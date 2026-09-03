import { describe, expect, test } from "bun:test";
import {
  AppUpdateCoordinator,
  type AppUpdateInfo,
  type AppUpdatePlugin,
  type AppUpdateState,
} from "./appUpdate";

const noUpdate: AppUpdateInfo = {
  available: false,
  flexibleAllowed: false,
  availableVersionCode: 6,
  installStatus: "idle",
};

function createPlugin(info: AppUpdateInfo = noUpdate) {
  const calls = { check: 0, start: 0, complete: 0 };
  const plugin: AppUpdatePlugin = {
    async checkForUpdate() {
      calls.check += 1;
      return info;
    },
    async startFlexibleUpdate() {
      calls.start += 1;
      return { ...info, started: true };
    },
    async completeUpdate() {
      calls.complete += 1;
    },
    async addListener(_eventName, _listener) {
      return { remove: async () => undefined };
    },
  };
  return { plugin, calls };
}

describe("AppUpdateCoordinator", () => {
  test("웹 환경에서는 Google Play 업데이트를 확인하지 않는다", async () => {
    const { plugin, calls } = createPlugin();
    const coordinator = new AppUpdateCoordinator(plugin, () => false);

    expect(await coordinator.checkAndStartFlexibleUpdate()).toBe("unsupported");
    expect(calls.check).toBe(0);
  });

  test("앱 실행 중 업데이트 확인은 한 번만 수행한다", async () => {
    const { plugin, calls } = createPlugin();
    const coordinator = new AppUpdateCoordinator(plugin, () => true);

    expect(await coordinator.checkAndStartFlexibleUpdate()).toBe("not-available");
    expect(await coordinator.checkAndStartFlexibleUpdate()).toBe("already-checked");
    expect(calls.check).toBe(1);
  });

  test("새 버전이 있으면 Flexible Update를 시작한다", async () => {
    const { plugin, calls } = createPlugin({
      available: true,
      flexibleAllowed: true,
      availableVersionCode: 7,
      installStatus: "idle",
    });
    const coordinator = new AppUpdateCoordinator(plugin, () => true);

    expect(await coordinator.checkAndStartFlexibleUpdate()).toBe("started");
    expect(calls.start).toBe(1);
  });

  test("이미 다운로드된 업데이트는 재시작 안내 상태를 전달한다", async () => {
    const { plugin } = createPlugin({
      available: true,
      flexibleAllowed: true,
      availableVersionCode: 7,
      installStatus: "downloaded",
    });
    const coordinator = new AppUpdateCoordinator(plugin, () => true);
    const states: AppUpdateState[] = [];

    expect(await coordinator.checkAndStartFlexibleUpdate((state) => states.push(state))).toBe(
      "downloaded",
    );
    expect(states).toEqual([{ status: "downloaded" }]);
  });

  test("업데이트 확인 오류가 앱 흐름으로 전파되지 않는다", async () => {
    const { plugin } = createPlugin();
    plugin.checkForUpdate = async () => {
      throw new Error("Play Store unavailable");
    };
    const coordinator = new AppUpdateCoordinator(plugin, () => true);

    expect(await coordinator.checkAndStartFlexibleUpdate()).toBe("failed");
  });
});
