const request = require('request');
const fs = require('fs');
const path = require('path');
const PDFParser = require('pdf2json');

let config = {};

this.downloadTeacherPDF = () => {
  const p = this;
  return new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(path.resolve('tmp', 'mails.pdf'));
    const cookieJar = request.jar();
    request.post({
      url: 'http://viktoriaschule-aachen.de/index.php',
      jar: cookieJar,
      form: {
        username: config.username,
        password: config.password
      }
    }, () => {
      request.get({
        url: 'http://viktoriaschule-aachen.de/index.php?menuid=97&downloadid=265',
        jar: cookieJar
      }).pipe(stream);
      stream.on('finish', () => {
        p.readTeacherList(resolve, reject);
      });
    });
  });
};

this.readTeacherList = resolve => {
  const pdfParser = new PDFParser();

  pdfParser.on('pdfParser_dataError', errData => {
    console.error(errData);
  });

  pdfParser.on('pdfParser_dataReady', pdfData => {
    let teacherList = [];
    const pages = pdfData.formImage.Pages;
    pages.forEach(page => {
      for (let i = 0; i < page.Texts.length; i++) {
        const text = decodeURI(page.Texts[i].R[0].T);
        if (new RegExp(/^[0-9]+\. $/gm).test(text)) {
          teacherList.push(decodeURI(page.Texts[i + 1].R[0].T));
          i++;
        }
      }
    });
    resolve(teacherList);
    console.log('Downloaded teacher\'s mails');
  });

  pdfParser.loadPDF(path.resolve('tmp', 'mails.pdf'));
};

this.setConfig = c => {
  config = c;
};

module.exports = this;