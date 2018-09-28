const express = require('express');
const fs = require('fs');
const crypto = require('crypto');
const mysql = require('mysql');
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
let pool;

if (!fs.existsSync('tmp')) {
  fs.mkdirSync('tmp');
}

if (fs.existsSync('./config/config.json')) {
  config = JSON.parse(fs.readFileSync('./config/config.json', 'utf-8'));

  ['username', 'password', 'dbhost', 'dbuser', 'dbpassword', 'dbport', 'apidb'].forEach(name => {
    if (!(name in config)) {
      throw new Error('Missing ' + name + ' in config');
    }
  });

  config.usernamesha = crypto.createHash('sha256').update(config.username).digest('hex');
  config.passwordsha = crypto.createHash('sha256').update(config.password).digest('hex');

  pool = mysql.createPool({
    connectionLimit: 10,
    host: config.dbhost,
    user: config.dbuser,
    password: config.dbpassword,
    port: config.dbport,
    database: config.apidb
  });

  pool.query('CREATE TABLE IF NOT EXISTS`' + config.apidb + '`.`teachers` ( `time` BIGINT NOT NULL , `data` TEXT NOT NULL ) ENGINE = InnoDB;', error => {
    if (error) throw error;
    pool.query('CREATE TABLE IF NOT EXISTS`' + config.apidb + '`.`dates` ( `time` BIGINT NOT NULL , `data` TEXT NOT NULL ) ENGINE = InnoDB;', error => {
      if (error) throw error;
      pool.query('CREATE TABLE IF NOT EXISTS`' + config.apidb + '`.`ags` ( `time` BIGINT NOT NULL , `data` TEXT NOT NULL ) ENGINE = InnoDB;', error => {
        if (error) throw error;
        pool.query('CREATE TABLE IF NOT EXISTS`' + config.apidb + '`.`documents` ( `time` BIGINT NOT NULL , `data` TEXT NOT NULL ) ENGINE = InnoDB;', error => {
          if (error) throw error;
          pool.query('CREATE TABLE IF NOT EXISTS`' + config.apidb + '`.`sp` ( `time` BIGINT NOT NULL , `data` TEXT NOT NULL ) ENGINE = InnoDB;', error => {
            if (error) throw error;
            pool.query('CREATE TABLE IF NOT EXISTS`' + config.apidb + '`.`vptoday` ( `time` BIGINT NOT NULL , `data` TEXT NOT NULL ) ENGINE = InnoDB;', error => {
              if (error) throw error;
              pool.query('CREATE TABLE IF NOT EXISTS`' + config.apidb + '`.`vptomorrow` ( `time` BIGINT NOT NULL , `data` TEXT NOT NULL ) ENGINE = InnoDB;', error => {
                if (error) throw error;
                console.log('Connected to DB');
                sp.setConfig(config);
                vp.setConfig(config);
                teachersShort.setConfig(config);
                teachersMail.setConfig(config);
                ags.setConfig(config);
                documents.setConfig(config);

                function getData(table) {
                  return new Promise((resolve, reject) => {
                    pool.query('SELECT data FROM ' + table + ' t WHERE t.time = (SELECT MAX(subt.time) FROM ' + table + ' subt);', (error, results) => {
                      if (error) {
                        console.log(error);
                        reject(error);
                        return;
                      }
                      resolve((results[0] || {data: []}).data);
                    });
                  });
                }

                  function getHash(table) {
                      return new Promise((resolve, reject) => {
                          pool.query('SELECT MD5(data) AS data FROM ' + table + ' t WHERE t.time = (SELECT MAX(subt.time) FROM ' + table + ' subt);', (error, results) => {
                              if (error) {
                                  console.log(error);
                                  reject(error);
                                  return;
                              }
                              resolve((results[0] || {data: []}).data);
                          });
                      });
                  }

                app.use('/teachers/list.json', (req, res) => {
                  getData('teachers').then(data => {
                    res.send(data);
                  }).catch(data => {
                    res.send(data);
                  });
                });
                app.use('/dates/list.json', (req, res) => {
                  getData('dates').then(data => {
                    res.send(data);
                  }).catch(data => {
                    res.send(data);
                  });
                });
                app.use('/ags/list.json', (req, res) => {
                  getData('ags').then(data => {
                    res.send(data);
                  }).catch(data => {
                    res.send(data);
                  });
                });
                app.use('/documents/list.json', (req, res) => {
                  getData('documents').then(data => {
                    res.send(data);
                  }).catch(data => {
                    res.send(data);
                  });
                });
                app.use('/sp/:grade.json', (req, res) => {
                  getData('sp').then(data => {
                    res.send(JSON.parse(data).filter(obj => {
                      return obj.grade === req.params.grade;
                    })[0].plan);
                  }).catch(data => {
                    res.send(data);
                  });
                });
                app.use('/vp/:day/:grade.json', (req, res) => {
                  getData('vp' + req.params.day).then(data => {
                    res.send(JSON.parse(data).filter(obj => {
                      return obj.grade === req.params.grade;
                    })[0].vp);
                  }).catch(data => {
                    res.send(data);
                  });
                });
                  app.use('/sums/list.json', (req, res) => {
                      let obj = {};
                      getHash('teachers').then(h => {
                          obj.teachers = h;
                          getHash('dates').then(h => {
                              obj.dates = h;
                              getHash('ags').then(h => {
                                  obj.ags = h;
                                  getHash('documents').then(h => {
                                      obj.documents = h;
                                      getHash('sp').then(h => {
                                          obj.sp = h;
                                          getHash('vptoday').then(h => {
                                              obj['vp/today'] = h;
                                              getHash('vptomorrow').then(h => {
                                                  obj['vp/tomorrow'] = h;
                                                  res.send(obj);
                                              }).catch(data => {
                                                  res.send(data);
                                              });
                                          }).catch(data => {
                                              res.send(data);
                                          });
                                      }).catch(data => {
                                          res.send(data);
                                      });
                                  }).catch(data => {
                                      res.send(data);
                                  });
                              }).catch(data => {
                                  res.send(data);
                              });
                          }).catch(data => {
                              res.send(data);
                          });
                      }).catch(data => {
                          res.send(data);
                      });
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
                app.listen(80, () => {
                  console.log('Listening on *:' + 80);
                });
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
                  pool.query('INSERT INTO `documents`(`time`, `data`) VALUES (' + Math.floor(Date.now() / 1000) + ',\'' + JSON.stringify(documents) + '\')', error => {
                    if (error) throw error;
                  });
                  ags.downloadAGPDF(documents.documents).then(ags => {
                    pool.query('INSERT INTO `ags`(`time`, `data`) VALUES (' + Math.floor(Date.now() / 1000) + ',\'' + JSON.stringify(ags) + '\')', error => {
                      if (error) throw error;
                    });
                  });
                  dates.downloadDatesPDF(documents.documents).then(dates => {
                    pool.query('INSERT INTO `dates`(`time`, `data`) VALUES (' + Math.floor(Date.now() / 1000) + ',\'' + JSON.stringify(dates) + '\')', error => {
                      if (error) throw error;
                    });
                  });
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
                    pool.query('INSERT INTO `teachers`(`time`, `data`) VALUES (' + Math.floor(Date.now() / 1000) + ',\'' + JSON.stringify(shorts) + '\')', error => {
                      if (error) throw error;
                    });
                  }
                }

                sp.downloadSP().then(sp => {
                  pool.query('INSERT INTO `sp`(`time`, `data`) VALUES (' + Math.floor(Date.now() / 1000) + ',\'' + JSON.stringify(sp) + '\')', error => {
                    if (error) throw error;
                  });
                });

                vp.getVP(true, () => {
                }).then(vp => {
                  pool.query('INSERT INTO `vptoday`(`time`, `data`) VALUES (' + Math.floor(Date.now() / 1000) + ',\'' + JSON.stringify(vp) + '\')', error => {
                    if (error) throw error;
                  });
                });
                vp.getVP(false, () => {
                }).then(vp => {
                  pool.query('INSERT INTO `vptomorrow`(`time`, `data`) VALUES (' + Math.floor(Date.now() / 1000) + ',\'' + JSON.stringify(vp) + '\')', error => {
                    if (error) throw error;
                  });
                });

                setInterval(() => {
                  vp.getVP(true, onVPUpdate);
                  vp.getVP(false, onVPUpdate);
                }, 60000);

                function onVPUpdate(grade, data) {
                  firebase.send(grade, JSON.stringify(data));
                }
              });
            });
          });
        });
      });
    });
  });
} else {
  throw new Error('config.json missing');
}