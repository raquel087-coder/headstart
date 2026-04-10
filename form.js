/**
 * HEADSTART — Client Registration Form
 * form.js — Firebase Firestore submission
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// =============================================
// FIREBASE CONFIG
// =============================================
const firebaseConfig = {
  apiKey            : "AIzaSyD4B7XUX-mqAR2nLGId4gJWpaB-fb8iLnw",
  authDomain        : "headstart-system.firebaseapp.com",
  projectId         : "headstart-system",
  storageBucket     : "headstart-system.firebasestorage.app",
  messagingSenderId : "643819854035",
  appId             : "1:643819854035:web:974f2ae0754d4ab48f5c26",
  measurementId     : "G-1M07QKDRCZ"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);



// =============================================
// SET MIN DATE (no past dates allowed)
// =============================================
function setMinDate() {
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('fDate').min   = today;
  document.getElementById('fDate').value = today;
}

// =============================================
// FORM SUBMISSION
// =============================================
document.getElementById('submitBtn').addEventListener('click', async () => {
  const name     = document.getElementById('fName').value.trim();
  const address  = document.getElementById('fAddress').value.trim();
  const phone    = document.getElementById('fPhone').value.trim();
  const fb       = document.getElementById('fFb').value.trim();
  const email    = document.getElementById('fEmail').value.trim();
  const date     = document.getElementById('fDate').value;
  const comments = document.getElementById('fComments').value.trim();

  // Validation
  if (!name)    { alert('Please enter your full name.');     return; }
  if (!address) { alert('Please enter your address.');       return; }
  if (!phone)   { alert('Please enter your mobile number.'); return; }
  if (!date)    { alert('Please select your preferred date.'); return; }

  // Show loading
  document.getElementById('loadingOverlay').classList.add('show');
  document.getElementById('submitBtn').disabled = true;

  try {
    await addDoc(collection(db, 'clients'), {
      name,
      address,
      phone,
      fbAccount        : fb,
      email,
      serviceRequested : '',  // Client selects service at the shop
      preferredDate    : date,
      comments,
      source           : 'online',   // marks this as online submission
      status           : 'Pending',
      createdAt        : serverTimestamp(),
    });

    // Hide form, show success message
    document.getElementById('formContent').style.display   = 'none';
    document.getElementById('successScreen').style.display = 'block';

  } catch (e) {
    alert('Something went wrong. Please try again.\n' + e.message);
    document.getElementById('submitBtn').disabled = false;
  } finally {
    document.getElementById('loadingOverlay').classList.remove('show');
  }
});

// =============================================
// INIT
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  setMinDate();
});
