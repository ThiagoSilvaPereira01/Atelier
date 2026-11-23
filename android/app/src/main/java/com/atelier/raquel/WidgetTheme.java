package com.atelier.raquel;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;

public final class WidgetTheme {
    public final int bgDrawable;
    public final int rowDrawable;
    public final int pillDrawable;
    public final int accentColor;
    public final int textPrimary;
    public final int textSecondary;
    public final int textMuted;

    private WidgetTheme(
        int bgDrawable,
        int rowDrawable,
        int pillDrawable,
        int accentColor,
        int textPrimary,
        int textSecondary,
        int textMuted
    ) {
        this.bgDrawable = bgDrawable;
        this.rowDrawable = rowDrawable;
        this.pillDrawable = pillDrawable;
        this.accentColor = accentColor;
        this.textPrimary = textPrimary;
        this.textSecondary = textSecondary;
        this.textMuted = textMuted;
    }

    public static WidgetTheme from(String themeName) {
        if ("dark".equals(themeName)) {
            return new WidgetTheme(
                R.drawable.widget_bg_dark,
                R.drawable.widget_row_dark,
                R.drawable.widget_pill_dark,
                Color.parseColor("#C9968C"),
                Color.parseColor("#F1F3F6"),
                Color.parseColor("#AEB4C0"),
                Color.parseColor("#767D8C")
            );
        }
        if ("light".equals(themeName)) {
            return new WidgetTheme(
                R.drawable.widget_bg_light,
                R.drawable.widget_row_light,
                R.drawable.widget_pill_light,
                Color.parseColor("#3F6259"),
                Color.parseColor("#18181B"),
                Color.parseColor("#52525B"),
                Color.parseColor("#8B8B95")
            );
        }
        return new WidgetTheme(
            R.drawable.widget_bg_pastel,
            R.drawable.widget_row_pastel,
            R.drawable.widget_pill_pastel,
            Color.parseColor("#B56B60"),
            Color.parseColor("#352421"),
            Color.parseColor("#755E59"),
            Color.parseColor("#9E8883")
        );
    }

    public static PendingIntent createOpenTabIntent(Context context, String tab, int requestCode) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction("com.atelier.raquel.OPEN_TAB_" + tab);
        intent.putExtra(WidgetBridgePlugin.EXTRA_OPEN_TAB, tab);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }
}
