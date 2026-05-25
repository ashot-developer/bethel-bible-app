import { Component, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { BibleStateService } from '../services/bible-state.service';
import type { Bookmark } from '../../../core/models/bible.models';

@Component({
  selector: 'app-bookmarks',
  standalone: true,
  template: `
    <div class="bm-wrap">
      <div class="bm-head">
        <i class="pi pi-bookmark-fill" style="color:var(--bethel-primary)"></i>
        Էջանիշներ&nbsp;({{ st.allBookmarks().length }})
      </div>

      <div class="bm-scroll">
        @if (st.allBookmarks().length === 0) {
          <div class="empty">
            <i class="pi pi-bookmark"></i>
            <p>Էջանիշ չկա</p>
            <p class="sub">Հատվածի կողքի կոճակով ավելացրեք</p>
          </div>
        }
        @for (bm of st.allBookmarks(); track bm.id) {
          <div class="verse-row" (click)="open(bm)" title="Բացել ընթերցում">
            <span class="vn ref" style="color:var(--bethel-primary)">
              {{ bm.book_name }}&nbsp;{{ bm.chapter }}:{{ bm.verse }}
            </span>
            <div class="bm-body">
              <span class="vt">{{ bm.text }}</span>
              @if (bm.note) { <span class="bm-note">📝 {{ bm.note }}</span> }
              <span class="bm-tr">{{ bm.translation }}</span>
            </div>
            <div class="va">
              <button class="av" (click)="$event.stopPropagation(); copy(bm)" title="Պատճենել"><i class="pi pi-copy"></i></button>
              <button class="av danger" (click)="$event.stopPropagation(); st.removeBookmark(bm)" title="Ջնջել"><i class="pi pi-trash"></i></button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; overflow: hidden; }

    .bm-wrap { display: flex; flex-direction: column; flex: 1; overflow: hidden; }

    .bm-head {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.75rem 1rem; border-bottom: 1px solid var(--surface-border);
      font-weight: 600; font-size: 0.9rem; flex-shrink: 0;
      background: var(--surface-card); color: var(--text-color);
    }

    .bm-scroll { flex: 1; overflow-y: auto; }

    .empty {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 3.5rem 1rem;
      color: var(--text-color-secondary); gap: 0.75rem;
    }
    .empty i { font-size: 2.2rem; opacity: 0.18; }
    .empty p { margin: 0; font-size: 0.88rem; }
    .empty .sub { font-size: 0.78rem; opacity: 0.65; }

    .verse-row {
      display: flex; gap: 0.7rem; padding: 0.65rem 1rem;
      border-bottom: 1px solid var(--surface-border);
      align-items: flex-start; transition: background 0.1s;
      cursor: pointer;
    }
    .verse-row:hover { background: var(--surface-hover); }
    .verse-row:hover .va { opacity: 1; }

    .vn { min-width: 22px; font-size: 0.7rem; font-weight: 700; color: var(--bethel-primary); padding-top: 3px; flex-shrink: 0; }
    .vn.ref { min-width: 86px; white-space: nowrap; }
    .vt { flex: 1; line-height: 1.78; font-size: 0.97rem; color: var(--text-color); }
    .va { display: flex; gap: 0.1rem; opacity: 1; flex-shrink: 0; }

    .bm-body { display: flex; flex-direction: column; flex: 1; }
    .bm-note { font-size: 0.78rem; color: var(--text-color-secondary); font-style: italic; margin-top: 0.2rem; }
    .bm-tr   { font-size: 0.7rem; color: var(--text-color-secondary); margin-top: 0.15rem; opacity: 0.65; }

    .av {
      border: none; background: transparent; padding: 0.28rem; border-radius: 6px;
      cursor: pointer; color: var(--text-color-secondary);
      display: flex; align-items: center; font-size: 0.82rem; transition: all 0.15s; font-family: inherit;
    }
    .av:hover { background: var(--surface-hover); color: var(--bethel-primary); }
    .av.danger:hover { color: var(--bethel-accent); }
  `]
})
export class BookmarksComponent {
  st  = inject(BibleStateService);
  private msg = inject(MessageService);

  async open(bm: Bookmark): Promise<void> {
    await this.st.openBookmarkInReader(bm);
  }

  copy(bm: Bookmark): void {
    const text = `${bm.book_name} ${bm.chapter}:${bm.verse}\n${bm.text}`;
    navigator.clipboard.writeText(text)
      .then(() => this.msg.add({ severity: 'success', summary: 'Պատճենված', life: 2000 }));
  }
}
