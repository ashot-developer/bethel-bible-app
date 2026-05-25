import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { UpdateService } from '../../core/services/update.service';
import { ThemeService } from '../../core/services/theme.service';
import { ElectronService } from '../../core/services/electron.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  template: `
<div class="settings-root">
  <div class="settings-inner">

    <!-- App info -->
    <div class="settings-card">
      <div class="card-header">
        <i class="pi pi-info-circle"></i>
        Ծրագրի մասին
      </div>
      <div class="info-row">
        <span class="info-label">Ծրագիր</span>
        <span class="info-value">Bethel Mrgashat Bible</span>
      </div>
      <div class="info-row">
        <span class="info-label">Տարբերակ</span>
        <span class="info-value version-badge">v{{ appVersion() }}</span>
      </div>
    </div>

    <!-- Theme -->
    <div class="settings-card">
      <div class="card-header">
        <i class="pi pi-palette"></i>
        Ձևավորում
      </div>
      <div class="theme-row">
        <div class="theme-info">
          <span class="info-label">Թեմա</span>
          <span class="info-value">{{ themeService.isDark() ? 'Մուգ' : 'Բաց' }}</span>
        </div>
        <button class="theme-toggle-btn" (click)="themeService.toggle()">
          <i [class]="themeService.isDark() ? 'pi pi-sun' : 'pi pi-moon'"></i>
          {{ themeService.isDark() ? 'Բաց թեմա' : 'Մուգ թեմա' }}
        </button>
      </div>
    </div>

    <!-- Updates -->
    <div class="settings-card">
      <div class="card-header">
        <i class="pi pi-refresh"></i>
        Թարմացումներ
      </div>

      <!-- Status display -->
      <div class="update-status-row">
        @switch (updateService.status().state) {
          @case ('idle') {
            <div class="status-pill neutral"><i class="pi pi-minus-circle"></i> Չի ստուգվել</div>
          }
          @case ('checking') {
            <div class="status-pill checking"><i class="pi pi-spin pi-spinner"></i> Ստուգում...</div>
          }
          @case ('not-available') {
            <div class="status-pill ok"><i class="pi pi-check-circle"></i> Արդի է — v{{ updateService.status().latestVersion ?? updateService.status().currentVersion }}</div>
          }
          @case ('available') {
            <div class="status-pill update">
              <i class="pi pi-arrow-circle-up"></i>
              Հասանելի է v{{ updateService.status().latestVersion }}
            </div>
          }
          @case ('error') {
            <div class="status-pill error"><i class="pi pi-exclamation-triangle"></i> Կապի սխալ</div>
          }
        }
      </div>

      <!-- Actions -->
      <div class="update-actions">
        <button class="action-btn"
                (click)="checkUpdate()"
                [disabled]="updateService.status().state === 'checking'">
          <i class="pi pi-refresh"></i>
          Ստուգել թարմացումները
        </button>

        @if (updateService.status().state === 'available') {
          <button class="action-btn primary" (click)="updateService.openDownload()">
            <i class="pi pi-download"></i>
            {{ updateService.status().downloadUrl ? 'Ներբեռնել' : 'Բացել GitHub' }}
          </button>
        }
      </div>

      @if (updateService.status().state === 'available' && updateService.status().releaseNotes) {
        <div class="release-notes">
          <div class="release-notes-label">Փոփոխություններ</div>
          <div class="release-notes-text">{{ updateService.status().releaseNotes }}</div>
        </div>
      }
    </div>

  </div>
</div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; overflow: hidden; }

    .settings-root {
      flex: 1;
      overflow-y: auto;
      background: var(--surface-ground);
      padding: 2rem 1.5rem;
    }

    .settings-inner {
      max-width: 560px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .settings-card {
      background: var(--surface-card);
      border: 1px solid var(--surface-border);
      border-radius: 12px;
      overflow: hidden;
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.8rem 1.1rem;
      border-bottom: 1px solid var(--surface-border);
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: var(--text-color-secondary);
    }

    .info-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1.1rem;
      border-bottom: 1px solid var(--surface-border);
    }
    .info-row:last-child { border-bottom: none; }

    .info-label {
      font-size: 0.88rem;
      color: var(--text-color-secondary);
    }

    .info-value {
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--text-color);
    }

    .version-badge {
      background: rgba(245,166,35,0.12);
      color: var(--bethel-primary);
      padding: 0.15rem 0.55rem;
      border-radius: 20px;
      font-size: 0.82rem;
      font-weight: 700;
    }

    /* Theme row */
    .theme-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1.1rem;
    }
    .theme-info { display: flex; flex-direction: column; gap: 0.1rem; }

    .theme-toggle-btn {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.4rem 0.9rem;
      border: 1.5px solid var(--surface-border);
      background: var(--surface-ground);
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.84rem;
      color: var(--text-color);
      font-family: inherit;
      transition: all 0.15s;
    }
    .theme-toggle-btn:hover {
      border-color: var(--bethel-primary);
      color: var(--bethel-primary);
    }

    /* Update section */
    .update-status-row {
      padding: 0.85rem 1.1rem;
      border-bottom: 1px solid var(--surface-border);
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.35rem 0.75rem;
      border-radius: 20px;
      font-size: 0.83rem;
      font-weight: 600;
    }
    .status-pill.neutral  { background: var(--surface-ground); color: var(--text-color-secondary); }
    .status-pill.checking { background: rgba(59,130,246,0.1); color: #3b82f6; }
    .status-pill.ok       { background: rgba(34,197,94,0.1); color: #16a34a; }
    .status-pill.update   { background: rgba(245,166,35,0.12); color: var(--bethel-primary); }
    .status-pill.error    { background: rgba(208,2,27,0.08); color: var(--bethel-accent); }

    .update-actions {
      display: flex;
      gap: 0.65rem;
      padding: 0.85rem 1.1rem;
    }

    .action-btn {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.45rem 1rem;
      border: 1.5px solid var(--surface-border);
      background: var(--surface-ground);
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.84rem;
      font-weight: 600;
      color: var(--text-color);
      font-family: inherit;
      transition: all 0.15s;
    }
    .action-btn:hover:not(:disabled) {
      border-color: var(--bethel-primary);
      color: var(--bethel-primary);
    }
    .action-btn:disabled { opacity: 0.45; cursor: default; }
    .action-btn.primary {
      background: var(--bethel-primary);
      border-color: var(--bethel-primary);
      color: #fff;
    }
    .action-btn.primary:hover { opacity: 0.88; }

    .release-notes {
      margin: 0 1.1rem 0.85rem;
      padding: 0.75rem;
      background: var(--surface-ground);
      border-radius: 8px;
      border: 1px solid var(--surface-border);
    }
    .release-notes-label {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-color-secondary);
      margin-bottom: 0.4rem;
    }
    .release-notes-text {
      font-size: 0.84rem;
      color: var(--text-color);
      line-height: 1.6;
      white-space: pre-wrap;
    }
  `]
})
export class SettingsComponent implements OnInit {
  updateService = inject(UpdateService);
  themeService  = inject(ThemeService);
  private electron = inject(ElectronService);

  appVersion = signal('...');

  async ngOnInit(): Promise<void> {
    const v = await this.electron.appApi?.getVersion();
    if (v) this.appVersion.set(v);
  }

  async checkUpdate(): Promise<void> {
    await this.updateService.check();
  }
}
