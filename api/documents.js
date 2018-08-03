const request = require('request');
const fs = require('fs');
const path = require('path');
const parser = require('fast-html-parser');

let config = {};

let pages = [];
let processedPages = [];
let documents = [];

this.fetchPages = () => {
  return new Promise(resolve => {
    request.get({url: 'http://viktoriaschule-aachen.de/'}, (error, response, body) => {
      if (error) {
        this.fetchPages().then(resolve);
        return;
      }
      const html = parser.parse(body);
      const links = html.querySelectorAll('.menuxaktiv_back').concat(html.querySelectorAll('.menuxaktiv'));
      links.forEach((link, i) => {
        links[i] = link.id.replace('menu_', '');
      });
      resolve(links);
    });
  });
};

this.processPage = id => {
  return new Promise(resolve => {
    request.get({url: 'http://viktoriaschule-aachen.de/index.php?menuid=' + id}, (error, response, body) => {
      if (error) {
        this.processPage(id).then(resolve);
        return;
      }
      const html = parser.parse(body);
      let links = html.querySelectorAll('.downloadlink');
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
        links[i].url = 'http://viktoriaschule-aachen.de' + link.url;
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
          fs.writeFileSync(path.resolve('documents', 'list.json'), JSON.stringify({
            documents: documents,
            groups: groups
          }, null, 2));
          console.log('Downloaded documents list');
        }
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