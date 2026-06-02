import { Component, OnInit, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { DropdownModule } from 'primeng/dropdown';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Capacitor } from '@capacitor/core';

import { BibleStateService } from './services/bible-state.service';
import { ThemeService } from '../../core/services/theme.service';
import { BookListComponent } from './book-list/book-list.component';
import { ChapterListComponent } from './chapter-list/chapter-list.component';
import { VersePickerComponent } from './verse-list/verse-picker.component';

@Component({
  selector: 'app-bible',
  standalone: true,
  imports: [
    FormsModule, DropdownModule, ToastModule, RouterOutlet,
    BookListComponent, ChapterListComponent, VersePickerComponent,
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

  <!-- backdrop — mobile overlay only -->
  @if (st.sidebarOpen()) {
    <div class="sidebar-backdrop" (click)="st.closeSidebar()"></div>
  }

  <!-- ══ Main ══ -->
  <div class="main">

    <!-- Top bar -->
    <div class="top-bar">
      @if (isNative && !isReadMode()) {
        <button class="ref-btn back-icon-btn" (click)="router.navigate(['/bible'])">
          <i class="pi pi-arrow-left"></i>
        </button>
      } @else {
        <button class="ref-btn" (click)="st.sidebarOpen() ? st.closeSidebar() : st.openSidebar()">
          <i class="pi pi-bars"></i>
          <span>{{ st.currentRef() }}</span>
        </button>
      }
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
      >
        <ng-template pTemplate="selectedItem" let-item>
          <span class="dd-full">{{ item?.name }}</span>
          <span class="dd-short">{{ item?.id }}</span>
        </ng-template>
      </p-dropdown>
      <button class="icon-btn" [class.active]="isSearch()"
              (click)="toggleMode('search')" title="Որոնել">
        <i class="pi pi-search"></i>
      </button>
      <button class="icon-btn bm-btn" [class.active]="isBookmarks()"
              (click)="toggleMode('bookmarks')" title="Էջանիշներ">
        <i class="pi pi-bookmark"></i>
        @if (st.allBookmarks().length > 0) {
          <span class="badge">{{ st.allBookmarks().length }}</span>
        }
      </button>
      @if (isNative) {
        <div class="top-bar-sep"></div>
        <button class="icon-btn" (click)="themeService.toggle()"
                [title]="themeService.isDark() ? 'Light mode' : 'Dark mode'">
          <i [class]="themeService.isDark() ? 'pi pi-sun' : 'pi pi-moon'"></i>
        </button>
        <button class="icon-btn" (click)="router.navigate(['/settings'])" title="Կարգավորումներ">
          <i class="pi pi-cog"></i>
        </button>
      }
    </div>

    <!-- Content area — child routes render here -->
    <div class="content">
      @if (initError) {
        <div style="padding:1.5rem;color:red;font-size:0.85rem;white-space:pre-wrap;word-break:break-all;">
          <strong>Init error:</strong><br>{{ initError }}
        </div>
      }
      <router-outlet />
    </div>
  </div>
</div>

<!-- Bookmark note dialog -->
@if (st.showNoteDialog()) {
  <div class="bm-backdrop" (click)="st.cancelBookmark()">
    <div class="bm-dialog" (click)="$event.stopPropagation()">
      <div class="bm-dialog-header">
        <span><i class="pi pi-bookmark-fill"></i>&nbsp;Ավելացնել Էջանիշ</span>
        <button class="bm-close" (click)="st.cancelBookmark()"><i class="pi pi-times"></i></button>
      </div>
      <div class="bm-dialog-body">
        <label class="bm-label">Նշում <span class="bm-opt">(կամընտիր)</span></label>
        <textarea class="bm-textarea" [ngModel]="st.pendingNote()" (ngModelChange)="st.pendingNote.set($event)"
                  rows="3" placeholder="Անձնական նշում..."></textarea>
      </div>
      <div class="bm-dialog-footer">
        <button class="bm-btn cancel" (click)="st.cancelBookmark()">Չեղարկել</button>
        <button class="bm-btn primary" (click)="confirmBookmark()">
          <i class="pi pi-bookmark"></i> Պահպանել
        </button>
      </div>
    </div>
  </div>
}
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; overflow: hidden; min-height: 0; }

    /* ── Bookmark dialog ── */
    .bm-backdrop {
      position: fixed; inset: 0; z-index: 300;
      background: rgba(0,0,0,0.38);
      display: flex; align-items: center; justify-content: center; padding: 1.5rem;
    }
    .bm-dialog {
      background: var(--surface-card); border-radius: 14px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.22);
      width: 100%; max-width: 380px;
      display: flex; flex-direction: column; overflow: hidden;
    }
    .bm-dialog-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.9rem 1.1rem 0.75rem;
      border-bottom: 1px solid var(--surface-border);
      font-size: 0.95rem; font-weight: 700; color: var(--bethel-primary);
    }
    .bm-close {
      border: none; background: transparent; cursor: pointer;
      color: var(--text-color-secondary); padding: 0.25rem; border-radius: 6px;
      display: flex; align-items: center; font-size: 0.9rem; transition: all 0.15s; font-family: inherit;
    }
    .bm-close:hover { background: var(--surface-hover); color: var(--bethel-primary); }
    .bm-dialog-body { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.5rem; }
    .bm-label { font-size: 0.82rem; font-weight: 600; color: var(--text-color); }
    .bm-opt { font-weight: 400; color: var(--text-color-secondary); }
    .bm-textarea {
      width: 100%; resize: vertical; border-radius: 8px; padding: 0.55rem 0.75rem;
      border: 1.5px solid var(--surface-border); background: var(--surface-ground);
      color: var(--text-color); font-size: 0.95rem; font-family: inherit;
      outline: none; transition: border-color 0.15s; box-sizing: border-box;
    }
    .bm-textarea:focus { border-color: var(--bethel-primary); }
    .bm-dialog-footer {
      display: flex; justify-content: flex-end; gap: 0.5rem;
      padding: 0.75rem 1.1rem;
      border-top: 1px solid var(--surface-border);
    }
    .bm-btn {
      border: 1.5px solid var(--surface-border); background: var(--surface-ground);
      color: var(--text-color); border-radius: 8px; padding: 0.38rem 1rem;
      cursor: pointer; font-size: 0.85rem; font-weight: 600;
      font-family: inherit; transition: all 0.15s;
      display: flex; align-items: center; gap: 0.35rem;
    }
    .bm-btn.cancel:hover { border-color: var(--bethel-primary); color: var(--bethel-primary); }
    .bm-btn.primary {
      background: var(--bethel-primary); border-color: var(--bethel-primary); color: #fff;
    }
    .bm-btn.primary:hover { opacity: 0.88; }

    /* ── Layout ── */
    .bible-layout {
      display: flex;
      flex: 1;
      overflow: hidden;
      min-height: 0;
      position: relative;
      background: var(--surface-ground);
    }

    /* ── Sidebar — desktop: push content ── */
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

    /* ── Sidebar — mobile: overlay ── */
    @media (max-width: 768px) {
      .sidebar {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: 268px !important;
        border-right-width: 1px !important;
        z-index: 200;
        transform: translateX(-100%);
        transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .sidebar.open {
        transform: translateX(0);
      }
      .sidebar-backdrop {
        position: absolute;
        inset: 0;
        z-index: 199;
        background: rgba(0, 0, 0, 0.38);
        animation: backdropIn 0.2s ease;
      }
      @keyframes backdropIn { from { opacity: 0; } to { opacity: 1; } }
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

    .back-icon-btn {
      padding: 0.3rem 0.55rem;
      min-width: unset;
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

      .dd-short { display: none; }
    }

    @media (max-width: 576px) {
      ::ng-deep .trans-dd {
        width: auto !important;
        max-width: none !important;
        min-width: 64px !important;
        .dd-full  { display: none; }
        .dd-short { display: inline; font-size: 0.82rem; font-weight: 700; }
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
    .content {
      flex: 1; overflow: hidden; display: flex; flex-direction: column; min-height: 0;
    }
    /* router-outlet is a zero-size element; keep it from affecting flex layout */
    router-outlet { display: none; }

    .top-bar-sep { width: 1px; height: 20px; background: var(--surface-border); margin: 0 0.1rem; flex-shrink: 0; }
  `]
})
export class BibleComponent implements OnInit {
  st           = inject(BibleStateService);
  themeService = inject(ThemeService);
  router       = inject(Router);
  private msg  = inject(MessageService);
  isNative     = Capacitor.isNativePlatform();

  private routerUrl = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => (e as NavigationEnd).urlAfterRedirects),
      startWith(this.router.url)
    )
  );

  isSearch    = computed(() => (this.routerUrl() ?? '').startsWith('/bible/search'));
  isBookmarks = computed(() => (this.routerUrl() ?? '').startsWith('/bible/bookmarks'));
  isReadMode  = computed(() => !this.isSearch() && !this.isBookmarks());

  swiperTransform = computed(() => {
    const step = this.st.sidebarStep();
    const px = step === 'books' ? 0 : step === 'chapters' ? -268 : -536;
    return `translateX(${px}px)`;
  });

  initError = '';

  async ngOnInit(): Promise<void> {
    try {
      await this.st.init();
    } catch (e: any) {
      this.initError = e?.message ?? String(e);
      console.error('BibleState init failed:', e);
    }
    const loader = document.getElementById('app-loader');
    if (loader) {
      loader.classList.add('fade-out');
      setTimeout(() => loader.remove(), 350);
    }
  }

  toggleMode(m: 'search' | 'bookmarks'): void {
    const active = m === 'search' ? this.isSearch() : this.isBookmarks();
    this.router.navigate([active ? '/bible' : `/bible/${m}`]);
  }

  async confirmBookmark(): Promise<void> {
    await this.st.confirmBookmark();
    this.msg.add({ severity: 'success', summary: 'Պահպանված', life: 2000 });
  }
}
