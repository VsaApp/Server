const request = require('request');
const fs = require('fs');
const path = require('path');
const pdf_table_extractor = require('pdf-table-extractor');

let config = {};

this.downloadAGPDF = () => {
  const p = this;
  const stream = fs.createWriteStream(path.resolve('ags', 'list.pdf'));
  request.get('http://viktoriaschule-aachen.de/index.php?menuid=1&downloadid=513').pipe(stream);
  stream.on('finish', () => {
    p.readAGList();
  });
};

this.readAGList = () => {
  pdf_table_extractor(path.resolve('ags', 'list.pdf'), result => {
    const tables = result.pageTables[0].tables;
    const ags = [];
    for (let i = 0; i < tables[0].length; i++) {
      ags.push({
        weekday: tables[0][i],
        ags: []
      });
    }
    for (let i = 1; i < tables.length; i++) {
      for (let j = 0; j < tables[i].length; j++) {
        if (!tables[i][j].startsWith(' ')) {
          ags[j].ags.push(tables[i][j]);
        }
        ags[j].ags = ags[j].ags.filter(el => {
          return el !== '';
        });
      }
    }
    for (let i = 0; i < ags.length; i++) {
      const t = ags[i].ags;
      ags[i].ags = [];
      for (let j = 0; j < t.length; j++) {
        const g = t[j];
        const s = g.split('\n');
        const o = {
          name: s[0].replace(/Kl\. [0-9]/g, '').trim(),
          time: '',
          room: '',
          grades: ''
        };
        for (let k = 0; k < s.length; k++) {
          if (s[k].toLowerCase().includes('uhr')) {
            let m = s[k].replace('Jgst. 5', '').trim();
            if (m.toLowerCase().includes('uhr') && !m.toLowerCase().includes(' uhr')) {
              m = m.toLowerCase().replace(/uhr/gim, ' Uhr');
            }
            if (m.includes('-')) {
              o.time = m.split('-')[0].trim() + ' - ' + m.split('-')[1].trim();
            } else {
              o.time = m;
            }
          } else if (s[k].toLowerCase().includes('raum') || s[k].toLowerCase().includes('r.') || s[k].toLowerCase().includes('comp.') || s[k].toLowerCase().includes('gr ha') || s[k].toLowerCase().includes('ghalle') || s[k].toLowerCase().includes('g halle') || s[k].toLowerCase().includes('aula') || s[k].toLowerCase().includes('beekstraße')) {
            o.room = s[k].toLowerCase().replace('raum ', '').replace('r.', '').replace('comp.', '').replace(/gr ha|ghalle|g halle/g, 'Große Halle').replace('musikraum', 'Musikraum').replace('aula', 'Aula').replace('beekstraße', 'Beekstraße').replace(/\./g, '').trim();
          } else if (s[k].toLowerCase().includes('gst') || s[k].toLowerCase().includes('alle') || s[k].toLowerCase().includes('stufe') || s[k].toLowerCase().includes('kl.')) {
            const grades = ['5', '6', '7', '8', '9', 'ef', 'q1', 'q2'];
            let m = s[k].toLowerCase().replace('jgst.', '').replace('gst.', '').replace('ef', 'EF').replace('q1', 'Q1').replace('q2', 'Q2').replace('oberstufe', 'Oberstufe').replace('mittelstufe', 'Mittelstufe').replace('unterstufe', 'Unterstufe').replace('alle', 'Alle').replace(/[1-2]\.hj/g, '').replace(/ +(?= )/g, '').replace('/', '-').trim();
            if (m.includes('kl.')) {
              m = m.split('kl.')[1].trim();
            }
            if (m.includes('ab')) {
              m = m.replace('ab', '').trim() + '-Q2';
            }
            if (m.includes('-')) {
              o.grades = m.split('-')[0].trim() + ' - ' + m.split('-')[1].trim();
            } else {
              o.grades = m;
            }
          }
        }
        ags[i].ags.push(o);
      }
    }
    fs.writeFileSync(path.resolve('ags', 'list.json'), JSON.stringify(ags, null, 2));
    console.log('Downloaded AGs');
  }, console.error);
};

this.setConfig = c => {
  config = c;
};

module.exports = this;