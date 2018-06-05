const socket = io();
socket.on('hello', who => {
  alert('Hello ' + who + '!');
});