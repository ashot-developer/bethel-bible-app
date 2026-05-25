import { Component, inject, effect, ViewChild, ElementRef } from '@angular/core';
import { MessageService } from 'primeng/api';
import { BibleStateService } from '../services/bible-state.service';

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
             [class.selected]="st.selectedVerse() === v.verse"
             [class.bm]="st.isBookmarked(v)"
             [attr.data-verse]="v.verse">
          <span class="vn">{{ v.verse }}</span>
          <span class="vt">{{ v.text }}</span>
          <div class="va">
            <button class="av" (click)="st.toggleBookmark(v)"
                    [title]="st.isBookmarked(v) ? 'Հեռացնել' : 'Էջանիշ'">
              <i [class]="st.isBookmarked(v) ? 'pi pi-bookmark-fill' : 'pi pi-bookmark'"
                 [style.color]="st.isBookmarked(v) ? 'var(--bethel-primary)' : ''"></i>
            </button>
            <button class="av" (click)="copy(v)" title="Պատճենել">
              <i class="pi pi-copy"></i>
            </button>
          </div>
        </div>
      }
    </div>

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

    .verse-scroll { flex: 1; overflow-y: auto; }

    .empty {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 4rem 1rem;
      color: var(--text-color-secondary); gap: 0.75rem;
    }
    .empty i { font-size: 2.2rem; opacity: 0.18; }
    .empty p { margin: 0; font-size: 0.88rem; }

    .verse-row {
      display: flex; gap: 0.7rem; padding: 0.65rem 1.1rem;
      border-bottom: 1px solid var(--surface-border);
      align-items: flex-start; transition: background 0.1s;
    }
    .verse-row:hover { background: var(--surface-hover); }
    .verse-row:hover .va { opacity: 1; }
    .verse-row.bm { background: rgba(245,166,35,0.04); }
    .verse-row.selected { background: rgba(245,166,35,0.08); }

    .vn { min-width: 22px; font-size: 0.7rem; font-weight: 700; color: var(--bethel-primary); padding-top: 3px; flex-shrink: 0; }
    .vt { flex: 1; line-height: 1.78; font-size: 0.97rem; color: var(--text-color); }
    .va { display: flex; gap: 0.1rem; opacity: 0; transition: opacity 0.15s; flex-shrink: 0; }

    .av {
      border: none; background: transparent; padding: 0.28rem; border-radius: 6px;
      cursor: pointer; color: var(--text-color-secondary);
      display: flex; align-items: center; font-size: 0.82rem; transition: all 0.15s; font-family: inherit;
    }
    .av:hover { background: var(--surface-hover); color: var(--bethel-primary); }

    @keyframes verse-flash {
      0%   { background: rgba(245, 166, 35, 0.35); }
      100% { background: transparent; }
    }
    .verse-jump { animation: verse-flash 1.4s ease-out; }

    /* ── Chapter nav bar ── */
    .ch-nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 1rem;
      border-top: 1px solid var(--surface-border);
      background: var(--surface-card);
      flex-shrink: 0;
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

    .nav-ref {
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-color-secondary);
    }
  `]
})
export class VerseListComponent {
  st = inject(BibleStateService);
  private msg = inject(MessageService);

  @ViewChild('scrollEl') scrollEl?: ElementRef<HTMLElement>;

  constructor() {
    effect(() => {
      const verse = this.st.selectedVerse();
      if (verse !== null) this.scrollToVerse(verse);
    });
  }

  private scrollToVerse(verse: number): void {
    setTimeout(() => {
      const container = this.scrollEl?.nativeElement;
      if (!container) return;
      const target = container.querySelector(`[data-verse="${verse}"]`) as HTMLElement | null;
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('verse-jump');
      setTimeout(() => target.classList.remove('verse-jump'), 1400);
    }, 200);
  }

  copy(v: { verse: number; chapter: number; text: string; book_name?: string }): void {
    navigator.clipboard.writeText(this.st.formatVerse(v as never))
      .then(() => this.msg.add({ severity: 'success', summary: 'Պատճենված', life: 2000 }));
  }
}
