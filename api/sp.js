const request = require('request');
const parser = require('fast-html-parser');
const fs = require('fs');
const path = require('path');

let config = {};

this.downloadSP = () => {
  request('http://www.viktoriaschule-aachen.de/sundvplan/sps/left.html', (error, response, body) => {
    if (response.statusCode !== 200) {
      console.error(body);
      process.exit(1);
    }
    const html = parser.parse(body);
    const tables = html.querySelectorAll('table');
    let divs = html.querySelectorAll('div');
    let sl = [];
    let jg = [];
    for (let i = 0; i < divs.length; i++) {
      const div = divs[i];
      if ('rawText' in div.childNodes[0]) {
        if (div.childNodes[0].rawText.startsWith('Stufenleitung: ')) {
          sl.push(div.childNodes[0].rawText.replace('Stufenleitung: ', ''));
        }
        if (div.childNodes[0].rawText.startsWith('Jahrgang: ')) {
          jg.push(div.childNodes[0].rawText.replace('Jahrgang: ', ''));
        }
      }
    }
    for (let i = 0; i < jg.length; i++) {
      let plan = [];
      for (let j = 0; j < tables[i].childNodes.length; j++) {
        for (let k = 0; k < tables[i].childNodes[j].childNodes.length; k++) {
          let lessons = [];
          for (let l = 0; l < tables[i].childNodes[j].childNodes[k].childNodes.length; l++) {
            let text = tables[i].childNodes[j].childNodes[k].childNodes[l].rawText;
            text = text.replace(/\u00A0/g, ' ');
            while (text.includes('  ')) {
              text = text.replace('  ', ' ');
            }
            lessons.push(text);
          }
          if (j === 0) {
            if (k !== 0) {
              let days = {
                'Mo': 'Montag',
                'Di': 'Dienstag',
                'Mi': 'Mittwoch',
                'Do': 'Donnerstag',
                'Fr': 'Freitag',
                'Sa': 'Samstag',
                'So': 'Sonntag'
              };
              plan[k - 1] = {
                name: days[lessons[0]],
                lessons: []
              };
            }
          } else {
            if (k !== 0) {
              if (plan[k - 1].lessons[j - 1] === undefined) {
                plan[k - 1].lessons[j - 1] = [];
              }
              if (lessons[0] !== ' ') {
                let lessons2 = [];
                if (lessons.length > 1) {
                  for (let m = 0; m < lessons.length; m++) {
                    let lesson = this.strToLesson(lessons[m], true);
                    if (lesson !== undefined) {
                      lessons2.push(lesson);
                    }
                  }
                } else {
                  lessons2.push(this.strToLesson(lessons[0], false));
                }
                plan[k - 1].lessons[j - 1] = lessons2;
              }
            }
          }
        }
      }
      fs.writeFileSync(path.resolve('sp', jg[i] + '.json'), JSON.stringify(plan, null, 2));
    }
    console.log('Downloaded sp');
  }).auth(config.username, config.password, false);
};

this.strToLesson = (str, multi) => {
  if (str.startsWith('Bl')) {
    return;
  }
  let arr = str.split(' ');
  arr = arr.filter(el => el !== '');
  if (multi) {
    return {
      teacher: arr[1],
      lesson: arr[0],
      room: arr[2]
    };
  } else {
    return {
      teacher: arr[0],
      lesson: arr[1],
      room: arr[2]
    };
  }
};

this.setConfig = c => {
  config = c;
};

module.exports = this;