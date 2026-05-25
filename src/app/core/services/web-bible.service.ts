import { Injectable } from '@angular/core';
import type { SqlJsStatic, Database } from 'sql.js';
import { BibleDataService } from './bible-data.service';
import type { BibleTranslation, BibleBook, BibleVerse, Bookmark } from '../models/bible.models';

const TRANSLATIONS: Array<{ id: string; file: string } & BibleTranslation> = [
  { id: 'KJV',    file: 'KJV.SQLite3',    name: 'King James Version',              language: 'en',      description: 'King James Version (1850 revision)',    hasStrongNumbers: true,  rightToLeft: false },
  { id: 'Ararat', file: 'Ararat.SQLite3', name: 'Արարատյան Թարգմանություն',        language: 'hy',      description: 'Eastern Armenian Bible - ARARAT, 1910', hasStrongNumbers: false, rightToLeft: false },
  { id: 'WAB',    file: 'WAB.SQLite3',    name: 'Բեյրութի թարգմանություն',          language: 'hy-west', description: 'Western Armenian Bible, 1994',          hasStrongNumbers: false, rightToLeft: false },
  { id: 'NRAB',   file: 'NRAB.SQLite3',   name: 'Нов. Рус.-Арм. Библия',           language: 'hy-ru',   description: 'New Russian-Armenian Bible 2018',       hasStrongNumbers: false, rightToLeft: false },
  { id: 'RST77',  file: 'RST77.SQLite3',  name: 'Синодальный перевод',              language: 'ru',      description: 'Russian Synodal Translation 1977',      hasStrongNumbers: false, rightToLeft: false },
  { id: 'RSTI',   file: 'RSTI.SQLite3',   name: 'Синодальный (с индексами)',        language: 'ru',      description: 'Russian Synodal with indices',          hasStrongNumbers: false, rightToLeft: false },
  { id: 'RSTM',   file: 'RSTM.SQLite3',   name: 'Синодальный (с морфологией)',      language: 'ru',      description: 'Russian Synodal with morphology',       hasStrongNumbers: false, rightToLeft: false },
];

const ARMENIAN_IDS = new Set(['Ararat', 'NRAB', 'WAB']);
const BM_KEY = 'bethel_bookmarks';

function stripMarkup(text: string): string {
  return text
    .replace(/<S>\d+<\/S>/g, '')
    .replace(/<pb\/>/g, '')
    .replace(/<f>[^<]*<\/f>/g, '')
    .replace(/<i>(.*?)<\/i>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function armenianVariants(q: string): string[] {
  const s = new Set([q]);
  s.add(q.replace(/վ/g, 'ւ').replace(/Վ/g, 'Ւ').replace(/հ/g, 'յ').replace(/Հ/g, 'Յ'));
  s.add(q.replace(/ւ/g, 'վ').replace(/Ւ/g, 'Վ').replace(/յ/g, 'հ').replace(/Յ/g, 'Հ'));
  return [...s];
}

@Injectable()
export class WebBibleService extends BibleDataService {
  private sqlPromise: Promise<SqlJsStatic> | null = null;
  private dbCache = new Map<string, Database>();
  private dbLoading = new Map<string, Promise<Database>>();

  private getSql(): Promise<SqlJsStatic> {
    if (!this.sqlPromise) {
      this.sqlPromise = import('sql.js').then(m =>
        (m.default as (config: object) => Promise<SqlJsStatic>)({
          locateFile: (f: string) => `assets/${f}`
        })
      );
    }
    return this.sqlPromise;
  }

  private async getDb(id: string): Promise<Database> {
    if (this.dbCache.has(id)) return this.dbCache.get(id)!;
    if (this.dbLoading.has(id)) return this.dbLoading.get(id)!;

    const meta = TRANSLATIONS.find(t => t.id === id);
    if (!meta) throw new Error(`Unknown translation: ${id}`);

    const promise = (async () => {
      const SQL = await this.getSql();
      const res = await fetch(`assets/databases/${meta.file}`);
      if (!res.ok) throw new Error(`Cannot load ${meta.file}`);
      const buf = await res.arrayBuffer();
      const db = new SQL.Database(new Uint8Array(buf));
      db.create_function('ulower', (s: unknown) => typeof s === 'string' ? s.toLowerCase() : s);
      this.dbCache.set(id, db);
      this.dbLoading.delete(id);
      return db;
    })();

    this.dbLoading.set(id, promise);
    return promise;
  }

  private query<T>(db: Database, sql: string, params: (string | number)[] = []): T[] {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows: T[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject() as T);
    stmt.free();
    return rows;
  }

  async getTranslations(): Promise<BibleTranslation[]> {
    const checks = await Promise.allSettled(
      TRANSLATIONS.map(t => fetch(`assets/databases/${t.file}`, { method: 'HEAD' }))
    );
    return TRANSLATIONS.filter((_, i) => {
      const r = checks[i];
      return r.status === 'fulfilled' && r.value.ok;
    });
  }

  async getBooks(id: string): Promise<BibleBook[]> {
    const db = await this.getDb(id);
    return this.query<BibleBook>(db, `
      SELECT b.book_number, b.short_name, b.long_name, b.book_color,
             COUNT(DISTINCT v.chapter) as chapter_count
      FROM books b
      LEFT JOIN verses v ON b.book_number = v.book_number
      GROUP BY b.book_number ORDER BY b.book_number
    `);
  }

  async getChapters(id: string, bookNumber: number): Promise<number[]> {
    const db = await this.getDb(id);
    const rows = this.query<{ chapter: number }>(db,
      'SELECT DISTINCT chapter FROM verses WHERE book_number = ? ORDER BY chapter',
      [bookNumber]
    );
    return rows.map(r => Number(r.chapter));
  }

  async getVerses(id: string, bookNumber: number, chapter: number): Promise<BibleVerse[]> {
    const db = await this.getDb(id);
    const nameRow = this.query<{ long_name: string }>(db,
      'SELECT long_name FROM books WHERE book_number = ?', [bookNumber]
    )[0];
    const bookName = nameRow?.long_name ?? '';
    const rows = this.query<BibleVerse>(db,
      'SELECT book_number, chapter, verse, text FROM verses WHERE book_number = ? AND chapter = ? ORDER BY verse',
      [bookNumber, chapter]
    );
    return rows.map(r => ({ ...r, text: stripMarkup(r.text), book_name: bookName }));
  }

  async search(id: string, query: string): Promise<BibleVerse[]> {
    if (!query.trim()) return [];
    const db = await this.getDb(id);
    const variants = ARMENIAN_IDS.has(id) ? armenianVariants(query.trim()) : [query.trim()];
    const conditions = variants.map(() => `ulower(v.text) LIKE ulower(?) ESCAPE '\\'`).join(' OR ');
    const params = variants.map(v => `%${v}%`);
    const rows = this.query<BibleVerse>(db, `
      SELECT v.book_number, v.chapter, v.verse, v.text, b.long_name as book_name
      FROM verses v JOIN books b ON v.book_number = b.book_number
      WHERE ${conditions} LIMIT 200
    `, params);
    return rows.map(r => ({ ...r, text: stripMarkup(r.text) }));
  }

  getBookmarks(): Promise<Bookmark[]> {
    const raw = localStorage.getItem(BM_KEY) ?? '[]';
    return Promise.resolve(JSON.parse(raw) as Bookmark[]);
  }

  addBookmark(bm: Omit<Bookmark, 'id' | 'created_at'>): Promise<Bookmark> {
    const list: Bookmark[] = JSON.parse(localStorage.getItem(BM_KEY) ?? '[]');
    const entry: Bookmark = { ...bm, id: Date.now(), created_at: new Date().toISOString() };
    list.unshift(entry);
    localStorage.setItem(BM_KEY, JSON.stringify(list));
    return Promise.resolve(entry);
  }

  removeBookmark(id: number): Promise<void> {
    const list: Bookmark[] = JSON.parse(localStorage.getItem(BM_KEY) ?? '[]');
    localStorage.setItem(BM_KEY, JSON.stringify(list.filter(b => b.id !== id)));
    return Promise.resolve();
  }
}
