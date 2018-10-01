const admin = require('firebase-admin');

const serviceAccount = require('../config/firebase.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://vsaapp-12965.firebaseio.com'
});

this.send = (topic, data) => {
  return admin.messaging().sendToTopic('/topics/' + topic, {
    data: {
      data: data
    }
  });
};

module.exports = this;