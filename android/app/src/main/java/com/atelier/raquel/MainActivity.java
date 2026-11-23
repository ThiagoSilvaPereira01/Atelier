package com.atelier.raquel;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetBridgePlugin.class);
        super.onCreate(savedInstanceState);
        handleWidgetIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleWidgetIntent(intent);
    }

    private void handleWidgetIntent(Intent intent) {
        if (intent == null) return;
        String tab = intent.getStringExtra(WidgetBridgePlugin.EXTRA_OPEN_TAB);
        if (tab != null && !tab.isEmpty()) {
            WidgetBridgePlugin.dispatchOpenTab(tab);
        }
    }
}
