import {
  Component, OnInit, signal, inject, ViewChild, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { MessageService } from 'primeng/api';
import { BibleDataService } from '../../core/services/bible-data.service';
import type { BibleTranslation, BibleBook, BibleVerse, Bookmark } from '../../core/models/bible.models';

type ViewMode = 'read' | 'search' | 'bookmarks';

@Component({
  selector: 'app-bible',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, DropdownModule, ToastModule, DialogModule, InputTextareaModule],
  providers: [MessageService],
  template: `
<p-toast />

<div class="bible-root">

  <!-- ── Top bar: Translation dropdown + mode buttons ── -->
  <div class="top-bar">
    <p-dropdown
      [options]="translations()"
      [(ngModel)]="selectedTranslation"
      optionLabel="name"
      optionValue="id"
      placeholder="Թարգմանություն"
      (ngModelChange)="setTranslation($event)"
      styleClass="trans-dropdown"
      appendTo="body"
    />
    <div class="spacer"></div>
    <button class="icon-btn" [class.active]="mode() === 'search'" (click)="toggleMode('search')" title="Որոնել">
      <i class="pi pi-search"></i>
    </button>
    <button class="icon-btn bm-btn" [class.active]="mode() === 'bookmarks'" (click)="toggleMode('bookmarks')" title="Էջանիշներ">
      <i class="pi pi-bookmark"></i>
      @if (allBookmarks().length > 0) {
        <span class="badge">{{ allBookmarks().length }}</span>
      }
    </button>
  </div>

  <!-- ══════════════════════ READ ══════════════════════ -->
  @if (mode() === 'read') {
    <div class="three-col">

      <!-- Books -->
      <div class="col col-books">
        <div class="col-head">Գրքեր</div>
        <div class="col-scroll">
          @for (book of books(); track book.book_number) {
            <div class="list-item" [class.active]="selectedBook()?.book_number === book.book_number"
                 (click)="selectBook(book)" [title]="book.long_name">
              {{ book.long_name }}
            </div>
          }
        </div>
      </div>

      <!-- Chapters -->
      <div class="col col-ch">
        <div class="col-head">Գլ.</div>
        <div class="col-scroll">
          @if (!selectedBook()) {
            <div class="col-placeholder">—</div>
          }
          @for (ch of chapters(); track ch) {
            <div class="ch-item" [class.active]="selectedChapter() === ch" (click)="selectChapter(ch)">
              {{ ch }}
            </div>
          }
        </div>
      </div>

      <!-- Verses -->
      <div class="col col-verses">
        <div class="col-head">
          @if (selectedBook() && selectedChapter()) {
            <span class="reading-title">{{ selectedBook()?.long_name }}&nbsp;{{ selectedChapter() }}</span>
            <span class="verse-count-badge">{{ verses().length }}&nbsp;հատ.</span>
          } @else {
            <span class="reading-hint">Ընտրեք գիրք</span>
          }
        </div>
        <div class="col-scroll" #versesEl>
          @if (!selectedBook()) {
            <div class="empty">
              <i class="pi pi-book"></i>
              <p>Ընտրեք գիրք կարդալու համար</p>
            </div>
          } @else if (!selectedChapter()) {
            <div class="empty">
              <i class="pi pi-list"></i>
              <p>Ընտրեք գլուխ</p>
            </div>
          }
          @for (v of verses(); track v.verse) {
            <div class="verse-row" [class.bm]="isBookmarked(v)" [attr.data-verse]="v.verse">
              <span class="vn">{{ v.verse }}</span>
              <span class="vt">{{ v.text }}</span>
              <div class="va">
                <button class="av" (click)="toggleBookmark(v)" [title]="isBookmarked(v) ? 'Հեռացնել' : 'Էջանիշ'">
                  <i [class]="isBookmarked(v) ? 'pi pi-bookmark-fill' : 'pi pi-bookmark'"
                     [style.color]="isBookmarked(v) ? 'var(--bethel-primary)' : ''"></i>
                </button>
                <button class="av" (click)="copyVerse(v)" title="Պատճենել">
                  <i class="pi pi-copy"></i>
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  }

  <!-- ══════════════════════ SEARCH ══════════════════════ -->
  @if (mode() === 'search') {
    <div class="panel-view">
      <div class="search-bar">
        <i class="pi pi-search si"></i>
        <input class="search-input" [(ngModel)]="searchQuery"
               placeholder="Որոնել Աստվածաշնչում..."
               (keydown.enter)="doSearch()" #searchEl />
        @if (searchQuery) {
          <button class="clear" (click)="searchQuery=''; searchResults.set([])">
            <i class="pi pi-times"></i>
          </button>
        }
        <button class="go-btn" (click)="doSearch()" [disabled]="searching()">Որոնել</button>
      </div>

      <div class="panel-scroll">
        @if (searching()) {
          <div class="empty"><i class="pi pi-spin pi-spinner"></i><p>Որոնում...</p></div>
        } @else if (!lastQuery()) {
          <div class="empty"><i class="pi pi-search"></i><p>Մուտքագրեք բառ</p></div>
        } @else if (searchResults().length === 0) {
          <div class="empty"><i class="pi pi-search"></i><p>Ոչ մի արդյունք «{{ lastQuery() }}»</p></div>
        }
        @if (searchResults().length > 0) {
          <div class="results-info">{{ searchResults().length }}&nbsp;արդյունք «{{ lastQuery() }}»-ի համար</div>
        }
        @for (v of searchResults(); track v.book_number+'-'+v.chapter+'-'+v.verse) {
          <div class="verse-row sr-row" (click)="openVerseInReader(v)" title="Բացել ընթերցում">
            <span class="vn ref">{{ v.book_name }}&nbsp;{{ v.chapter }}:{{ v.verse }}</span>
            <span class="vt" [innerHTML]="highlight(v.text, lastQuery())"></span>
            <div class="va">
              <button class="av" (click)="toggleBookmark(v)" [title]="isBookmarked(v) ? 'Հեռացնել' : 'Էջանիշ'">
                <i [class]="isBookmarked(v) ? 'pi pi-bookmark-fill' : 'pi pi-bookmark'"
                   [style.color]="isBookmarked(v) ? 'var(--bethel-primary)' : ''"></i>
              </button>
              <button class="av" (click)="copyVerse(v)" title="Պատճենել">
                <i class="pi pi-copy"></i>
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  }

  <!-- ══════════════════════ BOOKMARKS ══════════════════════ -->
  @if (mode() === 'bookmarks') {
    <div class="panel-view">
      <div class="panel-head">
        <i class="pi pi-bookmark-fill" style="color:var(--bethel-primary)"></i>
        Էջանիշներ&nbsp;({{ allBookmarks().length }})
      </div>
      <div class="panel-scroll">
        @if (allBookmarks().length === 0) {
          <div class="empty">
            <i class="pi pi-bookmark"></i>
            <p>Էջանիշ չկա</p>
            <p class="sub">Հատվածի կողքի կոճակով ավելացրեք</p>
          </div>
        }
        @for (bm of allBookmarks(); track bm.id) {
          <div class="verse-row">
            <span class="vn ref" style="color:var(--bethel-primary)">{{ bm.book_name }}&nbsp;{{ bm.chapter }}:{{ bm.verse }}</span>
            <div class="bm-body">
              <span class="vt">{{ bm.text }}</span>
              @if (bm.note) { <span class="bm-note">📝 {{ bm.note }}</span> }
              <span class="bm-tr">{{ bm.translation }}</span>
            </div>
            <div class="va" style="opacity:1">
              <button class="av" (click)="copyBookmark(bm)" title="Պատճենել"><i class="pi pi-copy"></i></button>
              <button class="av danger" (click)="removeBookmark(bm)" title="Ջնջել"><i class="pi pi-trash"></i></button>
            </div>
          </div>
        }
      </div>
    </div>
  }
</div>

<!-- Bookmark note dialog -->
<p-dialog [(visible)]="showNoteDialog" header="Ավելացնել Էջանիշ" [modal]="true" [style]="{width:'380px'}">
  <div class="flex flex-column gap-2 pt-2">
    <label class="text-sm font-semibold">Նշում (կամընտիր)</label>
    <textarea pInputTextarea [(ngModel)]="pendingNote" rows="3" class="w-full"
              placeholder="Անձնական նշում..."></textarea>
  </div>
  <ng-template pTemplate="footer">
    <p-button label="Չեղարկել" [text]="true" (onClick)="showNoteDialog=false" />
    <p-button label="Պահպանել" icon="pi pi-bookmark" (onClick)="confirmBookmark()" />
  </ng-template>
</p-dialog>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; overflow: hidden; min-height: 0; }

    .bible-root { display: flex; flex-direction: column; flex: 1; overflow: hidden; background: var(--surface-ground); }

    /* ── Top bar ── */
    .top-bar {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.45rem 0.85rem;
      border-bottom: 1px solid var(--surface-border);
      background: var(--surface-card);
      flex-shrink: 0;
    }
    ::ng-deep .trans-dropdown {
      .p-dropdown { border-radius: 8px; font-size: 0.85rem; }
      .p-dropdown-label { font-size: 0.85rem; padding: 0.35rem 0.65rem; }
    }
    .spacer { flex: 1; }
    .icon-btn {
      border: none;
      background: transparent;
      padding: 0.35rem 0.5rem;
      border-radius: 7px;
      cursor: pointer;
      color: var(--text-color-secondary);
      font-size: 0.95rem;
      position: relative;
      display: flex;
      align-items: center;
      transition: all 0.15s;
      font-family: inherit;
    }
    .icon-btn:hover { background: var(--surface-hover); color: var(--bethel-primary); }
    .icon-btn.active { color: var(--bethel-primary); background: rgba(245,166,35,0.12); }
    .badge {
      position: absolute;
      top: 1px; right: 1px;
      background: var(--bethel-accent);
      color: #fff;
      font-size: 0.58rem;
      width: 13px; height: 13px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; line-height: 1;
    }

    /* ── Three columns ── */
    .three-col { display: flex; flex: 1; overflow: hidden; min-height: 0; }
    .col { display: flex; flex-direction: column; overflow: hidden; min-height: 0; }
    .col-books { width: 200px; min-width: 200px; max-width: 200px; border-right: 1px solid var(--surface-border); }
    .col-ch    { width: 50px;  min-width: 50px;  max-width: 50px; border-right: 1px solid var(--surface-border); }
    .col-verses { flex: 1; min-width: 0; }

    .col-head {
      padding: 0 0.85rem;
      height: 34px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--surface-border);
      background: var(--surface-card);
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: var(--text-color-secondary);
      flex-shrink: 0;
    }
    .reading-title { font-size: 0.88rem; font-weight: 600; text-transform: none; letter-spacing: 0; color: var(--text-color); }
    .reading-hint  { font-size: 0.75rem; text-transform: none; letter-spacing: 0; opacity: 0.6; }
    .verse-count-badge { font-size: 0.68rem; opacity: 0.5; font-weight: 400; text-transform: none; letter-spacing: 0; }

    .col-scroll { flex: 1; overflow-y: auto; }

    .col-placeholder { text-align: center; padding: 1.5rem 0; color: var(--text-color-secondary); opacity: 0.25; font-size: 1.1rem; }

    .list-item {
      padding: 0.52rem 0.85rem;
      cursor: pointer;
      font-size: 0.845rem;
      color: var(--text-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: background 0.1s;
      border-left: 3px solid transparent;
    }
    .list-item:hover { background: var(--surface-hover); }
    .list-item.active { background: rgba(245,166,35,0.1); color: #c47d00; font-weight: 600; border-left-color: var(--bethel-primary); }

    /* Chapter column: override head padding to fit narrow width */
    .col-ch .col-head { padding: 0; justify-content: center; }

    .ch-item {
      padding: 0.48rem 0;
      text-align: center;
      cursor: pointer;
      font-size: 0.82rem;
      color: var(--text-color);
      transition: background 0.1s;
      border-left: 2px solid transparent;
    }
    .ch-item:hover { background: var(--surface-hover); }
    .ch-item.active { background: rgba(245,166,35,0.1); color: #c47d00; font-weight: 700; border-left-color: var(--bethel-primary); }

    /* ── Verse rows ── */
    .verse-row {
      display: flex;
      gap: 0.7rem;
      padding: 0.65rem 1rem;
      border-bottom: 1px solid var(--surface-border);
      align-items: flex-start;
      transition: background 0.1s;
    }
    .verse-row:hover { background: var(--surface-hover); }
    .verse-row:hover .va { opacity: 1; }
    .verse-row.bm { background: rgba(245,166,35,0.04); }

    .vn { min-width: 22px; font-size: 0.7rem; font-weight: 700; color: var(--bethel-primary); padding-top: 3px; flex-shrink: 0; }
    .vn.ref { min-width: 86px; white-space: nowrap; }
    .vt { flex: 1; line-height: 1.78; font-size: 0.97rem; color: var(--text-color); }
    .va { display: flex; gap: 0.1rem; opacity: 0; transition: opacity 0.15s; flex-shrink: 0; }

    .av {
      border: none;
      background: transparent;
      padding: 0.28rem;
      border-radius: 6px;
      cursor: pointer;
      color: var(--text-color-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.82rem;
      transition: all 0.15s;
      font-family: inherit;
    }
    .av:hover { background: var(--surface-hover); color: var(--bethel-primary); }
    .av.danger:hover { color: var(--bethel-accent); }

    /* ── Empty state ── */
    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3.5rem 1rem;
      color: var(--text-color-secondary);
      gap: 0.75rem;
      flex: 1;
    }
    .empty i { font-size: 2.2rem; opacity: 0.18; }
    .empty p { margin: 0; font-size: 0.88rem; }
    .empty .sub { font-size: 0.78rem; opacity: 0.65; }

    /* ── Search & Bookmarks panel ── */
    .panel-view { display: flex; flex-direction: column; flex: 1; overflow: hidden; min-height: 0; }
    .panel-head {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--surface-border);
      font-weight: 600;
      font-size: 0.9rem;
      flex-shrink: 0;
      background: var(--surface-card);
      color: var(--text-color);
    }
    .search-bar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.65rem 1rem;
      border-bottom: 1px solid var(--surface-border);
      background: var(--surface-card);
      flex-shrink: 0;
    }
    .si { color: var(--text-color-secondary); font-size: 0.95rem; }
    .search-input {
      flex: 1;
      border: none;
      outline: none;
      background: transparent;
      font-size: 0.97rem;
      color: var(--text-color);
      font-family: inherit;
    }
    .search-input::placeholder { color: var(--text-color-secondary); }
    .clear {
      border: none; background: transparent; cursor: pointer;
      color: var(--text-color-secondary); padding: 0.2rem; border-radius: 50%;
      display: flex; align-items: center; font-family: inherit;
    }
    .clear:hover { background: var(--surface-hover); }
    .go-btn {
      border: 1.5px solid var(--bethel-primary);
      background: var(--bethel-primary);
      color: #fff;
      border-radius: 8px;
      padding: 0.35rem 0.9rem;
      cursor: pointer;
      font-size: 0.845rem;
      font-family: inherit;
      font-weight: 600;
      transition: opacity 0.15s;
      white-space: nowrap;
    }
    .go-btn:hover { opacity: 0.88; }
    .go-btn:disabled { opacity: 0.45; cursor: default; }

    .panel-scroll { flex: 1; overflow-y: auto; display: flex; flex-direction: column; }
    .results-info {
      padding: 0.45rem 1rem;
      font-size: 0.75rem;
      color: var(--text-color-secondary);
      border-bottom: 1px solid var(--surface-border);
      flex-shrink: 0;
    }
    .sr-row { cursor: pointer; }
    .sr-row:hover .vn { color: var(--bethel-primary); }

    @keyframes verse-flash {
      0%   { background: rgba(245, 166, 35, 0.35); }
      100% { background: transparent; }
    }
    .verse-jump { animation: verse-flash 1.4s ease-out; }

    .bm-body { display: flex; flex-direction: column; flex: 1; }
    .bm-note { font-size: 0.78rem; color: var(--text-color-secondary); font-style: italic; margin-top: 0.2rem; }
    .bm-tr   { font-size: 0.7rem;  color: var(--text-color-secondary); margin-top: 0.15rem; opacity: 0.65; }
  `]
})
export class BibleComponent implements OnInit {
  private bible = inject(BibleDataService);
  private msgService = inject(MessageService);

  translations = signal<BibleTranslation[]>([]);
  books        = signal<BibleBook[]>([]);
  chapters     = signal<number[]>([]);
  verses       = signal<BibleVerse[]>([]);
  allBookmarks = signal<Bookmark[]>([]);
  bookmarkedSet = signal<Set<string>>(new Set());

  selectedTranslation = 'KJV';
  selectedBook    = signal<BibleBook | null>(null);
  selectedChapter = signal<number | null>(null);

  mode = signal<ViewMode>('read');

  searchQuery   = '';
  lastQuery     = signal('');
  searching     = signal(false);
  searchResults = signal<BibleVerse[]>([]);

  showNoteDialog = false;
  pendingNote    = '';
  pendingVerse: BibleVerse | null = null;

  @ViewChild('versesEl') versesEl?: ElementRef;

  async ngOnInit(): Promise<void> {
    const t = await this.bible.getTranslations();
    this.translations.set(t);
    if (t.length && !t.find(x => x.id === this.selectedTranslation)) {
      this.selectedTranslation = t[0].id;
    }
    await Promise.all([this.loadBooks(), this.loadBookmarks()]);
  }

  setTranslation(id: string): void {
    this.selectedTranslation = id;
    this.selectedBook.set(null);
    this.selectedChapter.set(null);
    this.chapters.set([]);
    this.verses.set([]);
    this.loadBooks();
    this.loadBookmarks();
  }

  toggleMode(m: ViewMode): void {
    this.mode.set(this.mode() === m ? 'read' : m);
  }

  private async loadBooks(): Promise<void> {
    const b = await this.bible.getBooks(this.selectedTranslation);
    this.books.set(b);
  }

  async selectBook(book: BibleBook): Promise<void> {
    this.selectedBook.set(book);
    this.selectedChapter.set(null);
    this.verses.set([]);
    const ch = await this.bible.getChapters(this.selectedTranslation, book.book_number);
    this.chapters.set(ch);
  }

  async selectChapter(ch: number): Promise<void> {
    this.selectedChapter.set(ch);
    const book = this.selectedBook();
    if (!book) return;
    const v = await this.bible.getVerses(this.selectedTranslation, book.book_number, ch);
    this.verses.set(v);
    setTimeout(() => this.versesEl?.nativeElement?.scrollTo(0, 0), 50);
  }

  async openVerseInReader(v: BibleVerse): Promise<void> {
    const book = this.books().find(b => b.book_number === v.book_number);
    if (!book) return;
    this.mode.set('read');
    await this.selectBook(book);
    await this.selectChapter(v.chapter);
    setTimeout(() => {
      const container = this.versesEl?.nativeElement as HTMLElement | undefined;
      if (!container) return;
      const target = container.querySelector(`[data-verse="${v.verse}"]`) as HTMLElement | null;
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('verse-jump');
      setTimeout(() => target.classList.remove('verse-jump'), 1400);
    }, 150);
  }

  async doSearch(): Promise<void> {
    if (!this.searchQuery.trim()) return;
    this.searching.set(true);
    this.lastQuery.set(this.searchQuery.trim());
    const r = await this.bible.search(this.selectedTranslation, this.searchQuery.trim());
    this.searchResults.set(r);
    this.searching.set(false);
  }

  private armenianHighlightVariants(q: string): string[] {
    const variants = new Set<string>([q]);
    variants.add(q.replace(/վ/g,'ւ').replace(/Վ/g,'Ւ').replace(/հ/g,'յ').replace(/Հ/g,'Յ'));
    variants.add(q.replace(/ւ/g,'վ').replace(/Ւ/g,'Վ').replace(/յ/g,'հ').replace(/Յ/g,'Հ'));
    return [...variants].filter(v => v.length > 0);
  }

  highlight(text: string, q: string): string {
    if (!q) return text;
    const parts = this.armenianHighlightVariants(q)
      .map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    try {
      // 'u' flag enables proper Unicode case folding so 'i' works for Armenian Հ/հ, Յ/յ etc.
      return text.replace(
        new RegExp(`(${parts.join('|')})`, 'giu'),
        '<mark style="background:#fff3cd;padding:0 1px;border-radius:2px">$1</mark>'
      );
    } catch {
      return text;
    }
  }

  private async loadBookmarks(): Promise<void> {
    const bm = await this.bible.getBookmarks();
    this.allBookmarks.set(bm);
    const set = new Set(bm.map((b: Bookmark) => this.bmKey(b.translation, b.book_number, b.chapter, b.verse)));
    this.bookmarkedSet.set(set);
  }

  private bmKey(tr: string, bn: number, ch: number, v: number): string {
    return `${tr}:${bn}:${ch}:${v}`;
  }

  isBookmarked(v: BibleVerse): boolean {
    return this.bookmarkedSet().has(this.bmKey(this.selectedTranslation, v.book_number, v.chapter, v.verse));
  }

  async toggleBookmark(v: BibleVerse): Promise<void> {
    const key = this.bmKey(this.selectedTranslation, v.book_number, v.chapter, v.verse);
    if (this.bookmarkedSet().has(key)) {
      const bm = this.allBookmarks().find(b =>
        b.translation === this.selectedTranslation && b.book_number === v.book_number &&
        b.chapter === v.chapter && b.verse === v.verse);
      if (bm?.id) {
        await this.bible.removeBookmark(bm.id);
        this.msgService.add({ severity: 'info', summary: 'Հեռացված', life: 2000 });
        await this.loadBookmarks();
      }
    } else {
      this.pendingVerse = v;
      this.pendingNote  = '';
      this.showNoteDialog = true;
    }
  }

  async confirmBookmark(): Promise<void> {
    const v = this.pendingVerse;
    if (!v) return;
    await this.bible.addBookmark({
      translation: this.selectedTranslation,
      book_number: v.book_number,
      chapter: v.chapter,
      verse: v.verse,
      text: v.text,
      book_name: v.book_name ?? this.selectedBook()?.long_name ?? '',
      note: this.pendingNote,
    });
    this.showNoteDialog = false;
    this.pendingVerse   = null;
    this.msgService.add({ severity: 'success', summary: 'Պահպանված', life: 2000 });
    await this.loadBookmarks();
  }

  async removeBookmark(bm: Bookmark): Promise<void> {
    if (bm.id) {
      await this.bible.removeBookmark(bm.id);
      await this.loadBookmarks();
      this.msgService.add({ severity: 'info', summary: 'Հեռացված', life: 2000 });
    }
  }

  copyVerse(v: BibleVerse): void {
    const book = v.book_name ?? this.selectedBook()?.long_name ?? '';
    navigator.clipboard.writeText(`${book} ${v.chapter}:${v.verse}\n${v.text}`)
      .then(() => this.msgService.add({ severity: 'success', summary: 'Պատճենված', life: 2000 }));
  }

  copyBookmark(bm: Bookmark): void {
    navigator.clipboard.writeText(`${bm.book_name} ${bm.chapter}:${bm.verse}\n${bm.text}`)
      .then(() => this.msgService.add({ severity: 'success', summary: 'Պատճենված', life: 2000 }));
  }
}
