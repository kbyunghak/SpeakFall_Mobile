import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export type AppUpdateStatus =
  | "idle"
  | "pending"
  | "downloading"
  | "downloaded"
  | "installing"
  | "installed"
  | "canceled"
  | "failed";

export type AppUpdateInfo = {
  available: boolean;
  flexibleAllowed: boolean;
  availableVersionCode: number;
  installStatus: AppUpdateStatus;
};

export type AppUpdateState = {
  status: AppUpdateStatus;
  bytesDownloaded?: number;
  totalBytesToDownload?: number;
};

type StartUpdateResult = AppUpdateInfo & { started: boolean };

export interface AppUpdatePlugin {
  checkForUpdate(): Promise<AppUpdateInfo>;
  startFlexibleUpdate(): Promise<StartUpdateResult>;
  completeUpdate(): Promise<void>;
  addListener(
    eventName: "updateStateChange",
    listener: (state: AppUpdateState) => void,
  ): Promise<PluginListenerHandle>;
}

const NativeAppUpdate = registerPlugin<AppUpdatePlugin>("AppUpdate");

export type AppUpdateCheckResult =
  | "unsupported"
  | "already-checked"
  | "not-available"
  | "downloaded"
  | "started"
  | "not-started"
  | "failed";

export class AppUpdateCoordinator {
  private checked = false;

  constructor(
    private readonly plugin: AppUpdatePlugin,
    private readonly supported: () => boolean,
  ) {}

  async checkAndStartFlexibleUpdate(
    onState?: (state: AppUpdateState) => void,
  ): Promise<AppUpdateCheckResult> {
    if (!this.supported()) return "unsupported";
    if (this.checked) return "already-checked";
    this.checked = true;

    try {
      const info = await this.plugin.checkForUpdate();
      if (info.installStatus === "downloaded") {
        onState?.({ status: "downloaded" });
        return "downloaded";
      }
      if (!info.available || !info.flexibleAllowed) return "not-available";

      const result = await this.plugin.startFlexibleUpdate();
      return result.started ? "started" : "not-started";
    } catch {
      return "failed";
    }
  }

  async observe(onState: (state: AppUpdateState) => void): Promise<() => void> {
    if (!this.supported()) return () => undefined;
    try {
      const handle = await this.plugin.addListener("updateStateChange", onState);
      return () => void handle.remove();
    } catch {
      return () => undefined;
    }
  }

  async completeUpdate(): Promise<boolean> {
    if (!this.supported()) return false;
    try {
      await this.plugin.completeUpdate();
      return true;
    } catch {
      return false;
    }
  }
}

function isNativeAndroid(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export const appUpdateCoordinator = new AppUpdateCoordinator(NativeAppUpdate, isNativeAndroid);
