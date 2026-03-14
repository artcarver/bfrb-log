import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut as fbSignOut 
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey:            "AIzaSyBpLjdsDss2eI7Ku9Ak1GDhnfavJdpY8OM",
  authDomain:        "skin-picking-log.firebaseapp.com",
  projectId:         "skin-picking-log",
  storageBucket:     "skin-picking-log.firebasestorage.app",
  messagingSenderId: "162906566118",
  appId:             "1:162906566118:web:a89abbd383fc847ba97a27"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export { auth, db, provider, signInWithPopup, onAuthStateChanged, fbSignOut };
