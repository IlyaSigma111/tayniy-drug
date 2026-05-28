import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDAJcDRDSyJik0uV44oTV1j4FtR0s83L1E",
  authDomain: "tayniysanta-4a84a.firebaseapp.com",
  databaseURL: "https://tayniysanta-4a84a-default-rtdb.firebaseio.com",
  projectId: "tayniysanta-4a84a",
  storageBucket: "tayniysanta-4a84a.firebasestorage.app",
  messagingSenderId: "967654206466",
  appId: "1:967654206466:web:a89b3a1def209fe0d10b1b"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
