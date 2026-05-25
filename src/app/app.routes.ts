import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'bible', pathMatch: 'full' },
  {
    path: 'bible',
    loadComponent: () => import('./features/bible/bible.component').then(m => m.BibleComponent),
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent),
  },
  { path: '**', redirectTo: 'bible' }
];
