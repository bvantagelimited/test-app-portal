declare module 'app-info-parser' {
  interface ApkInfo {
    application?: {
      label?: string[];
      icon?: string[];
      [key: string]: unknown;
    };
    package?: string;
    versionCode?: number;
    versionName?: string;
    icon?: string;
    [key: string]: unknown;
  }

  class AppInfoParser {
    constructor(file: string | File | Blob);
    parse(): Promise<ApkInfo>;
  }

  export default AppInfoParser;
}
