const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sp = require('./sp.js');
const vp = require('./vp.js');
const tutors = require('./tutors.js');
const firebase = require('./firebase.js');

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

  if (!fs.existsSync('tutors')) {
    fs.mkdirSync('tutors');
  }
  if (!fs.existsSync('sp')) {
    fs.mkdirSync('sp');
  }
  if (!fs.existsSync('vp')) {
    fs.mkdirSync('vp');
  }
  if (!fs.existsSync(path.resolve('vp', 'today'))) {
    fs.mkdirSync(path.resolve('vp', 'today'));
  }
  if (!fs.existsSync(path.resolve('vp', 'tomorrow'))) {
    fs.mkdirSync(path.resolve('vp', 'tomorrow'));
  }

  sp.setConfig(config);
  vp.setConfig(config);
  tutors.setConfig(config);

  app.use('/tutors', express.static('tutors'));
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
tutors.downloadTutorPDF();
sp.downloadSP();
vp.getVP(true, () => {});
vp.getVP(false, () => {});
setInterval(() => {
  vp.getVP(true, onVPUpdate);
  vp.getVP(false, onVPUpdate);
}, 60000);

const days = [
  'Sonntag',
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
  'Samstag'
];

function onVPUpdate(data) {
  const header = data;
  data = data.changes;
  if (data.length > 0) {
    if (data.length > 1) {
      let text = '';
      for (let i = 0; i < data.length; i++) {
        text += data[i].unit + '. Stunde ' + data[i].changed.tutor + ' ' + data[i].changed.info + ' ' + data[i].changed.room + '\n';
      }
      firebase.send(data[0].grade, {
        title: header.weekday,
        text: text.slice(0, -1)
      });
    } else {
      firebase.send(data[0].grade, {
        title: header.weekday + ' ' + data[0].unit + '. Stunde',
        text: data[0].changed.tutor + ' ' + data[0].changed.info + ' ' + data[0].changed.room
      });
    }
  }
}