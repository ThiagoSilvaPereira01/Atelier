package com.atelier.raquel;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.view.View;
import android.widget.RemoteViews;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

public class TasksWidgetProvider extends AppWidgetProvider {
    private static final int[] ROW_IDS = {
        R.id.task_row_1,
        R.id.task_row_2,
        R.id.task_row_3,
        R.id.task_row_4,
        R.id.task_row_5,
    };
    private static final int[] DOT_IDS = {
        R.id.task_dot_1,
        R.id.task_dot_2,
        R.id.task_dot_3,
        R.id.task_dot_4,
        R.id.task_dot_5,
    };
    private static final int[] TITLE_IDS = {
        R.id.task_title_1,
        R.id.task_title_2,
        R.id.task_title_3,
        R.id.task_title_4,
        R.id.task_title_5,
    };
    private static final int[] META_IDS = {
        R.id.task_meta_1,
        R.id.task_meta_2,
        R.id.task_meta_3,
        R.id.task_meta_4,
        R.id.task_meta_5,
    };

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_tasks);
        WidgetTheme theme = WidgetTheme.from(WidgetDataStore.getTheme(context));
        String brandName = WidgetDataStore.getBrandName(context);

        views.setInt(R.id.widget_tasks_root, "setBackgroundResource", theme.bgDrawable);
        views.setTextViewText(R.id.widget_tasks_brand, brandName.toUpperCase(Locale.ROOT));
        views.setTextColor(R.id.widget_tasks_brand, theme.accentColor);
        views.setTextColor(R.id.widget_tasks_title, theme.textPrimary);

        List<JSONObject> pendingTasks = new ArrayList<>();
        JSONArray allTasks = WidgetDataStore.getTasks(context);
        for (int i = 0; i < allTasks.length(); i++) {
            JSONObject task = allTasks.optJSONObject(i);
            if (task != null) {
                pendingTasks.add(task);
            }
        }

        int total = pendingTasks.size();
        String countText =
            total == 0
                ? "Tudo em dia"
                : total == 1
                ? "1 pendente"
                : total + " pendentes";
        views.setTextViewText(R.id.widget_tasks_count_pill, countText);
        views.setInt(R.id.widget_tasks_count_pill, "setBackgroundResource", theme.pillDrawable);
        views.setTextColor(R.id.widget_tasks_count_pill, theme.accentColor);

        views.setTextColor(R.id.widget_tasks_empty, theme.textMuted);
        views.setTextColor(R.id.widget_tasks_more, theme.textSecondary);

        String todayIso = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());

        if (pendingTasks.isEmpty()) {
            views.setViewVisibility(R.id.widget_tasks_empty, View.VISIBLE);
            views.setViewVisibility(R.id.widget_tasks_more, View.GONE);
            for (int rowId : ROW_IDS) {
                views.setViewVisibility(rowId, View.GONE);
            }
        } else {
            views.setViewVisibility(R.id.widget_tasks_empty, View.GONE);
            int maxRows = ROW_IDS.length;
            int visibleCount = Math.min(total, maxRows);

            for (int i = 0; i < maxRows; i++) {
                if (i < visibleCount) {
                    JSONObject task = pendingTasks.get(i);
                    String title = task.optString("title", "Tarefa");
                    String category = task.optString("category", "");
                    String priority = task.optString("priority", "media");
                    String dueDate = task.optString("dueDate", "");
                    boolean isReminder = task.optBoolean("isReminder", false);

                    views.setViewVisibility(ROW_IDS[i], View.VISIBLE);
                    views.setInt(ROW_IDS[i], "setBackgroundResource", theme.rowDrawable);

                    int dotDrawable =
                        "alta".equals(priority)
                            ? R.drawable.widget_dot_high
                            : "media".equals(priority)
                            ? R.drawable.widget_dot_medium
                            : R.drawable.widget_dot_low;
                    views.setImageViewResource(DOT_IDS[i], dotDrawable);

                    views.setTextViewText(TITLE_IDS[i], title);
                    views.setTextColor(TITLE_IDS[i], theme.textPrimary);

                    String meta = buildTaskMeta(category, dueDate, todayIso, isReminder);
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

            int extra = total - visibleCount;
            if (extra > 0) {
                views.setViewVisibility(R.id.widget_tasks_more, View.VISIBLE);
                views.setTextViewText(
                    R.id.widget_tasks_more,
                    "+" + extra + (extra == 1 ? " tarefa pendente" : " tarefas pendentes")
                );
            } else {
                views.setViewVisibility(R.id.widget_tasks_more, View.GONE);
            }
        }

        views.setOnClickPendingIntent(
            R.id.widget_tasks_root,
            WidgetTheme.createOpenTabIntent(context, "tarefas", 1002)
        );

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private static String buildTaskMeta(
        String category,
        String dueDate,
        String todayIso,
        boolean isReminder
    ) {
        StringBuilder sb = new StringBuilder();
        if (!category.isEmpty()) {
            sb.append(category);
        }
        if (isReminder) {
            if (sb.length() > 0) sb.append(" · ");
            sb.append("Lembrete");
        }
        if (!dueDate.isEmpty() && dueDate.length() >= 10) {
            String dueLabel;
            if (dueDate.equals(todayIso)) {
                dueLabel = "Hoje";
            } else if (dueDate.compareTo(todayIso) < 0) {
                dueLabel = "Atrasada";
            } else {
                dueLabel = dueDate.substring(8, 10) + "/" + dueDate.substring(5, 7);
            }
            if (sb.length() > 0) sb.append(" · ");
            sb.append(dueLabel);
        }
        return sb.toString();
    }
}
