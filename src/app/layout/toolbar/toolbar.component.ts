import { Component, inject, computed } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ThemeService } from '../../core/services/theme.service';
import { UpdateService } from '../../core/services/update.service';
import { ElectronService } from '../../core/services/electron.service';
import { BibleStateService } from '../../features/bible/services/bible-state.service';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [ButtonModule, TooltipModule],
  template: `
    <div class="app-toolbar" [class.electron]="electron.isElectron">

      <!-- Left: back button -->
      <div class="toolbar-left">
        @if (showBack()) {
          <button class="back-btn" (click)="goBack()">
            <i class="pi pi-arrow-left"></i>
            <span>Վերադառնալ</span>
          </button>
        }
      </div>

      <!-- Right: controls -->
      <div class="toolbar-right">
        <button class="tb-icon-btn" [class.active]="isSettings()"
                (click)="toggleSettings()" title="Կարգավորումներ">
          <i class="pi pi-cog"></i>
          @if (updateService.hasUpdate()) {
            <span class="update-dot"></span>
          }
        </button>
        <p-button
          [icon]="themeService.isDark() ? 'pi pi-sun' : 'pi pi-moon'"
          [rounded]="true"
          [text]="true"
          size="small"
          (onClick)="themeService.toggle()"
          [pTooltip]="themeService.isDark() ? 'Light mode' : 'Dark mode'"
          tooltipPosition="bottom"
        />
        <img src="assets/logo.png" alt="Bethel" class="toolbar-logo" />
      </div>

    </div>
  `,
  styles: [`
    .app-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 0.5rem;
      -webkit-app-region: drag;
    }
    .app-toolbar.electron {
      padding-left: 80px; /* clears macOS traffic lights (hiddenInset) */
    }

    .toolbar-left { display: flex; align-items: center; min-width: 120px; -webkit-app-region: no-drag; }
    .toolbar-right { display: flex; align-items: center; gap: 0.1rem; -webkit-app-region: no-drag; }

    .back-btn {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      border: none;
      background: transparent;
      padding: 0.3rem 0.55rem;
      border-radius: 7px;
      cursor: pointer;
      color: var(--text-color-secondary);
      font-size: 0.85rem;
      font-weight: 600;
      font-family: inherit;
      transition: all 0.15s;
    }
    .back-btn:hover { background: var(--surface-hover); color: var(--bethel-primary); }
    .back-btn i { font-size: 0.8rem; }

    .toolbar-logo { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }

    .tb-icon-btn {
      position: relative;
      border: none;
      background: transparent;
      padding: 0.3rem 0.45rem;
      border-radius: 7px;
      cursor: pointer;
      color: var(--text-color-secondary);
      font-size: 0.95rem;
      display: flex;
      align-items: center;
      transition: all 0.15s;
      font-family: inherit;
    }
    .tb-icon-btn:hover { background: var(--surface-hover); color: var(--bethel-primary); }
    .tb-icon-btn.active { color: var(--bethel-primary); background: rgba(245,166,35,0.12); }

    .update-dot {
      position: absolute;
      top: 3px;
      right: 3px;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--bethel-accent);
      border: 1.5px solid var(--surface-card);
    }
  `]
})
export class ToolbarComponent {
  themeService  = inject(ThemeService);
  updateService = inject(UpdateService);
  electron      = inject(ElectronService);
  bibleState    = inject(BibleStateService);
  private router = inject(Router);

  private currentUrl = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => (e as NavigationEnd).urlAfterRedirects),
      startWith(this.router.url)
    )
  );

  isSettings = computed(() => (this.currentUrl() ?? '').startsWith('/settings'));

  showBack = computed(() => {
    const url = this.currentUrl() ?? '';
    if (!url.startsWith('/bible')) return true;
    return this.bibleState.mode() !== 'read';
  });

  goBack(): void {
    const url = this.currentUrl() ?? '';
    if (!url.startsWith('/bible')) {
      this.router.navigate(['/bible']);
    } else {
      this.bibleState.mode.set('read');
    }
  }

  toggleSettings(): void {
    this.router.navigate([this.isSettings() ? '/bible' : '/settings']);
  }
}
