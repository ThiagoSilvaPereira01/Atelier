package com.atelier.raquel;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {
    public static final String EXTRA_OPEN_TAB = "atelier_open_tab";

    private static volatile WidgetBridgePlugin activeInstance;
    private static volatile String pendingTab;

    @Override
    public void load() {
        super.load();
        activeInstance = this;
    }

    @Override
    protected void handleOnDestroy() {
        if (activeInstance == this) {
            activeInstance = null;
        }
        super.handleOnDestroy();
    }

    public static void dispatchOpenTab(String tab) {
        if (tab == null || tab.isEmpty()) return;
        pendingTab = tab;
        WidgetBridgePlugin instance = activeInstance;
        if (instance != null) {
            JSObject payload = new JSObject();
            payload.put("tab", tab);
            instance.notifyListeners("widgetTabOpen", payload, true);
        }
    }

    @PluginMethod
    public void syncWidgetData(PluginCall call) {
        String theme = call.getString("theme", "pastel");
        String brandName = call.getString("brandName", "Atelier");
        JSArray events = call.getArray("events");
        JSArray tasks = call.getArray("tasks");

        String eventsJson = events != null ? events.toString() : "[]";
        String tasksJson = tasks != null ? tasks.toString() : "[]";

        WidgetDataStore.save(getContext(), theme, brandName, eventsJson, tasksJson);
        WidgetDataStore.updateAllWidgets(getContext());

        call.resolve();
    }

    @PluginMethod
    public void consumePendingTab(PluginCall call) {
        String tab = pendingTab;
        pendingTab = null;
        JSObject result = new JSObject();
        if (tab != null && !tab.isEmpty()) {
            result.put("tab", tab);
        }
        call.resolve(result);
    }
}
