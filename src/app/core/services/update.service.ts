import { Injectable, signal, computed, inject } from '@angular/core';
import { ElectronService, UpdateStatus } from './electron.service';

@Injectable({ providedIn: 'root' })
export class UpdateService {
  private electron = inject(ElectronService);

  status = signal<UpdateStatus>({ state: 'idle' });
  hasUpdate = computed(() => this.status().state === 'available');

  constructor() {
    // Receive push events from main process (auto-check on startup)
    this.electron.on('update:status', (s: unknown) => {
      this.status.set(s as UpdateStatus);
    });
    // Load status cached from a previous auto-check (if settings page opens late)
    this.electron.updateApi?.getStatus().then(s => {
      if (s && s.state !== 'idle') this.status.set(s);
    });
  }

  async check(): Promise<void> {
    this.status.set({ state: 'checking', currentVersion: this.status().currentVersion });
    const result = await this.electron.updateApi?.check();
    if (result) this.status.set(result);
  }

  openDownload(): void {
    const s = this.status();
    const url = s.downloadUrl ?? s.releaseUrl;
    if (url) this.electron.updateApi?.openDownload(url);
  }
}
