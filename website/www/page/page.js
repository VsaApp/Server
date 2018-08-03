$('#logout').click(() => {
  $.ajax({
    url: 'delete?web=' + Cookies.get('id'),
    success: () => {
      const keys = ['id', 'connected'];
      keys.forEach(Cookies.remove);
      Cookies.set('reload', true);
      location.reload();
    }
  });
});

$('.navitem a').click(e => {
  loadContainer($(e.target).attr('for'));
});

function loadContainer(name) {
  $('#content').html('');
  load('#content', 'page/containers/' + name + '.html').then(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i === 50) {
        clearInterval(interval);
        $('#logout').click();
        return;
      }
      if (grade !== undefined) {
        clearInterval(interval);
        containerReady();
        return;
      }
      i++;
    }, 10);
  });
}

loadContainer('sp');