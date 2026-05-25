import { Injectable } from '@angular/core';
import type { BibleBook, BibleTranslation, BibleVerse, Bookmark } from '../models/bible.models';
import type { Member } from '../models/member.models';
import type { ChurchEvent } from '../models/event.models';

export interface UpdateStatus {
  state: 'idle' | 'checking' | 'available' | 'not-available' | 'error';
  currentVersion?: string;
  latestVersion?: string;
  releaseUrl?: string;
  downloadUrl?: string;
  releaseNotes?: string;
  error?: string;
}

interface ElectronAPI {
  bible: {
    getTranslations(): Promise<BibleTranslation[]>;
    getBooks(translationId: string): Promise<BibleBook[]>;
    getChapters(translationId: string, bookNumber: number): Promise<number[]>;
    getVerses(translationId: string, bookNumber: number, chapter: number): Promise<BibleVerse[]>;
    getVerse(translationId: string, bookNumber: number, chapter: number, verse: number): Promise<BibleVerse | null>;
    search(translationId: string, query: string): Promise<BibleVerse[]>;
  };
  bookmarks: {
    getAll(): Promise<Bookmark[]>;
    add(bookmark: Omit<Bookmark, 'id' | 'created_at'>): Promise<Bookmark>;
    remove(id: number): Promise<void>;
    isBookmarked(translation: string, bookNumber: number, chapter: number, verse: number): Promise<boolean>;
  };
  members: {
    getAll(search?: string): Promise<Member[]>;
    add(member: Omit<Member, 'id' | 'created_at'>): Promise<Member>;
    update(member: Member): Promise<void>;
    delete(id: number): Promise<void>;
  };
  events: {
    getAll(): Promise<ChurchEvent[]>;
    getUpcoming(): Promise<ChurchEvent[]>;
    add(event: Omit<ChurchEvent, 'id' | 'created_at'>): Promise<ChurchEvent>;
    update(event: ChurchEvent): Promise<void>;
    delete(id: number): Promise<void>;
  };
  app: {
    getVersion(): Promise<string>;
    openExternal(url: string): Promise<void>;
  };
  theme: {
    get(): Promise<string>;
    set(theme: string): Promise<void>;
  };
  update: {
    getStatus(): Promise<UpdateStatus>;
    check(): Promise<UpdateStatus>;
    openDownload(url: string): Promise<void>;
  };
  on(channel: string, callback: (...args: unknown[]) => void): void;
  off(channel: string, callback: (...args: unknown[]) => void): void;
}

@Injectable({ providedIn: 'root' })
export class ElectronService {
  private api: ElectronAPI | null = null;

  constructor() {
    this.api = (window as unknown as { electronAPI: ElectronAPI }).electronAPI ?? null;
  }

  get isElectron(): boolean {
    return this.api !== null;
  }

  get bible() {
    return this.api?.bible;
  }

  get bookmarks() {
    return this.api?.bookmarks;
  }

  get members() {
    return this.api?.members;
  }

  get events() {
    return this.api?.events;
  }

  get appApi() {
    return this.api?.app;
  }

  get themeApi() {
    return this.api?.theme;
  }

  get updateApi() {
    return this.api?.update;
  }

  on(channel: string, callback: (...args: unknown[]) => void): void {
    this.api?.on(channel, callback);
  }

  off(channel: string, callback: (...args: unknown[]) => void): void {
    this.api?.off(channel, callback);
  }
}
