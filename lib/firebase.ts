import { initializeApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDdd_KkSJE9qA1Zbk7ueuZheBtCIqmb3po",
  authDomain: "skydive-boogie.firebaseapp.com",
  projectId: "skydive-boogie",
  storageBucket: "skydive-boogie.firebasestorage.app",
  messagingSenderId: "773256254342",
  appId: "1:773256254342:web:6e790d81a402a335f7d207"
};

const app = initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
