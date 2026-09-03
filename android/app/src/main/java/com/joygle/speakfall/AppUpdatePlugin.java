package com.joygle.speakfall;

import android.app.Activity;
import android.content.Intent;
import android.content.IntentSender;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.appupdate.AppUpdateOptions;
import com.google.android.play.core.install.InstallState;
import com.google.android.play.core.install.InstallStateUpdatedListener;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.InstallStatus;
import com.google.android.play.core.install.model.UpdateAvailability;

@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {
    private static final int UPDATE_REQUEST_CODE = 7301;

    private AppUpdateManager appUpdateManager;
    private final InstallStateUpdatedListener installStateListener = this::emitInstallState;

    @Override
    public void load() {
        appUpdateManager = AppUpdateManagerFactory.create(getContext());
        appUpdateManager.registerListener(installStateListener);
    }

    @PluginMethod
    public void checkForUpdate(PluginCall call) {
        appUpdateManager
            .getAppUpdateInfo()
            .addOnSuccessListener(info -> call.resolve(toUpdateInfo(info)))
            .addOnFailureListener(error -> call.reject("업데이트 정보를 확인하지 못했습니다.", error));
    }

    @PluginMethod
    public void startFlexibleUpdate(PluginCall call) {
        appUpdateManager
            .getAppUpdateInfo()
            .addOnSuccessListener(info -> {
                if (
                    info.updateAvailability() != UpdateAvailability.UPDATE_AVAILABLE ||
                    !info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE)
                ) {
                    JSObject result = toUpdateInfo(info);
                    result.put("started", false);
                    call.resolve(result);
                    return;
                }

                try {
                    boolean started = appUpdateManager.startUpdateFlowForResult(
                        info,
                        getActivity(),
                        AppUpdateOptions.newBuilder(AppUpdateType.FLEXIBLE).build(),
                        UPDATE_REQUEST_CODE
                    );
                    JSObject result = toUpdateInfo(info);
                    result.put("started", started);
                    call.resolve(result);
                } catch (IntentSender.SendIntentException error) {
                    call.reject("업데이트 화면을 열지 못했습니다.", error);
                }
            })
            .addOnFailureListener(error -> call.reject("업데이트를 시작하지 못했습니다.", error));
    }

    @PluginMethod
    public void completeUpdate(PluginCall call) {
        appUpdateManager
            .completeUpdate()
            .addOnSuccessListener(unused -> call.resolve())
            .addOnFailureListener(error -> call.reject("업데이트 설치를 완료하지 못했습니다.", error));
    }

    @Override
    protected void handleOnResume() {
        appUpdateManager
            .getAppUpdateInfo()
            .addOnSuccessListener(info -> {
                if (info.installStatus() == InstallStatus.DOWNLOADED) {
                    notifyListeners("updateStateChange", toUpdateInfo(info), true);
                }
            });
    }

    @Override
    protected void handleOnActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode != UPDATE_REQUEST_CODE) return;

        JSObject state = new JSObject();
        if (resultCode == Activity.RESULT_CANCELED) {
            state.put("status", "canceled");
            notifyListeners("updateStateChange", state);
        } else if (resultCode != Activity.RESULT_OK) {
            state.put("status", "failed");
            notifyListeners("updateStateChange", state);
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (appUpdateManager != null) {
            appUpdateManager.unregisterListener(installStateListener);
        }
    }

    private void emitInstallState(InstallState installState) {
        JSObject state = new JSObject();
        state.put("status", statusName(installState.installStatus()));
        state.put("bytesDownloaded", installState.bytesDownloaded());
        state.put("totalBytesToDownload", installState.totalBytesToDownload());
        notifyListeners("updateStateChange", state, installState.installStatus() == InstallStatus.DOWNLOADED);
    }

    private JSObject toUpdateInfo(AppUpdateInfo info) {
        JSObject result = new JSObject();
        result.put("available", info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE);
        result.put("flexibleAllowed", info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE));
        result.put("availableVersionCode", info.availableVersionCode());
        result.put("installStatus", statusName(info.installStatus()));
        result.put("status", statusName(info.installStatus()));
        return result;
    }

    private String statusName(int status) {
        switch (status) {
            case InstallStatus.PENDING:
                return "pending";
            case InstallStatus.DOWNLOADING:
                return "downloading";
            case InstallStatus.DOWNLOADED:
                return "downloaded";
            case InstallStatus.INSTALLING:
                return "installing";
            case InstallStatus.INSTALLED:
                return "installed";
            case InstallStatus.FAILED:
                return "failed";
            case InstallStatus.CANCELED:
                return "canceled";
            default:
                return "idle";
        }
    }
}
