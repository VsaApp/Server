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
    while (grade === undefined) ;
    containerReady();
  });
}

loadContainer('sp');