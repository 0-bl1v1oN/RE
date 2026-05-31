const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

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

  candidates.push('google-chrome', 'chromium', 'chromium-browser', 'microsoft-edge');

  return candidates;
}

function findChromiumBrowser() {
  if (process.platform === 'win32') {
    return getBrowserCandidates().find((candidate) => candidate && fs.existsSync(candidate));
  }

  return getBrowserCandidates().find(Boolean);
}

function openFallbackBrowser(url) {
  const command = process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  spawn(command, args, { detached: true, stdio: 'ignore', shell: false }).unref();
}

function escapePowerShellString(value) {
  return String(value).replace(/'/g, "''");
}

function keepWindowsWindowOnTop(windowTitle) {
  if (process.platform !== 'win32' || !windowTitle) return;

  const safeTitle = escapePowerShellString(windowTitle);
  const script = `
$signature = @'
using System;
using System.Runtime.InteropServices;
public static class Win32WindowTools {
  [DllImport("user32.dll")]
  public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
}
'@
Add-Type -TypeDefinition $signature -ErrorAction SilentlyContinue | Out-Null
$topMost = [IntPtr](-1)
$flags = 0x0001 -bor 0x0002 -bor 0x0040
$deadline = (Get-Date).AddSeconds(8)
do {
  $windows = Get-Process msedge, chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like '*${safeTitle}*' -and $_.MainWindowHandle -ne 0 }
  foreach ($window in $windows) {
    [Win32WindowTools]::SetWindowPos($window.MainWindowHandle, $topMost, 0, 0, 0, 0, $flags) | Out-Null
  }
  if ($windows) { Start-Sleep -Milliseconds 150 } else { Start-Sleep -Milliseconds 250 }
} while ((Get-Date) -lt $deadline)
`;

  spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  }).unref();
}

function openBrowserAppWindow(url, { width, height, x, y, userDataDir, alwaysOnTop = false, title = '' }) {
  const browser = findChromiumBrowser();

  if (!browser) {
    console.warn('Microsoft Edge or Google Chrome was not found. Falling back to the default browser.');
    openFallbackBrowser(url);
    return null;
  }

  const args = [
    `--app=${url}`,
    `--window-size=${width},${height}`,
    `--window-position=${x},${y}`,
    `--user-data-dir=${path.join(process.cwd(), userDataDir)}`,
    '--no-first-run',
    '--disable-translate',
  ];

  const child = spawn(browser, args, { detached: false, stdio: 'ignore', windowsHide: true });
  child.on('error', (error) => console.error('Failed to launch browser app window:', error));

  if (alwaysOnTop) {
    keepWindowsWindowOnTop(title);
  }

  return child;
}

function closeWindowProcess(childProcess) {
  if (!childProcess || childProcess.killed) return;

  try {
    childProcess.kill();
  } catch (error) {
    console.warn('Failed to close browser app window:', error.message);
  }
}

module.exports = {
  openBrowserAppWindow,
  closeWindowProcess,
};
