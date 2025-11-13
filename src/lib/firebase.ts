import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if Firebase is configured
const isFirebaseConfigured = 
  firebaseConfig.apiKey && 
  firebaseConfig.authDomain && 
  firebaseConfig.projectId &&
  firebaseConfig.apiKey !== "undefined" &&
  firebaseConfig.authDomain !== "undefined" &&
  firebaseConfig.projectId !== "undefined";

let app;
let auth: any = null;
let db: any = null;
let storage: any = null;

try {
  if (isFirebaseConfigured) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    
    // Enable auth persistence
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.warn("Failed to set auth persistence:", error);
    });
    
    // Enable Firestore persistence (optional, for offline support)
    enableIndexedDbPersistence(db).catch((error) => {
      if (error.code === "failed-precondition") {
        console.warn("Firestore persistence already enabled in another tab");
      } else if (error.code === "unimplemented") {
        console.warn("Firestore persistence not supported in this browser");
      }
    });
    
    console.log("Firebase initialized successfully with persistence");
  } else {
    console.warn("Firebase not configured. Please set environment variables.");
    console.warn("Config check:", {
      hasApiKey: !!firebaseConfig.apiKey,
      hasAuthDomain: !!firebaseConfig.authDomain,
      hasProjectId: !!firebaseConfig.projectId,
    });
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
  auth = null;
  db = null;
  storage = null;
}

export { auth, db, storage };
