import { Component, inject, effect, computed, signal, untracked, ViewChild, ElementRef } from '@angular/core';
import { MessageService } from 'primeng/api';
import { BibleStateService } from '../services/bible-state.service';
import type { BibleVerse } from '../../../core/models/bible.models';

@Component({
  selector: 'app-verse-list',
  standalone: true,
  template: `
    <div class="verse-scroll" #scrollEl>
      @if (!st.selectedBook()) {
        <div class="empty">
          <i class="pi pi-book"></i>
          <p>Ընտրեք գիրք կարդալու համար</p>
        </div>
      } @else if (!st.selectedChapter()) {
        <div class="empty">
          <i class="pi pi-list"></i>
          <p>Ընտրեք գլուխ</p>
        </div>
      }

      @for (v of st.verses(); track v.verse) {
        <div class="verse-row"
             [class.multi-sel]="isSelected(v.verse)"
             [class.bm]="st.isBookmarked(v)"
             [attr.data-verse]="v.verse"
             (click)="onVerseClick($event, v.verse)"
             (touchstart)="onTouchStart($event)"
             (touchend)="onTouchEnd($event, v.verse)">
          <span class="vn" [class.vn-checked]="isSelected(v.verse)">
            @if (isSelected(v.verse)) {
              <i class="pi pi-check"></i>
            } @else {
              {{ v.verse }}
            }
          </span>
          <span class="vt">{{ v.text }}</span>
          @if (selectionCount() === 0) {
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
          }
        </div>
      }
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

    <!-- ── Multi-select action bar ── -->
    @if (selectionCount() > 0) {
      <div class="sel-bar">
        <span class="sel-count">{{ selectionCount() }} հատված</span>
        <div class="sel-actions">
          <button class="sel-btn" (click)="bookmarkSelected()" title="Էջանիշ">
            <i class="pi pi-bookmark"></i>
          </button>
          <button class="sel-btn" (click)="compareSelected()" title="Բոլոր թարգ.">
            <i class="pi pi-language"></i>
          </button>
          <button class="sel-btn primary" (click)="copySelected()">
            <i class="pi pi-copy"></i> Պատճենել
          </button>
          <button class="sel-btn" (click)="clearSelection()" title="Մաքրել">
            <i class="pi pi-times"></i>
          </button>
        </div>
      </div>
    }

    <!-- ── Chapter navigation ── -->
    @if (st.selectedChapter()) {
      <div class="ch-nav">
        <button class="nav-btn" (click)="st.prevChapter()" [disabled]="!st.hasPrevChapter()">
          <i class="pi pi-chevron-left"></i>
          <span>Նախ. գլ.</span>
        </button>
        <span class="nav-ref">{{ st.selectedBook()?.short_name }}&nbsp;{{ st.selectedChapter() }}</span>
        <button class="nav-btn" (click)="st.nextChapter()" [disabled]="!st.hasNextChapter()">
          <span>Հաջ. գլ.</span>
          <i class="pi pi-chevron-right"></i>
        </button>
      </div>
    }
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; overflow: hidden; }

    .verse-scroll { flex: 1; overflow-y: auto; position: relative; outline: none; -webkit-overflow-scrolling: touch; }

    .empty {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 4rem 1rem;
      color: var(--text-color-secondary); gap: 0.75rem;
    }
    .empty i { font-size: 2.2rem; opacity: 0.18; }
    .empty p { margin: 0; font-size: 0.88rem; }

    .verse-row {
      display: flex; gap: 0.7rem; padding: 0.65rem 1.1rem;
      align-items: flex-start; transition: background 0.1s; cursor: pointer;
      touch-action: manipulation; -webkit-tap-highlight-color: transparent;
      position: relative;
      user-select: none; -webkit-user-select: none;
    }
    .verse-row::after {
      content: ''; position: absolute; bottom: 0; left: 0; right: 0;
      height: 1px; background: var(--surface-border); pointer-events: none;
    }
    .verse-row:active, .verse-row:focus { outline: none; box-shadow: none; }
    .verse-row:hover { background: var(--surface-hover); }
    .verse-row:hover .va { opacity: 1; }
    .verse-row.bm { background: rgba(245,166,35,0.04); }
    .verse-row.selected { background: rgba(245,166,35,0.08); }
    .verse-row.multi-sel { background: rgba(245,166,35,0.13); }
    .verse-row.multi-sel::after { background: rgba(245,166,35,0.2); }
    .verse-row.multi-sel:hover { background: rgba(245,166,35,0.18); }
    .verse-row.multi-sel .va { opacity: 1; }

    .vn {
      width: 20px; min-width: 20px; height: 20px; font-size: 0.7rem; font-weight: 700;
      color: var(--bethel-primary); flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; touch-action: manipulation;
    }
    .vn.vn-checked {
      background: var(--bethel-primary); color: #fff;
      border-radius: 50%; width: 20px; height: 20px; min-width: 20px;
      font-size: 0.65rem; padding: 0; align-items: center; margin-top: 2px;
    }
    .vn.vn-checked i { font-size: 12px; }
    .vt { flex: 1; line-height: 1.78; font-size: 0.97rem; color: var(--text-color); }
    .va { display: flex; gap: 0.1rem; opacity: 0; transition: opacity 0.15s; flex-shrink: 0; }
    @media (max-width: 576px), (hover: none) { .va { opacity: 1; } }

    .av {
      border: none; background: transparent; padding: 0.28rem; border-radius: 6px;
      cursor: pointer; color: var(--text-color-secondary);
      display: flex; align-items: center; font-size: 0.82rem; transition: all 0.15s; font-family: inherit;
      touch-action: manipulation;
    }
    .av:hover { background: var(--surface-hover); color: var(--bethel-primary); }

    @keyframes verse-flash {
      0%   { background: rgba(245, 166, 35, 0.35); }
      100% { background: transparent; }
    }
    .verse-jump { animation: verse-flash 1.4s ease-out; }

    @keyframes verse-select {
      0%,  80% { background: rgba(245, 166, 35, 0.12); }
      100%     { background: transparent; }
    }
    .verse-selected { animation: verse-select 4s ease-out forwards; }

    @keyframes vn-pulse {
      0%   { box-shadow: 0 0 0 0px  rgba(245, 166, 35, 0.8); border-radius: 50%; }
      50%  { box-shadow: 0 0 0 7px  rgba(245, 166, 35, 0.2); border-radius: 50%; }
      100% { box-shadow: 0 0 0 0px  rgba(245, 166, 35, 0);   border-radius: 50%; }
    }
    .verse-selected .vn { animation: vn-pulse 1.1s ease-out 3; }

    /* ── Multi-select bar ── */
    .sel-bar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.5rem 1rem;
      background: var(--bethel-primary);
      flex-shrink: 0;
    }
    .sel-count { font-size: 0.85rem; font-weight: 700; color: #fff; }
    .sel-actions { display: flex; gap: 0.4rem; align-items: center; }

    .sel-btn {
      border: 1.5px solid rgba(255,255,255,0.5); background: transparent;
      color: #fff; border-radius: 8px; padding: 0.28rem 0.75rem;
      cursor: pointer; font-size: 0.82rem; font-weight: 600;
      display: flex; align-items: center; gap: 0.35rem;
      font-family: inherit; transition: all 0.15s;
    }
    .sel-btn:hover { background: rgba(255,255,255,0.15); border-color: #fff; }
    .sel-btn.primary { background: rgba(255,255,255,0.2); }
    .sel-btn.primary:hover { background: rgba(255,255,255,0.3); }

    /* ── Chapter nav bar ── */
    .ch-nav {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.5rem 1rem;
      border-top: 1px solid var(--surface-border);
      background: var(--surface-card); flex-shrink: 0;
    }

    .nav-btn {
      display: flex; align-items: center; gap: 0.35rem;
      border: 1.5px solid var(--surface-border);
      background: var(--surface-ground);
      border-radius: 8px; padding: 0.32rem 0.75rem;
      cursor: pointer; font-size: 0.82rem; font-weight: 600;
      color: var(--text-color); font-family: inherit; transition: all 0.15s;
    }
    .nav-btn:hover:not(:disabled) { border-color: var(--bethel-primary); color: var(--bethel-primary); background: rgba(245,166,35,0.06); }
    .nav-btn:disabled { opacity: 0.35; cursor: default; }

    .nav-ref { font-size: 0.85rem; font-weight: 700; color: var(--text-color-secondary); }

    /* ── Compare popup ── */
    .cmp-backdrop {
      position: fixed; inset: 0; z-index: 200;
      background: rgba(0,0,0,0.35);
      display: flex; align-items: center; justify-content: center;
      padding: 1.5rem;
    }
    .cmp-panel {
      background: var(--surface-card);
      border-radius: 14px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.22);
      width: 100%; max-width: 520px;
      max-height: 80vh;
      display: flex; flex-direction: column;
      overflow: hidden;
    }
    .cmp-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.9rem 1.1rem 0.7rem;
      border-bottom: 1px solid var(--surface-border);
      flex-shrink: 0;
    }
    .cmp-title { font-size: 0.95rem; font-weight: 700; color: var(--text-color); }
    .cmp-close {
      border: none; background: transparent; cursor: pointer;
      color: var(--text-color-secondary); padding: 0.25rem; border-radius: 6px;
      display: flex; align-items: center; font-size: 0.9rem; transition: all 0.15s; font-family: inherit;
    }
    .cmp-close:hover { background: var(--surface-hover); color: var(--bethel-primary); }
    .cmp-body { overflow-y: auto; padding: 0.5rem 0; }
    .cmp-spinner {
      display: flex; justify-content: center; padding: 2.5rem;
      color: var(--text-color-secondary); font-size: 1.4rem;
    }
    .cmp-item {
      padding: 0.75rem 1.1rem;
      border-bottom: 1px solid var(--surface-border);
    }
    .cmp-item:last-child { border-bottom: none; }
    .cmp-item.cmp-current { background: rgba(245,166,35,0.05); }
    .cmp-tname {
      font-size: 0.72rem; font-weight: 700; color: var(--bethel-primary);
      text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.3rem;
    }
    .cmp-item.cmp-current .cmp-tname::after { content: ' ✓'; }
    .cmp-text { font-size: 0.95rem; line-height: 1.7; color: var(--text-color); white-space: pre-wrap; }
  `]
})
export class VerseListComponent {
  st = inject(BibleStateService);
  private msg = inject(MessageService);

  @ViewChild('scrollEl') scrollEl?: ElementRef<HTMLElement>;

  private selectedVerses = signal<Set<number>>(new Set());
  selectionCount = computed(() => this.selectedVerses().size);

  private lastAnchorVerse: number | null = null;
  private touchStartY = 0;
  private lastTouchHandled = 0;

  onTouchStart(event: TouchEvent): void {
    this.touchStartY = event.touches[0].clientY;
  }

  onTouchEnd(event: TouchEvent, verse: number): void {
    if ((event.target as HTMLElement).closest('.av')) return;
    const delta = Math.abs(event.changedTouches[0].clientY - this.touchStartY);
    if (delta > 15) return;
    this.lastTouchHandled = Date.now();
    this.toggleSelect(verse);
    this.lastAnchorVerse = verse;
  }

  onVerseClick(event: MouseEvent, verse: number): void {
    if (Date.now() - this.lastTouchHandled < 600) return;
    if (event.shiftKey && this.lastAnchorVerse !== null) {
      event.preventDefault(); // prevent browser text selection on shift+click
      this.selectRange(this.lastAnchorVerse, verse);
    } else {
      this.toggleSelect(verse);
      this.lastAnchorVerse = verse;
    }
  }

  private selectRange(from: number, to: number): void {
    const verseNums = this.st.verses().map(v => v.verse);
    const fromIdx = verseNums.indexOf(from);
    const toIdx   = verseNums.indexOf(to);
    if (fromIdx === -1 || toIdx === -1) return;
    const [lo, hi] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
    const s = new Set(this.selectedVerses());
    for (let i = lo; i <= hi; i++) s.add(verseNums[i]);
    this.selectedVerses.set(s);
  }

  compareOpen    = signal(false);
  compareLoading = signal(false);
  compareRef     = signal('');
  compareResults = signal<{ translation: { id: string; name: string }; text: string }[]>([]);

  constructor() {
    let prevVerse = untracked(() => this.st.selectedVerse());

    effect(() => {
      const verse   = this.st.selectedVerse();
      const jump    = untracked(() => this.st.verseJump());
      const changed = verse !== prevVerse;
      prevVerse = verse;
      if (verse !== null && (changed || jump)) this.scrollToVerse(verse, jump);
      if (jump) untracked(() => this.st.verseJump.set(false));
    });
    // Clear selection and reset scroll when chapter changes
    effect(() => {
      this.st.selectedChapter();
      this.selectedVerses.set(new Set());
      this.lastAnchorVerse = null;
      setTimeout(() => {
        const el = this.scrollEl?.nativeElement;
        if (el) el.scrollTop = 0;
      });
    }, { allowSignalWrites: true });
  }

  isSelected(verse: number): boolean {
    return this.selectedVerses().has(verse);
  }

  toggleSelect(verse: number): void {
    const s = new Set(this.selectedVerses());
    if (s.has(verse)) s.delete(verse); else s.add(verse);
    this.selectedVerses.set(s);
  }

  clearSelection(): void {
    this.selectedVerses.set(new Set());
    this.lastAnchorVerse = null;
  }

  async bookmarkSelected(): Promise<void> {
    const sel = this.selectedVerses();
    const verses = this.st.verses()
      .filter(v => sel.has(v.verse))
      .sort((a, b) => a.verse - b.verse);
    await this.st.bookmarkVersesDirect(verses);
    this.msg.add({ severity: 'success', summary: `${verses.length} հատված պահպանված`, life: 2000 });
    this.clearSelection();
  }

  async compareSelected(): Promise<void> {
    const sel = this.selectedVerses();
    const verses = this.st.verses()
      .filter(v => sel.has(v.verse))
      .sort((a, b) => a.verse - b.verse);
    if (!verses.length) return;

    const book = verses[0].book_name ?? this.st.selectedBook()?.long_name ?? '';
    const ch   = this.st.selectedChapter();
    this.compareRef.set(`${book} ${ch}:${this.formatVerseNums(verses.map(v => v.verse))}`);
    this.compareResults.set([]);
    this.compareLoading.set(true);
    this.compareOpen.set(true);

    const results = verses.length === 1
      ? await this.st.getVerseAcrossTranslations(verses[0].book_number, verses[0].chapter, verses[0].verse)
      : await this.st.getVersesRangeAcrossTranslations(verses[0].book_number, verses[0].chapter, verses.map(v => v.verse));

    this.compareResults.set(results);
    this.compareLoading.set(false);
  }

  private formatVerseNums(nums: number[]): string {
    const sorted = [...nums].sort((a, b) => a - b);
    const ranges: string[] = [];
    let start = sorted[0], end = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === end + 1) { end = sorted[i]; }
      else { ranges.push(start === end ? `${start}` : `${start}-${end}`); start = end = sorted[i]; }
    }
    ranges.push(start === end ? `${start}` : `${start}-${end}`);
    return ranges.join(',');
  }

  copySelected(): void {
    const sel = this.selectedVerses();
    const verses = this.st.verses()
      .filter(v => sel.has(v.verse))
      .sort((a, b) => a.verse - b.verse);
    if (!verses.length) return;

    const book = verses[0].book_name ?? this.st.selectedBook()?.long_name ?? '';
    const ch   = this.st.selectedChapter();
    const ref  = `${book} ${ch}:${this.formatVerseNums(verses.map(v => v.verse))}`;
    const text = verses.map(v => `${v.verse} ${v.text}`).join('\n');

    navigator.clipboard.writeText(`${ref}\n${text}`)
      .then(() => {
        this.msg.add({ severity: 'success', summary: `${verses.length} հատված պատճենված`, life: 2000 });
        this.clearSelection();
      });
  }

  async openCompare(v: BibleVerse): Promise<void> {
    const book = v.book_name ?? this.st.selectedBook()?.long_name ?? '';
    this.compareRef.set(`${book} ${v.chapter}:${v.verse}`);
    this.compareResults.set([]);
    this.compareLoading.set(true);
    this.compareOpen.set(true);
    const results = await this.st.getVerseAcrossTranslations(v.book_number, v.chapter, v.verse);
    this.compareResults.set(results);
    this.compareLoading.set(false);
  }

  private scrollToVerse(verse: number, animate = false): void {
    setTimeout(() => {
      const container = this.scrollEl?.nativeElement;
      if (!container) return;
      const target = container.querySelector(`[data-verse="${verse}"]`) as HTMLElement | null;
      if (!target) return;
      const scrollTop = target.offsetTop
        - (container.clientHeight / 2)
        + (target.offsetHeight / 2);
      container.scrollTo({ top: Math.max(0, scrollTop), behavior: 'smooth' });

      target.classList.remove('verse-selected');
      void target.offsetWidth;
      target.classList.add('verse-selected');
      target.addEventListener('animationend', () => target.classList.remove('verse-selected'), { once: true });

      if (animate) {
        target.classList.add('verse-jump');
        setTimeout(() => target.classList.remove('verse-jump'), 1400);
      }
    }, 350);
  }

  copy(v: { verse: number; chapter: number; text: string; book_name?: string }): void {
    navigator.clipboard.writeText(this.st.formatVerse(v as never))
      .then(() => this.msg.add({ severity: 'success', summary: 'Պատճենված', life: 2000 }));
  }
}
