const request = require('request');
const parser = require('fast-html-parser');
const fs = require('fs');
const path = require('path');

let config = {};

this.getVP = (today, callback) => {
  request('http://www.viktoriaschule-aachen.de/sundvplan/vps/' + (today ? 'left' : 'right') + '.html', (error, response, body) => {
    if (response.statusCode != 200) {
      console.error(body);
      process.exit(1);
    }
    const html = parser.parse(body);
    const table = html.querySelectorAll('table')[0];
    let prevGrade = '';
    for (let i = 1; i < table.childNodes.length; i++) {
      let data = {
        grade: '',
        unit: '',
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
              data.changed.tutor = split[2].split(':')[0];
              data.changed.room = split[2].split(' ')[split[2].split(' ').length - 1];
              data.changed.info = split[1].split(' ')[2] + ' ' + split[1].split(' ')[3] + ' Klausur';
            } else {
              data.changed.info = split[0].substr(3) + 'Freistd.';
            }
          } else {
            const lines = (text.match(/\n/g) || []).length + 1;
            if (lines == 1) {
              if (text === 'Studienzeit') {
                const g = table.childNodes[i].childNodes[1].childNodes[0].childNodes[0].rawText;
                data.changed.info = g.split(' ')[1] + ' ' + g.split(' ')[2] + ' ' + text;
              } else {
                data.changed.info = text;
              }
            } else {
              const split = text.split('\n');
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
      callback(data);
    }
    console.log('Downloaded vp of ' + (today ? 'today' : 'tomorrow'));
  }).auth(config.username, config.password, false);
};

this.setConfig = c => {
  config = c;
};

module.exports = this;