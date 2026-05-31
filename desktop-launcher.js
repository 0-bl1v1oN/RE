const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { StartRadar } = require('./app');

const APP_URL = 'http://localhost:5001/home';

function getBrowserCandidates() {
  const candidates = [];

  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || '';
    const programFiles = process.env.PROGRAMFILES || '';
    const programFilesX86 = process.env['PROGRAMFILES(X86)'] || '';

    candidates.push(
      path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(localAppData, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe')
    );
  }

  return candidates;
}

function findChromiumBrowser() {
  return getBrowserCandidates().find((candidate) => candidate && fs.existsSync(candidate));
}

function openBrowserAppWindow(url, { width, height, x, y, userDataDir }) {
  const browser = findChromiumBrowser();

  if (!browser) {
    console.warn('Microsoft Edge or Google Chrome was not found. Falling back to the default browser.');
    const command = process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
    spawn(command, args, { detached: true, stdio: 'ignore', shell: false }).unref();
    return;
  }

  const args = [
    `--app=${url}`,
    `--window-size=${width},${height}`,
    `--window-position=${x},${y}`,
    `--user-data-dir=${path.join(process.cwd(), userDataDir)}`,
    '--no-first-run',
    '--disable-translate',
  ];

  spawn(browser, args, { detached: true, stdio: 'ignore' }).unref();
}

StartRadar({ openBrowser: false });

setTimeout(() => {
  openBrowserAppWindow(APP_URL, {
    width: 1280,
    height: 820,
    x: 80,
    y: 60,
    userDataDir: '.zqradar-control-profile',
  });

}, 700);
