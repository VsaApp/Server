const request = require('request');
const parser = require('fast-html-parser');
const fs = require('fs');
const path = require('path');

let config = {};

let lastToday = '';
let lastTomorrow = '';
let vpToday = {};
let vpTomorrow = {};

this.getVP = (today, callback) => {
  request('http://www.viktoriaschule-aachen.de/sundvplan/vps/' + (today ? 'left' : 'right') + '.html', (error, response, body) => {
    if (!response) {
      this.getVP(today, callback);
      return;
    }
    if (response.statusCode !== 200) {
      console.error(body);
      process.exit(1);
    }
    const html = parser.parse(body);
    const dateStr = html.querySelectorAll('div')[0].childNodes[0].rawText.substr(1).replace('-Klassen-Vertretungsplan für ', '');
    const time = html.querySelectorAll('div')[1].childNodes[0].rawText.replace('Viktoriaschule Aachen, den ', '').split(' um ')[1];
    const date = new Date(dateStr);
    date.setHours(date.getHours() + 1);
    const weekday = dateStr.split(', ')[0];
    let update = false;
    if (today && lastToday !== dateStr + time) {
      update = true;
    }
    if (!today && lastTomorrow !== dateStr + time) {
      update = true;
    }
    if (update) {
      if (today) {
        lastToday = dateStr + time;
      } else {
        lastTomorrow = dateStr + time;
      }
      vpToday = {
        '5a': [],
        '5b': [],
        '5c': [],
        '6a': [],
        '6b': [],
        '6c': [],
        '7a': [],
        '7b': [],
        '7c': [],
        '8a': [],
        '8b': [],
        '8c': [],
        '9a': [],
        '9b': [],
        '9c': [],
        'EF': [],
        'Q1': [],
        'Q2': [],
        '13': []
      };
      vpTomorrow = {
        '5a': [],
        '5b': [],
        '5c': [],
        '6a': [],
        '6b': [],
        '6c': [],
        '7a': [],
        '7b': [],
        '7c': [],
        '8a': [],
        '8b': [],
        '8c': [],
        '9a': [],
        '9b': [],
        '9c': [],
        'EF': [],
        'Q1': [],
        'Q2': [],
        '13': []
      };
      const table = html.querySelectorAll('table')[0].childNodes[1].childNodes[0].childNodes[0].childNodes[0];
      let prevGrade = '';
      // Add all timestamps...
      for (const grade in vpToday) {
        vpToday[grade] = {
          date: date.getUTCDate() + '.' + (date.getUTCMonth() + 1) + '.' + date.getUTCFullYear(),
          time: time,
          weekday: weekday,
          changes: []
        };
      }
      for (const grade2 in vpTomorrow) {
        vpTomorrow[grade2] = {
          date: date.getUTCDate() + '.' + (date.getUTCMonth() + 1) + '.' + date.getUTCFullYear(),
          time: time,
          weekday: weekday,
          changes: []
        };
      }
      // Read the vp...
      for (let i = 1; i < table.childNodes.length; i++) {
        let data = {
          grade: '',
          unit: '',
          lesson: '',
          changed: {
            info: '',
            teacher: '',
            room: ''
          }
        };
        for (let j = 0; j < table.childNodes[i].childNodes.length; j++) {
          let text = '';
          for (let k = 0; k < table.childNodes[i].childNodes[j].childNodes.length; k++) {
            text += table.childNodes[i].childNodes[j].childNodes[k].childNodes[0].rawText + '\n';
          }
          text = text.slice(0, -1);
          text = text.replace('*** ', '');
          if (text.length === 1) {
            text = '';
          }
          if (j === 0) {
            if (text.startsWith('···')) {
              data.grade = prevGrade;
            } else {
              data.grade = text.split(' ')[0].slice(0, -1);
              prevGrade = data.grade;
            }
            data.unit = text.split(' ')[1].slice(0, -1);
          } else if (j === 2) {
            if (text === '') {
              for (let l = 0; l < table.childNodes[i].childNodes[1].childNodes.length; l++) {
                text += table.childNodes[i].childNodes[1].childNodes[l].childNodes[0].rawText + '\n';
              }
              while (text.includes('  ')) {
                text = text.replace('  ', ' ');
              }
              const split = text.split('\n');
              if (text.startsWith('Klausur:')) {
                if (split[1] !== 'Nachschreiber') {
                  data.lesson = split[1].split(' ')[2] + (split[1].split(' ')[3] === undefined ? '' : ' ' + split[1].split(' ')[3]);
                  data.changed.info = split[1].split(' ')[2] + (split[1].split(' ')[3] === undefined ? '' : ' ' + split[1].split(' ')[3]) + ' Klausur';
                } else {
                  data.changed.info = 'Nachschreiber Klausur';
                }
                data.changed.teacher = split[split.length - 2].split(':')[0];
                data.changed.room = split[split.length - 2].split(' ')[split[split.length - 2].split(' ').length - 1];
              } else {
                data.lesson = split[0].substr(3).trim();
                data.changed.info = 'Freistunde';
              }
            } else {
              const lines = (text.match(/\n/g) || []).length + 1;
              const g = table.childNodes[i].childNodes[1].childNodes[0].childNodes[0].rawText;
              if (lines === 1) {
                if (text === 'Studienzeit') {
                  data.lesson = g.split(' ')[1] + ' ' + g.split(' ')[2];
                  data.changed.info = 'Freistunde';
                } else {
                  data.lesson = g.split(' ')[1];
                  if (text.startsWith('R-Ändg. ')) {
                    data.changed.room = text.split(' ')[1];
                    data.changed.info = 'Raumänderung';
                  } else {
                    data.changed.info = text;
                  }
                }
              } else {
                const split = text.split('\n');
                data.lesson = g.split(' ')[1];
                data.changed.teacher = split[0].split(' ')[0];
                data.changed.info = split[0].split(' ')[1];
                for (let m = 0; m < split.length; m++) {
                  if (split[m].startsWith('R-Ändg. ')) {
                    data.changed.room = split[m].split(' ')[1];
                    break;
                  }
                }
              }
            }
          }
        }
        data.changed.room = data.changed.room
          .replace('klHa', 'kleine Halle')
          .replace('grHa', 'große Halle')
          .replace('Ku1', 'Kunst 1')
          .replace('Ku2', 'Kunst 2');
        data.changed.info = data.changed.info
          .replace(/abghgt\.|abgehängt/ig, 'Abgehängt')
          .replace('versch.', 'Verschoben')
          .replace('m.Aufg.', 'Mit Aufgaben')
          .replace('v.', 'Vertretung')
          .replace('Aufs.aus', 'Aufsicht aus')
          .replace('U-frei', 'Unterrichtsausfall');
        if (today) {
          vpToday[data.grade].changes.push(data);
        } else {
          vpTomorrow[data.grade].changes.push(data);
        }
      }

      if (today) {
        Object.keys(vpToday).forEach(key => {
          callback(vpToday[key]);
          fs.writeFileSync(path.resolve('vp', 'today', key + '.json'), JSON.stringify(vpToday[key], null, 2));
        });
      } else {
        Object.keys(vpTomorrow).forEach(key => {
          callback(vpTomorrow[key]);
          fs.writeFileSync(path.resolve('vp', 'tomorrow', key + '.json'), JSON.stringify(vpTomorrow[key], null, 2));
        });
      }
      console.log('Downloaded vp of ' + (today ? 'today' : 'tomorrow'));
    }
  }).auth(config.username, config.password, false);
};

this.setConfig = c => {
  config = c;
};

module.exports = this;