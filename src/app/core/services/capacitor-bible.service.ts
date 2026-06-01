import { Injectable } from '@angular/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';
import { BibleDataService } from './bible-data.service';
import type { BibleTranslation, BibleBook, BibleVerse, Bookmark } from '../models/bible.models';

const TRANSLATIONS: BibleTranslation[] = [
  { id: 'WAB',    name: 'Բեյրութի թարգմանություն',   language: 'hy-west', description: 'Western Armenian Bible, 1994',          hasStrongNumbers: false, rightToLeft: false },
  { id: 'Ararat', name: 'Արարատյան Թարգմանություն',   language: 'hy',      description: 'Eastern Armenian Bible - ARARAT, 1910', hasStrongNumbers: false, rightToLeft: false },
  { id: 'RST77',  name: 'Синодальный перевод',         language: 'ru',      description: 'Russian Synodal Translation 1977',      hasStrongNumbers: false, rightToLeft: false },
  { id: 'RSTI',   name: 'Синодальный (с индексами)',   language: 'ru',      description: 'Russian Synodal with indices',          hasStrongNumbers: false, rightToLeft: false },
  { id: 'RSTM',   name: 'Синодальный (с морфологией)', language: 'ru',      description: 'Russian Synodal with morphology',       hasStrongNumbers: false, rightToLeft: false },
  { id: 'KJV',    name: 'King James Version',          language: 'en',      description: 'King James Version (1850 revision)',    hasStrongNumbers: true,  rightToLeft: false },
];

const ARMENIAN_IDS = new Set(['WAB', 'Ararat']);
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
  const VO   = '\u0578';
  const YIWN = '\u0582';
  const U    = VO + YIWN;

  const subs: [RegExp, string][] = [
    [/\u057e/g, '\u0582'], [/\u0582/g, '\u057e'],
    [/\u054e/g, '\u0552'], [/\u0552/g, '\u054e'],
    [/\u0570/g, '\u0575'], [/\u0575/g, '\u0570'],
    [/\u0540/g, '\u0545'], [/\u0545/g, '\u0540'],
    [/\u0567/g, '\u0565'], [/\u0565/g, '\u0567'],
    [/\u0537/g, '\u0535'], [/\u0535/g, '\u0537'],
    [/\u0587/g, '\u0565\u0582'], [/\u0565\u0582/g, '\u0587'],
    [new RegExp(U, 'g'), VO],
    [new RegExp(`${VO}(?!${YIWN})`, 'g'), U],
  ];

  const variants = new Set<string>([q]);
  for (const [find, rep] of subs) {
    for (const v of [...variants]) {
      const n = v.replace(find, rep);
      if (n !== v) variants.add(n);
    }
  }
  return [...variants].filter(v => v.length > 0);
}

type CachedVerse = { book_number: number; chapter: number; verse: number; text: string; text_lower: string; book_name: string };

@Injectable()
export class CapacitorBibleService extends BibleDataService {
  private sqlite     = new SQLiteConnection(CapacitorSQLite);
  private dbCache    = new Map<string, SQLiteDBConnection>();
  private verseCache = new Map<string, CachedVerse[]>();

  private async getDb(id: string): Promise<SQLiteDBConnection> {
    if (this.dbCache.has(id)) return this.dbCache.get(id)!;

    // On first use, copy the DB from assets to device storage
    await CapacitorSQLite.copyFromAssets({ overwrite: false });

    const db = await this.sqlite.createConnection(id, false, 'no-encryption', 1, false);
    await db.open();
    this.dbCache.set(id, db);
    return db;
  }

  private async query<T>(db: SQLiteDBConnection, sql: string, values: (string | number)[] = []): Promise<T[]> {
    const res = await db.query(sql, values);
    return (res.values ?? []) as T[];
  }

  private async getVerseCache(id: string): Promise<CachedVerse[]> {
    if (this.verseCache.has(id)) return this.verseCache.get(id)!;
    const db   = await this.getDb(id);
    const rows = await this.query<{ book_number: number; chapter: number; verse: number; text: string; book_name: string }>(db, `
      SELECT v.book_number, v.chapter, v.verse, v.text, b.long_name AS book_name
      FROM verses v JOIN books b ON v.book_number = b.book_number
    `);
    const verses = rows.map(r => {
      const text = stripMarkup(r.text);
      return { ...r, text, text_lower: text.toLowerCase() };
    });
    this.verseCache.set(id, verses);
    return verses;
  }

  async getTranslations(): Promise<BibleTranslation[]> {
    // On mobile all translations are bundled — return full list
    return TRANSLATIONS;
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
    const db   = await this.getDb(id);
    const rows = await this.query<{ chapter: number }>(db,
      'SELECT DISTINCT chapter FROM verses WHERE book_number = ? ORDER BY chapter',
      [bookNumber]
    );
    return rows.map(r => Number(r.chapter));
  }

  async getVerses(id: string, bookNumber: number, chapter: number): Promise<BibleVerse[]> {
    const db      = await this.getDb(id);
    const nameRow = (await this.query<{ long_name: string }>(db,
      'SELECT long_name FROM books WHERE book_number = ?', [bookNumber]))[0];
    const bookName = nameRow?.long_name ?? '';
    const rows = await this.query<BibleVerse>(db,
      'SELECT book_number, chapter, verse, text FROM verses WHERE book_number = ? AND chapter = ? ORDER BY verse',
      [bookNumber, chapter]
    );
    return rows.map(r => ({ ...r, text: stripMarkup(r.text), book_name: bookName }));
  }

  async search(id: string, query: string): Promise<BibleVerse[]> {
    if (!query.trim()) return [];
    const variants   = ARMENIAN_IDS.has(id) ? armenianVariants(query.trim()) : [query.trim()];
    const qlVariants = variants.map(v => v.toLowerCase());
    const spaceVars  = qlVariants.map(v => ' ' + v);
    const allVerses  = await this.getVerseCache(id);
    const results: BibleVerse[] = [];
    for (const v of allVerses) {
      const tl = v.text_lower;
      for (let i = 0; i < qlVariants.length; i++) {
        if (tl.startsWith(qlVariants[i]) || tl.includes(spaceVars[i])) { results.push(v); break; }
      }
      if (results.length >= 200) break;
    }
    return results;
  }

  async suggest(id: string, query: string): Promise<{ word: string; count: number }[]> {
    if (!query || query.trim().length < 2) return [];
    const variants   = ARMENIAN_IDS.has(id) ? armenianVariants(query.trim()) : [query.trim()];
    const qlVariants = variants.map(v => v.toLowerCase());
    const queryLower = query.trim().toLowerCase();
    const allVerses  = await this.getVerseCache(id);

    const wordSet = new Map<string, number>();
    let sampled = 0;
    for (const v of allVerses) {
      const tl = v.text_lower;
      let matches = false;
      for (const ql of qlVariants) { if (tl.includes(ql)) { matches = true; break; } }
      if (!matches) continue;
      const words = tl.split(/[\s,;:.!?«»"'()\[\]{}—–\-\/]+/).filter(w => w.length > 1);
      for (const w of words) { if (qlVariants.some(ql => w.startsWith(ql))) wordSet.set(w, (wordSet.get(w) ?? 0) + 1); }
      if (++sampled >= 400) break;
    }

    const candidates  = [...wordSet.entries()].sort((a, b) => b[1] - a[1]).slice(0, 100).map(([w]) => w);
    if (!candidates.length) return [];

    const spaceCands = candidates.map(w => ' ' + w);
    const counts     = new Array<number>(candidates.length).fill(0);
    for (const v of allVerses) {
      const tl = v.text_lower;
      for (let i = 0; i < candidates.length; i++) {
        if (tl.startsWith(candidates[i]) || tl.includes(spaceCands[i])) counts[i]++;
      }
    }
    return candidates.map((word, i) => ({ word, count: counts[i] }))
      .filter(s => s.count > 0).sort((a, b) => b.count - a.count);
  }

  getBookmarks(): Promise<Bookmark[]> {
    const raw = localStorage.getItem(BM_KEY) ?? '[]';
    return Promise.resolve(JSON.parse(raw) as Bookmark[]);
  }

  addBookmark(bm: Omit<Bookmark, 'id' | 'created_at'>): Promise<Bookmark> {
    const list: Bookmark[] = JSON.parse(localStorage.getItem(BM_KEY) ?? '[]');
    const entry: Bookmark  = { ...bm, id: Date.now(), created_at: new Date().toISOString() };
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
