import { Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [ButtonModule, TooltipModule],
  template: `
    <div class="app-toolbar">
      <div class="toolbar-right">
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
    .toolbar-logo { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
  `]
})
export class ToolbarComponent {
  themeService = inject(ThemeService);
}
