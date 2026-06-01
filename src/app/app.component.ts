import { Component, effect, inject, signal } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { Location } from '@angular/common';
import { ToolbarComponent } from './layout/toolbar/toolbar.component';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
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
    @if (exitToast()) {
      <div class="exit-toast">Հետ գնալու համար սեղմեք նորից</div>
    }
  `,
  styles: [`
    .exit-toast {
      position: fixed;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.75);
      color: #fff;
      padding: 0.6rem 1.2rem;
      border-radius: 20px;
      font-size: 0.88rem;
      white-space: nowrap;
      pointer-events: none;
      z-index: 9999;
      animation: fadeIn 0.15s ease;
    }
    @keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(6px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
  `]
})
export class AppComponent {
  private themeService = inject(ThemeService);
  private router = inject(Router);
  private location = inject(Location);
  exitToast = signal(false);
  private exitToastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (!Capacitor.isNativePlatform()) return;

    App.addListener('backButton', ({ canGoBack }) => {
      const onHome = this.router.url === '/bible' || this.router.url === '/';
      if (!onHome) {
        this.location.back();
        return;
      }
      if (this.exitToast()) {
        App.exitApp();
        return;
      }
      this.exitToast.set(true);
      this.exitToastTimer = setTimeout(() => {
        this.exitToast.set(false);
        this.exitToastTimer = null;
      }, 2000);
    });

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
