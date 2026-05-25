import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToolbarComponent } from './layout/toolbar/toolbar.component';

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
export class AppComponent {}
