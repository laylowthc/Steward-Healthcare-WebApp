import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  projectId: "gen-lang-client-0103086983",
  appId: "1:875835612380:web:debf52c067c5179ac82819",
  apiKey: "AIzaSyDOVtAYKVQq7KF19YusNaZDbobZrx2pRd8",
  authDomain: "gen-lang-client-0103086983.firebaseapp.com",
  storageBucket: "gen-lang-client-0103086983.firebasestorage.app",
  messagingSenderId: "875835612380",
  measurementId: ""
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-0c3f63bb-3b10-4031-b09c-fa336f9b6e04");
export const storage = getStorage(app);
export const auth = getAuth(app);
