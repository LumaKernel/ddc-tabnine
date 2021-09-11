import { assert, fs, io, Mutex, path, semver, unZipFromFile } from "../deps.ts";

// https://github.com/denoland/deno_std/issues/1216
const exists = async (filePath: string): Promise<boolean> => {
  try {
    await Deno.lstat(filePath);
    return true;
  } catch (_e: unknown) {
    return false;
  }
};

export class TabNine {
  private proc?: Deno.Process;
  private lines?: AsyncIterator<string>;
  private runningBinaryPath?: string;

  private binaryPath?: string;
  private mutex = new Mutex();
  private numRestarts = 0;

  constructor(
    public clientName: string,
    public storagePath: string,
  ) {}

  async request(request: unknown): Promise<unknown> {
    const release = await this.mutex.acquire();
    try {
      this.numRestarts = 0;
      return await this.requestUnlocked(request);
    } finally {
      release();
    }
  }

  private async requestUnlocked(
    request: unknown,
  ): Promise<unknown> {
    const requestStr = JSON.stringify(request) + "\n";
    if (!this.isRunning()) {
      await this.restartProcLimited();
    }
    if (!this.isRunning()) {
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

  isRunning(): boolean {
    return Boolean(this.proc);
  }

  async restartProc(): Promise<void> {
    this.numRestarts = 0;
    await this.restartProcLimited();
  }

  private async restartProcLimited(): Promise<void> {
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

    this.runningBinaryPath = binaryPath;
    this.proc = Deno.run({
      cmd: [binaryPath, ...args],
      stdin: "piped",
      stdout: "piped",
    });
    void this.proc.status().then(() => {
      this.proc = undefined;
      this.runningBinaryPath = undefined;
    });
    assert(this.proc.stdout, "this.proc.stdout");
    this.lines = io.readLines(this.proc.stdout);
  }

  async isInstalled(version: string): Promise<boolean> {
    const archAndPlatform = TabNine.getArchAndPlatform();
    const destDir = path.join(
      this.storagePath,
      version,
      archAndPlatform,
      Deno.build.os === "windows" ? "TabNine.exe" : "TabNine",
    );
    return await exists(destDir);
  }

  async installTabNine(
    version: string,
  ): Promise<void> {
    const archAndPlatform = TabNine.getArchAndPlatform();
    const destDir = path.join(
      this.storagePath,
      version,
      archAndPlatform,
    );

    const url =
      `https://update.tabnine.com/bundles/${version}/${archAndPlatform}/TabNine.zip`;

    const zipPath = path.join(destDir, path.basename(url));
    await fs.ensureDir(destDir);
    const res = await fetch(url);
    if (res.body) {
      const destFile = await Deno.open(zipPath, {
        write: true,
        create: true,
      });
      try {
        const reader = io.readerFromStreamReader(res.body.getReader());
        await io.copy(reader, destFile);
        await unZipFromFile(zipPath, destDir);
      } finally {
        destFile.close();
      }
      await Deno.remove(zipPath);
    }
    for await (const entry of await Deno.readDir(destDir)) {
      await Deno.chmod(path.resolve(destDir, entry.name), 0o755);
    }
  }

  async cleanAllVersions(): Promise<void> {
    const versions = await this.getInstalledVersions();
    await Promise.all(versions.map((ver) => this.cleanVersion(ver)));
  }

  async cleanVersion(
    version: string,
  ): Promise<void> {
    const archAndPlatform = TabNine.getArchAndPlatform();
    const destDir = path.join(
      this.storagePath,
      version,
      archAndPlatform,
    );
    if (await exists(destDir)) {
      await Deno.remove(destDir, { recursive: true });
    }
  }

  close() {
    this.proc?.kill(Deno.Signal.SIGINT);
  }

  static async getLatestVersion(): Promise<string> {
    const url = "https://update.tabnine.com/bundles/version";
    const res = await fetch(url);
    if (!res.body) {
      throw Object.assign(new Error(`Body not found: ${url}`), { res });
    }
    if (!res.ok) {
      throw Object.assign(new Error(`Response status not ok: ${url}`), { res });
    }
    const version = new TextDecoder().decode(
      await io.readAll(io.readerFromStreamReader(res.body.getReader())),
    );
    return version;
  }

  async getInstalledVersions(): Promise<string[]> {
    const versions: string[] = [];
    const archAndPlatform = TabNine.getArchAndPlatform();
    const { storagePath } = this;
    if (!(await exists(storagePath))) return [];
    for await (const version of Deno.readDir(storagePath)) {
      if (
        semver.valid(version.name) &&
        await exists(
          path.join(
            storagePath,
            version.name,
            archAndPlatform,
            Deno.build.os == "windows" ? "TabNine.exe" : "TabNine",
          ),
        )
      ) {
        versions.push(version.name);
      }
    }
    return versions;
  }

  getRunningBinaryPath(): string | null {
    return this.runningBinaryPath ?? null;
  }

  async getBinaryPath(): Promise<string> {
    const archAndPlatform = TabNine.getArchAndPlatform();
    const { storagePath } = this;
    const versions = await this.getInstalledVersions();

    if (!versions || versions.length == 0) {
      throw new Error(`TabNine not installed in ${storagePath}`);
    }

    const sortedVersions = TabNine.sortBySemver(versions);

    const tried: string[] = [];
    for (const version of sortedVersions) {
      const fullPath = path.join(
        storagePath,
        version,
        archAndPlatform,
        Deno.build.os == "windows" ? "TabNine.exe" : "TabNine",
      );
      if (await exists(fullPath)) {
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
