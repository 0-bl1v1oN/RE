const express = require('express');
const PhotonParser = require('./scripts/classes/PhotonPacketParser');
const WebSocket = require('ws');

const fs = require("fs");

const { getAdapterIp } = require('./server-scripts/adapter-selector');
const { openBrowserAppWindow, closeWindowProcess } = require('./server-scripts/browser-app-window');

const EventCodes = require('./scripts/Utils/EventCodesApp.js')

const port = 5001;

function StartRadar(options = {})
{
  const { openBrowser = true, onServerReady = null } = options;
  const app = express();
  let radarPipProcess = null;
  let packetCapture = null;
  let manager = null;

  BigInt.prototype.toJSON = function() { return this.toString() }

  app.use(express.static(__dirname + '/views'));
  app.set('view engine', 'ejs');


  app.get('/', (req, res) => {
    const viewName = 'main/radar';
    res.render('layout', { mainContent: viewName});
  });

  app.get('/home', (req, res) => {
    const viewName = 'main/radar';
    res.render('./layout', { mainContent: viewName});
  });

  app.get('/players', (req, res) => {
    const viewName = 'main/home';
    res.render('layout', { mainContent: viewName});
  });

  app.get('/resources', (req, res) => {
    const viewName = 'main/resources';
    res.render('layout', { mainContent: viewName });
  });

  app.get('/enemies', (req, res) => {
    const viewName = 'main/enemies';
    res.render('layout', { mainContent: viewName });
  });

  app.get('/chests', (req, res) => {
    const viewName = 'main/chests';
    res.render('layout', { mainContent: viewName });
  });

  app.get('/map', (req, res) => {
    const viewName = 'main/map';
    const viewRequireName = 'main/require-map'

    fs.access("./images/Maps", function(error) {
      if (error)
      {
        res.render('layout', { mainContent: viewRequireName });
      }
      else
      {
        res.render('layout', { mainContent: viewName });
      }
    });
  });

  app.get('/ignorelist', (req, res) => {
    const viewName = 'main/ignorelist';
    res.render('layout', { mainContent: viewName });
  });

  app.get('/settings', (req, res) => {
    const viewName = 'main/settings';
    res.render('layout', { mainContent: viewName });
  });



  app.get('/drawing', (req, res) => {

    res.render('main/drawing');
  });

  app.post('/pip/open', (req, res) => {
    try {
      closeWindowProcess(radarPipProcess);
      radarPipProcess = openBrowserAppWindow(`http://localhost:${port}/drawing?pip=1`, {
        width: 280,
        height: 280,
        x: 120,
        y: 120,
        userDataDir: '.zqradar-pip-profile',
        alwaysOnTop: true,
        title: 'AlbionRadar PiP',
      });
      res.json({ ok: true });
    } catch (error) {
      console.error('Failed to open PiP radar:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post('/pip/close', (req, res) => {
    closeWindowProcess(radarPipProcess);
    radarPipProcess = null;
    res.json({ ok: true });
  });

  app.get('/items', (req, res) => {

    res.render('main/drawing-items');
  });

  /*app.get('/logout', (req, res) => {

    req.session.destroy();
    res.redirect('/');
  });*/



  app.use('/scripts', express.static(__dirname + '/scripts'));
  app.use('/scripts/Handlers', express.static(__dirname + '/scripts/Handlers'));
  app.use('/scripts/Drawings', express.static(__dirname + '/scripts/Drawings'));
  app.use('/scripts/Utils', express.static(__dirname + '/scripts/Utils'));
  app.use('/scripts/Utils/languages', express.static(__dirname + '/scripts/Utils/languages'));
  app.use('/images/Resources', express.static(__dirname + '/images/Resources'));
  app.use('/images/Maps', express.static(__dirname + '/images/Maps'));
  app.use('/images/Items', express.static(__dirname + '/images/Items'));
  app.use('/images/Flags', express.static(__dirname + '/images/Flags'));
  app.use('/sounds', express.static(__dirname + '/sounds'));
  app.use('/config', express.static(__dirname + '/config'));

  const httpServer = app.listen(port, () => {
    const url = `http://localhost:${port}/home`;
    console.log(`Server is running on ${url}`);

    if (typeof onServerReady === 'function') {
      onServerReady(url);
    } else if (openBrowser) {
      openUrl(url);
    }

    setImmediate(initializePacketCapture);
  });

  httpServer.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Close the other radar instance and start again.`);
      return;
    }


  console.error('Failed to start web server:', error);
  });

  let adapterIp;

  if (fs.existsSync('ip.txt'))
    adapterIp = fs.readFileSync('ip.txt', { encoding: 'utf-8', flag: 'r' })
    

  if (!adapterIp)
  {
    adapterIp = getAdapterIp()
  }
  else
  {
    console.log();
    console.log(`Using last adapter selected - ${adapterIp}`);
    console.log('If you want to change adapter, delete the  "ip.txt"  file.');
    console.log();
  }

  let device = Cap.findDevice(adapterIp);

  if (device == undefined)
  {
    console.log();
    console.log(`Last adapter is not working, please choose a new one.`);
    console.log();

    adapterIp = getAdapterIp();
    device = Cap.findDevice(adapterIp);
  }

  const filter = 'udp and (dst port 5056 or src port 5056)';
  var bufSize =  4096;
  var buffer = Buffer.alloc(4096);
  const manager = new PhotonParser();
  var linkType = c.open(device, filter, bufSize, buffer);

  c.setMinBytes && c.setMinBytes(0);


  async function handlePayloadAsync(payload) {
    try {
      manager.handle(payload);
    } catch (error) {
      console.error('Error processing the payload:', error);
    }
  }

  // setup Cap event listener on global level
  c.on('packet', function (nbytes, trunc) {
    try {
      const ret = decoders.Ethernet(buffer);
      const ipRet = decoders.IPV4(buffer, ret.offset);
      const udpRet = decoders.UDP(buffer, ipRet.offset);

      // Slice the buffer to get the actual payload from the offset where the UDP packet data starts
      const payload = buffer.slice(udpRet.offset, nbytes);

      // Call the asynchronous handler
      handlePayloadAsync(payload);
    } catch (error) {
      console.error('Error decoding the packet:', error);
    }
  });

  const server = new WebSocket.Server({ port: 5002, host: 'localhost'});
  
  function broadcast(code, dictonary) {
    const message = JSON.stringify({ code, dictionary: JSON.stringify(dictonary) });

    server.clients.forEach(function(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
  
  server.on('listening', () => {
    manager.on('event', (dictonary) =>
    {
      const eventCode = dictonary["parameters"][252];

      switch (eventCode) {
        case EventCodes.EventCodes.NewCharacter:
        case EventCodes.EventCodes.Leave:
        case EventCodes.EventCodes.CharacterEquipmentChanged:
          broadcast("items", dictonary);
          // Intentional fallthrough: the items window needs "items", while the main radar still needs "event".
      
        default:
          broadcast("event", dictonary);
          break;
      }
    });

    
    manager.on('request', (dictonary) =>
    {
      broadcast("request", dictonary);
    });

    manager.on('response', (dictonary) =>
    {
      broadcast("response", dictonary);
    });
  });

  server.on('close', () => {
    console.log('closed')
    manager.removeAllListeners()
  })

  return { app, httpServer, server, packetCapture: c, manager };
}

function openUrl(url)
{
  const { exec } = require('child_process');

  if (process.platform === 'win32') {
    exec(`start "" "${url}"`);
    return;
  }

  if (process.platform === 'darwin') {
    exec(`open "${url}"`);
    return;
  }

  exec(`xdg-open "${url}"`);
}

if (require.main === module) {
  StartRadar();
}

module.exports = {
  StartRadar,
};
