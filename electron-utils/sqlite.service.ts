import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import type {
  BibleBook,
  BibleVerse,
  BibleTranslation,
  Bookmark,
  Member,
  ChurchEvent
} from './ipc-channels';

const isDev = !app.isPackaged;

function getBibleDbPath(filename: string): string {
  if (isDev) {
    // __dirname = dist/electron/electron-utils → go up 3 to project root, then src/assets/databases
    return path.join(__dirname, '../../../src/assets/databases', filename);
  }
  return path.join(process.resourcesPath, 'databases', filename);
}

function getAppDbPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'bethel-church.db');
}

const TRANSLATIONS: Record<string, { file: string; name: string; language: string; description: string; hasStrongNumbers: boolean; rightToLeft: boolean }> = {
  'WAB':    { file: 'WAB.SQLite3',    name: 'Բեյրութի թարգմանություն', language: 'hy-west', description: 'Western Armenian Bible, 1994', hasStrongNumbers: false, rightToLeft: false },
  'Ararat': { file: 'Ararat.SQLite3', name: 'Արարատյան Թարգմանություն', language: 'hy', description: 'Eastern Armenian Bible - ARARAT, 1910', hasStrongNumbers: false, rightToLeft: false },
  'KJV': { file: 'KJV.SQLite3', name: 'King James Version', language: 'en', description: 'King James Version (1850 revision)', hasStrongNumbers: true, rightToLeft: false },
  'NRAB': { file: 'NRAB.SQLite3', name: 'Нов. Рус.-Арм. Библия', language: 'hy-ru', description: 'New Russian-Armenian Bible 2018', hasStrongNumbers: false, rightToLeft: false },
  'RST77': { file: 'RST77.SQLite3', name: 'Синодальный перевод', language: 'ru', description: 'Russian Synodal Translation 1977', hasStrongNumbers: false, rightToLeft: false },
  'RSTI':  { file: 'RSTI.SQLite3',  name: 'Синодальный (с индексами)', language: 'ru', description: 'Russian Synodal with indices', hasStrongNumbers: false, rightToLeft: false },
  'RSTM':  { file: 'RSTM.SQLite3',  name: 'Синодальный (с морфологией)', language: 'ru', description: 'Russian Synodal with morphology', hasStrongNumbers: false, rightToLeft: false },
};

// Bible DBs cache
const bibleDbCache: Record<string, Database.Database> = {};

function getBibleDb(translationId: string): Database.Database {
  if (bibleDbCache[translationId]) return bibleDbCache[translationId];
  const meta = TRANSLATIONS[translationId];
  if (!meta) throw new Error(`Unknown translation: ${translationId}`);
  const dbPath = getBibleDbPath(meta.file);
  if (!fs.existsSync(dbPath)) throw new Error(`Bible database not found: ${dbPath}`);
  const db = new Database(dbPath, { readonly: true });
  // SQLite built-in lower() is ASCII-only; this handles full Unicode including Armenian
  db.function('ulower', (s: unknown) => (typeof s === 'string' ? s.toLowerCase() : s));
  bibleDbCache[translationId] = db;
  return db;
}

// App DB (mutable)
let appDb: Database.Database | null = null;

function getAppDb(): Database.Database {
  if (appDb) return appDb;
  const dbPath = getAppDbPath();
  appDb = new Database(dbPath);
  initAppDb(appDb);
  return appDb;
}

function initAppDb(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      translation TEXT NOT NULL,
      book_number INTEGER NOT NULL,
      chapter INTEGER NOT NULL,
      verse INTEGER NOT NULL,
      text TEXT NOT NULL DEFAULT '',
      book_name TEXT NOT NULL DEFAULT '',
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      join_date TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      date TEXT NOT NULL,
      time TEXT DEFAULT '',
      location TEXT DEFAULT '',
      type TEXT DEFAULT 'service',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

// Strip markup tags from Bible verse text
function stripVerseMarkup(text: string): string {
  return text
    .replace(/<S>\d+<\/S>/g, '')
    .replace(/<pb\/>/g, '')
    .replace(/<f>[^<]*<\/f>/g, '')
    .replace(/<i>(.*?)<\/i>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .trim();
}

// ─── Bible API ───────────────────────────────────────────────────────────────

export function getTranslations(): BibleTranslation[] {
  return Object.entries(TRANSLATIONS)
    .filter(([id, meta]) => {
      const dbPath = getBibleDbPath(meta.file);
      return fs.existsSync(dbPath);
    })
    .map(([id, meta]) => ({
      id,
      name: meta.name,
      language: meta.language,
      description: meta.description,
      hasStrongNumbers: meta.hasStrongNumbers,
      rightToLeft: meta.rightToLeft,
    }));
}

export function getBooks(translationId: string): BibleBook[] {
  const db = getBibleDb(translationId);
  const rows = db.prepare(`
    SELECT b.book_number, b.short_name, b.long_name, b.book_color,
           COUNT(DISTINCT v.chapter) as chapter_count
    FROM books b
    LEFT JOIN verses v ON b.book_number = v.book_number
    GROUP BY b.book_number
    ORDER BY b.book_number
  `).all() as BibleBook[];
  return rows;
}

export function getChapters(translationId: string, bookNumber: number): number[] {
  const db = getBibleDb(translationId);
  const rows = db.prepare(`
    SELECT DISTINCT chapter FROM verses
    WHERE book_number = ?
    ORDER BY chapter
  `).all(bookNumber) as { chapter: number }[];
  return rows.map(r => r.chapter);
}

export function getVerses(translationId: string, bookNumber: number, chapter: number): BibleVerse[] {
  const db = getBibleDb(translationId);
  const bookRow = db.prepare('SELECT long_name FROM books WHERE book_number = ?').get(bookNumber) as { long_name: string } | undefined;
  const bookName = bookRow?.long_name || '';

  const rows = db.prepare(`
    SELECT book_number, chapter, verse, text
    FROM verses
    WHERE book_number = ? AND chapter = ?
    ORDER BY verse
  `).all(bookNumber, chapter) as BibleVerse[];

  return rows.map(r => ({ ...r, text: stripVerseMarkup(r.text), book_name: bookName }));
}

export function getVerse(translationId: string, bookNumber: number, chapter: number, verse: number): BibleVerse | null {
  const db = getBibleDb(translationId);
  const bookRow = db.prepare('SELECT long_name FROM books WHERE book_number = ?').get(bookNumber) as { long_name: string } | undefined;
  const bookName = bookRow?.long_name || '';
  const row = db.prepare(`
    SELECT book_number, chapter, verse, text FROM verses
    WHERE book_number = ? AND chapter = ? AND verse = ?
  `).get(bookNumber, chapter, verse) as BibleVerse | undefined;
  if (!row) return null;
  return { ...row, text: stripVerseMarkup(row.text), book_name: bookName };
}

// Modern Eastern Armenian ↔ Classical Armenian character mapping.
// Users type modern Eastern Armenian; old translations use classical spelling.
function armenianVariants(query: string): string[] {
  const VO   = 'ո';     // ո
  const YIWN = 'ւ';     // ւ
  const U    = VO + YIWN;   // ու  (digraph)

  const variants = new Set<string>([query]);

  // Modern Eastern Armenian → Classical
  variants.add(query
    .replace(/վ/g, 'ւ').replace(/Վ/g, 'Ւ')  // վ→ւ, Վ→Ւ
    .replace(/հ/g, 'յ').replace(/Հ/g, 'Յ')  // հ→յ, Հ→Յ
    .replace(/և/g, 'եւ')                          // և→եւ
    .replace(new RegExp(U, 'g'), VO)                             // ու→ո
  );

  // Classical → Modern Eastern Armenian
  variants.add(query
    .replace(/ւ/g, 'վ').replace(/Ւ/g, 'Վ')  // ւ→վ, Ւ→Վ
    .replace(/յ/g, 'հ').replace(/Յ/g, 'Հ')  // յ→հ, Յ→Հ
    .replace(/եւ/g, 'և')                          // եւ→և
    .replace(new RegExp(`${VO}(?!${YIWN})`, 'g'), U)            // ո→ու (when not already ու)
  );

  return [...variants].filter(v => v.length > 0);
}

const ARMENIAN_TRANSLATIONS = new Set(['Ararat', 'NRAB', 'WAB']);

export function searchVerses(translationId: string, query: string): BibleVerse[] {
  if (!query || query.trim().length < 1) return [];
  const db = getBibleDb(translationId);

  const variants = ARMENIAN_TRANSLATIONS.has(translationId)
    ? armenianVariants(query.trim())
    : [query.trim()];

  const conditions = variants.map(() => `ulower(v.text) LIKE ulower(?) ESCAPE '\\'`).join(' OR ');
  const params     = variants.map(v => `%${v}%`);

  const rows = db.prepare(`
    SELECT v.book_number, v.chapter, v.verse, v.text, b.long_name as book_name
    FROM verses v
    JOIN books b ON v.book_number = b.book_number
    WHERE ${conditions}
    LIMIT 200
  `).all(...params) as BibleVerse[];

  return rows.map(r => ({ ...r, text: stripVerseMarkup(r.text) }));
}

// ─── Bookmarks API ───────────────────────────────────────────────────────────

export function getBookmarks(): Bookmark[] {
  const db = getAppDb();
  return db.prepare('SELECT * FROM bookmarks ORDER BY created_at DESC').all() as Bookmark[];
}

export function addBookmark(bookmark: Omit<Bookmark, 'id' | 'created_at'>): Bookmark {
  const db = getAppDb();
  const info = db.prepare(`
    INSERT INTO bookmarks (translation, book_number, chapter, verse, text, book_name, note)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    bookmark.translation,
    bookmark.book_number,
    bookmark.chapter,
    bookmark.verse,
    bookmark.text,
    bookmark.book_name || '',
    bookmark.note || ''
  );
  return { ...bookmark, id: info.lastInsertRowid as number };
}

export function removeBookmark(id: number): void {
  const db = getAppDb();
  db.prepare('DELETE FROM bookmarks WHERE id = ?').run(id);
}

export function isBookmarked(translation: string, bookNumber: number, chapter: number, verse: number): boolean {
  const db = getAppDb();
  const row = db.prepare(`
    SELECT id FROM bookmarks
    WHERE translation = ? AND book_number = ? AND chapter = ? AND verse = ?
  `).get(translation, bookNumber, chapter, verse);
  return !!row;
}

// ─── Members API ─────────────────────────────────────────────────────────────

export function getMembers(search?: string): Member[] {
  const db = getAppDb();
  if (search) {
    return db.prepare(`
      SELECT * FROM members WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?
      ORDER BY name
    `).all(`%${search}%`, `%${search}%`, `%${search}%`) as Member[];
  }
  return db.prepare('SELECT * FROM members ORDER BY name').all() as Member[];
}

export function addMember(member: Omit<Member, 'id' | 'created_at'>): Member {
  const db = getAppDb();
  const info = db.prepare(`
    INSERT INTO members (name, email, phone, join_date, status, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(member.name, member.email || '', member.phone || '', member.join_date || '', member.status, member.notes || '');
  return { ...member, id: info.lastInsertRowid as number };
}

export function updateMember(member: Member): void {
  const db = getAppDb();
  db.prepare(`
    UPDATE members SET name=?, email=?, phone=?, join_date=?, status=?, notes=?
    WHERE id=?
  `).run(member.name, member.email || '', member.phone || '', member.join_date || '', member.status, member.notes || '', member.id);
}

export function deleteMember(id: number): void {
  const db = getAppDb();
  db.prepare('DELETE FROM members WHERE id = ?').run(id);
}

// ─── Events API ──────────────────────────────────────────────────────────────

export function getEvents(): ChurchEvent[] {
  const db = getAppDb();
  return db.prepare('SELECT * FROM events ORDER BY date, time').all() as ChurchEvent[];
}

export function getUpcomingEvents(limit = 10): ChurchEvent[] {
  const db = getAppDb();
  return db.prepare(`
    SELECT * FROM events
    WHERE date >= date('now')
    ORDER BY date, time
    LIMIT ?
  `).all(limit) as ChurchEvent[];
}

export function addEvent(event: Omit<ChurchEvent, 'id' | 'created_at'>): ChurchEvent {
  const db = getAppDb();
  const info = db.prepare(`
    INSERT INTO events (title, description, date, time, location, type)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(event.title, event.description || '', event.date, event.time || '', event.location || '', event.type);
  return { ...event, id: info.lastInsertRowid as number };
}

export function updateEvent(event: ChurchEvent): void {
  const db = getAppDb();
  db.prepare(`
    UPDATE events SET title=?, description=?, date=?, time=?, location=?, type=?
    WHERE id=?
  `).run(event.title, event.description || '', event.date, event.time || '', event.location || '', event.type, event.id);
}

export function deleteEvent(id: number): void {
  const db = getAppDb();
  db.prepare('DELETE FROM events WHERE id = ?').run(id);
}

// ─── Settings API ────────────────────────────────────────────────────────────

export function getSetting(key: string): string | null {
  const db = getAppDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  const db = getAppDb();
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}
