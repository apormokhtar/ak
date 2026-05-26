const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: false,
      nodeIntegration: true
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// خواندن فایل ماژول
ipcMain.handle('read-module', (event, modulePath) => {
  const fullPath = path.join(__dirname, 'renderer', modulePath);
  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    return { success: true, content };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// انتخاب فایل ویدیو
ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'انتخاب فایل فیلم',
    filters: [{ name: 'ویدیو', extensions: ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm'] }],
    properties: ['openFile']
  });
  return result.canceled ? null : result.filePaths[0];
});

// پخش فایل (با برنامه پیش‌فرض)
ipcMain.handle('play-file', (event, filePath) => {
  if (filePath) shell.openPath(filePath);
  return { success: true };
});

// باز کردن پوشه حاوی فایل
ipcMain.handle('open-folder', (event, filePath) => {
  if (filePath) shell.showItemInFolder(filePath);
  return { success: true };
});