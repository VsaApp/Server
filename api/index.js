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

                function getLatestData(table) {
                  return new Promise((resolve, reject) => {
                    pool.query('SELECT data FROM ' + table + ' ORDER BY time DESC LIMIT 1', (error, results) => {
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
                    pool.query('SELECT MD5(data) AS data FROM ' + table + ' ORDER BY time DESC LIMIT 1', (error, results) => {
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
                  getLatestData('teachers').then(data => {
                    res.send(data);
                  }).catch(data => {
                    res.send(data);
                  });
                });
                app.use('/dates/list.json', (req, res) => {
                  getLatestData('dates').then(data => {
                    res.send(data);
                  }).catch(data => {
                    res.send(data);
                  });
                });
                app.use('/ags/list.json', (req, res) => {
                  getLatestData('ags').then(data => {
                    res.send(data);
                  }).catch(data => {
                    res.send(data);
                  });
                });
                app.use('/documents/list.json', (req, res) => {
                  getLatestData('documents').then(data => {
                    res.send(data);
                  }).catch(data => {
                    res.send(data);
                  });
                });
                app.use('/sp/:grade.json', (req, res) => {
                  getLatestData('sp').then(data => {
                    res.send(JSON.parse(data).filter(obj => {
                      return obj.grade === req.params.grade;
                    })[0].plan);
                  }).catch(data => {
                    res.send(data);
                  });
                });
                app.use('/vp/:day/:grade.json', (req, res) => {
                  getLatestData('vp' + req.params.day).then(data => {
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

                function insertData(table, data) {
                  getLatestData(table).then(d => {
                    if (JSON.stringify(data) !== d) {
                      pool.query('INSERT INTO `' + table + '`(`time`, `data`) VALUES (' + Math.floor(Date.now() / 1000) + ',\'' + JSON.stringify(data) + '\')', error => {
                        if (error) throw error;
                      });
                    }
                  }).catch();
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
                  insertData('documents', documents);
                  ags.downloadAGPDF(documents.documents).then(ags => {
                    insertData('ags', ags);
                  });
                  dates.downloadDatesPDF(documents.documents).then(dates => {
                    insertData('dates', dates);
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
                    insertData('teachers', shorts);
                  }
                }

                sp.downloadSP().then(sp => {
                  insertData('sp', sp);
                });

                vp.getVP(true, () => {
                }).then(vp => {
                  insertData('vptoday', vp);
                });
                vp.getVP(false, () => {
                }).then(vp => {
                  insertData('vptomorrow', vp);
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