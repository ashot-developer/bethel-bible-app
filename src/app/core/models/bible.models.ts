export interface BibleTranslation {
  id: string;
  name: string;
  language: string;
  description: string;
  hasStrongNumbers: boolean;
  rightToLeft: boolean;
}

export interface BibleBook {
  book_number: number;
  short_name: string;
  long_name: string;
  book_color: string;
  chapter_count?: number;
}

export interface BibleVerse {
  book_number: number;
  chapter: number;
  verse: number;
  text: string;
  book_name?: string;
}

export interface Bookmark {
  id?: number;
  translation: string;
  book_number: number;
  chapter: number;
  verse: number;
  text: string;
  note?: string;
  book_name?: string;
  created_at?: string;
}
