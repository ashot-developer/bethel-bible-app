export const IPC_CHANNELS = {
  BIBLE: {
    GET_TRANSLATIONS: 'bible:getTranslations',
    GET_BOOKS: 'bible:getBooks',
    GET_CHAPTERS: 'bible:getChapters',
    GET_VERSES: 'bible:getVerses',
    GET_VERSE: 'bible:getVerse',
    SEARCH: 'bible:search',
  },
  BOOKMARKS: {
    GET_ALL: 'bookmarks:getAll',
    ADD: 'bookmarks:add',
    REMOVE: 'bookmarks:remove',
    IS_BOOKMARKED: 'bookmarks:isBookmarked',
  },
  MEMBERS: {
    GET_ALL: 'members:getAll',
    ADD: 'members:add',
    UPDATE: 'members:update',
    DELETE: 'members:delete',
    SEARCH: 'members:search',
  },
  EVENTS: {
    GET_ALL: 'events:getAll',
    GET_UPCOMING: 'events:getUpcoming',
    ADD: 'events:add',
    UPDATE: 'events:update',
    DELETE: 'events:delete',
  },
  APP: {
    GET_VERSION: 'app:getVersion',
    CHECK_UPDATE: 'app:checkUpdate',
    OPEN_EXTERNAL: 'app:openExternal',
  },
  THEME: {
    SET: 'theme:set',
    GET: 'theme:get',
  },
  UPDATE: {
    CHECK: 'update:check',
    GET_STATUS: 'update:getStatus',
    OPEN_DOWNLOAD: 'update:openDownload',
    STATUS: 'update:status',
  }
} as const;

export interface UpdateStatus {
  state: 'idle' | 'checking' | 'available' | 'not-available' | 'error';
  currentVersion?: string;
  latestVersion?: string;
  releaseUrl?: string;
  downloadUrl?: string;
  releaseNotes?: string;
  error?: string;
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

export interface BibleTranslation {
  id: string;
  name: string;
  language: string;
  description: string;
  hasStrongNumbers: boolean;
  rightToLeft: boolean;
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

export interface Member {
  id?: number;
  name: string;
  email?: string;
  phone?: string;
  join_date?: string;
  status: 'active' | 'inactive';
  notes?: string;
  created_at?: string;
}

export interface ChurchEvent {
  id?: number;
  title: string;
  description?: string;
  date: string;
  time?: string;
  location?: string;
  type: 'service' | 'prayer' | 'youth' | 'special' | 'other';
  created_at?: string;
}
