const admin = require('firebase-admin');

const serviceAccount = require('./firebase.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://vsaapp-12965.firebaseio.com'
});

this.send = (topic, notification) => {
  admin.messaging().sendToTopic('/topics/' + topic, {
      notification: notification
    })
    .catch((error) => {
      console.log('Error sending message:', error);
    });
};

module.exports = this;