import { Injectable, inject } from '@angular/core';
import { BibleDataService } from './bible-data.service';
import { ElectronService } from './electron.service';
import type { BibleTranslation, BibleBook, BibleVerse, Bookmark } from '../models/bible.models';

@Injectable()
export class ElectronBibleService extends BibleDataService {
  private e = inject(ElectronService);

  getTranslations(): Promise<BibleTranslation[]>                                          { return this.e.bible!.getTranslations(); }
  getBooks(t: string): Promise<BibleBook[]>                                               { return this.e.bible!.getBooks(t); }
  getChapters(t: string, b: number): Promise<number[]>                                   { return this.e.bible!.getChapters(t, b); }
  getVerses(t: string, b: number, c: number): Promise<BibleVerse[]>                      { return this.e.bible!.getVerses(t, b, c); }
  search(t: string, q: string): Promise<BibleVerse[]>                                    { return this.e.bible!.search(t, q); }
  getBookmarks(): Promise<Bookmark[]>                                                     { return this.e.bookmarks!.getAll(); }
  addBookmark(bm: Omit<Bookmark, 'id' | 'created_at'>): Promise<Bookmark>               { return this.e.bookmarks!.add(bm); }
  removeBookmark(id: number): Promise<void>                                               { return this.e.bookmarks!.remove(id); }
}
