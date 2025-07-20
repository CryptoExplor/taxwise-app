
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC70iMVmZ2Xskik0zMP8TcUM4d2olBw4TE",
  authDomain: "computationtax.firebaseapp.com",
  projectId: "computationtax",
  storageBucket: "computationtax.appspot.com",
  messagingSenderId: "413709098206",
  appId: "1:413709098206:web:be583c64514bdd9590764f"
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
