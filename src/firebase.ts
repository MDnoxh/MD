import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBKkGMe6KZOsDaY1z7o0YJVagYP8CavAZM",
  authDomain: "web-tm-f7f8d.firebaseapp.com",
  projectId: "web-tm-f7f8d",
  storageBucket: "web-tm-f7f8d.firebasestorage.app",
  messagingSenderId: "202861378913",
  appId: "1:202861378913:web:b0f624d2438c6cafc25920",
  measurementId: "G-4G1NQLP1Y0"
};

const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
export const db = getFirestore(app);
