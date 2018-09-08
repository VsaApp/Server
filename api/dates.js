const request = require('request');
const fs = require('fs');
const path = require('path');
const pdf_table_extractor = require('pdf-table-extractor');

let config = {};

this.downloadDatesPDF = documents => {
  const document = documents.filter(document => {
    return document.text.startsWith('Übersichtsplanung über die Termine im Schuljahr');
  })[0];
  const p = this;
  const stream = fs.createWriteStream(path.resolve('dates', 'list.pdf'));
  request(document.url).pipe(stream);
  stream.on('finish', () => {
    p.readDatesList();
  });
};

this.readDatesList = () => {
  const out = {
    years: [],
    holidays: [],
    openDoorDay: {},
    freeDays: [],
    consultationDays: [],
    conferences: [],
    gradesReleases: []
  };
  pdf_table_extractor(path.resolve('dates', 'list.pdf'), result => {
    result.pageTables[0].tables[0][0].split('\n').forEach(line => {
      if (line.includes('Ferienordnung')) {
        out.years = line.replace('Ferienordnung ', '').split(' ')[0].split('/').map(year => {
          return parseInt(year);
        });
        out.years[1] = parseInt(out.years[0].toString().substring(0, 2) + out.years[1].toString());
      }
    });
    const lines = result.pageTables[0].tables[2][0].split('\n').filter(line => {
      return line.trim() !== '';
    }).map(line => {
      return line.trim();
    });
    getHolidays(result.pageTables[0].tables[1][0].split('\n').slice(1));
    getOpenDoorDay(lines);
    getFreeDays(lines);
    getConsultationDays(lines);
    getGradeReleases(lines);
    getConferences(lines);
    fs.writeFileSync(path.resolve('dates', 'list.json'), JSON.stringify(out, null, 2));
    console.log('Downloaded dates');
    module.parent.exports();
  }, console.error);

  function getConferences(lines) {
    lines = lines.join('\n').split('Zeugniskonferenzen:')[1].split('Pädagogischer Tag und Kollegiumstagung:')[0].split('\n');
    lines.shift();
    lines.pop();
    lines.forEach((line, i) => {
      lines[i] = line.replace(' ', '');
    });
    lines = lines.filter(line => {
      line = line.trim();
      return !line.startsWith('Beratungskonferenzen') && !line.startsWith('Zeugnisausgabe');
    });
    lines.forEach(line => {
      while (line.includes('  ')) {
        line = line.replace('  ', ' ');
      }
      if (/^[0-9]/m.test(line)) {
        line = line.split('. ')[0];
        let b = line.split(' und ')[0];
        const a = b.split('/')[0] + b.split('/')[1].split('.').slice(1).join('.');
        b = b.split('/')[1];
        let d = line.split(' und ')[1];
        const c = d.split('/')[0] + d.split('/')[1].split('.').slice(1).join('.');
        d = d.split('/')[1];
        const dates = [a, b, c, d];
        dates.forEach(date => {
          const dateObj = new Date(parseInt(date.split('.')[2]), parseInt(date.split('.')[1]) - 1, date.split('.')[0]);
          out.conferences.push({
            description: 'Beratungskonferenz (Kurzstunden)',
            grade: ['SI'],
            day: {
              weekday: intToWeekday(dateObj.getDay()),
              day: parseInt(date.split('.')[0]),
              month: intToMonth(date.split('.')[1]),
              year: parseInt(date.split('.')[2])
            }
          });
        });
      } else {
        const weekday = line.split(' ')[0].replace(',', '');
        const day = parseInt(line.split(' ')[1].replace('.', ''));
        const month = line.split(' ')[2];
        const year = parseInt(line.split(' ')[3]);
        const rest = line.split(' ').slice(4).join(' ');
        const grades = rest.split('), ')[0].replace('(', '');
        const description = rest.split('), ').slice(1).join(' ');
        out.conferences.push({
          description: description,
          grade: grades.split(', '),
          day: {
            weekday: weekday,
            day: day,
            month: month,
            year: year
          }
        });
      }
    });
  }

  function getGradeReleases(lines) {
    lines = lines.filter(line => {
      return line.includes('Zeugnisausgabe');
    });
    lines.forEach(line => {
      line = line.replace('Zeugnisausgabe:', '').replace(/zu Beginn der [0-9]\. Stunde/, '').trim();
      while (line.includes('  ')) {
        line = line.replace('  ', ' ');
      }
      line = line.split(' ').slice(1).join(' ');
      const weekday = line.split(' ')[0].replace(',', '');
      const day = parseInt(line.split(' ')[1].replace('.', ''));
      const month = line.split(' ')[2];
      const year = parseInt(line.split(' ')[3]);
      const schoolOff = line.split(' ').slice(4).join(' ').replace(/[()]/g, '');
      out.gradesReleases.push({
        description: 'Zeugnisausgabe',
        schoolOff: schoolOff,
        day: {
          weekday: weekday,
          day: day,
          month: month,
          year: year
        }
      });
    });
  }

  function getConsultationDays(lines) {
    lines = lines.join('\n').split('Sprechtage').slice(1)[0].split('\n');
    lines.forEach(line => {
      if (/^[0-9]\. /m.test(line)) {
        line = line.replace(/^[0-9]\. /, '').trim();
        const description = line.includes('Monitasprechtag') ? 'Monitasprechtag' : 'Elternsprechtag';
        line = line.replace(': Monitasprechtag', '');
        const days = [];
        if (line.includes('und')) {
          const date1 = line.split(' und ')[0];
          const date2 = line.split(' und ')[1];
          const time = date2.split(' ').slice(4).join(' ');
          days.push({
            description: description,
            time: time.replace(/[()]/g, ''),
            weekday: date1.split(' ')[0].replace(',', ''),
            day: parseInt(date1.split(' ')[1].replace('.', '')),
            month: date1.split(' ')[2],
            year: parseInt(date1.split(' ')[3])
          });
          days.push({
            description: description,
            time: time.replace(/[()]/g, ''),
            weekday: date2.split(' ')[0].replace(',', ''),
            day: parseInt(date2.split(' ')[1].replace('.', '')),
            month: date2.split(' ')[2],
            year: parseInt(date2.split(' ')[3])
          });
        } else {
          const date = line;
          const time = date.split(' ').slice(4).join(' ');
          days.push({
            description: description,
            time: time.replace(/[()]/g, ''),
            weekday: date.split(' ')[0].replace(',', ''),
            day: parseInt(date.split(' ')[1].replace('.', '')),
            month: date.split(' ')[2],
            year: parseInt(date.split(' ')[3])
          });
        }
        days.forEach(day => {
          out.consultationDays.push(day);
        });
      }
    });
  }

  function getFreeDays(lines) {
    const lines1 = lines.join('\n').split('Sprechtage')[0].split('\n');
    lines1.forEach(line => {
      if (/^[0-9]\. /m.test(line)) {
        line = line.replace(/^[0-9]\. /, '').trim();
        const weekday = line.split(' ')[0].replace(',', '');
        const day = parseInt(line.split(' ')[1].replace('.', ''));
        const month = line.split(' ')[2];
        const year = parseInt(line.split(' ')[3]);
        const description = (weekday.toLowerCase().includes('karneval') ? weekday : line.split(' ').slice(4).join(' ').replace(/[()]/g, ''));
        out.freeDays.push({
          description: description,
          weekday: weekday,
          day: day,
          month: month,
          year: year
        });
      }
    });
    let lines2 = lines.join('\n').split('Pädagogischer Tag und Kollegiumstagung:')[1].split('\n').slice(1);
    lines2.forEach(line => {
      if (line.startsWith(' ')) {
        line = line.slice(2);
        while (line.includes('  ')) {
          line = line.replace('  ', ' ');
        }
        let description = line.split(': ')[0];
        if (/[0-9]$/m.test(description)) {
          description = description.slice(0, -1);
        }
        if (line.includes('voraussichtlich')) {
          description += ' (voraussichtlich)';
          line = line.replace(' voraussichtlich', '');
        }
        line = line.split(': ')[1];
        const weekday = line.split(' ')[0].replace(',', '');
        const day = parseInt(line.split(' ')[1].replace('.', ''));
        const month = line.split(' ')[2];
        const year = parseInt(line.split(' ')[3]);
        out.freeDays.push({
          description: description,
          weekday: weekday,
          day: day,
          month: month,
          year: year
        });
      }
    });
  }

  function getOpenDoorDay(lines) {
    let openDoorDay = lines.find(line => {
      return line.includes('Unterricht am Tag der Offenen Tür für künftige Fünftklässler und deren Eltern.');
    }).replace(': Unterricht am Tag der Offenen Tür für künftige Fünftklässler und deren Eltern.', '');
    let openDoorDayReplacement = lines.find(line => {
      return line.includes('Dafür ist unterrichtsfrei am');
    }).replace('Dafür ist unterrichtsfrei am ', '').replace(', dem', '').slice(0, -1);
    out.openDoorDay = {
      description: 'Tag der Offenen Tür',
      day: parseInt(openDoorDay.split('.')[0]),
      month: intToMonth(parseInt(openDoorDay.split('.')[1])),
      year: openDoorDay.split('.')[2]
    };
    out.freeDays.push({
      description: 'Ersatz für Tag der Offenen Tür',
      weekday: openDoorDayReplacement.split(' ')[0],
      day: parseInt(openDoorDayReplacement.split(' ')[1]),
      month: openDoorDayReplacement.split(' ')[2],
      year: parseInt(openDoorDayReplacement.split(' ')[3])
    });
  }

  function getHolidays(lines) {
    lines.forEach(line => {
      const name = line.split(' ')[0];
      let rest = line.slice(line.split(' ')[0].length).trim();
      while (rest.includes('  ')) {
        rest = rest.replace('  ', ' ');
      }
      const arr = rest.split(' ');
      let start = arr.slice(0, 4);
      let end = arr.slice(4, arr.length);
      start = {weekday: start[0], day: parseInt(start[1]), month: start[2], year: parseInt(start[3])};
      if (end.length > 0) {
        end = {weekday: end[0], day: parseInt(end[1]), month: end[2], year: parseInt(end[3])};
      } else {
        end = {};
      }
      out.holidays.push({
        name: name,
        start: start,
        end: end
      });
    });
  }
};

function intToMonth(month) {
  const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  return months[month - 1];
}

function intToWeekday(day) {
  const weekdays = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  return weekdays[day - 1];
}

this.setConfig = c => {
  config = c;
};

module.exports = this;