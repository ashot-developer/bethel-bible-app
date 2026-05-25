import { Injectable } from '@angular/core';
import type { BibleTranslation, BibleBook, BibleVerse, Bookmark } from '../models/bible.models';

@Injectable()
export abstract class BibleDataService {
  abstract getTranslations(): Promise<BibleTranslation[]>;
  abstract getBooks(translationId: string): Promise<BibleBook[]>;
  abstract getChapters(translationId: string, bookNumber: number): Promise<number[]>;
  abstract getVerses(translationId: string, bookNumber: number, chapter: number): Promise<BibleVerse[]>;
  abstract search(translationId: string, query: string): Promise<BibleVerse[]>;
  abstract getBookmarks(): Promise<Bookmark[]>;
  abstract addBookmark(bm: Omit<Bookmark, 'id' | 'created_at'>): Promise<Bookmark>;
  abstract removeBookmark(id: number): Promise<void>;
}
