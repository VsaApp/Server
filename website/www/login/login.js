if (Cookies.get('id') !== undefined) {
  console.log(Cookies.get('id'));
  $('#QR').attr('src', 'https://chart.googleapis.com/chart?chs=150x150&cht=qr&chl=' + Cookies.get('id') + '&choe=UTF-8&chld=L|1');
}