import { Component, inject } from '@angular/core';
import { BibleStateService } from '../services/bible-state.service';

@Component({
  selector: 'app-book-list',
  standalone: true,
  template: `
    <div class="panel">
      <div class="panel-hd">
        <span class="panel-title">Ընտրեք Գիրք</span>
        <button class="icon-btn" (click)="st.closeSidebar()" title="Փակել">
          <i class="pi pi-times"></i>
        </button>
      </div>
      <div class="panel-scroll">
        <div class="books-grid">
          @for (book of st.books(); track book.book_number) {
            <button class="book-btn"
                    [class.active]="st.selectedBook()?.book_number === book.book_number"
                    (click)="st.selectBook(book)"
                    [title]="book.long_name">
              {{ book.short_name }}
            </button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: contents; }

    .panel { display: flex; flex-direction: column; height: 100%; }

    .panel-hd {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 0.75rem;
      height: 40px;
      border-bottom: 1px solid var(--surface-border);
      flex-shrink: 0;
    }
    .panel-title { font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-color-secondary); }

    .icon-btn {
      border: none; background: transparent; padding: 0.3rem; border-radius: 6px;
      cursor: pointer; color: var(--text-color-secondary); font-size: 0.85rem;
      display: flex; align-items: center; transition: all 0.15s; font-family: inherit;
    }
    .icon-btn:hover { background: var(--surface-hover); color: var(--bethel-primary); }

    .panel-scroll { flex: 1; overflow-y: auto; padding: 0.6rem; }

    .books-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }

    .book-btn {
      border: 1px solid var(--surface-border);
      background: var(--surface-ground);
      border-radius: 7px;
      padding: 0.42rem 0.25rem;
      cursor: pointer;
      font-size: 0.76rem;
      font-weight: 600;
      color: var(--text-color);
      font-family: inherit;
      text-align: center;
      transition: all 0.12s;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .book-btn:hover { border-color: var(--bethel-primary); color: var(--bethel-primary); background: rgba(245,166,35,0.06); }
    .book-btn.active { background: rgba(245,166,35,0.12); border-color: var(--bethel-primary); color: #c47d00; font-weight: 700; }
  `]
})
export class BookListComponent {
  st = inject(BibleStateService);
}
