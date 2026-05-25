# Bethel Mrgashat Bible — Project Guide for Claude

## What this app is
Desktop Bible reader for **Bethel Mrgashat** church.
Built with **Angular 17 + Electron**. No web server — runs entirely offline as a native desktop app.
Distributed as a **DMG (Mac)** or **NSIS installer (Windows)** without code signing.

---

## Tech Stack
| Layer | Technology |
|---|---|
| UI framework | Angular 17, standalone components, signals |
| UI library | PrimeNG 17 + PrimeFlex + PrimeIcons |
| Desktop shell | Electron 29 |
| Database | better-sqlite3 (SQLite) |
| Packaging | electron-builder 24 |
| Build | Angular CLI + tsc (separate tsconfig for electron) |

---

## Directory Structure

```
bethel-church-app/
├── src/                          # Angular renderer process
│   ├── app/
│   │   ├── app.component.ts      # Root: toolbar + router-outlet only (no sidebar)
│   │   ├── app.routes.ts         # Routes: /bible (default), ** → /bible
│   │   ├── app.config.ts         # withHashLocation() — required for Electron file://
│   │   ├── features/
│   │   │   └── bible/
│   │   │       └── bible.component.ts   # THE main component (all Bible logic here)
│   │   ├── layout/
│   │   │   └── toolbar/
│   │   │       └── toolbar.component.ts # Top bar: theme toggle + logo only
│   │   └── core/
│   │       ├── models/           # TypeScript interfaces (bible, member, event)
│   │       └── services/
│   │           ├── electron.service.ts  # Wraps window.electronAPI
│   │           └── theme.service.ts     # Dark/light toggle, saves to SQLite
│   ├── assets/
│   │   └── databases/            # Bible SQLite files (DO NOT put in dist — electron-builder copies them)
│   │       ├── KJV.SQLite3
│   │       ├── Ararat.SQLite3
│   │       ├── NRAB.SQLite3
│   │       ├── RST77.SQLite3
│   │       ├── RSTI.SQLite3
│   │       ├── RSTM.SQLite3
│   │       └── WAB.SQLite3
│   ├── index.html                # title: "Bethel Mrgashat Bible"
│   └── styles.scss               # Global styles + dark mode CSS variable overrides
│
├── electron/
│   ├── main.ts                   # BrowserWindow, loadFile vs loadURL, autoUpdater
│   └── preload.ts                # contextBridge — exposes window.electronAPI
│
├── electron-utils/
│   ├── ipc-channels.ts           # All IPC channel name constants + TypeScript types
│   ├── ipc-handlers.ts           # Registers all ipcMain.handle() calls
│   └── sqlite.service.ts         # ALL database logic (Bible queries, bookmarks, settings)
│
├── assets/                       # electron-builder resources (icon, entitlements)
│   ├── logo.png                  # 4446×4446px — used for app icon
│   └── entitlements.mac.plist
│
├── angular.json                  # baseHref: "./" in production — critical for Electron file://
├── tsconfig.json                 # Base TS config
├── tsconfig.app.json             # Angular renderer
├── tsconfig.electron.json        # Electron main process (outputs to dist/electron/)
├── electron-builder.yml          # Mac DMG + Windows NSIS, identity: null (unsigned)
└── package.json
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
```

---

## Key Architecture Decisions

### 1. baseHref must be "./"
`angular.json` production config has `"baseHref": "./"`.
Without this, `<base href="/">` makes all JS/CSS paths absolute — they fail over `file://` protocol in Electron.

### 2. Hash routing required
`app.config.ts` uses `withHashLocation()`. Electron loads via `file://` so HTML5 pushState routing doesn't work.

### 3. isDev detection
`electron/main.ts`:
```ts
const isDev = !app.isPackaged && process.env['NODE_ENV'] !== 'production';
```
- Dev mode: loads `http://localhost:4200`
- Production mode: loads `dist/renderer/browser/index.html`

### 4. Bible database paths
- **Dev mode**: `../../../src/assets/databases/` (relative to `dist/electron/electron-utils/`)
- **Packaged**: `process.resourcesPath + '/databases/'`
- Copied by electron-builder `extraResources` config

### 5. Dark mode
`ThemeService` toggles `dark-mode` class on `document.body`.
CSS overrides are in `styles.scss` under `body.dark-mode { }`.
Overrides PrimeNG's `:root` CSS variables (`--surface-card`, `--surface-border`, etc.).
Theme preference saved to SQLite `settings` table via IPC.

### 6. No sidebar
The app has NO sidebar. Navigation is: Bible only (full screen).
Toolbar (`app-toolbar`) has `padding-left: 80px` to clear macOS traffic light buttons.

---

## Bible Component (`bible.component.ts`)

The entire Bible UI is in one component. Structure:

```
top-bar          — translation dropdown + search/bookmarks icon buttons
three-col        — only shown in 'read' mode
  col-books      — 200px fixed, book list
  col-ch         — 50px fixed, chapter numbers
  col-verses     — flex:1, verse text
panel-view       — shown in 'search' or 'bookmarks' mode
```

**ViewMode signal**: `'read' | 'search' | 'bookmarks'` — clicking search/bookmark icons toggles mode.

---

## Translations

Defined in `electron-utils/sqlite.service.ts` → `TRANSLATIONS` constant.
The app auto-detects which files exist (`fs.existsSync`) — missing files are silently skipped.

| Key | File | Language |
|---|---|---|
| KJV | KJV.SQLite3 | English |
| Ararat | Ararat.SQLite3 | Eastern Armenian (1910, classical orthography) |
| NRAB | NRAB.SQLite3 | Russian-Armenian (2018) |
| RST77 | RST77.SQLite3 | Russian Synodal (1977) |
| RSTI | RSTI.SQLite3 | Russian Synodal with indices |
| RSTM | RSTM.SQLite3 | Russian Synodal with morphology |
| WAB | WAB.SQLite3 | Western Armenian / Բեյրութի թարգմանություն (1994) |

### Adding a new translation
1. Copy `.SQLite3` file to `src/assets/databases/`
2. Add entry to `TRANSLATIONS` in `electron-utils/sqlite.service.ts`
3. If Armenian, add key to `ARMENIAN_TRANSLATIONS` Set in same file
4. Run `npm run build`

### Database schema required
```sql
books  (book_number INTEGER, short_name TEXT, long_name TEXT, book_color TEXT)
verses (book_number NUMERIC, chapter NUMERIC, verse NUMERIC, text TEXT)
```

---

## Armenian Search Normalization

Armenian users type **modern Eastern Armenian** letters but old Bible translations use **classical orthography**.
`sqlite.service.ts` → `armenianVariants()` generates both forms:

| Modern (typed) | Classical (in Bible) |
|---|---|
| `վ` | `ւ` |
| `Վ` | `Ւ` |
| `հ` | `յ` |
| `Հ` | `Յ` |

Applies to: `Ararat`, `NRAB`, `WAB`. SQLite query uses `OR` across all variants.

---

## IPC Channel Pattern

```
Angular component
  → ElectronService (wraps window.electronAPI)
    → preload.ts (contextBridge)
      → ipcMain.handle() in ipc-handlers.ts
        → sqlite.service.ts functions
```

All channel names are constants in `ipc-channels.ts`.

---

## Packaging Notes

- **Unsigned builds** — `identity: null` in `electron-builder.yml`
- Mac: users right-click → Open to bypass Gatekeeper
- Windows: users click "More info" → "Run anyway" on SmartScreen
- No App Store / Play Store distribution
- `publish: null` — no auto-update GitHub releases configured

---

## User Data (SQLite app DB)
Stored at `app.getPath('userData')/bethel-church.db`

Tables:
- `bookmarks` — saved verses with optional notes
- `settings` — key/value (currently stores `theme: light|dark`)
- `members` — (unused, legacy)
- `events` — (unused, legacy)

---

## Branding
- App name: **Bethel Mrgashat Bible** (`Բեթել Մրգաշատ Աստվածաշունչ`)
- Primary color: `#F5A623` (golden yellow)
- Accent color: `#D0021B` (red)
- Logo: `assets/logo.png` (4446×4446px circular PNG)
- All UI labels are in **Armenian**
