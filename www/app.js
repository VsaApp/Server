const socket = io();

socket.on('sp', sp => {
  console.log(sp);
});
socket.on('vp', vp => {
  console.log(vp);
});

$(() => {
  $('#gradesubmit').click(() => {
    socket.emit('grade', $('#grade').val());
  });
});