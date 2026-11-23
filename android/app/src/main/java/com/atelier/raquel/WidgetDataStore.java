package com.atelier.raquel;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;

public final class WidgetDataStore {
    private static final String PREFS_NAME = "atelier_widget_prefs";
    private static final String KEY_THEME = "theme";
    private static final String KEY_BRAND_NAME = "brand_name";
    private static final String KEY_EVENTS_JSON = "events_json";
    private static final String KEY_TASKS_JSON = "tasks_json";

    private WidgetDataStore() {}

    public static void save(
        Context context,
        String theme,
        String brandName,
        String eventsJson,
        String tasksJson
    ) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs
            .edit()
            .putString(KEY_THEME, theme != null ? theme : "pastel")
            .putString(KEY_BRAND_NAME, brandName != null && !brandName.isEmpty() ? brandName : "Atelier")
            .putString(KEY_EVENTS_JSON, eventsJson != null ? eventsJson : "[]")
            .putString(KEY_TASKS_JSON, tasksJson != null ? tasksJson : "[]")
            .apply();
    }

    public static String getTheme(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getString(KEY_THEME, "pastel");
    }

    public static String getBrandName(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getString(KEY_BRAND_NAME, "Atelier");
    }

    public static JSONArray getEvents(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String raw = prefs.getString(KEY_EVENTS_JSON, "[]");
        try {
            return new JSONArray(raw);
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    public static JSONArray getTasks(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String raw = prefs.getString(KEY_TASKS_JSON, "[]");
        try {
            return new JSONArray(raw);
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    public static void updateAllWidgets(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        if (manager == null) return;

        int[] agendaIds = manager.getAppWidgetIds(new ComponentName(context, AgendaWidgetProvider.class));
        if (agendaIds != null && agendaIds.length > 0) {
            for (int id : agendaIds) {
                AgendaWidgetProvider.updateAppWidget(context, manager, id);
            }
        }

        int[] taskIds = manager.getAppWidgetIds(new ComponentName(context, TasksWidgetProvider.class));
        if (taskIds != null && taskIds.length > 0) {
            for (int id : taskIds) {
                TasksWidgetProvider.updateAppWidget(context, manager, id);
            }
        }
    }
}
