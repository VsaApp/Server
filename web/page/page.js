$('#logout').click(() => {
  $.ajax({
    url: 'web/delete?web=' + Cookies.get('id'),
    success: data => {
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
    containerReady();
  });
}

loadContainer('sp');