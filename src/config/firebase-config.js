// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore, serverTimestamp } from "firebase/firestore";
import { getStorage } from "firebase/storage"

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCf1RFwmQwjY_59ABKJN1EaeJdKaZuBU6A",
  authDomain: "gigabites-f44fe.firebaseapp.com",
  projectId: "gigabites-f44fe",
  storageBucket: "gigabites-f44fe.firebasestorage.app",
  messagingSenderId: "322685957505",
  appId: "1:322685957505:web:bcda01a8af39f1525c6480",
  measurementId: "G-QE1W0HQ7NN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app)
// reference of the database(firestore)
export const db = getFirestore(app)
export const storage = getStorage(app);
export {serverTimestamp}

export const googleProvider = new GoogleAuthProvider();

