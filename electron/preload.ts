import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../electron-utils/ipc-channels';
import type {
  BibleBook,
  BibleVerse,
  BibleTranslation,
  Bookmark,
  Member,
  ChurchEvent,
  UpdateStatus
} from '../electron-utils/ipc-channels';

const invoke = (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld('electronAPI', {
  bible: {
    getTranslations: (): Promise<BibleTranslation[]> =>
      invoke(IPC_CHANNELS.BIBLE.GET_TRANSLATIONS),
    getBooks: (translationId: string): Promise<BibleBook[]> =>
      invoke(IPC_CHANNELS.BIBLE.GET_BOOKS, translationId),
    getChapters: (translationId: string, bookNumber: number): Promise<number[]> =>
      invoke(IPC_CHANNELS.BIBLE.GET_CHAPTERS, translationId, bookNumber),
    getVerses: (translationId: string, bookNumber: number, chapter: number): Promise<BibleVerse[]> =>
      invoke(IPC_CHANNELS.BIBLE.GET_VERSES, translationId, bookNumber, chapter),
    getVerse: (translationId: string, bookNumber: number, chapter: number, verse: number): Promise<BibleVerse | null> =>
      invoke(IPC_CHANNELS.BIBLE.GET_VERSE, translationId, bookNumber, chapter, verse),
    search: (translationId: string, query: string): Promise<BibleVerse[]> =>
      invoke(IPC_CHANNELS.BIBLE.SEARCH, translationId, query),
  },

  bookmarks: {
    getAll: (): Promise<Bookmark[]> =>
      invoke(IPC_CHANNELS.BOOKMARKS.GET_ALL),
    add: (bookmark: Omit<Bookmark, 'id' | 'created_at'>): Promise<Bookmark> =>
      invoke(IPC_CHANNELS.BOOKMARKS.ADD, bookmark),
    remove: (id: number): Promise<void> =>
      invoke(IPC_CHANNELS.BOOKMARKS.REMOVE, id),
    isBookmarked: (translation: string, bookNumber: number, chapter: number, verse: number): Promise<boolean> =>
      invoke(IPC_CHANNELS.BOOKMARKS.IS_BOOKMARKED, translation, bookNumber, chapter, verse),
  },

  members: {
    getAll: (search?: string): Promise<Member[]> =>
      invoke(IPC_CHANNELS.MEMBERS.GET_ALL, search),
    add: (member: Omit<Member, 'id' | 'created_at'>): Promise<Member> =>
      invoke(IPC_CHANNELS.MEMBERS.ADD, member),
    update: (member: Member): Promise<void> =>
      invoke(IPC_CHANNELS.MEMBERS.UPDATE, member),
    delete: (id: number): Promise<void> =>
      invoke(IPC_CHANNELS.MEMBERS.DELETE, id),
  },

  events: {
    getAll: (): Promise<ChurchEvent[]> =>
      invoke(IPC_CHANNELS.EVENTS.GET_ALL),
    getUpcoming: (): Promise<ChurchEvent[]> =>
      invoke(IPC_CHANNELS.EVENTS.GET_UPCOMING),
    add: (event: Omit<ChurchEvent, 'id' | 'created_at'>): Promise<ChurchEvent> =>
      invoke(IPC_CHANNELS.EVENTS.ADD, event),
    update: (event: ChurchEvent): Promise<void> =>
      invoke(IPC_CHANNELS.EVENTS.UPDATE, event),
    delete: (id: number): Promise<void> =>
      invoke(IPC_CHANNELS.EVENTS.DELETE, id),
  },

  app: {
    getVersion: (): Promise<string> =>
      invoke(IPC_CHANNELS.APP.GET_VERSION),
    openExternal: (url: string): Promise<void> =>
      invoke(IPC_CHANNELS.APP.OPEN_EXTERNAL, url),
  },

  theme: {
    get: (): Promise<string> =>
      invoke(IPC_CHANNELS.THEME.GET),
    set: (theme: string): Promise<void> =>
      invoke(IPC_CHANNELS.THEME.SET, theme),
  },

  update: {
    getStatus: (): Promise<UpdateStatus> =>
      invoke(IPC_CHANNELS.UPDATE.GET_STATUS),
    check: (): Promise<UpdateStatus> =>
      invoke(IPC_CHANNELS.UPDATE.CHECK),
    openDownload: (url: string): Promise<void> =>
      invoke(IPC_CHANNELS.UPDATE.OPEN_DOWNLOAD, url),
  },

  on: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(channel, (_, ...args) => callback(...args));
  },

  off: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.off(channel, callback as never);
  },
});
