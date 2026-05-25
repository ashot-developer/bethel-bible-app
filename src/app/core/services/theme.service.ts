import { Injectable, signal } from '@angular/core';
import { ElectronService } from './electron.service';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  isDark = signal(false);

  constructor(private electron: ElectronService) {
    this.loadSavedTheme();
  }

  private async loadSavedTheme(): Promise<void> {
    try {
      const saved = await this.electron.themeApi?.get();
      if (saved === 'dark') this.applyDark(true);
    } catch {
      const localPref = localStorage.getItem('bethel-theme');
      if (localPref === 'dark') this.applyDark(true);
    }
  }

  toggle(): void {
    this.applyDark(!this.isDark());
  }

  private applyDark(dark: boolean): void {
    this.isDark.set(dark);
    document.body.classList.toggle('dark-mode', dark);
    const theme = dark ? 'dark' : 'light';
    localStorage.setItem('bethel-theme', theme);
    this.electron.themeApi?.set(theme).catch(() => {});
  }
}
