import { ipcMain, shell, app, net, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from './ipc-channels';
import type { UpdateStatus } from './ipc-channels';
import * as db from './sqlite.service';

const GITHUB_OWNER = 'ashot-developer';
const GITHUB_REPO  = 'bethel-bible-app';

let cachedUpdateStatus: UpdateStatus = { state: 'idle' };

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

const PLATFORM_EXT: Record<string, string> = {
  darwin: '.dmg',
  win32:  '.exe',
  linux:  '.AppImage',
};

function pickAssetUrl(assets: { name: string; browser_download_url: string }[]): string | undefined {
  const ext = PLATFORM_EXT[process.platform];
  if (!ext) return undefined;
  return assets.find(a => a.name.endsWith(ext))?.browser_download_url;
}

async function fetchLatestRelease(): Promise<UpdateStatus> {
  const currentVersion = app.getVersion();
  try {
    const res = await net.fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
      { headers: { 'User-Agent': 'bethel-bible-app', 'Accept': 'application/vnd.github.v3+json' } }
    );
    if (res.status === 404) return { state: 'not-available', currentVersion };
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const data = await res.json() as {
      tag_name: string; html_url: string; body?: string;
      assets: { name: string; browser_download_url: string }[];
    };
    const latestVersion = data.tag_name.replace(/^v/, '');
    if (compareVersions(latestVersion, currentVersion) > 0) {
      return {
        state: 'available', currentVersion, latestVersion,
        releaseUrl: data.html_url,
        downloadUrl: pickAssetUrl(data.assets ?? []),
        releaseNotes: data.body ?? '',
      };
    }
    return { state: 'not-available', currentVersion, latestVersion };
  } catch (err) {
    return { state: 'error', currentVersion, error: String(err) };
  }
}

export async function performAutoUpdateCheck(win: BrowserWindow): Promise<void> {
  cachedUpdateStatus = { state: 'checking', currentVersion: app.getVersion() };
  win.webContents.send(IPC_CHANNELS.UPDATE.STATUS, cachedUpdateStatus);
  cachedUpdateStatus = await fetchLatestRelease();
  win.webContents.send(IPC_CHANNELS.UPDATE.STATUS, cachedUpdateStatus);
}

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

  // ── Update ─────────────────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.UPDATE.GET_STATUS, () => cachedUpdateStatus);
  ipcMain.handle(IPC_CHANNELS.UPDATE.CHECK, async () => {
    cachedUpdateStatus = { state: 'checking', currentVersion: app.getVersion() };
    cachedUpdateStatus = await fetchLatestRelease();
    return cachedUpdateStatus;
  });
  ipcMain.handle(IPC_CHANNELS.UPDATE.OPEN_DOWNLOAD, (_, url: string) => shell.openExternal(url));
}
