const express = require('express');
const fs = require('fs');
const crypto = require('crypto');
const sp = require('./sp.js');
const vp = require('./vp.js');

const app = express();
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
  const hash = crypto.createHash('sha256');

  config.usernamesha = crypto.createHash('sha256').update(config.username).digest('hex');

  config.passwordsha = crypto.createHash('sha256').update(config.password).digest('hex');

  if (!fs.existsSync('sp')) {
    fs.mkdirSync('sp');
  }
  if (!fs.existsSync('vp')) {
    fs.mkdirSync('vp');
  }

  sp.setConfig(config);
  vp.setConfig(config);

  app.use('/sp', express.static('sp'));
  app.use('/vp', express.static('vp'));
  app.get('/', (req, res) => {
    res.send('Nothing to see here!');
  });
  app.get('/validate', (req, res) => {
    if (!('username' in req.query)) {
      res.send('2');
      return;
    }
    if (!('password' in req.query)) {
      res.send('3');
      return;
    }
    if (req.query.username !== config.usernamesha || req.query.password !== config.passwordsha) {
      res.send('1');
      return;
    }
    res.send('0');
  });
  app.listen(config.port, () => {
    console.log('Listening on *:' + config.port);
  });
} else {
  throw new Error('config.json missing');
}
sp.downloadSP();
vp.getVP(true, onVPUpdate);
vp.getVP(false, onVPUpdate);
setInterval(() => {
  vp.getVP(true, onVPUpdate);
  vp.getVP(false, onVPUpdate);
}, 10000);

function onVPUpdate(data) {
  console.log(JSON.stringify(data));
}