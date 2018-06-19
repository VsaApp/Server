const request = require('request');
const fs = require('fs');
const path = require('path');
const PDFParser = require('pdf2json');

let config = {};

this.downloadTeacherPDF = () => {
  const p = this;
  return new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(path.resolve('teachers', 'shorts.pdf'));
    request('http://www.viktoriaschule-aachen.de/index.php?menuid=41&downloadid=80').pipe(stream);
    stream.on('finish', () => {
      p.readTeacherList(resolve, reject);
    });
  });
};

this.readTeacherList = (resolve, reject) => {
  const pdfParser = new PDFParser();

  pdfParser.on('pdfParser_dataError', errData => {
    console.error(errData);
  });

  pdfParser.on('pdfParser_dataReady', pdfData => {
    let teacherList = [];
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
      // Convert lines to teachers...
      lines.forEach(function(line) {
        let teacher = {
          'longName': '',
          'shortName': '',
          'subjects': []
        };
        for (let i = 0; i < line.length; i++) {
          const value = line[i].trim();
          if (value.length == 3 && value === value.toUpperCase()) {
            teacher.shortName = value;
          } else if (value.length <= 2) {
            teacher.subjects.push(value);
          } else {
            teacher.longName = value;
          }
        }
        teacherList.push(teacher);
      });
    });
    resolve(teacherList);
    console.log('Downloaded teacher\'s shortnames');
  });

  pdfParser.loadPDF(path.resolve('teachers', 'shorts.pdf'));
};

this.setConfig = c => {
  config = c;
};

module.exports = this;