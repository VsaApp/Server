const firebase = require('./firebase.js');
if (process.argv.length == 5) {
  firebase.send(process.argv[2], {
    title: process.argv[3],
    text: process.argv[4]
  });
} else {
  console.log('Usage: firebaseTest.js topic title text');
}