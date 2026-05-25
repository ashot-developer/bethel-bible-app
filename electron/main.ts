import { app, BrowserWindow, Menu } from 'electron';
import * as path from 'path';
import { registerIpcHandlers, performAutoUpdateCheck } from '../electron-utils/ipc-handlers';

const isDev = !app.isPackaged && process.env['NODE_ENV'] !== 'production';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    icon: isDev
      ? path.join(__dirname, '../../../src/assets/logo.png')
      : path.join(process.resourcesPath, 'logo.png'),
    show: false,
    backgroundColor: '#ffffff',
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:4200');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/browser/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    // Auto-check for updates 10 s after window is visible
    setTimeout(() => {
      if (mainWindow) performAutoUpdateCheck(mainWindow);
    }, 10000);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (!isDev) {
    Menu.setApplicationMenu(null);
  }
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: prevent new window creation
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
});
