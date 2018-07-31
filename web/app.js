if (Cookies.get('reload') !== undefined) {
  Cookies.remove('reload');
  location.reload();
}
let grade;
let choices;

$(() => {
  let connected = Cookies.get('connected');
  if (connected === undefined) {
    connected = false;
  }
  let i = Cookies.get('id');
  if (i === undefined) {
    i = null;
  }
  $.ajax({
    url: 'web/id?web=' + i,
    success: data => {
      Cookies.set('id', data.id, {
        expires: Infinity
      });
      if (connected) {
        $.ajax({
          url: 'web/grade?web=' + Cookies.get('id'),
          success: data => {
            grade = data.grade;
            $.ajax({
              url: 'web/choices?web=' + Cookies.get('id'),
              success: data => {
                choices = data;
                if (grade === undefined) {
                  $('#logout').click();
                }
              }
            });
          }
        });
      }
    }
  });
  if (!connected) {
    setInterval(() => {
      $.ajax({
        url: 'web/connected?web=' + Cookies.get('id'),
        success: data => {
          if (data.connected) {
            Cookies.set('connected', true);
            location.reload();
          } else {
            Cookies.remove('connected');
          }
        }
      });
    }, 500);
  }
  if (!connected) {
    showLoginScreen();
  } else {
    showPage();
  }
});

function showPage() {
  load('body', 'page/page.html');
}

function showLoginScreen() {
  load('body', 'login/login.html');
}

function load(selector, url) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: url,
      success: content => {
        $(selector).html(content);
        resolve();
      }
    });
  });
}

const subjectNames = {
  CH: 'Chemie',
  PH: 'Physik',
  DB: 'NW',
  DP: 'PoWi',
  IF: 'Info',
  S8: 'Spanisch',
  S0: 'Spanisch',
  MU: 'Musik',
  SP: 'Sport',
  F6: 'Französisch',
  L6: 'Latein',
  ER: 'E. Reli',
  KR: 'K. Reli',
  D: 'Deutsch',
  E5: 'Englisch',
  M: 'Mathe',
  PK: 'Politik',
  BI: 'Bio',
  UC: 'U. Chor',
  EK: 'Erdkunde',
  KU: 'Kunst',
  SW: 'SoWi',
  PL: 'Philosophie',
  GE: 'Geschichte',
  VM: 'Vertiefung Mathe',
  VD: 'Vertiefung Deutsch',
  VE: 'Vertiefung Englisch',
  FF: 'Französisch Förder',
  LF: 'Latein Förder'
};