/**
 * HEADSTART — Client Registration Form
 * form.js — Firebase Firestore submission
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, serverTimestamp
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
// LOAD SERVICES FROM FIREBASE
// (so client can see and choose actual services)
// =============================================
async function loadServices() {
  const servicesList = document.getElementById('servicesList');
  try {
    const snap = await getDocs(collection(db, 'services'));
    const services = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (!services.length) {
      servicesList.innerHTML = '<p class="no-services-msg">No services available yet. Please contact the shop.</p>';
      return;
    }

    // Group by category
    const groups = {};
    services.forEach(s => {
      if (!groups[s.category]) groups[s.category] = [];
      groups[s.category].push(s);
    });

    const catEmoji = { 'Barbershop': '💈', 'Salon': '💅', 'Spa': '🧖' };

    let html = '';
    Object.entries(groups).forEach(([cat, svcs]) => {
      html += `<div class="service-cat-label">${catEmoji[cat]||''} ${cat}</div>`;
      svcs.forEach(s => {
        html += `
          <label class="service-option">
            <input type="checkbox" name="service" value="${s.name}" />
            <span>${s.name} — <strong>₱${parseFloat(s.price).toLocaleString()}</strong>${s.duration ? ' · ' + s.duration + ' mins' : ''}</span>
          </label>`;
      });
    });

    servicesList.innerHTML = html;
  } catch(e) {
    servicesList.innerHTML = '<p class="no-services-msg">Could not load services. Please check your connection.</p>';
  }
}

// =============================================
// SET MIN DATE (no past dates)
// =============================================
function setMinDate() {
  const today = new Date().toISOString().slice(0,10);
  document.getElementById('fDate').min = today;
  document.getElementById('fDate').value = today;
}

// =============================================
// FORM SUBMISSION
// =============================================
document.getElementById('submitBtn').addEventListener('click', async () => {
  const name    = document.getElementById('fName').value.trim();
  const address = document.getElementById('fAddress').value.trim();
  const phone   = document.getElementById('fPhone').value.trim();
  const fb      = document.getElementById('fFb').value.trim();
  const email   = document.getElementById('fEmail').value.trim();
  const date    = document.getElementById('fDate').value;
  const comments = document.getElementById('fComments').value.trim();

  // Get selected services
  const checked = document.querySelectorAll('input[name="service"]:checked');
  const selectedServices = Array.from(checked).map(c => c.value);

  // Validation
  if (!name)    { alert('Please enter your full name.'); return; }
  if (!address) { alert('Please enter your address.'); return; }
  if (!phone)   { alert('Please enter your mobile number.'); return; }
  if (selectedServices.length === 0) { alert('Please select at least one service.'); return; }
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
      serviceRequested : selectedServices.join(', '),
      preferredDate    : date,
      comments,
      source           : 'online',   // marks this as online submission
      status           : 'Pending',
      createdAt        : serverTimestamp(),
    });

    // Hide form, show success
    document.getElementById('formContent').style.display    = 'none';
    document.getElementById('successScreen').style.display  = 'block';
  } catch(e) {
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
  loadServices();
  setMinDate();
});