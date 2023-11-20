import { assert, decompress, fs, io, Mutex, path, semver } from "../deps.ts";

export class TabNine {
  private proc?: Deno.Process;
  private lines?: AsyncIterator<string>;
  private runningBinaryPath?: string;

  private binaryPath?: string;
  private mutex = new Mutex();
  private numRestarts = 0;

  constructor(
    public clientName: string,
    public storageDir: string,
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
    await new Blob([requestStr]).stream().pipeTo(
      this.proc.stdin.writable,
      { preventClose: true },
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
      killProcess(oldProc);
    }
    const args = [
      `--client=${this.clientName}`,
    ];

    const binaryPath = this.binaryPath ||
      await TabNine.getBinaryPath(this.storageDir);

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
      this.storageDir,
      version,
      archAndPlatform,
      Deno.build.os === "windows" ? "TabNine.exe" : "TabNine",
    );
    return await fs.exists(destDir);
  }

  static async installTabNine(
    storageDir: string,
    version: string,
  ): Promise<void> {
    const archAndPlatform = TabNine.getArchAndPlatform();
    const destDir = path.join(
      storageDir,
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
        await res.body.pipeTo(destFile.writable);
      } finally {
        destFile.close();
      }
      try {
        if (!(await decompress(zipPath, destDir))) {
          throw new Error("failed to decompress a TabNine archive");
        }
      } catch (e: unknown) {
        throw e;
      } finally {
        await Deno.remove(zipPath);
      }
    }
    if (Deno.build.os === "windows") {
      return;
    }
    for await (const entry of await Deno.readDir(destDir)) {
      await Deno.chmod(path.resolve(destDir, entry.name), 0o755);
    }
  }

  static async cleanAllVersions(storageDir: string): Promise<void> {
    const versions = await TabNine.getInstalledVersions(storageDir);
    await Promise.all(
      versions.map((ver) => TabNine.cleanVersion(storageDir, ver)),
    );
  }

  static async cleanVersion(
    storageDir: string,
    version: string,
  ): Promise<void> {
    const archAndPlatform = TabNine.getArchAndPlatform();
    const destDir = path.join(
      storageDir,
      version,
      archAndPlatform,
    );
    if (await fs.exists(destDir)) {
      await Deno.remove(destDir, { recursive: true });
    }
  }

  close() {
    if (this.proc) {
      killProcess(this.proc);
    }
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
    const version = await res.text();
    return version;
  }

  static async getInstalledVersions(storageDir: string): Promise<string[]> {
    const versions: string[] = [];
    const archAndPlatform = TabNine.getArchAndPlatform();
    if (!(await fs.exists(storageDir))) return [];
    for await (const version of Deno.readDir(storageDir)) {
      if (
        semver.valid(version.name) &&
        await fs.exists(
          path.join(
            storageDir,
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

  static async getBinaryPath(storageDir: string): Promise<string> {
    const archAndPlatform = TabNine.getArchAndPlatform();
    const versions = await TabNine.getInstalledVersions(storageDir);

    if (!versions || versions.length == 0) {
      throw new Error(`TabNine not installed in ${storageDir}`);
    }

    const sortedVersions = TabNine.sortBySemver(versions);

    const tried: string[] = [];
    for (const version of sortedVersions) {
      const fullPath = path.join(
        storageDir,
        version,
        archAndPlatform,
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

// https://github.com/vim-denops/denops.vim/blob/17d20561e5eb45657235e92b94b4a9c690b85900/denops/%40denops/test/tester.ts#L176-L196
// Brought under the MIT License ( https://github.com/vim-denops/denops.vim/blob/17d20561e5eb45657235e92b94b4a9c690b85900/LICENSE ) from https://github.com/vim-denops/denops.vim
async function killProcess(proc: Deno.Process): Promise<void> {
  if (semver.rcompare(Deno.version.deno, "1.14.0") < 0) {
    // Prior to v1.14.0, `Deno.Signal.SIGTERM` worked on Windows as well
    // deno-lint-ignore no-explicit-any
    proc.kill((Deno as any).Signal.SIGTERM);
  } else if (Deno.build.os === "windows") {
    // Signal API in Deno v1.14.0 on Windows
    // does not work so use `taskkill` for now
    const p = Deno.run({
      cmd: ["taskkill", "/pid", proc.pid.toString(), "/F"],
      stdin: "null",
      stdout: "null",
      stderr: "null",
    });
    await p.status();
    p.close();
  } else {
    // deno-lint-ignore no-explicit-any
    proc.kill("SIGTERM" as any);
  }
}
