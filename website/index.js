const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const requestProxy = require('express-request-proxy');

if (!fs.existsSync('./config/connections.json')) {
  fs.writeFileSync('./config/connections.json', '[]');
}
if (!fs.existsSync('./config/choices.json')) {
  fs.writeFileSync('./config/choices.json', '{}');
}
let connections = require('./config/connections.json');
const choices = require('./config/choices.json');

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

  app.use('/api/:a/:b', requestProxy({
    url: 'http://api/:a/:b'
  }));
  app.use('/', express.static('www'));
  app.use('/jquery', express.static(path.resolve('node_modules', 'jquery', 'dist')));
  app.use('/js-cookie', express.static(path.resolve('node_modules', 'js-cookie', 'src')));

  app.get('/connect', (req, res) => {
    if (!('client' in req.query)) {
      res.send({
        error: 'No client ID'
      });
      return;
    }
    if (!('web' in req.query)) {
      res.send({
        error: 'No web ID'
      });
      return;
    }
    if (!('grade' in req.query)) {
      res.send({
        error: 'No grade'
      });
      return;
    }
    if (!('username' in req.query)) {
      res.send({
        error: 'No username'
      });
      return;
    }
    if (!('password' in req.query)) {
      res.send({
        error: 'No password'
      });
      return;
    }
    const username = req.query.username;
    const password = req.query.password;
    if (password !== config.passwordsha || username !== config.usernamesha) {
      res.send({
        error: 'Wrong credentials'
      });
      return;
    }
    const clientID = req.query.client;
    const webID = req.query.web;
    const grade = req.query.grade;
    res.send({
      error: null
    });
    addConnection(clientID, webID, grade);
  });
  app.get('/connections', (req, res) => {
    if (!('id' in req.query)) {
      res.send({
        error: 'No ID'
      });
      return;
    }
    let c = [];
    connections.forEach(connection => {
      if (connection.client === req.query.id) {
        c.push({
          id: connection.web,
          time: connection.time
        });
      }
    });
    res.send({
      error: null,
      connections: c
    });
  });
  app.get('/push', (req, res) => {
    if (!('id' in req.query)) {
      res.send({
        error: 'No ID'
      });
      return;
    }
    if (!('choice' in req.query)) {
      res.send({
        error: 'No choice'
      });
      return;
    }
    if (!hasConnection(req.query.id)) {
      res.send({
        error: 'No connection'
      });
      return;
    }
    updateChoice(req.query.id, JSON.parse(req.query.choice));
    res.send({
      error: null
    });
  });
  app.get('/id', (req, res) => {
    let id = (req.query.web === 'null' ? null : req.query.web) || crypto.randomBytes(8).toString('hex');
    res.send({
      id: id
    });
  });
  app.get('/grade', (req, res) => {
    if (!('web' in req.query)) {
      res.send({
        error: 'No ID'
      });
      return;
    }
    res.send({
      grade: getGradeFromID(req.query.web)
    });
  });
  app.get('/choices', (req, res) => {
    if (!('web' in req.query)) {
      res.send({
        error: 'No ID'
      });
      return;
    }
    res.send(choices[getClientFromWeb(req.query.web)]);
    updateLast(req.query.web);
  });
  app.get('/delete', (req, res) => {
    if (!('web' in req.query)) {
      res.send({
        error: 'No ID'
      });
      return;
    }
    removeConnection(req.query.web);
    res.send({
      error: null
    });
  });
  app.get('/connected', (req, res) => {
    if (!('web' in req.query)) {
      res.send({
        error: 'No ID'
      });
      return;
    }
    res.send({
      connected: connections.filter(connection => {
        return connection.web === req.query.web;
      }).length > 0
    });
  });
  app.listen(80, () => {
    console.log('Listening on *:' + 80);
  });
} else {
  throw new Error('config.json missing');
}

function getGradeFromID(id) {
  try {
    const r = connections.filter(connection => connection.web === id)[0].grade;
    updateLast(id);
    return r;
  } catch (e) {

  }
}

function getClientFromWeb(id) {
  try {
    const r = connections.filter(connection => connection.web === id)[0].client;
    updateLast(id);
    return r;
  } catch (e) {

  }
}

function addConnection(clientID, webID, grade) {
  connections.push({
    client: clientID,
    web: webID,
    grade: grade
  });
  fs.writeFileSync('connections.json', JSON.stringify(connections, null, 2));
  updateLast(webID);
}

function removeConnection(webID) {
  connections = connections.filter(connection => {
    return connection.web !== webID;
  });
  fs.writeFileSync('connections.json', JSON.stringify(connections, null, 2));
}

function hasConnection(id) {
  let ok = false;
  for (let i = 0; i < connections.length; i++) {
    if (connections[i].client === id) {
      ok = true;
      break;
    }
  }
  return ok;
}

function updateChoice(id, data) {
  if (!isArray(data)) {
    data = [data];
  }
  if (choices[id] !== undefined) {
    for (let i = 0; i < choices[id].length; i++) {
      const choice = choices[id][i];
      for (let j = 0; j < data.length; j++) {
        if (choice.weekday === data[j].weekday && choice.unit === data[j].unit) {
          choices[id][i] = data[j];
          break;
        }
      }
    }
  } else {
    choices[id] = data;
  }
  fs.writeFileSync('choices.json', JSON.stringify(choices, null, 2));
}

function updateLast(webID) {
  const date = new Date();
  const c = connections.filter(connection => {
    return connection.web === webID;
  })[0];
  if (c !== undefined) {
    const day = (date.getDate().toString().length < 2 ? '0' + date.getDate() : date.getDate());
    const month = ((date.getMonth() + 1).toString().length < 2 ? '0' + (date.getMonth() + 1) : (date.getMonth() + 1));
    const year = date.getFullYear();
    const hour = (date.getHours().toString().length < 2 ? '0' + date.getHours() : date.getHours());
    const minute = (date.getMinutes().toString().length < 2 ? '0' + date.getMinutes() : date.getMinutes());
    c.time = hour + ':' + minute + ' ' + day + '.' + month + '.' + year;
    fs.writeFileSync('connections.json', JSON.stringify(connections, null, 2));
  }
}

function isArray(what) {
  return Object.prototype.toString.call(what) === '[object Array]';
}

this.setConfig = c => {
  config = c;
};

module.exports = this;