const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const hashFiles = require('hash-files');
const sp = require('./sp');
const vp = require('./vp');
const teachersShort = require('./teachersShort');
const teachersMail = require('./teachersMail');
const cafetoria = require('./cafetoria');
const dates = require('./dates');
const ags = require('./ags');
const documents = require('./documents');
const firebase = require('./firebase');

const app = express();
let config = {};

if (fs.existsSync('./config/config.json')) {
  config = JSON.parse(fs.readFileSync('./config/config.json', 'utf-8'));

  if (!('username' in config)) {
    throw new Error('Missing username in config');
  }
  if (!('password' in config)) {
    throw new Error('Missing password in config');
  }

  config.usernamesha = crypto.createHash('sha256').update(config.username).digest('hex');

  config.passwordsha = crypto.createHash('sha256').update(config.password).digest('hex');

  if (!fs.existsSync('teachers')) {
    fs.mkdirSync('teachers');
  }
  if (!fs.existsSync('dates')) {
    fs.mkdirSync('dates');
  }
  if (!fs.existsSync('ags')) {
    fs.mkdirSync('ags');
  }
  if (!fs.existsSync('documents')) {
    fs.mkdirSync('documents');
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
  if (!fs.existsSync('sums')) {
    fs.mkdirSync('sums');
  }

  sp.setConfig(config);
  vp.setConfig(config);
  teachersShort.setConfig(config);
  teachersMail.setConfig(config);
  ags.setConfig(config);
  documents.setConfig(config);

  app.use('/teachers', express.static('teachers'));
  app.use('/dates', express.static('dates'));
  app.use('/ags', express.static('ags'));
  app.use('/documents', express.static('documents'));
  app.use('/sums', express.static('sums'));
  app.use('/sp', express.static('sp'));
  app.use('/vp', express.static('vp'));
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
  app.listen(80, () => {
    console.log('Listening on *:' + 80);
  });
} else {
  throw new Error('config.json missing');
}

let shorts = [];
let mails = [];

teachersShort.downloadTeacherPDF().then(teacherList => {
  teacherList = teacherList.sort((a, b) => {
    const textA = a.longName.toUpperCase();
    const textB = b.longName.toUpperCase();
    return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
  });
  shorts = teacherList;
  checkTeachers();
});
teachersMail.downloadTeacherPDF().then(teacherList => {
  teacherList = teacherList.sort((a, b) => {
    const textA = a.replace('Herr ').replace('Frau ').toUpperCase();
    const textB = b.replace('Herr ').replace('Frau ').toUpperCase();
    return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
  });
  mails = teacherList;
  checkTeachers();
});
documents.listDocuments().then(documents => {
  ags.downloadAGPDF(documents);
  dates.downloadDatesPDF(documents);
});

function overrideGender(short) {
  if ('genders' in config) {
    if (short in config.genders) {
      return config.genders[short];
    }
  } else {
    return null;
  }
}

function checkTeachers() {
  if (shorts.length > 0 && mails.length > 0) {
    for (let i = 0; i < shorts.length; i++) {
      const gender = overrideGender(shorts[i].shortName);
      if (gender) {
        shorts[i].gender = gender;
      } else {
        shorts[i].gender = (mails[i].startsWith('Herr ') ? 'male' : 'female');
      }
    }
    fs.writeFileSync(path.resolve('teachers', 'list.json'), JSON.stringify(shorts, null, 2));
  }
}

sp.downloadSP();

vp.getVP(true, () => {
});
vp.getVP(false, () => {
});

setInterval(() => {
  vp.getVP(true, onVPUpdate);
  vp.getVP(false, onVPUpdate);
}, 60000);

function onVPUpdate(grade, data) {
  firebase.send(grade, JSON.stringify(data));
}

let hashes = {};

module.exports = () => {
  const files = ['ags/list.json', 'dates/list.json', 'documents/list.json', 'sp/*', 'teachers/list.json', 'vp/today/*', 'vp/tomorrow/*'];
  let got = 0;
  files.forEach(file => {
    hashFiles({files: [file], algorithm: 'sha256'}, (error, hash) => {
      if (error) {
        throw error;
      }
      const name = file.replace(/\/list.json|\/\*/ig, '');
      hashes[name] = hash;
      got++;
      if (got === files.length) {
        fs.writeFileSync(path.resolve('sums', 'list.json'), JSON.stringify(hashes, null, 2));
      }
    });
  });
};