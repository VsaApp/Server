function containerReady() {
  $.ajax({
    url: 'sp/' + grade + '.json',
    success: sp => {
      choices.forEach(choice => {
        const day = sp.filter(day => {
          return day.name === choice.weekday;
        })[0];
        const lesson = day.lessons[choice.unit].filter(lesson => {
          return poop(lesson.teacher) === choice.teacher && lesson.lesson === choice.subject;
        })[0];
        day.lessons[choice.unit][0] = lesson;
      });

      $.ajax({
        url: 'teachers/list.json',
        success: teachers => {
          sp.forEach(day => {
            day.lessons.forEach(subjects => {
              if (subjects.length > 0) {
                const teacher = teachers.filter(teacher => {
                  return teacher.shortName === subjects[0].teacher;
                })[0];
                subjects[0].teacher = (teacher.gender === 'female' ? 'Frau' : 'Herrn') + ' ' + teacher.longName;
              }
            });
          });

          try {
            const headers = ['Uhrzeit', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
            headers.forEach(text => {
              $('#sptable').append('<div>' + text + '</div>');
            });
          } catch (e) {

          }

          try {
            const times = ['8:00 - 9:00', '9:10 - 10:10', '10:30 - 11:30', '11:40 - 12:40', '13:00 - 14:00', '14:00 - 15:00', '15:00 - 16:00', '16:05 - 17:05'];
            for (let i = 0; i < times.length; i++) {
              $('#sptable').append('<div>' + times[i] + '</div>');
              for (let j = 0; j < 5; j++) {
                const lesson = sp[j].lessons[i][0];
                if (sp[j].lessons[i].length > 0) {
                  $('#sptable').append('<div><b>' + subjectNames[lesson.lesson.toUpperCase()] + '</b><br>mit ' + lesson.teacher + '<br>in Raum ' + lesson.room + '</div>');
                } else {
                  if (grade === ('EF' || 'Q1' || 'Q2')) {
                    if (i == 5) {
                      $('#sptable').append('<div>Mittagspause</div>');
                    } else {
                      $('#sptable').append('<div></div>');
                    }
                  }
                }
              }
            }
          } catch (e) {

          }
          if (grade !== ('EF' || 'Q1' || 'Q2')) {
            for (let i = 0; i < 3; i++) {
              $('#sptable').children().last().remove();
            }
          }
        }
      });
    }
  });
}

function poop(name) {
  return name.replace('ä', 'ae').replace('ü', 'ue').replace('ö', 'oe').replace('Ä', 'AE').replace('Ü', 'UE').replace('Ö', 'OE');
}