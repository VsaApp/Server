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
    if (response.statusCode != 200) {
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
    if (today && lastToday !== time) {
      update = true;
    }
    if (!today && lastTomorrow !== time) {
      update = true;
    }
    if (update) {
      if (today) {
        lastToday = time;
      } else {
        lastTomorrow = time;
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
        'Q2': []
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
        'Q2': []
      };
      const table = html.querySelectorAll('table')[0];
      let prevGrade = '';
      for (let i = 1; i < table.childNodes.length; i++) {
        let data = {
          date: date.getUTCDate() + '.' + (date.getUTCMonth() + 1) + '.' + date.getUTCFullYear(),
          time: time,
          weekday: weekday,
          grade: '',
          unit: '',
          lesson: '',
          changed: {
            info: '',
            tutor: '',
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
          if (text.length == 1) {
            text = '';
          }
          if (j == 0) {
            if (text.startsWith('···')) {
              data.grade = prevGrade;
            } else {
              data.grade = text.split(' ')[0].slice(0, -1);
              prevGrade = data.grade;
            }
            data.unit = text.split(' ')[1].slice(0, -1);
          } else if (j == 2) {
            if (text === '') {
              for (let l = 0; l < table.childNodes[i].childNodes[1].childNodes.length; l++) {
                text += table.childNodes[i].childNodes[1].childNodes[l].childNodes[0].rawText + '\n';
              }
              while (text.includes('  ')) {
                text = text.replace('  ', ' ');
              }
              const lines = (text.match(/\n/g) || []).length + 1;
              const split = text.split('\n');
              if (text.startsWith('Klausur:')) {
                data.lesson = split[1].split(' ')[2] + ' ' + split[1].split(' ')[3];
                data.changed.tutor = split[split.length - 2].split(':')[0];
                data.changed.room = split[split.length - 2].split(' ')[split[split.length - 2].split(' ').length - 1];
                data.changed.info = split[1].split(' ')[2] + ' ' + split[1].split(' ')[3] + ' Klausur';
              } else {
                data.lesson = split[0].substr(3).trim();
                data.changed.info = split[0].substr(3) + 'Freistd.';
              }
            } else {
              const lines = (text.match(/\n/g) || []).length + 1;
              const g = table.childNodes[i].childNodes[1].childNodes[0].childNodes[0].rawText;
              if (lines == 1) {
                if (text === 'Studienzeit') {
                  data.lesson = g.split(' ')[1] + ' ' + g.split(' ')[2];
                  data.changed.info = 'Freistunde';
                } else {
                  data.lesson = g.split(' ')[1];
                  data.changed.info = text;
                }
              } else {
                const split = text.split('\n');
                data.lesson = g.split(' ')[1];
                data.changed.tutor = split[0].split(' ')[0];
                data.changed.info = split[0].split(' ')[1];
                for (let m = 0; m < split.length; m++) {
                  if (split[m].startsWith('R-Ändg. ')) {
                    data.changed.room = split[m].replace('R-Ändg. ', '');
                    break;
                  }
                }
              }
            }
          }
        }
        if (today) {
          vpToday[data.grade].push(data);
        } else {
          vpTomorrow[data.grade].push(data);
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
