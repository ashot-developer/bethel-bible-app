import { Component, inject } from '@angular/core';
import { BibleStateService } from '../services/bible-state.service';

@Component({
  selector: 'app-verse-picker',
  standalone: true,
  template: `
    <div class="panel">
      <div class="panel-hd">
        <button class="back-btn" (click)="st.goBack()" title="Վերադառնալ">
          <i class="pi pi-arrow-left"></i>
        </button>
        <span class="panel-title">{{ st.selectedBook()?.short_name }} {{ st.selectedChapter() }}</span>
      </div>
      <div class="panel-scroll">
        <div class="num-grid">
          @for (v of st.verses(); track v.verse) {
            <button class="num-btn"
                    [class.active]="st.selectedVerse() === v.verse"
                    (click)="st.selectVerse(v.verse)">
              {{ v.verse }}
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
      gap: 0.5rem;
      padding: 0 0.75rem;
      height: 40px;
      border-bottom: 1px solid var(--surface-border);
      flex-shrink: 0;
    }
    .panel-title { font-size: 0.82rem; font-weight: 600; color: var(--text-color); }

    .back-btn {
      border: none; background: transparent; padding: 0.3rem; border-radius: 6px;
      cursor: pointer; color: var(--text-color-secondary); font-size: 0.85rem;
      display: flex; align-items: center; flex-shrink: 0; transition: all 0.15s; font-family: inherit;
    }
    .back-btn:hover { background: var(--surface-hover); color: var(--bethel-primary); }

    .panel-scroll { flex: 1; overflow-y: auto; padding: 0.6rem; }

    .num-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; }

    .num-btn {
      border: 1px solid var(--surface-border);
      background: var(--surface-ground);
      border-radius: 7px;
      padding: 0.48rem 0;
      cursor: pointer;
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--text-color);
      font-family: inherit;
      text-align: center;
      transition: all 0.12s;
    }
    .num-btn:hover { border-color: var(--bethel-primary); color: var(--bethel-primary); background: rgba(245,166,35,0.06); }
    .num-btn.active { background: rgba(245,166,35,0.12); border-color: var(--bethel-primary); color: #c47d00; font-weight: 700; }
  `]
})
export class VersePickerComponent {
  st = inject(BibleStateService);
}
