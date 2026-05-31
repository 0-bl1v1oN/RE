const { StartRadar } = require('./app');
const { openBrowserAppWindow } = require('./server-scripts/browser-app-window');

const APP_URL = 'http://localhost:5001/home';


StartRadar({ openBrowser: false });

setTimeout(() => {
  openBrowserAppWindow(APP_URL, {
    width: 1280,
    height: 820,
    x: 80,
    y: 60,
    userDataDir: '.zqradar-control-profile',
    title: 'AlbionRadar',
  });

}, 700);
