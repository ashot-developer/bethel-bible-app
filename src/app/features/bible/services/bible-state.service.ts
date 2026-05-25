import { Injectable, signal, computed, inject } from '@angular/core';
import { BibleDataService } from '../../../core/services/bible-data.service';
import type { BibleTranslation, BibleBook, BibleVerse, Bookmark } from '../../../core/models/bible.models';

type BookmarkLike = { translation: string; book_number: number; chapter: number; verse: number };

export type SidebarStep = 'books' | 'chapters' | 'verses';
export type ViewMode    = 'read' | 'search' | 'bookmarks';

@Injectable({ providedIn: 'root' })
export class BibleStateService {
  private bible = inject(BibleDataService);

  // ── Translation ────────────────────────────────────────────────────────────
  translations        = signal<BibleTranslation[]>([]);
  selectedTranslation = signal('WAB');

  // ── Navigation data ────────────────────────────────────────────────────────
  books    = signal<BibleBook[]>([]);
  chapters = signal<number[]>([]);
  verses   = signal<BibleVerse[]>([]);

  selectedBook    = signal<BibleBook | null>(null);
  selectedChapter = signal<number | null>(null);
  selectedVerse   = signal<number | null>(null);

  // ── View mode ──────────────────────────────────────────────────────────────
  mode = signal<ViewMode>('read');

  // ── Sidebar ────────────────────────────────────────────────────────────────
  sidebarOpen = signal(false);
  sidebarStep = signal<SidebarStep>('books');

  // ── Bookmarks ──────────────────────────────────────────────────────────────
  allBookmarks  = signal<Bookmark[]>([]);
  bookmarkedSet = signal<Set<string>>(new Set());

  // ── Bookmark dialog ────────────────────────────────────────────────────────
  showNoteDialog = signal(false);
  pendingNote    = signal('');
  pendingVerse   = signal<BibleVerse | null>(null);

  // ── Computed ───────────────────────────────────────────────────────────────
  currentRef = computed(() => {
    const b = this.selectedBook();
    const c = this.selectedChapter();
    const v = this.selectedVerse();
    if (!b) return 'Ընտրեք';
    if (!c) return b.short_name;
    if (!v) return `${b.short_name} ${c}`;
    return `${b.short_name} ${c}:${v}`;
  });

  // ── Init ───────────────────────────────────────────────────────────────────
  async init(): Promise<void> {
    const t = await this.bible.getTranslations();
    this.translations.set(t);
    if (t.length && !t.find(x => x.id === this.selectedTranslation())) {
      this.selectedTranslation.set(t[0].id);
    }
    await Promise.all([this._loadBooks(), this.loadBookmarks()]);

    // Pre-select first book → chapter 1 → verse 1 (no sidebar animation)
    const books = this.books();
    if (!books.length) return;
    const book = books[0];
    this.selectedBook.set(book);
    const chs = await this.bible.getChapters(this.selectedTranslation(), book.book_number);
    this.chapters.set(chs);
    if (!chs.length) return;
    this.selectedChapter.set(chs[0]);
    const vs = await this.bible.getVerses(this.selectedTranslation(), book.book_number, chs[0]);
    this.verses.set(vs);
    if (vs.length) this.selectedVerse.set(vs[0].verse);
  }

  // ── Translation change ─────────────────────────────────────────────────────
  async setTranslation(id: string): Promise<void> {
    this.selectedTranslation.set(id);
    this.selectedBook.set(null);
    this.selectedChapter.set(null);
    this.selectedVerse.set(null);
    this.chapters.set([]);
    this.verses.set([]);
    await Promise.all([this._loadBooks(), this.loadBookmarks()]);
    if (this.mode() === 'read') this.openSidebar();
  }

  private async _loadBooks(): Promise<void> {
    this.books.set(await this.bible.getBooks(this.selectedTranslation()));
  }

  // ── Chapter loading without sidebar step change ────────────────────────────
  private async _loadChapterData(bookNumber: number, ch: number): Promise<void> {
    this.selectedChapter.set(ch);
    this.selectedVerse.set(null);
    const vs = await this.bible.getVerses(this.selectedTranslation(), bookNumber, ch);
    this.verses.set(vs);
  }

  // ── Prev / Next chapter ────────────────────────────────────────────────────
  hasPrevChapter = computed(() => {
    const ch   = this.selectedChapter();
    const book = this.selectedBook();
    if (!ch || !book) return false;
    const chIdx   = this.chapters().indexOf(ch);
    const bookIdx = this.books().findIndex(b => b.book_number === book.book_number);
    return chIdx > 0 || bookIdx > 0;
  });

  hasNextChapter = computed(() => {
    const ch   = this.selectedChapter();
    const book = this.selectedBook();
    if (!ch || !book) return false;
    const chIdx   = this.chapters().indexOf(ch);
    const bookIdx = this.books().findIndex(b => b.book_number === book.book_number);
    return chIdx < this.chapters().length - 1 || bookIdx < this.books().length - 1;
  });

  async prevChapter(): Promise<void> {
    const ch   = this.selectedChapter();
    const book = this.selectedBook();
    if (!ch || !book) return;
    const chIdx = this.chapters().indexOf(ch);
    if (chIdx > 0) {
      await this._loadChapterData(book.book_number, this.chapters()[chIdx - 1]);
    } else {
      const bookIdx = this.books().findIndex(b => b.book_number === book.book_number);
      if (bookIdx <= 0) return;
      const prevBook = this.books()[bookIdx - 1];
      this.selectedBook.set(prevBook);
      const chs = await this.bible.getChapters(this.selectedTranslation(), prevBook.book_number);
      this.chapters.set(chs);
      if (chs.length) await this._loadChapterData(prevBook.book_number, chs[chs.length - 1]);
    }
  }

  async nextChapter(): Promise<void> {
    const ch   = this.selectedChapter();
    const book = this.selectedBook();
    if (!ch || !book) return;
    const chIdx = this.chapters().indexOf(ch);
    if (chIdx < this.chapters().length - 1) {
      await this._loadChapterData(book.book_number, this.chapters()[chIdx + 1]);
    } else {
      const bookIdx = this.books().findIndex(b => b.book_number === book.book_number);
      if (bookIdx >= this.books().length - 1) return;
      const nextBook = this.books()[bookIdx + 1];
      this.selectedBook.set(nextBook);
      const chs = await this.bible.getChapters(this.selectedTranslation(), nextBook.book_number);
      this.chapters.set(chs);
      if (chs.length) await this._loadChapterData(nextBook.book_number, chs[0]);
    }
  }

  // ── Sidebar navigation (with step animation) ───────────────────────────────
  openSidebar(): void {
    this.sidebarStep.set('books');
    this.sidebarOpen.set(true);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  goBack(): void {
    const s = this.sidebarStep();
    if (s === 'chapters') this.sidebarStep.set('books');
    else if (s === 'verses') this.sidebarStep.set('chapters');
  }

  async selectBook(book: BibleBook): Promise<void> {
    this.selectedBook.set(book);
    this.selectedChapter.set(null);
    this.selectedVerse.set(null);
    this.verses.set([]);
    const chs = await this.bible.getChapters(this.selectedTranslation(), book.book_number);
    this.chapters.set(chs);
    this.sidebarStep.set('chapters');
  }

  async selectChapter(ch: number): Promise<void> {
    this.selectedChapter.set(ch);
    this.selectedVerse.set(null);
    const vs = await this.bible.getVerses(
      this.selectedTranslation(), this.selectedBook()!.book_number, ch
    );
    this.verses.set(vs);
    this.sidebarStep.set('verses');
  }

  selectVerse(verse: number): void {
    this.selectedVerse.set(verse);
    this.sidebarOpen.set(false);
    this.mode.set('read');
  }

  // ── Open bookmark in reader — switches translation if needed, no sidebar ──
  async openBookmarkInReader(bm: BookmarkLike): Promise<void> {
    if (bm.translation !== this.selectedTranslation()) {
      this.selectedTranslation.set(bm.translation);
      await Promise.all([this._loadBooks(), this.loadBookmarks()]);
    }
    const book = this.books().find(b => b.book_number === bm.book_number);
    if (!book) return;
    this.selectedBook.set(book);
    const chs = await this.bible.getChapters(this.selectedTranslation(), book.book_number);
    this.chapters.set(chs);
    const vs = await this.bible.getVerses(this.selectedTranslation(), book.book_number, bm.chapter);
    this.verses.set(vs);
    this.selectedChapter.set(bm.chapter);
    this.selectedVerse.set(bm.verse);
    this.mode.set('read');
  }

  // ── Open verse from search (no sidebar) ───────────────────────────────────
  async openVerseInReader(v: BibleVerse): Promise<void> {
    const book = this.books().find(b => b.book_number === v.book_number);
    if (!book) return;
    this.selectedBook.set(book);
    this.selectedChapter.set(v.chapter);
    const chs = await this.bible.getChapters(this.selectedTranslation(), book.book_number);
    this.chapters.set(chs);
    const vs = await this.bible.getVerses(this.selectedTranslation(), book.book_number, v.chapter);
    this.verses.set(vs);
    this.selectedVerse.set(v.verse);
    this.mode.set('read');
  }

  // ── Bookmarks ──────────────────────────────────────────────────────────────
  async loadBookmarks(): Promise<void> {
    const bm = await this.bible.getBookmarks();
    this.allBookmarks.set(bm);
    this.bookmarkedSet.set(
      new Set(bm.map((b: Bookmark) => this.bmKey(b.translation, b.book_number, b.chapter, b.verse)))
    );
  }

  bmKey(tr: string, bn: number, ch: number, v: number): string {
    return `${tr}:${bn}:${ch}:${v}`;
  }

  isBookmarked(v: BibleVerse): boolean {
    return this.bookmarkedSet().has(
      this.bmKey(this.selectedTranslation(), v.book_number, v.chapter, v.verse)
    );
  }

  toggleBookmark(v: BibleVerse): void {
    const key = this.bmKey(this.selectedTranslation(), v.book_number, v.chapter, v.verse);
    if (this.bookmarkedSet().has(key)) {
      const bm = this.allBookmarks().find(b =>
        b.translation === this.selectedTranslation() &&
        b.book_number === v.book_number && b.chapter === v.chapter && b.verse === v.verse
      );
      if (bm?.id) this._doRemoveBookmark(bm.id);
    } else {
      this.pendingVerse.set(v);
      this.pendingNote.set('');
      this.showNoteDialog.set(true);
    }
  }

  async confirmBookmark(): Promise<void> {
    const v = this.pendingVerse();
    if (!v) return;
    await this.bible.addBookmark({
      translation: this.selectedTranslation(),
      book_number: v.book_number,
      chapter: v.chapter,
      verse: v.verse,
      text: v.text,
      book_name: v.book_name ?? this.selectedBook()?.long_name ?? '',
      note: this.pendingNote(),
    });
    this.showNoteDialog.set(false);
    this.pendingVerse.set(null);
    await this.loadBookmarks();
  }

  cancelBookmark(): void {
    this.showNoteDialog.set(false);
    this.pendingVerse.set(null);
  }

  private async _doRemoveBookmark(id: number): Promise<void> {
    await this.bible.removeBookmark(id);
    await this.loadBookmarks();
  }

  async removeBookmark(bm: Bookmark): Promise<void> {
    if (bm.id) await this._doRemoveBookmark(bm.id);
  }

  async search(query: string): Promise<BibleVerse[]> {
    return this.bible.search(this.selectedTranslation(), query);
  }

  formatVerse(v: BibleVerse): string {
    const book = v.book_name ?? this.selectedBook()?.long_name ?? '';
    return `${book} ${v.chapter}:${v.verse}\n${v.text}`;
  }
}
