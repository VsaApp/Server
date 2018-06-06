const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const fs = require('fs');
const sp = require('./sp.js');

let config = {};

if (fs.existsSync('config.json')) {
  config = JSON.parse(fs.readFileSync('config.json', 'utf-8'));
  config.port = config.port || 9000;

  if (!('username' in config)) {
    throw new Error('Missing username in config');
  }
  if (!('password' in config)) {
    throw new Error('Missing password in config');
  }

  sp.setConfig(config);

  app.use(express.static('www'));

  io.on('connection', client => {
    let grade = '';
    client.on('grade', val => {
      grade = val;
      client.emit('sp', sp.getPlan(grade));
    });
  });

  http.listen(config.port, () => {
    console.log('listening on *:' + config.port);
  });
} else {
  throw new Error('config.json missing');
}
sp.downloadSP();