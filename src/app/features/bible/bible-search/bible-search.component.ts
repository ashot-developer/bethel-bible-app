import { Component, inject, signal, effect, OnInit } from '@angular/core';
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
      <div class="search-bar-wrap">
        <div class="search-bar">
          <i class="pi pi-search si"></i>
          <div class="input-wrap">
            <input #searchInput class="search-input" [(ngModel)]="query"
                   placeholder="Որոնել Աստվածաշնչում..."
                   (input)="onInputChange()"
                   (keydown.enter)="doSearch(); hideSuggestions()"
                   (keydown.arrowdown)="moveSuggestion(1)"
                   (keydown.arrowup)="moveSuggestion(-1)"
                   (keydown.escape)="hideSuggestions()"
                   (focus)="onFocus()"
                   (blur)="onBlur()" />
            @if (query) {
              <button class="clear-btn" (click)="clearSearch()">
                <i class="pi pi-times"></i>
              </button>
            }
          </div>
          <button class="go-btn" (click)="doSearch(); hideSuggestions()" [disabled]="searching()">Որոնել</button>
        </div>

        @if (suggestions().length > 0 && showSuggestions()) {
          <div class="suggestions">
            @for (s of suggestions(); track s.word; let i = $index) {
              <div class="suggestion-item"
                   [class.active]="i === activeSuggestion()"
                   (mousedown)="pickSuggestion(s.word)">
                <span class="s-word">{{ s.word }}</span>
                <span class="s-count">{{ s.count > SEARCH_LIMIT ? SEARCH_LIMIT + '+' : s.count }} հատ.</span>
              </div>
            }
          </div>
        }
      </div>

      <div class="results-scroll">
        @if (searching()) {
          <div class="empty"><i class="pi pi-spin pi-spinner"></i><p>Որոնում...</p></div>
        } @else if (!lastQuery()) {
          <div class="empty"><i class="pi pi-search"></i><p>Մուտքագրեք բառ</p></div>
        } @else if (results().length === 0) {
          <div class="empty"><i class="pi pi-search"></i><p>Ոչ մի արդյունք «{{ lastQuery() }}»</p></div>
        } @else {
          <div class="results-info">
            {{ results().length >= SEARCH_LIMIT ? SEARCH_LIMIT + '+' : results().length }}&nbsp;արդյունք «{{ lastQuery() }}»-ի համար
          </div>
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
              <button class="av" (click)="$event.stopPropagation(); openCompare(v)" title="Բոլոր թարգմանությունները">
                <i class="pi pi-language"></i>
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

    <!-- ── Compare translations popup ── -->
    @if (compareOpen()) {
      <div class="cmp-backdrop" (click)="compareOpen.set(false)">
        <div class="cmp-panel" (click)="$event.stopPropagation()">
          <div class="cmp-header">
            <span class="cmp-title">{{ compareRef() }}</span>
            <button class="cmp-close" (click)="compareOpen.set(false)"><i class="pi pi-times"></i></button>
          </div>
          <div class="cmp-body">
            @if (compareLoading()) {
              <div class="cmp-spinner"><i class="pi pi-spin pi-spinner"></i></div>
            } @else {
              @for (item of compareResults(); track item.translation.id) {
                <div class="cmp-item" [class.cmp-current]="item.translation.id === st.selectedTranslation()">
                  <div class="cmp-tname">{{ item.translation.name }}</div>
                  <div class="cmp-text">{{ item.text }}</div>
                </div>
              }
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; overflow: hidden; }

    .search-wrap { display: flex; flex-direction: column; flex: 1; overflow: hidden; }

    .search-bar-wrap {
      position: relative; flex-shrink: 0;
      border-bottom: 1px solid var(--surface-border);
    }

    .search-bar {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.65rem 1rem;
      background: var(--surface-card);
    }

    .suggestions {
      position: absolute; top: 100%; left: 0; right: 0; z-index: 100;
      background: var(--surface-card);
      border: 1px solid var(--surface-border);
      border-top: none;
      border-radius: 0 0 10px 10px;
      box-shadow: 0 6px 20px rgba(0,0,0,0.10);
      max-height: 260px;
      overflow-y: auto;
    }

    .suggestion-item {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.55rem 1rem; cursor: pointer;
      transition: background 0.1s;
    }
    .suggestion-item:hover,
    .suggestion-item.active { background: var(--surface-hover); }

    .s-word {
      font-size: 0.9rem; color: var(--text-color); font-weight: 500;
    }
    .s-count {
      font-size: 0.75rem; color: var(--text-color-secondary);
      background: var(--surface-ground); border-radius: 10px;
      padding: 0.1rem 0.5rem; font-weight: 600;
    }
    .suggestion-item.active .s-count,
    .suggestion-item:hover .s-count {
      background: rgba(245,166,35,0.12); color: var(--bethel-primary);
    }
    .si { color: var(--text-color-secondary); font-size: 0.95rem; }

    .input-wrap {
      flex: 1; position: relative; display: flex; align-items: center; min-width: 0;
    }
    .search-input {
      width: 100%; border: none; outline: none; background: transparent;
      font-size: 0.97rem; color: var(--text-color); font-family: inherit;
      padding-right: 1.6rem;
    }
    .search-input::placeholder { color: var(--text-color-secondary); }

    .clear-btn {
      position: absolute; right: 0; top: 50%; transform: translateY(-50%);
      border: none; background: transparent; cursor: pointer;
      color: var(--text-color-secondary); padding: 0.2rem; border-radius: 6px;
      display: flex; align-items: center; font-family: inherit; transition: all 0.15s;
      line-height: 1;
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
    .vn.ref { min-width: 165px; white-space: nowrap; }
    .vt { flex: 1; line-height: 1.78; font-size: 0.97rem; color: var(--text-color); min-width: 0; }
    .va { display: flex; gap: 0.1rem; opacity: 0; transition: opacity 0.15s; flex-shrink: 0; }
    @media (max-width: 576px) {
      .search-bar { gap: 2px; }
      .verse-row { flex-wrap: wrap; }
      .vn.ref { flex: 1; min-width: unset; order: 1; }
      .va     { order: 2; opacity: 1; }
      .vt     { order: 3; flex-basis: 100%; }
    }

    .av {
      border: none; background: transparent; padding: 0.28rem; border-radius: 6px;
      cursor: pointer; color: var(--text-color-secondary);
      display: flex; align-items: center; font-size: 0.82rem; transition: all 0.15s; font-family: inherit;
    }
    .av:hover { background: var(--surface-hover); color: var(--bethel-primary); }

    .cmp-backdrop {
      position: fixed; inset: 0; z-index: 200;
      background: rgba(0,0,0,0.35);
      display: flex; align-items: center; justify-content: center;
      padding: 1.5rem;
    }
    .cmp-panel {
      background: var(--surface-card); border-radius: 14px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.22);
      width: 100%; max-width: 520px; max-height: 80vh;
      display: flex; flex-direction: column; overflow: hidden;
    }
    .cmp-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.9rem 1.1rem 0.7rem;
      border-bottom: 1px solid var(--surface-border); flex-shrink: 0;
    }
    .cmp-title { font-size: 0.95rem; font-weight: 700; color: var(--text-color); }
    .cmp-close {
      border: none; background: transparent; cursor: pointer;
      color: var(--text-color-secondary); padding: 0.25rem; border-radius: 6px;
      display: flex; align-items: center; font-size: 0.9rem; transition: all 0.15s; font-family: inherit;
    }
    .cmp-close:hover { background: var(--surface-hover); color: var(--bethel-primary); }
    .cmp-body { overflow-y: auto; padding: 0.5rem 0; }
    .cmp-spinner { display: flex; justify-content: center; padding: 2.5rem; color: var(--text-color-secondary); font-size: 1.4rem; }
    .cmp-item { padding: 0.75rem 1.1rem; border-bottom: 1px solid var(--surface-border); }
    .cmp-item:last-child { border-bottom: none; }
    .cmp-item.cmp-current { background: rgba(245,166,35,0.05); }
    .cmp-tname { font-size: 0.72rem; font-weight: 700; color: var(--bethel-primary); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.3rem; }
    .cmp-item.cmp-current .cmp-tname::after { content: ' ✓'; }
    .cmp-text { font-size: 0.95rem; line-height: 1.7; color: var(--text-color); }
  `]
})
export class BibleSearchComponent implements OnInit {
  st          = inject(BibleStateService);
  private msg = inject(MessageService);

  compareOpen    = signal(false);
  compareLoading = signal(false);
  compareRef     = signal('');
  compareResults = signal<{ translation: { id: string; name: string }; text: string }[]>([]);

  readonly SEARCH_LIMIT = 200;

  query            = '';
  searching        = signal(false);
  suggestions      = signal<{ word: string; count: number }[]>([]);
  showSuggestions  = signal(false);
  activeSuggestion = signal(-1);

  // persisted in BibleStateService
  get results()   { return this.st.searchResults; }
  get lastQuery() { return this.st.searchLastQuery; }

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private suggestTimer: ReturnType<typeof setTimeout> | null = null;
  private suggestGen = 0;

  constructor() {
    effect(() => {
      this.st.selectedTranslation();
      if (this.lastQuery()) this.doSearch();
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.query = this.st.searchQuery();
  }

  onInputChange(): void {
    this.st.searchQuery.set(this.query);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.suggestTimer) clearTimeout(this.suggestTimer);
    if (!this.query.trim()) { this.clearSearch(); return; }
    this.activeSuggestion.set(-1);
    this.suggestTimer  = setTimeout(() => this.loadSuggestions(), 200);
    this.debounceTimer = setTimeout(() => this.doSearch(), 400);
  }

  onFocus(): void {
    if (this.suggestions().length) this.showSuggestions.set(true);
  }

  onBlur(): void {
    setTimeout(() => this.showSuggestions.set(false), 150);
  }

  hideSuggestions(): void {
    this.showSuggestions.set(false);
    this.activeSuggestion.set(-1);
  }

  moveSuggestion(dir: 1 | -1): void {
    const max = this.suggestions().length - 1;
    const cur = this.activeSuggestion();
    const next = Math.max(-1, Math.min(max, cur + dir));
    this.activeSuggestion.set(next);
    if (next >= 0) {
      this.query = this.suggestions()[next].word;
      this.st.searchQuery.set(this.query);
    }
  }

  pickSuggestion(word: string): void {
    this.query = word;
    this.st.searchQuery.set(word);
    this.hideSuggestions();
    this.doSearch();
  }

  private async loadSuggestions(): Promise<void> {
    if (this.query.trim().length < 2) { this.suggestions.set([]); return; }
    const gen = ++this.suggestGen;
    const s = await this.st.suggest(this.query.trim());
    if (gen !== this.suggestGen) return; // stale response — a newer call is in flight
    this.suggestions.set(s);
    this.showSuggestions.set(s.length > 0);
  }

  clearSearch(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.suggestTimer)  clearTimeout(this.suggestTimer);
    this.query = '';
    this.st.searchQuery.set('');
    this.st.searchLastQuery.set('');
    this.st.searchResults.set([]);
    this.suggestions.set([]);
    this.showSuggestions.set(false);
  }

  async doSearch(): Promise<void> {
    if (!this.query.trim()) return;
    this.searching.set(true);
    this.st.searchLastQuery.set(this.query.trim());
    const r = await this.st.search(this.query.trim());
    this.st.searchResults.set(r);
    this.searching.set(false);
  }

  async open(v: BibleVerse): Promise<void> {
    await this.st.openVerseInReader(v);
  }

  async openCompare(v: BibleVerse): Promise<void> {
    const book = v.book_name ?? '';
    this.compareRef.set(`${book} ${v.chapter}:${v.verse}`);
    this.compareResults.set([]);
    this.compareLoading.set(true);
    this.compareOpen.set(true);
    const results = await this.st.getVerseAcrossTranslations(v.book_number, v.chapter, v.verse);
    this.compareResults.set(results);
    this.compareLoading.set(false);
  }

  copy(v: BibleVerse): void {
    navigator.clipboard.writeText(this.st.formatVerse(v))
      .then(() => this.msg.add({ severity: 'success', summary: 'Պատճենված', life: 2000 }));
  }

  private armenianVariants(q: string): string[] {
    const VO   = '\u0578';
    const YIWN = '\u0582';
    const U    = VO + YIWN;

    const subs: [RegExp, string][] = [
      [/\u057e/g, '\u0582'], [/\u0582/g, '\u057e'],
      [/\u054e/g, '\u0552'], [/\u0552/g, '\u054e'],
      [/\u0570/g, '\u0575'], [/\u0575/g, '\u0570'],
      [/\u0540/g, '\u0545'], [/\u0545/g, '\u0540'],
      [/\u0567/g, '\u0565'], [/\u0565/g, '\u0567'],
      [/\u0537/g, '\u0535'], [/\u0535/g, '\u0537'],
      [/\u0587/g, '\u0565\u0582'], [/\u0565\u0582/g, '\u0587'],
      [new RegExp(U, 'g'), VO],
      [new RegExp(`${VO}(?!${YIWN})`, 'g'), U],
    ];

    const variants = new Set<string>([q]);
    for (const [find, rep] of subs) {
      for (const v of [...variants]) {
        const n = v.replace(find, rep);
        if (n !== v) variants.add(n);
      }
    }
    return [...variants].filter(v => v.length > 0);
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
