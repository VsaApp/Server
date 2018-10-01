const fs = require('fs');
const crypto = require('crypto');
const mysql = require('mysql');
const express = require('express');
const requestProxy = require('express-request-proxy');
const firebase = require('./firebase');
const errors = require('../client/src/errors');

let pool;

if (fs.existsSync('../config/config.json')) {
  config = JSON.parse(fs.readFileSync('../config/config.json', 'utf-8'));

  ['dbhost', 'dbuser', 'dbpassword', 'dbport', 'pinboarddb'].forEach(name => {
    if (!(name in config)) {
      throw new Error('Missing ' + name + ' in config');
    }
  });

  pool = mysql.createPool({
    connectionLimit: 10,
    host: config.dbhost,
    user: config.dbuser,
    password: config.dbpassword,
    port: config.dbport,
    database: config.pinboarddb
  });

  pool.query('CREATE TABLE IF NOT EXISTS`' + config.pinboarddb + '`.`users` ( `username` TEXT NOT NULL , `password` TEXT NOT NULL , `followers` INT NOT NULL ) ENGINE = InnoDB;', error => {
    if (error) throw error;
    pool.query('CREATE TABLE IF NOT EXISTS`' + config.pinboarddb + '`.`messages` ( `username` TEXT NOT NULL , `id` TEXT NOT NULL , `title` TEXT NOT NULL , `message` LONGTEXT NOT NULL , `time` BIGINT NOT NULL ) ENGINE = InnoDB;', error => {
      if (error) throw error;
      const app = express();
      const api = express.Router();

      function verifyUser(username, password) {
        return new Promise((resolve, reject) => {
          pool.query('SELECT username FROM users WHERE username=' + pool.escape(username) + ' AND password=' + pool.escape(password), (error, results) => {
            if (error) {
              console.log(error);
              reject();
              return;
            }
            resolve(results.length > 0);
          });
        });
      }

      api.get('/login', (req, res) => {
        verifyUser(req.query.username, req.query.password).then(ok => {
          res.send({error: (ok ? null : errors.WRONG_USERNAME_PASSWORD)});
        }).catch(() => {
          res.send({error: errors.UNKNOWN});
        });
      });

      api.get('/getfollowers', (req, res) => {
        pool.query('SELECT followers FROM users WHERE username=' + pool.escape(req.query.username), (error, results) => {
          if (error) {
            console.log(error);
            res.send({error: errors.UNKNOWN});
            return;
          }
          res.send({error: null, followers: results[0].followers});
        });
      });

      api.get('/messages', (req, res) => {
        pool.query('SELECT * FROM messages WHERE username=' + pool.escape(req.query.username) + ' ORDER BY time DESC', (error, results) => {
          if (error) {
            console.log(error);
            res.send({error: errors.UNKNOWN});
            return;
          }
          res.send({error: null, data: results});
        });
      });

      api.get('/delete', (req, res) => {
        verifyUser(req.query.username, req.query.password).then(ok => {
          if (!ok) {
            res.send({error: errors.WRONG_USERNAME_PASSWORD});
            return;
          }
          pool.query('DELETE FROM messages WHERE id=' + pool.escape(req.query.id), error => {
            if (error) {
              console.log(error);
              res.send({error: errors.UNKNOWN});
              return;
            }
            res.send({error: null});
          });
        }).catch(() => {
          res.send({error: errors.UNKNOWN});
        });
      });

      api.get('/send', (req, res) => {
        verifyUser(req.query.username, req.query.password).then(ok => {
          if (!ok) {
            res.send({error: errors.WRONG_USERNAME_PASSWORD});
            return;
          }
          pool.query('INSERT INTO messages (username, id, title, message, time) VALUES (' + pool.escape(req.query.username) + ', \'' + crypto.randomBytes(4).toString('hex') + '\', ' + pool.escape(req.query.title) + ', ' + pool.escape(req.query.message) + ', ' + Math.round((new Date()).getTime() / 1000) + ')', error => {
            if (error) {
              console.log(error);
              res.send({error: errors.UNKNOWN});
              return;
            }
            firebase.send('pinboard-' + req.query.username.replace(' ', '_'), JSON.stringify({
              user: req.query.username,
              title: req.query.title,
              message: req.query.message
            })).then(() => {
              res.send({error: null});
            }).catch(error => {
              console.log(error);
              res.send({error: errors.UNKNOWN});
            });
          });
        }).catch(() => {
          res.send({error: errors.UNKNOWN});
        });
      });

      api.get('/users', (req, res) => {
        pool.query('SELECT username FROM users', (error, results) => {
          if (error) {
            console.log(error);
            res.send({error: errors.UNKNOWN});
            return;
          }
          res.send({
            error: null,
            data: results.map(result => result.username)
          });
        });
      });

      api.get('/follow', (req, res) => {
        pool.query('UPDATE users SET followers=followers+1 WHERE username=' + pool.escape(req.query.username), error => {
          if (error) {
            console.log(error);
            res.send({error: errors.UNKNOWN});
            return;
          }
          res.send({error: null});
        });
      });

      api.get('/unfollow', (req, res) => {
        pool.query('UPDATE users SET followers=followers-1 WHERE username=' + pool.escape(req.query.username), error => {
          if (error) {
            console.log(error);
            res.send({error: errors.UNKNOWN});
            return;
          }
          res.send({error: null});
        });
      });

      app.use('/api', api);

      if (process.env.mode === 'production') {
        const serve = express();
        serve.use('/', express.static('../client/build'));
        serve.use('/api/:a', requestProxy({
          url: 'http://localhost:3001/api/:a'
        }));
        serve.listen(3000, () => {
          console.log('Serving production build on *:3000');
        });
      }

      app.listen(3001, () => {
        console.log('Serving API on *:3001');
      });
    });
  });
}
else {
  throw new Error('config.json missing');
}
