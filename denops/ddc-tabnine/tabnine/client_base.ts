import * as semver from "https://deno.land/x/semver@v1.4.0/mod.ts";
import { Mutex } from "https://deno.land/x/semaphore@v1.1.0/mod.ts";
import * as path from "https://deno.land/std@0.106.0/path/mod.ts";
import * as io from "https://deno.land/std@0.106.0/io/mod.ts";
import * as fs from "https://deno.land/std@0.106.0/fs/mod.ts";
import { unZipFromFile } from "https://deno.land/x/zip@v1.1.0/mod.ts";
import { assert } from "https://deno.land/std@0.106.0/testing/asserts.ts";

export class TabNine {
  private proc?: Deno.Process;
  private procAlive = false;
  private binaryPath?: string;
  private mutex: Mutex = new Mutex();
  private lines?: AsyncIterator<string>;
  numRestarts = 0;

  constructor(
    public clientName: string,
    public storagePath: string,
  ) {}

  async request(request: unknown): Promise<unknown> {
    const release = await this.mutex.acquire();
    try {
      return await this.requestUnlocked(request);
    } finally {
      release();
    }
  }

  private async requestUnlocked(
    request: unknown,
  ): Promise<unknown> {
    const requestStr = JSON.stringify(request) + "\n";
    if (!this.isChildAlive()) {
      await this.restartChild();
    }
    if (!this.isChildAlive()) {
      throw new Error("TabNine process is dead.");
    }
    assert(this.proc?.stdin, "this.proc.stdin");
    await io.writeAll(
      this.proc.stdin,
      new TextEncoder().encode(requestStr),
    );
    const responseResult = await this.lines?.next();
    if (responseResult && !responseResult.done) {
      const response: unknown = JSON.parse(responseResult.value);
      return response;
    }
    return undefined;
  }

  private isChildAlive(): boolean {
    return Boolean(this.proc) && this.procAlive;
  }

  private async restartChild(): Promise<void> {
    if (this.numRestarts >= 10) {
      return;
    }
    this.numRestarts += 1;
    if (this.proc) {
      const oldProc = this.proc;
      this.proc = undefined;
      oldProc.kill(Deno.Signal.SIGINT);
    }
    const args = [
      `--client=${this.clientName}`,
    ];

    const binaryPath = this.binaryPath ||
      await this.getBinaryPath();

    this.proc = Deno.run({
      cmd: [binaryPath, ...args],
      stdin: "piped",
      stdout: "piped",
    });
    this.procAlive = true;
    void this.proc.status().then(() => {
      this.procAlive = false;
    });
    assert(this.proc.stdout, "this.proc.stdout");
    this.lines = io.readLines(this.proc.stdout);
  }

  async isInstalled(version: string): Promise<boolean> {
    const archAndPlatform = TabNine.getArchAndPlatform();
    const destDir = path.join(
      this.storagePath,
      "binaries",
      archAndPlatform,
      version,
    );
    return await fs.exists(destDir);
  }

  async installTabNine(
    version: string,
  ): Promise<void> {
    const archAndPlatform = TabNine.getArchAndPlatform();
    const destDir = path.join(
      this.storagePath,
      "binaries",
      archAndPlatform,
      version,
    );

    const url =
      `https://update.tabnine.com/bundles/${version}/${archAndPlatform}/TabNine.zip`;

    const binaries = [
      "TabNine",
      "TabNine-deep-cloud",
      "TabNine-deep-local",
      "WD-TabNine",
    ];
    const zipPath = path.join(destDir, path.basename(url));
    await fs.ensureDir(destDir);
    const res = await fetch(url);
    if (res.body) {
      const destFile = await Deno.open(zipPath, {
        write: true,
        create: true,
      });
      const reader = io.readerFromStreamReader(res.body.getReader());
      await io.copy(reader, destFile);
      await unZipFromFile(zipPath, destDir);
    }
    for (let b of binaries) {
      if (Deno.build.os == "windows") b = b + ".exe";
      const fullpath = path.resolve(destDir, b);

      if (await fs.exists(fullpath)) {
        await Deno.chmod(fullpath, 0o755);
      }
    }
  }

  async cleanTabNine(
    version: string,
  ): Promise<void> {
    const archAndPlatform = TabNine.getArchAndPlatform();
    const destDir = path.join(
      this.storagePath,
      "binaries",
      archAndPlatform,
      version,
    );
    if (await fs.exists(destDir)) {
      await Deno.remove(destDir, { recursive: true });
    }
  }

  close() {
    this.proc?.kill(Deno.Signal.SIGINT);
  }

  static async getTabNineLatestVersion(): Promise<string> {
    const url = "https://update.tabnine.com/bundles/version";
    const res = await fetch(url);
    if (!res.body) {
      throw Object.assign(new Error(`Body not found: ${url}`), { res });
    }
    const version = new TextDecoder().decode(
      await io.readAll(io.readerFromStreamReader(res.body.getReader())),
    );
    return version;
  }

  async getInstalledVersions(): Promise<string[]> {
    const versions: string[] = [];
    const archAndPlatform = TabNine.getArchAndPlatform();
    const binaries = path.join(this.storagePath, "binaries", archAndPlatform);
    if (!(await fs.exists(binaries))) return [];
    for await (const version of Deno.readDir(binaries)) {
      versions.push(version.name);
    }
    return versions;
  }

  async getBinaryPath(): Promise<string> {
    const archAndPlatform = TabNine.getArchAndPlatform();
    const binaries = path.join(this.storagePath, "binaries", archAndPlatform);
    const versions = await this.getInstalledVersions();

    if (!versions || versions.length == 0) {
      throw new Error("TabNine not installed");
    }

    const sortedVersions = TabNine.sortBySemver(versions);

    const tried: string[] = [];
    for (const version of sortedVersions) {
      const fullPath = path.join(
        binaries,
        version,
        Deno.build.os == "windows" ? "TabNine.exe" : "TabNine",
      );
      if (await fs.exists(fullPath)) {
        return fullPath;
      } else {
        tried.push(fullPath);
      }
    }
    throw new Error(
      `Couldn't find a TabNine binary (tried the following paths: versions=${sortedVersions} ${tried})`,
    );
  }

  static getArchAndPlatform(): string {
    const arch = Deno.build.arch;

    let suffix: string;
    switch (Deno.build.os) {
      case "windows":
        suffix = "pc-windows-gnu";
        break;
      case "darwin":
        suffix = "apple-darwin";
        break;
      case "linux":
        suffix = "unknown-linux-musl";
        break;
      default:
        throw new Error(
          `Sorry, the platform '${Deno.build.os}' is not supported by TabNine.`,
        );
    }

    return `${arch}-${suffix}`;
  }

  static sortBySemver(versions: string[]): string[] {
    return versions.sort(TabNine.cmpSemver);
  }

  static cmpSemver(a: string, b: string): number {
    const aValid = semver.valid(a);
    const bValid = semver.valid(b);
    if (aValid && bValid) return semver.rcompare(a, b);
    else if (aValid) return -1;
    else if (bValid) return 1;
    else if (a < b) return -1;
    else if (a > b) return 1;
    else return 0;
  }
}
