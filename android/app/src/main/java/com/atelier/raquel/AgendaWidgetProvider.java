package com.atelier.raquel;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.view.View;
import android.widget.RemoteViews;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

public class AgendaWidgetProvider extends AppWidgetProvider {
    private static final int[] ROW_IDS = {
        R.id.agenda_row_1,
        R.id.agenda_row_2,
        R.id.agenda_row_3,
        R.id.agenda_row_4,
        R.id.agenda_row_5,
    };
    private static final int[] TIME_IDS = {
        R.id.agenda_time_1,
        R.id.agenda_time_2,
        R.id.agenda_time_3,
        R.id.agenda_time_4,
        R.id.agenda_time_5,
    };
    private static final int[] TITLE_IDS = {
        R.id.agenda_title_1,
        R.id.agenda_title_2,
        R.id.agenda_title_3,
        R.id.agenda_title_4,
        R.id.agenda_title_5,
    };
    private static final int[] META_IDS = {
        R.id.agenda_meta_1,
        R.id.agenda_meta_2,
        R.id.agenda_meta_3,
        R.id.agenda_meta_4,
        R.id.agenda_meta_5,
    };

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_agenda);
        WidgetTheme theme = WidgetTheme.from(WidgetDataStore.getTheme(context));
        String brandName = WidgetDataStore.getBrandName(context);

        views.setInt(R.id.widget_agenda_root, "setBackgroundResource", theme.bgDrawable);
        views.setTextViewText(R.id.widget_agenda_brand, brandName.toUpperCase(Locale.ROOT));
        views.setTextColor(R.id.widget_agenda_brand, theme.accentColor);
        views.setTextColor(R.id.widget_agenda_title, theme.textPrimary);

        Date now = new Date();
        String todayIso = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(now);
        String datePill = formatShortDatePtBr(now);
        views.setTextViewText(R.id.widget_agenda_date_pill, datePill);
        views.setInt(R.id.widget_agenda_date_pill, "setBackgroundResource", theme.pillDrawable);
        views.setTextColor(R.id.widget_agenda_date_pill, theme.accentColor);

        List<JSONObject> todayEvents = new ArrayList<>();
        JSONArray allEvents = WidgetDataStore.getEvents(context);
        for (int i = 0; i < allEvents.length(); i++) {
            JSONObject ev = allEvents.optJSONObject(i);
            if (ev != null && todayIso.equals(ev.optString("date"))) {
                todayEvents.add(ev);
            }
        }

        Collections.sort(
            todayEvents,
            new Comparator<JSONObject>() {
                @Override
                public int compare(JSONObject a, JSONObject b) {
                    boolean allDayA = a.optBoolean("allDay", false);
                    boolean allDayB = b.optBoolean("allDay", false);
                    if (allDayA != allDayB) return allDayA ? -1 : 1;
                    return a.optString("time", "99:99").compareTo(b.optString("time", "99:99"));
                }
            }
        );

        views.setTextColor(R.id.widget_agenda_empty, theme.textMuted);
        views.setTextColor(R.id.widget_agenda_more, theme.textSecondary);

        if (todayEvents.isEmpty()) {
            views.setViewVisibility(R.id.widget_agenda_empty, View.VISIBLE);
            views.setViewVisibility(R.id.widget_agenda_more, View.GONE);
            for (int rowId : ROW_IDS) {
                views.setViewVisibility(rowId, View.GONE);
            }
        } else {
            views.setViewVisibility(R.id.widget_agenda_empty, View.GONE);
            int maxRows = ROW_IDS.length;
            int visibleCount = Math.min(todayEvents.size(), maxRows);

            for (int i = 0; i < maxRows; i++) {
                if (i < visibleCount) {
                    JSONObject ev = todayEvents.get(i);
                    boolean allDay = ev.optBoolean("allDay", false);
                    String time = allDay ? "Dia todo" : ev.optString("time", "--:--");
                    String title = ev.optString("title", "Compromisso");
                    String category = ev.optString("category", "");
                    String location = ev.optString("location", "");
                    String meta = buildMeta(category, location);

                    views.setViewVisibility(ROW_IDS[i], View.VISIBLE);
                    views.setInt(ROW_IDS[i], "setBackgroundResource", theme.rowDrawable);

                    views.setTextViewText(TIME_IDS[i], time);
                    views.setTextColor(TIME_IDS[i], theme.accentColor);

                    views.setTextViewText(TITLE_IDS[i], title);
                    views.setTextColor(TITLE_IDS[i], theme.textPrimary);

                    if (meta.isEmpty()) {
                        views.setViewVisibility(META_IDS[i], View.GONE);
                    } else {
                        views.setViewVisibility(META_IDS[i], View.VISIBLE);
                        views.setTextViewText(META_IDS[i], meta);
                        views.setTextColor(META_IDS[i], theme.textSecondary);
                    }
                } else {
                    views.setViewVisibility(ROW_IDS[i], View.GONE);
                }
            }

            int extra = todayEvents.size() - visibleCount;
            if (extra > 0) {
                views.setViewVisibility(R.id.widget_agenda_more, View.VISIBLE);
                views.setTextViewText(
                    R.id.widget_agenda_more,
                    "+" + extra + (extra == 1 ? " compromisso hoje" : " compromissos hoje")
                );
            } else {
                views.setViewVisibility(R.id.widget_agenda_more, View.GONE);
            }
        }

        views.setOnClickPendingIntent(
            R.id.widget_agenda_root,
            WidgetTheme.createOpenTabIntent(context, "agenda", 1001)
        );

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private static String buildMeta(String category, String location) {
        if (!category.isEmpty() && !location.isEmpty()) {
            return category + " · " + location;
        }
        return !category.isEmpty() ? category : location;
    }

    private static String formatShortDatePtBr(Date date) {
        Locale ptBr = new Locale("pt", "BR");
        String raw = new SimpleDateFormat("EEE, d MMM", ptBr).format(date).replace(".", "");
        if (raw.isEmpty()) return "Hoje";
        return raw.substring(0, 1).toUpperCase(ptBr) + raw.substring(1);
    }
}
