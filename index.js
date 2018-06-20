const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sp = require('./sp.js');
const vp = require('./vp.js');
const teachersShort = require('./teachersShort.js');
const teachersMail = require('./teachersMail.js');
const cafetoria = require('./cafetoria');
const dates = require('./dates.js');
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

  if (!fs.existsSync('teachers')) {
    fs.mkdirSync('teachers');
  }
  if (!fs.existsSync('dates')) {
    fs.mkdirSync('dates');
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
  teachersShort.setConfig(config);
  teachersMail.setConfig(config);

  app.use('/teachers', express.static('teachers'));
  app.use('/dates', express.static('dates'));
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
  cafetoria.host(app);
  app.listen(config.port, () => {
    console.log('Listening on *:' + config.port);
  });
} else {
  throw new Error('config.json missing');
}
dates.downloadDatesPDF();

let shorts = [];
let mails = [];

teachersShort.downloadTeacherPDF().then(teacherList => {
  shorts = teacherList;
  checkTeachers();
});
teachersMail.downloadTeacherPDF().then(teacherList => {
  mails = teacherList;
  checkTeachers();
});

function checkTeachers() {
  if (shorts.length > 0 && mails.length > 0) {
    for (let i = 0; i < shorts.length; i++) {
      shorts[i].gender = (mails[i].startsWith('Herr ') ? 'male' : 'female');
    }
    fs.writeFileSync(path.resolve('teachers', 'list.json'), JSON.stringify(shorts, null, 2));
  }
}

sp.downloadSP();

vp.getVP(true, () => {});
vp.getVP(false, () => {});

setInterval(() => {
  vp.getVP(true, onVPUpdate);
  vp.getVP(false, onVPUpdate);
}, 60000);

function onVPUpdate(data) {
  if (data.changes.length > 0) {
    firebase.send(data.changes[0].grade, JSON.stringify(data));
  }
}