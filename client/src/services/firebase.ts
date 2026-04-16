import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyD9WY3VdXDeix79E8oiRvcP3Wa8TeQCjbc",
  authDomain: "hymn-52cd5.firebaseapp.com",
  projectId: "hymn-52cd5",
  storageBucket: "hymn-52cd5.firebasestorage.app",
  messagingSenderId: "696510875424",
  appId: "1:696510875424:web:48133d7a999d0f60ef7945",
  measurementId: "G-8274GGE890"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
