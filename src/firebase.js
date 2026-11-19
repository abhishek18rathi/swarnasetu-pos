import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBIbKF75kesXkSqFCG6WTKqZ_8lflYxooI",
  authDomain: "swarnasetu-pos.firebaseapp.com",
  projectId: "swarnasetu-pos",
  storageBucket: "swarnasetu-pos.firebasestorage.app",
  messagingSenderId: "937623426146",
  appId: "1:937623426146:web:8d9f571afd7d0cd1db6d3b"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
