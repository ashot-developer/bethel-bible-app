# Bethel Mrgashat Bible — Project Guide for Claude

## What this app is
Bible reader for **Bethel Mrgashat** church.
Built with **Angular 17 + Electron 29** (desktop) and **Capacitor 8** (iOS/Android). Runs entirely offline.
Distributed as **DMG (Mac)**, **NSIS installer (Windows)** — unsigned builds.
Also runs as a **web app** (sql.js) and **mobile app** (Capacitor).

---

## Tech Stack
| Layer | Technology |
|---|---|
| UI framework | Angular 17, standalone components, signals |
| UI library | PrimeNG 17 + PrimeFlex + PrimeIcons |
| Desktop shell | Electron 29 |
| Mobile shell | Capacitor 8 (@capacitor-community/sqlite) |
| Database (Electron) | better-sqlite3 (SQLite, native, requires rebuild for Electron ABI) |
| Database (Web) | sql.js (SQLite compiled to WASM) |
| Database (Mobile) | @capacitor-community/sqlite (copyFromAssets) |
| Packaging | electron-builder 24 |
| Build | Angular CLI + tsc (separate tsconfig for electron) |
| CI/CD | GitHub Actions (`.github/workflows/release.yml`) |

---

## Directory Structure

```
bethel-bible-app/
├── src/
│   ├── app/
│   │   ├── app.component.ts          # Root: app-toolbar + router-outlet
│   │   ├── app.routes.ts             # /bible (default), /settings, ** → /bible
│   │   ├── app.config.ts             # withHashLocation() — required for Electron file://
│   │   ├── features/
│   │   │   ├── bible/
│   │   │   │   ├── bible.component.ts          # Shell: sidebar + swiper + main area
│   │   │   │   ├── services/
│   │   │   │   │   └── bible-state.service.ts  # ALL state as signals, providedIn: 'root'
│   │   │   │   ├── book-list/
│   │   │   │   │   └── book-list.component.ts  # 3-col grid of books
│   │   │   │   ├── chapter-list/
│   │   │   │   │   └── chapter-list.component.ts # 5-col grid of chapters
│   │   │   │   ├── verse-list/
│   │   │   │   │   ├── verse-list.component.ts   # Verse text + prev/next nav
│   │   │   │   │   └── verse-picker.component.ts # 5-col grid of verse numbers
│   │   │   │   ├── bible-search/
│   │   │   │   │   └── bible-search.component.ts # Search with debounce + highlight
│   │   │   │   └── bookmarks/
│   │   │   │       └── bookmarks.component.ts    # Saved verses list
│   │   │   └── settings/
│   │   │       └── settings.component.ts         # Theme, version, update check
│   │   ├── layout/
│   │   │   └── toolbar/
│   │   │       └── toolbar.component.ts  # Back button + gear + theme + logo
│   │   └── core/
│   │       ├── models/               # TypeScript interfaces (bible, member, event)
│   │       └── services/
│   │           ├── electron.service.ts        # Wraps window.electronAPI, isElectron flag
│   │           ├── electron-bible.service.ts  # BibleDataService impl for Electron
│   │           ├── web-bible.service.ts        # BibleDataService impl for Web (sql.js)
│   │           ├── capacitor-bible.service.ts  # BibleDataService impl for Mobile
│   │           ├── bible-data.service.ts       # Abstract base class
│   │           ├── theme.service.ts            # Dark/light toggle, saves to SQLite
│   │           └── update.service.ts           # Update status signal, check(), openDownload()
│   ├── assets/
│   │   └── databases/                # Bible SQLite files (.SQLite3 for Electron, .db for Capacitor)
│   ├── index.html                    # Has inline CSS loader (spinner) — removed after init()
│   └── styles.scss                   # Global + dark mode overrides + p-dropdown focus fix
│
├── electron/
│   ├── main.ts                       # BrowserWindow (titleBarStyle: hiddenInset), auto-update check
│   └── preload.ts                    # contextBridge — exposes window.electronAPI
│
├── electron-utils/
│   ├── ipc-channels.ts               # IPC channel constants + TypeScript interfaces
│   ├── ipc-handlers.ts               # registerIpcHandlers(), performAutoUpdateCheck()
│   └── sqlite.service.ts             # ALL DB logic: Bible queries, bookmarks, settings
│
├── .github/
│   └── workflows/
│       └── release.yml               # Builds DMG + EXE and uploads to GitHub release
│
├── electron-builder.yml              # Mac DMG (x64+arm64) + Windows NSIS, publish: github
└── package.json                      # version field MUST match the GitHub release tag
```

---

## Build & Run Commands

```bash
# Development (Angular dev server + Electron)
npm start

# Build production (Angular + Electron main)
npm run build

# Test production build locally (no packaging)
npm run preview

# Package Mac DMG
npm run dist:mac

# Package Windows installer
npm run dist:win

# Rebuild better-sqlite3 for Electron ABI (run after npm install on Mac arm64)
npm run electron:rebuild
```

### Mobile (requires Node 22 terminal — Capacitor CLI requires Node >= 22)

```bash
# Build Angular for mobile + sync to native projects
npm run build:mobile && npx cap sync android

# Open in Android Studio (build/run from there)
npx cap open android

# Open in Xcode (macOS only)
npx cap open ios
```

---

## Releasing a New Version

```bash
# 1. Commit and push code
git add .
git commit -m "your changes"
git push

# 2. Create GitHub release — triggers CI build automatically
gh release create v1.0.0 --title "v1.0.0" --notes "What changed"
```

GitHub Actions builds `.dmg` (mac, x64+arm64) and `.exe` (win, x64) and attaches them to the release. The app checks GitHub releases API on startup (10s delay) and in Settings.

**Important**: The `package.json` version is overwritten by the workflow from the release tag before building — so binaries always match the tag version.

---

## Key Architecture Decisions

### 1. baseHref must be "./"
`angular.json` production config: `"baseHref": "./"`.
Without this, paths fail over `file://` in Electron.

### 2. Hash routing required
`app.config.ts` uses `withHashLocation()` for Electron `file://` compatibility.

### 3. isDev detection
```ts
const isDev = !app.isPackaged && process.env['NODE_ENV'] !== 'production';
```
- Dev: loads `http://localhost:4200`
- Prod: loads `dist/renderer/browser/index.html`

### 4. Bible database paths
- **Dev**: `../../../src/assets/databases/` (relative to compiled electron-utils)
- **Packaged**: `process.resourcesPath + '/databases/'`

### 5. Dark mode
`ThemeService` toggles `dark-mode` class on `document.body`.
CSS variables overridden in `styles.scss` under `body.dark-mode {}`.
Preference saved in SQLite `settings` table.

### 6. Toolbar layout
`titleBarStyle: 'hiddenInset'` — macOS traffic lights overlap content.
Toolbar uses `padding-left: 80px` **only when `electron.isElectron` is true** (via `.electron` CSS class).
Toolbar is draggable (`-webkit-app-region: drag`), buttons have `no-drag`.

### 7. BibleStateService is root-level
`providedIn: 'root'` — shared across all components including the toolbar.
Previously was component-scoped (`providers: [BibleStateService]` in BibleComponent) — was changed to allow toolbar to read `mode()`.

---

## Bible Layout

```
app-toolbar (always visible — back button + gear + theme + logo)
  ├── /bible route → BibleComponent
  │     ├── sidebar (push, 268px, CSS transition width)
  │     │     └── swiper-track (804px = 268×3, translateX animation)
  │     │           ├── panel 0: app-book-list   (3-col grid)
  │     │           ├── panel 1: app-chapter-list (5-col grid)
  │     │           └── panel 2: app-verse-picker (5-col grid, numbers only)
  │     └── main
  │           ├── top-bar (≡ ref-btn + translation dropdown + search + bookmarks icons)
  │           └── content (flex:1)
  │                 ├── mode=read      → app-verse-list (verses + prev/next chapter nav)
  │                 ├── mode=search    → app-bible-search
  │                 └── mode=bookmarks → app-bookmarks
  └── /settings route → SettingsComponent
```

**Back button** in toolbar:
- Shows when NOT on `/bible` route OR when `bibleState.mode() !== 'read'`
- On `/bible` + non-read mode: sets `mode` back to `'read'`
- On other routes: navigates to `/bible`

---

## BibleStateService Signals

```ts
// Navigation
selectedTranslation = signal('WAB')    // default translation
selectedBook        = signal<BibleBook | null>(null)
selectedChapter     = signal<number | null>(null)
selectedVerse       = signal<number | null>(null)
books               = signal<BibleBook[]>([])
chapters            = signal<number[]>([])
verses              = signal<BibleVerse[]>([])

// UI state
mode        = signal<'read' | 'search' | 'bookmarks'>('read')
sidebarOpen = signal(false)
sidebarStep = signal<'books' | 'chapters' | 'verses'>('books')

// Bookmarks
allBookmarks  = signal<Bookmark[]>([])
bookmarkedSet = signal<Set<string>>(new Set())

// Bookmark dialog
showNoteDialog = signal(false)
pendingNote    = signal('')
pendingVerse   = signal<BibleVerse | null>(null)

// Computed
currentRef       = computed(...)     // "Gen 1:1" style string
hasPrevChapter   = computed(...)
hasNextChapter   = computed(...)
```

Key methods:
- `init()` — preloads first book/chapter/verse, no sidebar animation
- `setTranslation(id)` — reloads books, opens sidebar only if `mode === 'read'`
- `openVerseInReader(v)` — from search, no sidebar
- `openBookmarkInReader(bm)` — switches translation if needed, then navigates
- `prevChapter() / nextChapter()` — cross-book aware navigation

---

## Translations

Default: `WAB` (Western Armenian / Բեյրութի թարգմանություն)

| Key | File | Language |
|---|---|---|
| KJV | KJV.SQLite3 | English |
| Ararat | Ararat.SQLite3 | Eastern Armenian (1910, classical) |
| NRAB | NRAB.SQLite3 | Russian-Armenian (2018) |
| RST77 | RST77.SQLite3 | Russian Synodal (1977) |
| RSTI | RSTI.SQLite3 | Russian Synodal with indices |
| RSTM | RSTM.SQLite3 | Russian Synodal with morphology |
| WAB | WAB.SQLite3 | Western Armenian (1994) |

### Adding a new translation
1. Copy `.SQLite3` AND `.db` (same file, both extensions) to `src/assets/databases/`
2. Add entry to `TRANSLATIONS` in `sqlite.service.ts`, `web-bible.service.ts`, AND `capacitor-bible.service.ts`
3. If Armenian, add key to `ARMENIAN_IDS` Set in all three files
4. Run `npm run build` (desktop/web) or `npm run build:mobile && npx cap sync` (mobile)

### Database schema required
```sql
books  (book_number INTEGER, short_name TEXT, long_name TEXT, book_color TEXT)
verses (book_number NUMERIC, chapter NUMERIC, verse NUMERIC, text TEXT)
```

---

## Armenian Search Normalization

Users type **modern Eastern Armenian**; old translations use **classical orthography**.
`armenianVariants()` exists in THREE places — keep them in sync:
- `electron-utils/sqlite.service.ts`
- `src/app/core/services/web-bible.service.ts`
- `src/app/features/bible/bible-search/bible-search.component.ts` (highlight only)

Current mappings:
| Modern → Classical | Classical → Modern |
|---|---|
| `վ` → `ւ` | `ւ` → `վ` |
| `հ` → `յ` | `յ` → `հ` |
| `և` → `եւ` | `եւ` → `և` |
| `ου` (ու) → `ο` (ο) | `ο` → `ου` (when not already ου) |

**IMPORTANT**: Use code-point constants (U+0578, U+0582) to avoid Greek/Armenian confusion in editors.

---

## Search UX

- **300ms debounce** on input — auto-searches while typing
- **Enter / Search button** — immediate search (no debounce)
- **Translation change while searching** — re-runs last query in new translation (via `effect()` with `allowSignalWrites: true`)
- Results hidden while `searching()` is true (spinner shown instead)

---

## Update System

Flow:
1. Electron app starts → waits 10s → calls GitHub releases API
2. Compares `app.getVersion()` vs latest release `tag_name`
3. If newer: pushes `update:status` event to renderer via `win.webContents.send()`
4. Toolbar gear icon shows red dot; Settings shows update card

Download:
- Picks platform asset: `.dmg` (darwin), `.exe` (win32), `.AppImage` (linux)
- If asset found: direct file download via `shell.openExternal(downloadUrl)`
- If no asset: opens release page (fallback)

Settings page shows macOS install note (xattr command) only when `navigator.platform` starts with `'mac'`.

---

## Mobile Architecture (Capacitor)

`capacitor.config.ts`:
- `appId: 'am.bethel.bible'`
- `webDir: 'dist/mobile/browser'`
- SQLite plugin: `iosDatabaseLocation: 'Library/CapacitorDatabase'`, no encryption

`CapacitorBibleService` mirrors the verse cache pattern from `WebBibleService`:
- On first `getDb()` call: `CapacitorSQLite.copyFromAssets({ overwrite: false })` copies `.db` files from `assets/databases/` to device storage
- Then opens a named connection matching the translation ID (e.g. `'WAB'` → looks for `WAB.db`)
- Bookmarks use `localStorage` (same as web build)

**Database file extensions:**
- Electron uses `.SQLite3` (opened by path via better-sqlite3)
- Capacitor `copyFromAssets` only picks up `.db` files
- Both extensions exist in `src/assets/databases/` — they are identical files

**Settings/Updates on mobile:** The updates card and macOS install note in `settings.component.ts` are wrapped in `@if (electron.isElectron)` — hidden on mobile and web.

**Tap highlight:** `-webkit-tap-highlight-color: transparent` is set globally in `styles.scss` to prevent the default blue flash on Android/iOS.

---

## IPC Channel Pattern

```
Angular component
  → ElectronService (window.electronAPI)
    → preload.ts (contextBridge)
      → ipcMain.handle() in ipc-handlers.ts
        → sqlite.service.ts functions
```

All channel names are constants in `ipc-channels.ts`.

---

## Packaging & Distribution

- **Unsigned** — `identity: null` in `electron-builder.yml`
- Mac: `xattr -cr "/Applications/Bethel Mrgashat Bible.app"` removes quarantine flag
- Windows: "More info → Run anyway" on SmartScreen
- GitHub Actions workflow: `.github/workflows/release.yml`
  - Triggered on `release: created`
  - Needs `permissions: contents: write`
  - Sets version from tag before building

---

## User Data (SQLite app DB)
Path: `app.getPath('userData')/bethel-church.db`

Tables:
- `bookmarks` — saved verses with optional notes
- `settings` — key/value (`theme: light|dark`)
- `members` — unused legacy
- `events` — unused legacy

---

## Branding
- App name: **Bethel Mrgashat Bible** (`Բեթել Մրգաշատ Աստվածաշունչ`)
- Primary color: `#F5A623` (golden yellow) — `var(--bethel-primary)`
- Accent color: `#D0021B` (red) — `var(--bethel-accent)`
- Logo: `assets/logo.png`
- All UI labels are in **Armenian**
- Loader: inline CSS spinner in `index.html`, removed after `BibleStateService.init()` completes
