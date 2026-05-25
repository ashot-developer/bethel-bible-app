import { Component, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { BibleStateService } from '../services/bible-state.service';
import type { BibleVerse } from '../../../core/models/bible.models';

@Component({
  selector: 'app-bible-search',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="search-wrap">
      <div class="search-bar">
        <i class="pi pi-search si"></i>
        <input class="search-input" [(ngModel)]="query"
               placeholder="Որոնել Աստվածաշնչում..."
               (input)="onInputChange()"
               (keydown.enter)="doSearch()" />
        @if (query) {
          <button class="clear-btn" (click)="clearSearch()">
            <i class="pi pi-times"></i>
          </button>
        }
        <button class="go-btn" (click)="doSearch()" [disabled]="searching()">Որոնել</button>
      </div>

      <div class="results-scroll">
        @if (searching()) {
          <div class="empty"><i class="pi pi-spin pi-spinner"></i><p>Որոնում...</p></div>
        } @else if (!lastQuery()) {
          <div class="empty"><i class="pi pi-search"></i><p>Մուտքագրեք բառ</p></div>
        } @else if (results().length === 0) {
          <div class="empty"><i class="pi pi-search"></i><p>Ոչ մի արդյունք «{{ lastQuery() }}»</p></div>
        } @else {
          <div class="results-info">{{ results().length }}&nbsp;արդյունք «{{ lastQuery() }}»-ի համար</div>
        }
        @if (!searching()) {
        @for (v of results(); track v.book_number+'-'+v.chapter+'-'+v.verse) {
          <div class="verse-row" (click)="open(v)" title="Բացել ընթերցում">
            <span class="vn ref">{{ v.book_name }}&nbsp;{{ v.chapter }}:{{ v.verse }}</span>
            <span class="vt" [innerHTML]="highlight(v.text, lastQuery())"></span>
            <div class="va">
              <button class="av" (click)="$event.stopPropagation(); st.toggleBookmark(v)"
                      [title]="st.isBookmarked(v) ? 'Հեռացնել' : 'Էջանիշ'">
                <i [class]="st.isBookmarked(v) ? 'pi pi-bookmark-fill' : 'pi pi-bookmark'"
                   [style.color]="st.isBookmarked(v) ? 'var(--bethel-primary)' : ''"></i>
              </button>
              <button class="av" (click)="$event.stopPropagation(); copy(v)" title="Պատճենել">
                <i class="pi pi-copy"></i>
              </button>
            </div>
          </div>
        }
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; overflow: hidden; }

    .search-wrap { display: flex; flex-direction: column; flex: 1; overflow: hidden; }

    .search-bar {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.65rem 1rem; border-bottom: 1px solid var(--surface-border);
      background: var(--surface-card); flex-shrink: 0;
    }
    .si { color: var(--text-color-secondary); font-size: 0.95rem; }
    .search-input {
      flex: 1; border: none; outline: none; background: transparent;
      font-size: 0.97rem; color: var(--text-color); font-family: inherit;
    }
    .search-input::placeholder { color: var(--text-color-secondary); }

    .clear-btn {
      border: none; background: transparent; cursor: pointer;
      color: var(--text-color-secondary); padding: 0.25rem; border-radius: 6px;
      display: flex; align-items: center; font-family: inherit; transition: all 0.15s;
    }
    .clear-btn:hover { background: var(--surface-hover); color: var(--bethel-primary); }

    .go-btn {
      border: 1.5px solid var(--bethel-primary); background: var(--bethel-primary);
      color: #fff; border-radius: 8px; padding: 0.35rem 0.9rem; cursor: pointer;
      font-size: 0.845rem; font-family: inherit; font-weight: 600;
      transition: opacity 0.15s; white-space: nowrap;
    }
    .go-btn:hover { opacity: 0.88; }
    .go-btn:disabled { opacity: 0.45; cursor: default; }

    .results-scroll { flex: 1; overflow-y: auto; display: flex; flex-direction: column; }

    .results-info {
      padding: 0.45rem 1rem; font-size: 0.75rem; color: var(--text-color-secondary);
      border-bottom: 1px solid var(--surface-border); flex-shrink: 0;
    }

    .empty {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 3.5rem 1rem;
      color: var(--text-color-secondary); gap: 0.75rem;
    }
    .empty i { font-size: 2.2rem; opacity: 0.18; }
    .empty p { margin: 0; font-size: 0.88rem; }

    .verse-row {
      display: flex; gap: 0.7rem; padding: 0.65rem 1rem;
      border-bottom: 1px solid var(--surface-border);
      align-items: flex-start; cursor: pointer; transition: background 0.1s;
    }
    .verse-row:hover { background: var(--surface-hover); }
    .verse-row:hover .va { opacity: 1; }

    .vn { min-width: 22px; font-size: 0.7rem; font-weight: 700; color: var(--bethel-primary); padding-top: 3px; flex-shrink: 0; }
    .vn.ref { min-width: 86px; white-space: nowrap; }
    .vt { flex: 1; line-height: 1.78; font-size: 0.97rem; color: var(--text-color); }
    .va { display: flex; gap: 0.1rem; opacity: 0; transition: opacity 0.15s; flex-shrink: 0; }

    .av {
      border: none; background: transparent; padding: 0.28rem; border-radius: 6px;
      cursor: pointer; color: var(--text-color-secondary);
      display: flex; align-items: center; font-size: 0.82rem; transition: all 0.15s; font-family: inherit;
    }
    .av:hover { background: var(--surface-hover); color: var(--bethel-primary); }
  `]
})
export class BibleSearchComponent {
  st       = inject(BibleStateService);
  private msg = inject(MessageService);

  query     = '';
  lastQuery = signal('');
  searching = signal(false);
  results   = signal<BibleVerse[]>([]);

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      this.st.selectedTranslation();
      if (this.lastQuery()) this.doSearch();
    }, { allowSignalWrites: true });
  }

  onInputChange(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (!this.query.trim()) { this.clearSearch(); return; }
    this.debounceTimer = setTimeout(() => this.doSearch(), 300);
  }

  clearSearch(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.query = '';
    this.lastQuery.set('');
    this.results.set([]);
  }

  async doSearch(): Promise<void> {
    if (!this.query.trim()) return;
    this.searching.set(true);
    this.lastQuery.set(this.query.trim());
    const r = await this.st.search(this.query.trim());
    this.results.set(r);
    this.searching.set(false);
  }

  async open(v: BibleVerse): Promise<void> {
    await this.st.openVerseInReader(v);
  }

  copy(v: BibleVerse): void {
    navigator.clipboard.writeText(this.st.formatVerse(v))
      .then(() => this.msg.add({ severity: 'success', summary: 'Պատճենված', life: 2000 }));
  }

  private armenianVariants(q: string): string[] {
    const VO   = 'ո'; // Armenian VO
    const YIWN = 'ւ'; // Armenian YIWN
    const U    = VO + YIWN;   // ου

    const s = new Set([q]);

    // Modern → Classical
    s.add(q
      .replace(/վ/g, 'ւ').replace(/Վ/g, 'Ւ')
      .replace(/հ/g, 'յ').replace(/Հ/g, 'Յ')
      .replace(/և/g, 'եւ')
      .replace(new RegExp(U, 'g'), VO)
    );

    // Classical → Modern
    s.add(q
      .replace(/ւ/g, 'վ').replace(/Ւ/g, 'Վ')
      .replace(/յ/g, 'հ').replace(/Յ/g, 'Հ')
      .replace(/եւ/g, 'և')
      .replace(new RegExp(`${VO}(?!${YIWN})`, 'g'), U)
    );

    return [...s].filter(v => v.length > 0);
  }

  highlight(text: string, q: string): string {
    if (!q) return text;
    const parts = this.armenianVariants(q).map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    try {
      return text.replace(
        new RegExp(`(${parts.join('|')})`, 'giu'),
        '<mark style="background:#fff3cd;padding:0 1px;border-radius:2px">$1</mark>'
      );
    } catch { return text; }
  }
}
