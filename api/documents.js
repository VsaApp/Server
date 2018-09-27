const request = require('request');
const parser = require('fast-html-parser');

let config = {};

let pages = [];
let processedPages = [];
let documents = [];

this.processPage = id => {
  return new Promise(resolve => {
    request.get({url: 'http://viktoriaschule-aachen.de/index.php?menuid=' + id}, (error, response, body) => {
      if (error) {
        this.processPage(id).then(resolve);
        return;
      }
      const html = parser.parse(body);
      let links = html.querySelectorAll('a').filter(link => {
        return link.classNames.includes('downloadlink') || (this.extractAttrs(link.rawAttrs).href !== undefined && (this.extractAttrs(link.rawAttrs).href.toLowerCase().includes('pdf') || this.extractAttrs(link.rawAttrs).href.toLowerCase().includes('downloadid')));
      });
      links.forEach((link, i) => {
        links[i] = {
          url: this.extractAttrs(link.rawAttrs).href.slice(0, -1).replace(/amp;/g, ''),
          text: link.childNodes[0].rawText
        };
      });
      links = links.filter(link => {
        return link.url.startsWith('/');
      });
      links.forEach((link, i) => {
        links[i].url = 'http://viktoriaschule-aachen.de' + link.url.replace('&reporeid=0', '').replace('&reporeid=', '');
      });
      resolve(links);
    });
  });
};

this.extractAttrs = str => {
  let out = {};
  const attrs = str.split('" ');
  attrs.forEach(attr => {
    out[attr.split('="')[0]] = attr.split('="')[1];
  });
  return out;
};

this.listDocuments = () => {
  return new Promise(resolve => {
    let idCount = 0;
    this.listPages(1).then(() => {
      processedPages.forEach(pp => {
        pages = pages.filter(page => {
          return pp.id !== page.id;
        });
      });
      processedPages = processedPages.concat(pages);
      pages.forEach(page => {
        this.processPage(page.id).then(links => {
          links.forEach((link, i) => {
            links[i] = {url: link.url, text: link.text, group: parseInt(page.id)};
          });
          documents = documents.concat(links);
          idCount++;
          if (idCount === pages.length) {
            const groups = {};
            pages.forEach(page => {
              groups[parseInt(page.id)] = page.text;
            });
            documents = documents.filter((document, index, self) => {
              return index === self.findIndex(t => {
                return t.text === document.text;
              });
            });
            documents = documents.map(document => {
              document.text = document.text.replace(/"/g, '').replace(/'/g, '').replace(/, $/m, '');
              return document;
            });
            console.log('Downloaded documents list');
            resolve({
              documents: documents,
              groups: groups
            });
          }
        });
      });
    });
  });
};

this.listPages = id => {
  return new Promise(resolve => {
    request.get({url: 'http://viktoriaschule-aachen.de/index.php?menuid=' + id}, (error, response, body) => {
      if (error) {
        this.listPages(id).then(resolve);
        return;
      }
      let e = this.extractPages(body);
      pages.forEach(page => {
        e = e.filter(s => {
          return s.id !== page.id;
        });
      });
      pages = pages.concat(e);
      if (e.length > 0) {
        let got = 0;
        e.forEach(s => {
          this.listPages(s).then(() => {
            got++;
            if (got === e.length) {
              resolve();
            }
          });
        });
      } else {
        resolve();
      }
    });
  });
};

this.extractPages = html => {
  const body = parser.parse(html);
  let links = [];
  ['menuxaktiv', 'menuxaktiv_back', 'menuy_aktiv'].forEach(s => {
    links = links.concat(body.querySelectorAll('.' + s));
  });
  links.forEach((link, i) => {
    links[i] = {
      id: this.extractAttrs(link.rawAttrs).href.replace('index.php?menuid=', ''),
      text: link.childNodes[3].rawText.replace('Viktoria - ', '')
    };
  });
  return links;
};

this.setConfig = c => {
  config = c;
};

module.exports = this;