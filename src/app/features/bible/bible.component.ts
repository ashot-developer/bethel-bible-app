import { Component, OnInit, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';

import { BibleStateService } from './services/bible-state.service';
import { BookListComponent } from './book-list/book-list.component';
import { ChapterListComponent } from './chapter-list/chapter-list.component';
import { VersePickerComponent } from './verse-list/verse-picker.component';
import { VerseListComponent } from './verse-list/verse-list.component';
import { BibleSearchComponent } from './bible-search/bible-search.component';
import { BookmarksComponent } from './bookmarks/bookmarks.component';

@Component({
  selector: 'app-bible',
  standalone: true,
  providers: [MessageService],
  imports: [
    FormsModule, DropdownModule, ToastModule, DialogModule,
    InputTextareaModule, ButtonModule,
    BookListComponent, ChapterListComponent, VersePickerComponent,
    VerseListComponent, BibleSearchComponent, BookmarksComponent,
  ],
  template: `
<p-toast />

<div class="bible-layout">

  <!-- ══ Sidebar ══ -->
  <div class="sidebar" [class.open]="st.sidebarOpen()">
    <div class="swiper-track" [style.transform]="swiperTransform()">
      <div class="swiper-panel"><app-book-list /></div>
      <div class="swiper-panel"><app-chapter-list /></div>
      <div class="swiper-panel"><app-verse-picker /></div>
    </div>
  </div>

  <!-- ══ Main ══ -->
  <div class="main">

    <!-- Top bar -->
    <div class="top-bar">
      <button class="ref-btn" (click)="st.openSidebar()">
        <i class="pi pi-bars"></i>
        <span>{{ st.currentRef() }}</span>
      </button>
      <div class="spacer"></div>
      <p-dropdown
        [options]="st.translations()"
        [ngModel]="st.selectedTranslation()"
        (ngModelChange)="st.setTranslation($event)"
        optionLabel="name"
        optionValue="id"
        placeholder="Թարգ."
        styleClass="trans-dd"
        appendTo="body"
      />
      <button class="icon-btn" [class.active]="st.mode() === 'search'"
              (click)="toggleMode('search')" title="Որոնել">
        <i class="pi pi-search"></i>
      </button>
      <button class="icon-btn bm-btn" [class.active]="st.mode() === 'bookmarks'"
              (click)="toggleMode('bookmarks')" title="Էջանիշներ">
        <i class="pi pi-bookmark"></i>
        @if (st.allBookmarks().length > 0) {
          <span class="badge">{{ st.allBookmarks().length }}</span>
        }
      </button>
    </div>

    <!-- Content area -->
    <div class="content">
      @if (st.mode() === 'read')      { <app-verse-list /> }
      @if (st.mode() === 'search')    { <app-bible-search /> }
      @if (st.mode() === 'bookmarks') { <app-bookmarks /> }
    </div>
  </div>
</div>

<!-- Bookmark note dialog -->
<p-dialog [(visible)]="showDialog" header="Ավելացնել Էջանիշ" [modal]="true" [style]="{width:'380px'}">
  <div class="flex flex-column gap-2 pt-2">
    <label class="text-sm font-semibold">Նշում (կամընտիր)</label>
    <textarea pInputTextarea [ngModel]="st.pendingNote()" (ngModelChange)="st.pendingNote.set($event)"
              rows="3" class="w-full" placeholder="Անձնական նշում..."></textarea>
  </div>
  <ng-template pTemplate="footer">
    <p-button label="Չեղարկել" [text]="true" (onClick)="st.cancelBookmark()" />
    <p-button label="Պահպանել" icon="pi pi-bookmark" (onClick)="confirmBookmark()" />
  </ng-template>
</p-dialog>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; overflow: hidden; min-height: 0; }

    /* ── Layout ── */
    .bible-layout {
      display: flex;
      flex: 1;
      overflow: hidden;
      min-height: 0;
      background: var(--surface-ground);
    }

    /* ── Sidebar ── */
    .sidebar {
      width: 0;
      flex-shrink: 0;
      overflow: hidden;
      background: var(--surface-card);
      border-right: 0 solid var(--surface-border);
      transition: width 0.28s cubic-bezier(0.4, 0, 0.2, 1),
                  border-right-width 0.28s;
    }
    .sidebar.open {
      width: 268px;
      border-right-width: 1px;
    }

    /* Swiper: 3 panels side by side at 268px each */
    .swiper-track {
      display: flex;
      width: 804px; /* 268 * 3 */
      height: 100%;
      transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .swiper-panel {
      width: 268px;
      height: 100%;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
    }

    /* ── Main ── */
    .main {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

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

    .ref-btn {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      border: 1.5px solid var(--surface-border);
      background: var(--surface-ground);
      border-radius: 8px;
      padding: 0.3rem 0.75rem;
      cursor: pointer;
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--text-color);
      font-family: inherit;
      transition: all 0.15s;
      max-width: 220px;
    }
    .ref-btn span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ref-btn i { color: var(--text-color-secondary); flex-shrink: 0; }
    .ref-btn:hover { border-color: var(--bethel-primary); color: var(--bethel-primary); }
    .ref-btn:hover i { color: var(--bethel-primary); }

    .spacer { flex: 1; }

    ::ng-deep .trans-dd {
      width: 240px !important;
      max-width: 240px !important;
      min-height: 35px !important;
      border-radius: 8px;

      &.p-dropdown { min-height: 35px !important; display: flex !important; align-items: center !important; }
      .p-dropdown-trigger { width: 2rem; align-self: center; }
      .p-dropdown-label { display: flex !important; align-items: center !important; }

      .p-dropdown-label {
        font-size: 0.82rem;
        padding: 0.32rem 0.6rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: block;
      }
    }

    .icon-btn {
      border: none; background: transparent; padding: 0.35rem 0.5rem;
      border-radius: 7px; cursor: pointer; color: var(--text-color-secondary);
      font-size: 0.95rem; position: relative; display: flex; align-items: center;
      transition: all 0.15s; font-family: inherit;
    }
    .icon-btn:hover { background: var(--surface-hover); color: var(--bethel-primary); }
    .icon-btn.active { color: var(--bethel-primary); background: rgba(245,166,35,0.12); }

    .badge {
      position: absolute; top: 1px; right: 1px;
      background: var(--bethel-accent); color: #fff;
      font-size: 0.58rem; width: 13px; height: 13px;
      border-radius: 50%; display: flex; align-items: center;
      justify-content: center; font-weight: 700; line-height: 1;
    }

    /* ── Content ── */
    .content { flex: 1; overflow: hidden; display: flex; flex-direction: column; min-height: 0; }
  `]
})
export class BibleComponent implements OnInit {
  st  = inject(BibleStateService);
  private msg = inject(MessageService);

  get showDialog(): boolean { return this.st.showNoteDialog(); }
  set showDialog(v: boolean) { if (!v) this.st.cancelBookmark(); }

  swiperTransform = computed(() => {
    const step = this.st.sidebarStep();
    const px = step === 'books' ? 0 : step === 'chapters' ? -268 : -536;
    return `translateX(${px}px)`;
  });

  async ngOnInit(): Promise<void> {
    await this.st.init();
  }

  toggleMode(m: 'search' | 'bookmarks'): void {
    this.st.mode.set(this.st.mode() === m ? 'read' : m);
  }

  async confirmBookmark(): Promise<void> {
    await this.st.confirmBookmark();
    this.msg.add({ severity: 'success', summary: 'Պահպանված', life: 2000 });
  }
}
