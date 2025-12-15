declare module 'adbkit-apkreader' {
  interface ManifestApplication {
    label?: string;
    icon?: string;
    theme?: string;
    debuggable?: boolean;
  }

  interface Manifest {
    package?: string;
    versionCode?: number;
    versionName?: string;
    application?: ManifestApplication;
    usesPermissions?: string[];
    usesFeatures?: string[];
  }

  class ApkReader {
    static open(path: string): Promise<ApkReader>;
    readManifest(): Promise<Manifest>;
    readContents(): Promise<string[]>;
  }

  export = ApkReader;
}
