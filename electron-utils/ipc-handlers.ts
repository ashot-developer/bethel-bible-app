import { ipcMain, shell, app } from 'electron';
import { IPC_CHANNELS } from './ipc-channels';
import * as db from './sqlite.service';

export function registerIpcHandlers(): void {
  // ── Bible ──────────────────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.BIBLE.GET_TRANSLATIONS, () => db.getTranslations());
  ipcMain.handle(IPC_CHANNELS.BIBLE.GET_BOOKS, (_, translationId: string) => db.getBooks(translationId));
  ipcMain.handle(IPC_CHANNELS.BIBLE.GET_CHAPTERS, (_, translationId: string, bookNumber: number) =>
    db.getChapters(translationId, bookNumber));
  ipcMain.handle(IPC_CHANNELS.BIBLE.GET_VERSES, (_, translationId: string, bookNumber: number, chapter: number) =>
    db.getVerses(translationId, bookNumber, chapter));
  ipcMain.handle(IPC_CHANNELS.BIBLE.GET_VERSE, (_, translationId: string, bookNumber: number, chapter: number, verse: number) =>
    db.getVerse(translationId, bookNumber, chapter, verse));
  ipcMain.handle(IPC_CHANNELS.BIBLE.SEARCH, (_, translationId: string, query: string) =>
    db.searchVerses(translationId, query));

  // ── Bookmarks ──────────────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.BOOKMARKS.GET_ALL, () => db.getBookmarks());
  ipcMain.handle(IPC_CHANNELS.BOOKMARKS.ADD, (_, bookmark) => db.addBookmark(bookmark));
  ipcMain.handle(IPC_CHANNELS.BOOKMARKS.REMOVE, (_, id: number) => db.removeBookmark(id));
  ipcMain.handle(IPC_CHANNELS.BOOKMARKS.IS_BOOKMARKED, (_, translation: string, bookNumber: number, chapter: number, verse: number) =>
    db.isBookmarked(translation, bookNumber, chapter, verse));

  // ── Members ────────────────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.MEMBERS.GET_ALL, (_, search?: string) => db.getMembers(search));
  ipcMain.handle(IPC_CHANNELS.MEMBERS.SEARCH, (_, query: string) => db.getMembers(query));
  ipcMain.handle(IPC_CHANNELS.MEMBERS.ADD, (_, member) => db.addMember(member));
  ipcMain.handle(IPC_CHANNELS.MEMBERS.UPDATE, (_, member) => db.updateMember(member));
  ipcMain.handle(IPC_CHANNELS.MEMBERS.DELETE, (_, id: number) => db.deleteMember(id));

  // ── Events ─────────────────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.EVENTS.GET_ALL, () => db.getEvents());
  ipcMain.handle(IPC_CHANNELS.EVENTS.GET_UPCOMING, () => db.getUpcomingEvents());
  ipcMain.handle(IPC_CHANNELS.EVENTS.ADD, (_, event) => db.addEvent(event));
  ipcMain.handle(IPC_CHANNELS.EVENTS.UPDATE, (_, event) => db.updateEvent(event));
  ipcMain.handle(IPC_CHANNELS.EVENTS.DELETE, (_, id: number) => db.deleteEvent(id));

  // ── App ────────────────────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.APP.GET_VERSION, () => app.getVersion());
  ipcMain.handle(IPC_CHANNELS.APP.OPEN_EXTERNAL, (_, url: string) => shell.openExternal(url));

  // ── Theme ──────────────────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.THEME.GET, () => db.getSetting('theme') ?? 'light');
  ipcMain.handle(IPC_CHANNELS.THEME.SET, (_, theme: string) => db.setSetting('theme', theme));
}
