const request = require('request');
const fs = require('fs');
const path = require('path');
const PDFParser = require('pdf2json');

let config = {};

this.downloadTutorPDF = () => {
  const p = this;
  const stream = fs.createWriteStream(path.resolve('tutors', 'list.pdf'));
  request('http://www.viktoriaschule-aachen.de/index.php?menuid=41&downloadid=80').pipe(stream);
  stream.on('finish', () => {
    p.readTutorList();
  });
};

this.readTutorList = () => {
  const pdfParser = new PDFParser();

  pdfParser.on('pdfParser_dataError', errData => {
    console.error(errData);
  });

  pdfParser.on('pdfParser_dataReady', pdfData => {
    let tutorList = [];
    const pages = pdfData.formImage.Pages;
    pages.forEach(page => {
      let lines = [];
      let tempValues = [];

      page.Texts.forEach(rawText => {
        const text = decodeURI(rawText.R[0].T);
        if ((text.includes('.') && text.length <= 3) | text == 'Fakultenliste') {
          return;
        } else if (text.length == 3 && text === text.toUpperCase()) {
          tempValues.push(text);
          lines.push(tempValues);
          tempValues = [];
        } else {
          tempValues.push(text);
        }
      });
      // Convert lines to tutors...
      lines.forEach(function(line) {
        let tutor = {
          'longName': '',
          'shortName': '',
          'subjects': []
        };
        for (let i = 0; i < line.length; i++) {
          const value = line[i].trim();
          if (value.length == 3 && value === value.toUpperCase()) {
            tutor.shortName = value;
          } else if (value.length <= 2) {
            tutor.subjects.push(value);
          } else {
            tutor.longName = value;
          }
        }
        tutorList.push(tutor);
      });
    });
    fs.writeFileSync(path.resolve('tutors', 'list.json'), JSON.stringify(tutorList, null, 2));
    console.log('Downloaded teachers');
  });

  pdfParser.loadPDF(path.resolve('tutors', 'list.pdf'));
};

this.setConfig = c => {
  config = c;
};

module.exports = this;