import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'bible', pathMatch: 'full' },
  {
    path: 'bible',
    loadComponent: () => import('./features/bible/bible.component').then(m => m.BibleComponent),
  },
  { path: '**', redirectTo: 'bible' }
];
