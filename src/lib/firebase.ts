import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Config from firebase-applet-config.json
const firebaseConfig = {
  projectId: "gen-lang-client-0047376393",
  appId: "1:890658793880:web:dc7a14b625c7b587b963ed",
  apiKey: "AIzaSyDcv-socuFr1kAE1AZZGMSFiiOlvQvOYeI",
  authDomain: "gen-lang-client-0047376393.firebaseapp.com",
  storageBucket: "gen-lang-client-0047376393.firebasestorage.app",
  messagingSenderId: "890658793880",
  firestoreDatabaseId: "ai-studio-24681120-6b20-4e1a-89ea-e0442fe62133"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export async function loginAnonymously() {
  try {
    const userCredential = await signInAnonymously(auth);
    return userCredential.user;
  } catch (error) {
    console.warn("Firebase anonymous sign-in failed. Falling back to local session:", error);
    // Fallback to local session ID to allow seamless play even if Anonymous Auth is disabled in Firebase Console
    let localUid = localStorage.getItem("stc_algo_local_uid");
    if (!localUid) {
      localUid = "anon_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();
      localStorage.setItem("stc_algo_local_uid", localUid);
    }
    return { uid: localUid };
  }
}
