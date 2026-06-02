package am.bethel.bible;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.ActionMode;
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
        // Switch away from the launch theme (which has the Capacitor splash drawable as its
        // window background) so the splash never shows through gaps during keyboard open or
        // ActionMode bar appearance.
        setTheme(R.style.AppTheme_NoActionBar);

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

        // Suppress the native long-press popup (Android selection toolbar / context menu)
        // that appears over the WebView. The app handles verse selection via its own UI;
        // the system popup causes confusing overlapping dialogs on long press.
        WebView webView = getBridge().getWebView();
        webView.setOnLongClickListener(v -> true);
        webView.setHapticFeedbackEnabled(false);

    }

    // All action modes triggered by any child view (including the WebView's text-selection
    // popup) route through onWindowStartingActionMode before reaching startActionMode.
    // Returning null here is the earliest and most reliable intercept point.
    @Override
    public ActionMode onWindowStartingActionMode(ActionMode.Callback callback) {
        return null;
    }

    @Override
    public ActionMode onWindowStartingActionMode(ActionMode.Callback callback, int type) {
        return null;
    }

    @Override
    public ActionMode startActionMode(ActionMode.Callback callback) {
        return null;
    }

    @Override
    public ActionMode startActionMode(ActionMode.Callback callback, int type) {
        return null;
    }
}
