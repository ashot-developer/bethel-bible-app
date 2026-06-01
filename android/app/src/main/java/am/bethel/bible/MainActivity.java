package am.bethel.bible;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.content.pm.ApplicationInfo;
import android.webkit.WebView;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Called before super so the flag is set before AppCompat inflates the decor.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        super.onCreate(savedInstanceState);

        // AppCompat resets this flag for non-edge-to-edge themes inside super.onCreate(),
        // so we set it again here.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // Capacitor enables WebView debugging for debug builds, which causes a visible
        // inspector overlay and extra "Inspect" option during text selection. Force it off
        // so the debug UI never appears for end users.
        boolean isDebug = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        WebView.setWebContentsDebuggingEnabled(isDebug);

        // AppCompat also installs an insets listener that adds paddingTop = statusBarHeight
        // to the content frame, pushing the WebView down. Override both the frame and its
        // sub-decor child, clearing padding while still forwarding insets to the WebView
        // so CSS env(safe-area-inset-*) continues to work.
        View contentFrame = getWindow().getDecorView().findViewById(android.R.id.content);
        if (contentFrame instanceof ViewGroup) {
            contentFrame.setPadding(0, 0, 0, 0);
            ViewCompat.setOnApplyWindowInsetsListener(contentFrame, (v, insets) -> {
                v.setPadding(0, 0, 0, 0);
                return insets;
            });
            View subDecor = ((ViewGroup) contentFrame).getChildAt(0);
            if (subDecor != null) {
                subDecor.setPadding(0, 0, 0, 0);
                ViewCompat.setOnApplyWindowInsetsListener(subDecor, (v, insets) -> {
                    v.setPadding(0, 0, 0, 0);
                    return insets;
                });
            }
        }

        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            getWindow().setStatusBarContrastEnforced(false);
            getWindow().setNavigationBarContrastEnforced(false);
        }
    }
}
