var http = require('http');
var fs = require('fs');

let config = {};

// To install PDF libraray: npm install pdf2json

this.downloadTutorPDF = () => {
  var file = fs.createWriteStream("./tutor/list.pdf");
  var request = http.get("http://www.viktoriaschule-aachen.de/index.php?menuid=41&downloadid=80&reporeid=0", function(response) {
    response.pipe(file);
    readTutorList();
  });
};

readTutorList = () => {
  let fs = require("fs"),
    PDFParser = require("pdf2json");

  let pdfParser = new PDFParser();

  pdfParser.on("pdfParser_dataError", errData => {
    console.error(errData);
  });

  pdfParser.on("pdfParser_dataReady", pdfData => {
    let tutorList = [];
    let pages = pdfData.formImage.Pages;
    pages.forEach(function(page) {
      let lines = [];
      let tempValues = [];

      page.Texts.forEach(function(rawText) {
        let text = decodeURI(rawText.R[0].T);
        if ((text.includes('.') && text.length <= 3) | text == 'Fakultenliste') {
          return;
        } else if (text.length == 3) {
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
          let value = line[i].trim();
          if (value.length == 3) {
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


    let pJSON = JSON.stringify(tutorList, null, 2);

    //fs.writeFile("./dates.json", JSON.stringify(pdfData));

    fs.writeFile("./tutor/list.json", pJSON, err => {
      if (err) {
        console.error("parsing error:", err);
      } else {
        console.log("parsing succeeded");
      }
    });
  });

  pdfParser.loadPDF("./tutor/list.pdf");
};

this.setConfig = c => {
  config = c;
};

module.exports = this;