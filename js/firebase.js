import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-analytics.js";
const firebaseConfig = {
  apiKey: "",
  authDomain: "evdeki-restoranim-1.firebaseapp.com",
  projectId: "evdeki-restoranim-1",
  storageBucket: "evdeki-restoranim-1.firebasestorage.app",
  messagingSenderId: "238625102318",
  appId: "",
  measurementId: "G-EK97FS901E"
};
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
