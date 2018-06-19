const request = require('request');
const fs = require('fs');
const path = require('path');
const PDFParser = require('pdf2json');

let config = {};

this.downloadDatesPDF = () => {
  const p = this;
  const stream = fs.createWriteStream(path.resolve('dates', 'list.pdf'));
  request('http://www.viktoriaschule-aachen.de/index.php?menuid=3&downloadid=797&reporeid=0').pipe(stream);
  stream.on('finish', () => {
    p.readDatesList();
  });
};

this.readDatesList = () => {
  const pdfParser = new PDFParser();

  pdfParser.on('pdfParser_dataError', errData => {
    console.error(errData);
  });

  pdfParser.on('pdfParser_dataReady', pdfData => {
    // filter all textes in the PDF...
    let sections = {
      'holidays': [],
      'bridgeDays': [],
      'consultationDays': [],
      'conferences': [],
      'others': []
    };
    texts = pdfData.formImage.Pages[0].Texts;
    key = "header";
    texts.forEach(textObject => {
      text = decodeURI(textObject.R[0].T).trim().replace(/  +/g, ' ');
      // Decode the Text...
      text = text.split("%3A").join(":");
      text = text.split("%2C").join(",");
      text = text.split("%3C").join(",");
      text = text.split("%2F").join("/");

      // SPlit PDF in all sections...
      switch (text) {
        case "Letzter Ferientag":
          key = "holidays";
          return;
        case "Alle Samstage sind unterrichtsfrei, außer":
          key = "bridgeDays";
          return;
        case "Sprechtage":
          key = "consultationDays";
          return;
        case "Zeugniskonferenzen:":
          key = "conferences";
          return;
        case "Pädagogischer Tag und Kollegiumstagung:":
          key = "others";
          return;
        case "Einen vollständigen und voraussichtlich endgültigen Terminplan finden Sie ab September 2017 auf unserer Homepage":
          key = "footer";
          return;
      }
      if (key != "header" && key != "footer") {
        sections[key].push(text);
      }
    });

    let dates = {
      'holidays': [],
      'openDoorDay': {},
      'freeDays': [],
      'consultationDays': [],
      'conferences': [],
      'gradesReleases': []
    };


    // Get all holidays...
    let linenumber = 0;
    sections.holidays.forEach(entry => {
      let day = {
        'weekday': '',
        'day': 0,
        'month': '',
        'year': 0
      };
      let fragments = entry.split(" ");

      switch (linenumber) {
        case 0:
          let holiday = {
            'name': fragments[0],
            'start': {},
            'end': {}
          };
          dates.holidays.push(holiday);
          linenumber++;
          break;
        case 1:
          day.weekday = fragments[0].replace(":", "");
          day.day = parseInt(fragments[1].substring(0, 2));
          day.month = fragments[2];
          day.year = parseInt(fragments[3]);
          dates.holidays[dates.holidays.length - 1].start = day;
          linenumber++;
          break;
        case 2:
          day.weekday = fragments[0].replace(":", "");
          day.day = parseInt(fragments[1].substring(0, 2));
          day.month = fragments[2];
          day.year = parseInt(fragments[3]);
          dates.holidays[dates.holidays.length - 1].end = day;
          linenumber = 0;
          break;
      }

    });

    // Get all bridge days...
    for (let i = 0; i < sections.bridgeDays.length; i++) {
      entry = sections.bridgeDays[i];
      if (entry == "Unterricht am Tag der Offenen Tür für künftige Fünftklässler und deren Eltern.") {
        let lastEntry = sections.bridgeDays[i - 1];
        dates.openDoorDay = {
          'description': "Tag der offenen Tür",
          'day': parseInt(lastEntry.split(".")[0]),
          'month': parseInt(lastEntry.split(".")[1]),
          'year': parseInt(lastEntry.split(".")[2].substring(0, 4))
        };
      } else if (entry == "Dafür unterrichtsfrei am") {
        dates.freeDays.push({
          'desription': "Ersatz für Tag der offenen Tür",
          'weekday': sections.bridgeDays[i + 1],
          'day': parseInt(sections.bridgeDays[i + 3].split(" ")[1].substring(0, 2)),
          'month': sections.bridgeDays[i + 3].split(" ")[2],
          'year': parseInt(sections.bridgeDays[i + 3].split(" ")[3])
        });
      } else if (entry.length == 2) {
        if (!isNaN(entry[0]) && entry[1] == ".") {
          entry = sections.bridgeDays[i + 1];
          dates.freeDays.push({
            'description': entry.split("(")[1].split(")")[0],
            'weekday': entry.split(",")[0],
            'day': parseInt(entry.split(" ")[1].substring(0, 2)),
            'month': entry.split(" ")[2],
            'year': parseInt(entry.split(" ")[3]),
          });
        }
      }
    }

    // Get all consultation days...
    for (let i = 0; i < sections.consultationDays.length; i++) {
      entry = sections.consultationDays[i];
      day = {
        'description': '',
        'time': '',
        'weekday': '',
        'day': '',
        'month': '',
        'year': '',
      };
      if (entry.length == 2) {
        if (!isNaN(entry[0]) && entry[1] == ".") {
          entry = sections.consultationDays[i + 1];

          let fragments = entry.split(" und ");
          for (let j = 0; j < fragments.length; j++) {
            fragment = fragments[j];
            if (fragments.length == 1) day.time = fragment.split("(")[1].split(")")[0];
            else day.time = entry.split("(")[1].split(")")[0];
            day.weekday = fragment.split(",")[0];
            day.day = parseInt(fragment.split(" ")[1].substring(0, 2));
            day.month = fragment.split(" ")[2];
            day.year = parseInt(fragment.split(" ")[3].substring(0, 4));
            if (fragment.split(": ").length > 1) {
              day.description = fragment.split(": ")[1].split(" (")[0];
            } else {
              day.description = 'Elternsprechtag';
            }
            dates.consultationDays.push(day);
          }
        }
      }
    }

    // Get all testimony conferences...
    for (let i = 0; i < sections.conferences.length; i++) {
      entry = sections.conferences[i];
      if (entry == "\uf0b7") {
        entry = sections.conferences[i + 1];
        if (entry == 'Zeugnisausgabe') {
          entry = sections.conferences[i + 2].split(":")[1].trim();
          dates.gradesReleases.push({
            'desription': 'Zeugnisausgabe',
            'schoolOff': sections.conferences[i + 3],
            'day': {
              'weekday': entry.split(", ")[0],
              'day': parseInt(entry.split(", ")[1].split(" ")[0].substring(0, 2)),
              'month': entry.split(", ")[1].split(" ")[1],
              'year': parseInt(entry.split(", ")[1].split(" ")[2].substring(0, 4))
            }
          });
        } else if (entry.split(", ").length > 2) {
          dates.conferences.push({
            'desription': entry.split(", ")[entry.split(", ").length - 1],
            'class': entry.split("(")[1].split(")")[0].split(", "),
            'day': {
              'weekday': entry.split(", ")[0],
              'day': parseInt(entry.split(", ")[1].split(" ")[0].substring(0, 2)),
              'month': entry.split(", ")[1].split(" ")[1],
              'year': parseInt(entry.split(", ")[1].split(" ")[2].substring(0, 4))
            }
          });
        } else {
          // Example entry: "21./23.11.2017 und 24./26.4.2018. Der Unterricht endet jeweils um 12.45 Uhr, es finden Kurzstunden statt."
          let fragments = entry.split(". ")[0].split(" und ");
          for (let y = 0; y < fragments.length; y++) {
            let days = fragments[y].split("/");
            for (let index = 0; index < fragments.length; index++) {
              dates.conferences.push({
                'desription': 'Kurzstunden',
                'class': ["S1", "S2"],
                'day': {
                  'weekday': null,
                  'day': parseInt(days[index].substring(0, 2)),
                  'month': parseInt(fragments[y].split(".")[fragments[y].split(".").length - 2]),
                  'year': parseInt(fragments[y].split(".")[fragments[y].split(".").length - 1])
                }
              });
            }
          }
        }
      }
    }

    // Get all other free days...
    for (let i = 0; i < sections.others.length; i++) {
      let entry = sections.others[i];
      if (entry == "\uf0b7") {
        entry = sections.others[i + 2];
        if (!isNaN(entry)) {
          entry = sections.others[i + 5];
        }
        // Example entry: 'Mittwoch, 16. Mai 2018'
        dates.freeDays.push({
          'desription': sections.others[i + 1].replace(':', ''),
          'weekday': entry.split(" ")[0],
          'day': parseInt(entry.split(" ")[1].substring(0, 2)),
          'month': entry.split(" ")[2],
          'year': parseInt(entry.split(" ")[3])
        });
      }
    }

    fs.writeFileSync(path.resolve('dates', 'list.json'), JSON.stringify(dates, null, 2));
    console.log('Downloaded dates');
  });

  pdfParser.loadPDF(path.resolve('dates', 'list.pdf'));
};

this.setConfig = c => {
  config = c;
};

module.exports = this;