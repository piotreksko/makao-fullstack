import firebase from 'firebase/app';

// Initialize firebase
const firebaseConfig  = {
    apiKey: "AIzaSyDljMfEcL0t5MUXYUBQaWoDg-gUO7vw0gk",
    authDomain: "makao-react.firebaseapp.com",
    databaseURL: "https://makao-react.firebaseio.com",
    projectId: "makao-react",
    storageBucket: "makao-react.appspot.com",
    messagingSenderId: "408694507372"
  };

  firebase.initializeApp(firebaseConfig);

  export default firebase;