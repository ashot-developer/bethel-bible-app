import { Routes } from '@angular/router';
import { MessageService } from 'primeng/api';

export const routes: Routes = [
  { path: '', redirectTo: 'bible', pathMatch: 'full' },
  {
    path: 'bible',
    loadComponent: () => import('./features/bible/bible.component').then(m => m.BibleComponent),
    providers: [MessageService],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/bible/verse-list/verse-list.component').then(m => m.VerseListComponent),
      },
      {
        path: 'search',
        loadComponent: () =>
          import('./features/bible/bible-search/bible-search.component').then(m => m.BibleSearchComponent),
      },
      {
        path: 'bookmarks',
        loadComponent: () =>
          import('./features/bible/bookmarks/bookmarks.component').then(m => m.BookmarksComponent),
      },
      { path: '**', redirectTo: '' },
    ],
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/settings.component').then(m => m.SettingsComponent),
  },
  { path: '**', redirectTo: 'bible' },
];
