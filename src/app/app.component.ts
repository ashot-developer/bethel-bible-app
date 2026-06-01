import { Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToolbarComponent } from './layout/toolbar/toolbar.component';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style, StatusBarInfo } from '@capacitor/status-bar';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToolbarComponent],
  template: `
    <div class="app-layout">
      <app-toolbar />
      <main class="app-content">
        <router-outlet />
      </main>
    </div>
  `
})
export class AppComponent {
  private themeService = inject(ThemeService);

  constructor() {
    if (!Capacitor.isNativePlatform()) return;

    // Log current status bar info on startup
    StatusBar.getInfo().then((info: StatusBarInfo) => {
      console.log('[StatusBar] getInfo:', JSON.stringify(info));
    }).catch(e => console.error('[StatusBar] getInfo error:', e));

    // Log safe area insets
    const style = getComputedStyle(document.documentElement);
    console.log('[SafeArea] top:', style.getPropertyValue('env(safe-area-inset-top)'));
    console.log('[SafeArea] bottom:', style.getPropertyValue('env(safe-area-inset-bottom)'));
    const appLayout = document.querySelector('.app-layout') as HTMLElement | null;
    if (appLayout) {
      const cs = getComputedStyle(appLayout);
      console.log('[AppLayout] paddingTop:', cs.paddingTop);
      console.log('[AppLayout] paddingBottom:', cs.paddingBottom);
      console.log('[AppLayout] background:', cs.backgroundColor);
    }

    // Sync status bar icon style with app theme (runs on init + every toggle)
    effect(() => {
      const style = this.themeService.isDark() ? Style.Dark : Style.Light;
      console.log('[StatusBar] setStyle:', style);
      StatusBar.setStyle({ style })
        .then(() => StatusBar.getInfo())
        .then((info: StatusBarInfo) => console.log('[StatusBar] after setStyle:', JSON.stringify(info)))
        .catch(e => console.error('[StatusBar] setStyle error:', e));
    });

    // Re-apply on resume (Android restores status bar state from background)
    document.addEventListener('resume', () => {
      const s = this.themeService.isDark() ? Style.Dark : Style.Light;
      StatusBar.setStyle({ style: s }).catch(() => {});
    });
  }
}
