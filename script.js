/**
 * HEADSTART — Admin System script.js
 * Firebase Firestore for real-time sync
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, doc,
  updateDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp
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
// COLLECTIONS
// =============================================
const COL = {
  clients      : 'clients',
  services     : 'services',
  appointments : 'appointments',
  payments     : 'payments',
};

// =============================================
// LOCAL STATE (cached from Firestore)
// =============================================
let STATE = {
  clients      : [],
  services     : [],
  appointments : [],
  payments     : [],
};

// =============================================
// HELPERS
// =============================================
const money  = n => '₱' + parseFloat(n||0).toLocaleString('en-PH', { minimumFractionDigits: 2 });
const todayYMD = () => new Date().toISOString().slice(0,10);

function fmtDate(ymd) {
  if (!ymd) return '—';
  const [y,m,d] = ymd.split('-').map(Number);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[m-1]} ${d}, ${y}`;
}

function fmtTime(t) {
  if (!t) return '—';
  const [hStr, mStr] = t.split(':');
  let h = parseInt(hStr);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2,'0')}:${mStr} ${ampm}`;
}

function weekStart() {
  const now = new Date(); const day = now.getDay() || 7;
  now.setDate(now.getDate() - day + 1);
  return now.toISOString().slice(0,10);
}
function monthStart() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
}

// =============================================
// TOAST
// =============================================
let _tt;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(_tt); _tt = setTimeout(() => t.classList.remove('show'), 2800);
}

// =============================================
// NAV
// =============================================
function initNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
      if (btn.dataset.tab === 'dashboard') renderDashboard();
      if (btn.dataset.tab === 'reports')   renderReports();
      if (btn.dataset.tab === 'qrcode')    renderQR();
    });
  });
}

// =============================================
// MODAL
// =============================================
const openModal  = id => document.getElementById(id).classList.add('open');
const closeModal = id => document.getElementById(id).classList.remove('open');
function bindClose(modalId, ...btnIds) {
  btnIds.forEach(id => document.getElementById(id).addEventListener('click', () => closeModal(modalId)));
  document.getElementById(modalId).addEventListener('click', e => { if (e.target.id === modalId) closeModal(modalId); });
}

// =============================================
// FIRESTORE LISTENERS (real-time)
// =============================================
function initListeners() {
  // Clients
  onSnapshot(query(collection(db, COL.clients), orderBy('createdAt', 'desc')), snap => {
    STATE.clients = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderClients(); renderDashboard();
  });
  // Services
  onSnapshot(collection(db, COL.services), snap => {
    STATE.services = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderServices(); renderDashboard();
  });
  // Appointments
  onSnapshot(query(collection(db, COL.appointments), orderBy('createdAt', 'desc')), snap => {
    STATE.appointments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderAppointments(); renderDashboard();
  });
  // Payments
  onSnapshot(query(collection(db, COL.payments), orderBy('createdAt', 'desc')), snap => {
    STATE.payments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderPayments(); renderDashboard();
  });
}

// =============================================
// POPULATE SELECTS
// =============================================
function populateClientSelect(selectId, selectedId = '') {
  const sel = document.getElementById(selectId);
  sel.innerHTML = STATE.clients.length
    ? `<option value="">Select client...</option>` + STATE.clients.map(c =>
        `<option value="${c.id}" ${c.id === selectedId ? 'selected':''}>${c.name}</option>`).join('')
    : `<option value="">No clients yet</option>`;
}

function populateServiceSelect(selectId, selectedId = '') {
  const sel = document.getElementById(selectId);
  sel.innerHTML = STATE.services.length
    ? `<option value="">Select service...</option>` + STATE.services.map(s =>
        `<option value="${s.id}" ${s.id === selectedId ? 'selected':''}>${s.name} (${money(s.price)})</option>`).join('')
    : `<option value="">No services yet</option>`;
}

// =============================================
// DASHBOARD
// =============================================
function renderDashboard() {
  const today        = todayYMD();
  const apptToday    = STATE.appointments.filter(a => a.date === today);
  const payToday     = STATE.payments.filter(p => p.date === today);
  const revenueToday = payToday.reduce((s,p) => s + parseFloat(p.amount||0), 0);
  const revenueTotal = STATE.payments.reduce((s,p) => s + parseFloat(p.amount||0), 0);

  document.getElementById('statClients').textContent           = STATE.clients.length;
  document.getElementById('statAppointmentsToday').textContent = apptToday.length;
  document.getElementById('statRevenueToday').textContent      = money(revenueToday);
  document.getElementById('statRevenueTotal').textContent      = money(revenueTotal);

  // New submissions (online form, unread)
  const subContainer = document.getElementById('newSubmissions');
  const newSubs = STATE.clients.filter(c => c.source === 'online').slice(0, 5);
  subContainer.innerHTML = newSubs.length
    ? newSubs.map(c => `
        <div class="dash-item">
          <div>
            <div class="dash-item-name">${c.name}</div>
            <div class="dash-item-sub">${c.serviceRequested || '—'} · ${fmtDate(c.preferredDate)}</div>
          </div>
          <span class="badge badge-${(c.status||'pending').toLowerCase()}">${c.status||'Pending'}</span>
        </div>`).join('')
    : '<p class="empty-state">No online submissions yet.</p>';

  // Recent payments
  const payContainer = document.getElementById('recentPayments');
  const recent = STATE.payments.slice(0, 5);
  payContainer.innerHTML = recent.length
    ? recent.map(p => {
        const c = STATE.clients.find(x => x.id === p.clientId);
        const s = STATE.services.find(x => x.id === p.serviceId);
        return `<div class="dash-item">
          <div>
            <div class="dash-item-name">${c ? c.name : '—'}</div>
            <div class="dash-item-sub">${s ? s.name : '—'} · ${p.method}</div>
          </div>
          <span class="dash-item-badge">${money(p.amount)}</span>
        </div>`;
      }).join('')
    : '<p class="empty-state">No payments yet.</p>';
}

// =============================================
// CLIENTS
// =============================================
let clientSearchQ  = '';
let clientSourceQ  = 'all';

function renderClients() {
  let clients = [...STATE.clients];
  const q = clientSearchQ.toLowerCase();
  if (q) clients = clients.filter(c =>
    c.name?.toLowerCase().includes(q) ||
    c.phone?.includes(q) ||
    c.email?.toLowerCase().includes(q)
  );
  if (clientSourceQ !== 'all') clients = clients.filter(c => (c.source || 'walk-in') === clientSourceQ);

  const tbody = document.getElementById('clientTableBody');
  if (!clients.length) {
    tbody.innerHTML = `<tr><td colspan="10" class="empty-row">No clients found.</td></tr>`; return;
  }
  tbody.innerHTML = clients.map((c, i) => `
    <tr>
      <td>${i+1}</td>
      <td><strong>${c.name}</strong><br/><small style="color:var(--muted)">${c.address||''}</small></td>
      <td>${c.phone||'—'}</td>
      <td>${c.email||'—'}</td>
      <td>${c.fbAccount||'—'}</td>
      <td>${c.serviceRequested||'—'}</td>
      <td>${fmtDate(c.preferredDate)}</td>
      <td><span class="badge ${c.source==='online' ? 'badge-confirmed' : 'badge-pending'}">${c.source==='online'?'Online':'Walk-in'}</span></td>
      <td><span class="badge badge-${(c.status||'pending').toLowerCase()}">${c.status||'Pending'}</span></td>
      <td>
        <div class="action-btns">
          <button class="btn-edit" onclick="editClient('${c.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit
          </button>
          <button class="btn-delete" onclick="deleteClient('${c.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>Del
          </button>
        </div>
      </td>
    </tr>`).join('');
}

function initClients() {
  document.getElementById('btnAddClient').addEventListener('click', () => {
    document.getElementById('clientModalTitle').textContent = 'Add Client';
    document.getElementById('clientId').value = '';
    ['clientName','clientPhone','clientEmail','clientAddress','clientFb','clientService','clientComments'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('clientDate').value   = '';
    document.getElementById('clientStatus').value = 'Pending';
    openModal('clientModal');
  });
  bindClose('clientModal', 'closeClientModal', 'cancelClientModal');

  document.getElementById('saveClient').addEventListener('click', async () => {
    const name    = document.getElementById('clientName').value.trim();
    const phone   = document.getElementById('clientPhone').value.trim();
    const id      = document.getElementById('clientId').value;
    if (!name)  { showToast('⚠️ Please enter client name.'); return; }
    if (!phone) { showToast('⚠️ Please enter phone number.'); return; }

    const data = {
      name, phone,
      email           : document.getElementById('clientEmail').value.trim(),
      address         : document.getElementById('clientAddress').value.trim(),
      fbAccount       : document.getElementById('clientFb').value.trim(),
      serviceRequested: document.getElementById('clientService').value.trim(),
      preferredDate   : document.getElementById('clientDate').value,
      comments        : document.getElementById('clientComments').value.trim(),
      status          : document.getElementById('clientStatus').value,
      source          : 'walk-in',
    };

    try {
      if (id) {
        await updateDoc(doc(db, COL.clients, id), data);
      } else {
        await addDoc(collection(db, COL.clients), { ...data, createdAt: serverTimestamp() });
      }
      closeModal('clientModal');
      showToast('✅ Client saved!');
    } catch(e) { showToast('❌ Error: ' + e.message); }
  });

  document.getElementById('clientSearch').addEventListener('input', e => { clientSearchQ = e.target.value; renderClients(); });
  document.getElementById('clientSourceFilter').addEventListener('change', e => { clientSourceQ = e.target.value; renderClients(); });
}

window.editClient = async (id) => {
  const c = STATE.clients.find(x => x.id === id);
  if (!c) return;
  document.getElementById('clientModalTitle').textContent = 'Edit Client';
  document.getElementById('clientId').value       = c.id;
  document.getElementById('clientName').value     = c.name||'';
  document.getElementById('clientPhone').value    = c.phone||'';
  document.getElementById('clientEmail').value    = c.email||'';
  document.getElementById('clientAddress').value  = c.address||'';
  document.getElementById('clientFb').value       = c.fbAccount||'';
  document.getElementById('clientService').value  = c.serviceRequested||'';
  document.getElementById('clientDate').value     = c.preferredDate||'';
  document.getElementById('clientComments').value = c.comments||'';
  document.getElementById('clientStatus').value   = c.status||'Pending';
  openModal('clientModal');
};

window.deleteClient = async (id) => {
  if (!confirm('Delete this client?')) return;
  await deleteDoc(doc(db, COL.clients, id));
  showToast('🗑️ Client deleted.');
};

// =============================================
// SERVICES
// =============================================
let activeCat = 'all';

function renderServices() {
  let services = [...STATE.services];
  if (activeCat !== 'all') services = services.filter(s => s.category === activeCat);
  const grid = document.getElementById('servicesGrid');
  if (!services.length) {
    grid.innerHTML = '<p class="empty-state">No services found.</p>'; return;
  }
  grid.innerHTML = services.map(s => `
    <div class="service-card">
      <div class="service-card-cat">${s.category}</div>
      <div class="service-card-name">${s.name}</div>
      <div class="service-card-desc">${s.description||''}</div>
      <div class="service-card-footer">
        <div>
          <div class="service-card-price">${money(s.price)}</div>
          <div class="service-card-duration">${s.duration ? s.duration+' mins' : ''}</div>
        </div>
        <div class="action-btns">
          <button class="btn-edit" onclick="editService('${s.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-delete" onclick="deleteService('${s.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
        </div>
      </div>
    </div>`).join('');
}

function initServices() {
  document.getElementById('btnAddService').addEventListener('click', () => {
    document.getElementById('serviceModalTitle').textContent = 'Add Service';
    document.getElementById('serviceId').value = '';
    ['serviceName','servicePrice','serviceDuration','serviceDesc'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('serviceCategory').value = '';
    openModal('serviceModal');
  });
  bindClose('serviceModal', 'closeServiceModal', 'cancelServiceModal');

  document.getElementById('saveService').addEventListener('click', async () => {
    const name     = document.getElementById('serviceName').value.trim();
    const category = document.getElementById('serviceCategory').value;
    const price    = document.getElementById('servicePrice').value;
    const id       = document.getElementById('serviceId').value;
    if (!name)     { showToast('⚠️ Please enter service name.'); return; }
    if (!category) { showToast('⚠️ Please select a category.'); return; }
    if (!price)    { showToast('⚠️ Please enter the price.'); return; }

    const data = {
      name, category, price,
      duration   : document.getElementById('serviceDuration').value,
      description: document.getElementById('serviceDesc').value.trim(),
    };
    try {
      if (id) { await updateDoc(doc(db, COL.services, id), data); }
      else    { await addDoc(collection(db, COL.services), data); }
      closeModal('serviceModal');
      showToast('✅ Service saved!');
    } catch(e) { showToast('❌ Error: ' + e.message); }
  });

  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCat = btn.dataset.cat;
      renderServices();
    });
  });
}

window.editService = (id) => {
  const s = STATE.services.find(x => x.id === id);
  if (!s) return;
  document.getElementById('serviceModalTitle').textContent = 'Edit Service';
  document.getElementById('serviceId').value       = s.id;
  document.getElementById('serviceName').value     = s.name;
  document.getElementById('serviceCategory').value = s.category;
  document.getElementById('servicePrice').value    = s.price;
  document.getElementById('serviceDuration').value = s.duration||'';
  document.getElementById('serviceDesc').value     = s.description||'';
  openModal('serviceModal');
};

window.deleteService = async (id) => {
  if (!confirm('Delete this service?')) return;
  await deleteDoc(doc(db, COL.services, id));
  showToast('🗑️ Service deleted.');
};

// =============================================
// APPOINTMENTS
// =============================================
let apptSearchQ = '', apptStatusQ = 'all';

function renderAppointments() {
  let appts = [...STATE.appointments];
  if (apptSearchQ) {
    const q = apptSearchQ.toLowerCase();
    appts = appts.filter(a => {
      const c = STATE.clients.find(x => x.id === a.clientId);
      const s = STATE.services.find(x => x.id === a.serviceId);
      return (c && c.name.toLowerCase().includes(q)) || (s && s.name.toLowerCase().includes(q));
    });
  }
  if (apptStatusQ !== 'all') appts = appts.filter(a => a.status === apptStatusQ);

  const tbody = document.getElementById('apptTableBody');
  if (!appts.length) { tbody.innerHTML = `<tr><td colspan="7" class="empty-row">No appointments found.</td></tr>`; return; }

  tbody.innerHTML = appts.map((a,i) => {
    const c = STATE.clients.find(x => x.id === a.clientId);
    const s = STATE.services.find(x => x.id === a.serviceId);
    return `<tr>
      <td>${i+1}</td>
      <td><strong>${c ? c.name : '—'}</strong></td>
      <td>${s ? s.name : '—'}</td>
      <td>${fmtDate(a.date)}</td>
      <td>${fmtTime(a.time)}</td>
      <td><span class="badge badge-${(a.status||'pending').toLowerCase()}">${a.status}</span></td>
      <td><div class="action-btns">
        <button class="btn-edit" onclick="editAppt('${a.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit</button>
        <button class="btn-delete" onclick="deleteAppt('${a.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>Del</button>
      </div></td>
    </tr>`;
  }).join('');
}

function initAppointments() {
  document.getElementById('btnAddAppointment').addEventListener('click', () => {
    document.getElementById('apptModalTitle').textContent = 'Book Appointment';
    document.getElementById('apptId').value = '';
    document.getElementById('apptDate').value   = todayYMD();
    document.getElementById('apptTime').value   = '';
    document.getElementById('apptStatus').value = 'Pending';
    document.getElementById('apptNotes').value  = '';
    populateClientSelect('apptClient');
    populateServiceSelect('apptService');
    openModal('apptModal');
  });
  bindClose('apptModal', 'closeApptModal', 'cancelApptModal');

  document.getElementById('saveAppt').addEventListener('click', async () => {
    const clientId  = document.getElementById('apptClient').value;
    const serviceId = document.getElementById('apptService').value;
    const date      = document.getElementById('apptDate').value;
    const time      = document.getElementById('apptTime').value;
    const id        = document.getElementById('apptId').value;
    if (!clientId)  { showToast('⚠️ Please select a client.'); return; }
    if (!serviceId) { showToast('⚠️ Please select a service.'); return; }
    if (!date)      { showToast('⚠️ Please select a date.'); return; }
    if (!time)      { showToast('⚠️ Please select a time.'); return; }

    const data = { clientId, serviceId, date, time,
      status: document.getElementById('apptStatus').value,
      notes : document.getElementById('apptNotes').value.trim(),
    };
    try {
      if (id) { await updateDoc(doc(db, COL.appointments, id), data); }
      else    { await addDoc(collection(db, COL.appointments), { ...data, createdAt: serverTimestamp() }); }
      closeModal('apptModal'); showToast('✅ Appointment saved!');
    } catch(e) { showToast('❌ Error: ' + e.message); }
  });

  document.getElementById('apptSearch').addEventListener('input', e => { apptSearchQ = e.target.value; renderAppointments(); });
  document.getElementById('apptStatusFilter').addEventListener('change', e => { apptStatusQ = e.target.value; renderAppointments(); });
}

window.editAppt = (id) => {
  const a = STATE.appointments.find(x => x.id === id);
  if (!a) return;
  document.getElementById('apptModalTitle').textContent = 'Edit Appointment';
  document.getElementById('apptId').value     = a.id;
  document.getElementById('apptDate').value   = a.date;
  document.getElementById('apptTime').value   = a.time;
  document.getElementById('apptStatus').value = a.status;
  document.getElementById('apptNotes').value  = a.notes||'';
  populateClientSelect('apptClient', a.clientId);
  populateServiceSelect('apptService', a.serviceId);
  openModal('apptModal');
};

window.deleteAppt = async (id) => {
  if (!confirm('Delete this appointment?')) return;
  await deleteDoc(doc(db, COL.appointments, id));
  showToast('🗑️ Appointment deleted.');
};

// =============================================
// PAYMENTS
// =============================================
let paySearchQ = '', payMethodQ = 'all';

function renderPayments() {
  let pays = [...STATE.payments];
  if (paySearchQ) {
    const q = paySearchQ.toLowerCase();
    pays = pays.filter(p => {
      const c = STATE.clients.find(x => x.id === p.clientId);
      const s = STATE.services.find(x => x.id === p.serviceId);
      return (c && c.name.toLowerCase().includes(q)) || (s && s.name.toLowerCase().includes(q));
    });
  }
  if (payMethodQ !== 'all') pays = pays.filter(p => p.method === payMethodQ);

  const tbody = document.getElementById('payTableBody');
  if (!pays.length) { tbody.innerHTML = `<tr><td colspan="7" class="empty-row">No payments found.</td></tr>`; return; }

  tbody.innerHTML = pays.map((p,i) => {
    const c = STATE.clients.find(x => x.id === p.clientId);
    const s = STATE.services.find(x => x.id === p.serviceId);
    return `<tr>
      <td>${i+1}</td>
      <td><strong>${c ? c.name : '—'}</strong></td>
      <td>${s ? s.name : '—'}</td>
      <td><strong style="color:var(--blue)">${money(p.amount)}</strong></td>
      <td>${p.method}</td>
      <td>${fmtDate(p.date)}</td>
      <td><div class="action-btns">
        <button class="btn-edit" onclick="editPay('${p.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit</button>
        <button class="btn-delete" onclick="deletePay('${p.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>Del</button>
      </div></td>
    </tr>`;
  }).join('');
}

function initPayments() {
  document.getElementById('btnAddPayment').addEventListener('click', () => {
    document.getElementById('payModalTitle').textContent = 'Add Payment';
    document.getElementById('payId').value = '';
    document.getElementById('payAmount').value = '';
    document.getElementById('payDate').value   = todayYMD();
    document.getElementById('payMethod').value = 'Cash';
    document.getElementById('payNotes').value  = '';
    populateClientSelect('payClient');
    populateServiceSelect('payService');
    openModal('payModal');
  });
  bindClose('payModal', 'closePayModal', 'cancelPayModal');

  document.getElementById('savePay').addEventListener('click', async () => {
    const clientId  = document.getElementById('payClient').value;
    const serviceId = document.getElementById('payService').value;
    const amount    = document.getElementById('payAmount').value;
    const date      = document.getElementById('payDate').value;
    const id        = document.getElementById('payId').value;
    if (!clientId || !serviceId || !amount || !date) { showToast('⚠️ Please fill all required fields.'); return; }

    const data = { clientId, serviceId, amount, date,
      method: document.getElementById('payMethod').value,
      notes : document.getElementById('payNotes').value.trim(),
    };
    try {
      if (id) { await updateDoc(doc(db, COL.payments, id), data); }
      else    { await addDoc(collection(db, COL.payments), { ...data, createdAt: serverTimestamp() }); }
      closeModal('payModal'); showToast('✅ Payment saved!');
    } catch(e) { showToast('❌ Error: ' + e.message); }
  });

  document.getElementById('paySearch').addEventListener('input', e => { paySearchQ = e.target.value; renderPayments(); });
  document.getElementById('payMethodFilter').addEventListener('change', e => { payMethodQ = e.target.value; renderPayments(); });
}

window.editPay = (id) => {
  const p = STATE.payments.find(x => x.id === id);
  if (!p) return;
  document.getElementById('payModalTitle').textContent = 'Edit Payment';
  document.getElementById('payId').value     = p.id;
  document.getElementById('payAmount').value = p.amount;
  document.getElementById('payMethod').value = p.method;
  document.getElementById('payDate').value   = p.date;
  document.getElementById('payNotes').value  = p.notes||'';
  populateClientSelect('payClient', p.clientId);
  populateServiceSelect('payService', p.serviceId);
  openModal('payModal');
};

window.deletePay = async (id) => {
  if (!confirm('Delete this payment record?')) return;
  await deleteDoc(doc(db, COL.payments, id));
  showToast('🗑️ Payment deleted.');
};

// =============================================
// REPORTS
// =============================================
function renderReports() {
  const payments = STATE.payments;
  const appts    = STATE.appointments;
  const services = STATE.services;
  const today    = todayYMD();

  const totalRevenue = payments.reduce((s,p) => s + parseFloat(p.amount||0), 0);
  const todayRev  = payments.filter(p => p.date === today).reduce((s,p) => s + parseFloat(p.amount||0), 0);
  const weekRev   = payments.filter(p => p.date >= weekStart()).reduce((s,p) => s + parseFloat(p.amount||0), 0);
  const monthRev  = payments.filter(p => p.date >= monthStart()).reduce((s,p) => s + parseFloat(p.amount||0), 0);

  document.getElementById('rToday').textContent = money(todayRev);
  document.getElementById('rWeek').textContent  = money(weekRev);
  document.getElementById('rMonth').textContent = money(monthRev);
  document.getElementById('rTotal').textContent = money(totalRevenue);

  document.getElementById('rApptTotal').textContent     = appts.length;
  document.getElementById('rApptDone').textContent      = appts.filter(a => a.status==='Completed').length;
  document.getElementById('rApptPending').textContent   = appts.filter(a => a.status==='Pending').length;
  document.getElementById('rApptCancelled').textContent = appts.filter(a => a.status==='Cancelled').length;

  const cashTotal  = payments.filter(p => p.method==='Cash').reduce((s,p) => s+parseFloat(p.amount||0),0);
  const gcashTotal = payments.filter(p => p.method==='GCash').reduce((s,p) => s+parseFloat(p.amount||0),0);
  const cardTotal  = payments.filter(p => p.method==='Card').reduce((s,p) => s+parseFloat(p.amount||0),0);
  document.getElementById('rCash').textContent  = money(cashTotal);
  document.getElementById('rGcash').textContent = money(gcashTotal);
  document.getElementById('rCard').textContent  = money(cardTotal);

  const svcCount = {};
  payments.forEach(p => { svcCount[p.serviceId] = (svcCount[p.serviceId]||0)+1; });
  const topSvcs = Object.entries(svcCount).sort((a,b)=>b[1]-a[1]).slice(0,5)
    .map(([id,count]) => ({ name: services.find(x=>x.id===id)?.name||'—', count }));
  const topEl = document.getElementById('rTopServices');
  topEl.innerHTML = topSvcs.length
    ? topSvcs.map(s => `<div class="top-service-item"><span>${s.name}</span><strong>${s.count} bookings</strong></div>`).join('')
    : '<p class="empty-state">No data yet.</p>';
}

// =============================================
// QR CODE
// =============================================
function renderQR() {
  const formUrl = window.location.href.replace('index.html','').replace(/\/$/, '') + '/form.html';
  document.getElementById('qrUrl').textContent = formUrl;
  const container = document.getElementById('qrCodeContainer');
  container.innerHTML = '';

  // Use QR Server API to generate QR code image
  const img = document.createElement('img');
  img.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(formUrl)}`;
  img.alt = 'QR Code';
  img.style.cssText = 'border-radius:12px; border:4px solid #fff; box-shadow:0 4px 16px rgba(27,31,138,.15);';
  container.appendChild(img);
}

document.getElementById('btnPrintQR').addEventListener('click', () => {
  const formUrl = window.location.href.replace('index.html','').replace(/\/$/, '') + '/form.html';
  const qrSrc   = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(formUrl)}`;
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><title>HEADSTART QR Code</title>
    <style>
      body{font-family:'Segoe UI',sans-serif;text-align:center;padding:40px;color:#1a1a2e}
      h1{color:#E82B2B;font-size:24px;margin-bottom:4px}
      p{color:#6b6b8a;font-size:14px;margin-bottom:24px}
      img{border-radius:16px;border:6px solid #1B1F8A}
      .url{margin-top:16px;font-size:12px;color:#6b6b8a;word-break:break-all}
      .instructions{margin-top:20px;font-size:13px;color:#1B1F8A;font-weight:600}
    </style></head><body>
    <h1>HEADSTART</h1>
    <p>Barbershop · Salon · Spa</p>
    <img src="${qrSrc}" alt="QR Code"/>
    <div class="instructions">📱 Scan this QR Code to register as a client!</div>
    <div class="url">${formUrl}</div>
    </body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 800);
});

// =============================================
// EXPORT REPORT
// =============================================
document.getElementById('btnExportReport').addEventListener('click', () => {
  const payments = STATE.payments;
  const clients  = STATE.clients;
  const services = STATE.services;
  const today    = todayYMD();
  const total    = payments.reduce((s,p) => s+parseFloat(p.amount||0),0);

  const rows = payments.map((p,i) => {
    const c = clients.find(x => x.id === p.clientId);
    const s = services.find(x => x.id === p.serviceId);
    return `<tr><td>${i+1}</td><td>${c?.name||'—'}</td><td>${s?.name||'—'}</td><td>${money(p.amount)}</td><td>${p.method}</td><td>${fmtDate(p.date)}</td></tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>HEADSTART Report</title>
    <style>body{font-family:'Segoe UI',sans-serif;padding:32px;color:#1a1a2e}h1{color:#E82B2B;font-size:22px}
    .meta{font-size:13px;color:#6b6b8a;margin-bottom:20px}.stats{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:24px}
    .stat{background:#f7f7fc;border-radius:8px;padding:12px 18px;border-top:3px solid #E82B2B;min-width:130px}
    .stat-val{font-size:20px;font-weight:700;color:#1B1F8A}.stat-lbl{font-size:11px;color:#6b6b8a}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th{background:#1B1F8A;color:#fff;padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase}
    td{padding:10px 12px;border-bottom:1px solid #e4e4ef}
    .total{margin-top:14px;font-weight:700;font-size:15px;color:#E82B2B}</style></head>
    <body><h1>HEADSTART — Business Report</h1>
    <div class="meta">Generated: ${fmtDate(today)}</div>
    <div class="stats">
      <div class="stat"><div class="stat-val">${clients.length}</div><div class="stat-lbl">Total Clients</div></div>
      <div class="stat"><div class="stat-val">${STATE.appointments.length}</div><div class="stat-lbl">Appointments</div></div>
      <div class="stat"><div class="stat-val">${payments.length}</div><div class="stat-lbl">Payments</div></div>
      <div class="stat"><div class="stat-val">${money(total)}</div><div class="stat-lbl">Total Revenue</div></div>
    </div>
    <table><thead><tr><th>#</th><th>Client</th><th>Service</th><th>Amount</th><th>Method</th><th>Date</th></tr></thead>
    <tbody>${rows||'<tr><td colspan="6" style="text-align:center">No payments yet.</td></tr>'}</tbody></table>
    <p class="total">Total Revenue: ${money(total)}</p></body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html); win.document.close();
  setTimeout(() => win.print(), 600);
});

// =============================================
// APP INIT
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initClients();
  initServices();
  initAppointments();
  initPayments();
  initListeners();
});