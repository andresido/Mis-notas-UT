// --- FIREBASE CONFIG ---
const firebaseConfig = {
    apiKey: "AIzaSyBLgwJ0Bcd0GpgVtzmK8S5a0c58Zmhc19o",
    authDomain: "notas-ut.firebaseapp.com",
    projectId: "notas-ut",
    storageBucket: "notas-ut.firebasestorage.app",
    messagingSenderId: "608162169192",
    appId: "1:608162169192:web:93aa3bfc7619ce888316dd"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- DATA MASTER (MALLA CURRICULAR 0854 Plan I) ---
const PENSUM = {
    1: ["Lectura y Escritura en la Universidad", "Seminario Permanente de Autoformación", "Introducción a los Sistemas", "Lógica de Sistemas", "Álgebra Lineal", "Pre-Cálculo"],
    2: [
        { name: "Elementos de Programación Orientada a Objetos", teacher: "MORAN GUERRERO WILSON ALEXANDER", email: "wamorang@ut.edu.co", room: "Biblioteca", shift: "Sábado 1", tutoDates: ["2026-03-21","2026-04-11","2026-04-25","2026-05-09","2026-05-30"], examDate: "2026-06-13" },
        { name: "Cálculo I", teacher: "PAZ HURTADO ELVIS", email: "epazh@ut.edu.co", room: "03 - 205", shift: "Sábado 1", tutoDates: ["2026-03-21","2026-04-11","2026-04-25","2026-05-09","2026-05-30"], examDate: "2026-06-13" },
        { name: "Teoría de Sistemas", teacher: "ARAUJO MUÑOZ LEWIS ARGEMIRO", email: "learaujom@ut.edu.co", room: "SALA SISTEMAS 02 - 102", shift: "Sábado 1", tutoDates: ["2026-03-21","2026-04-11","2026-04-25","2026-05-09","2026-05-30"], examDate: "2026-06-13" },
        { name: "Estadística I", teacher: "POVEDA CENDALES MARÍA ISABEL", email: "mipovedac@ut.edu.co", room: "04 - 103", shift: "Sábado 2", tutoDates: ["2026-03-28","2026-04-18","2026-05-02","2026-05-23","2026-06-06"], examDate: "2026-06-20" },
        { name: "Ética Profesional", teacher: "HURTADO OSPINA DANIEL", email: "dahurtadoo@ut.edu.co", room: "07 - 202", shift: "Sábado 2", tutoDates: ["2026-03-28","2026-04-18","2026-05-02","2026-05-23","2026-06-06"], examDate: "2026-06-20" },
        { name: "Inglés I", teacher: "RAMIREZ GOMEZ LINDA EVELIN", email: "leramirezg@ut.edu.co", room: "06 - 203", shift: "Sábado 2", tutoDates: ["2026-03-28","2026-04-18","2026-05-02","2026-05-23","2026-06-06"], examDate: "2026-06-20" }
    ],
    3: ["Gestión de Información", "Aplicación de Programación Orientada a Objetos", "Metodología de Diseño de Software", "Cálculo II", "Estadística II", "Inglés II"],
    4: ["Ingeniería de Software", "Profundización Programación Orientada a Objetos I", "Sistemas Operativos", "Constitución Política", "Cálculo III", "Física I", "Inglés III"],
    5: ["Formación para la Investigación I", "Profundización Programación Orientada a Objetos II", "Diseño de Redes", "Ecuaciones Diferenciales", "Matemáticas Discretas", "Electiva I"],
    6: ["Formación para la Investigación II", "Arquitectura de Software", "Minería de Datos", "Procesos Administrativos", "Métodos Numéricos", "Física II"],
    7: ["Formación para la Investigación III", "Aprendizaje Automático I", "Análisis de Datos a Gran Escala", "Modelos del Conocimiento", "Elementos Financieros", "Electiva II"],
    8: ["Calidad de Software", "Inteligencia de Negocios", "Ingeniería Legal", "Investigación de Operaciones", "Taller de Gerencia de Proyectos", "Optativa I"],
    9: ["Gerencia de TI", "Auditoría de Sistemas de Información", "Seguridad de la Información", "Aprendizaje Automático II", "Modelos y Simulación", "Optativa II", "Optativa III"]
};

// --- ESTADO (STATE MANAGEMENT) ---
let appState = { semesters: {} };
let currentSemester = null;
let currentSubjectId = null;
let calCurrentDate = new Date();

function createDefaultState() {
    const newState = { semesters: {} };
    for (let i = 1; i <= 9; i++) {
        newState.semesters[i] = { initialized: false, subjects: [] };
    }
    return newState;
}

// --- INICIALIZACIÓN ---
let currentUid = null;
let currentUserProfile = null;

function generateId() { return Math.random().toString(36).substr(2, 9); }

// Observe auth state
firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
        currentUid = user.uid;
        document.getElementById('login-loading').style.display = 'block';
        // Ensure user profile exists
        const profRef = db.collection('users').doc(currentUid);
        const profSnap = await profRef.get();
        if (profSnap.exists) {
            currentUserProfile = profSnap.data();
        } else {
            currentUserProfile = { uid: currentUid, email: user.email, displayName: user.displayName || '', role: 'user', createdAt: new Date().toISOString() };
            await profRef.set(currentUserProfile);
        }

        // Load user data
        const dataRef = db.collection('userdata').doc(currentUid);
        const dataSnap = await dataRef.get();
        if (dataSnap.exists) {
            appState = dataSnap.data();
        } else {
            appState = createDefaultState();
            await dataRef.set(appState);
        }

        document.getElementById('login-loading').style.display = 'none';
        showApp();
    } else {
        currentUid = null;
        currentUserProfile = null;
        document.getElementById('app-screen').style.display = 'none';
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('logout-btn').style.display = 'none';
        document.getElementById('admin-panel-btn').style.display = 'none';
    }
});

async function saveState() {
    if (!currentUid) return;
    try {
        await db.collection('userdata').doc(currentUid).set(appState);
    } catch (err) {
        console.error('Error guardando en Firebase:', err);
    }
    if (currentSemester) renderSemesterView(currentSemester);
    renderDashboard();
}

// Simple registration flow (client-side). For production, use Cloud Functions/Admin SDK.
document.getElementById('btn-show-register').addEventListener('click', async () => {
    const nick = prompt('Nombre de usuario (nick) para registrar:');
    if (!nick) return;
    const pass = prompt('Contraseña (min 6 caracteres):');
    if (!pass) return;
    try {
        document.getElementById('login-loading').style.display = 'block';
        // Ensure nick is unique
        const q = await db.collection('users').where('nick', '==', nick).get();
        if (!q.empty) {
            alert('El nick ya existe. Elige otro.');
            return;
        }
        // Use synthetic email for Firebase Auth
        const email = `${nick}@notas-ut.local`;
        const cred = await firebase.auth().createUserWithEmailAndPassword(email, pass);
        // create minimal profile
        await db.collection('users').doc(cred.user.uid).set({ uid: cred.user.uid, email, nick, role: 'user', createdAt: new Date().toISOString() });
        alert('Cuenta creada. Ya puedes iniciar sesión con tu nick.');
    } catch (err) {
        alert('Error creando cuenta: ' + err.message);
    } finally {
        document.getElementById('login-loading').style.display = 'none';
    }
});

// Login by nick
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nick = document.getElementById('nick').value.trim();
    const password = document.getElementById('password').value;
    try {
        document.getElementById('login-loading').style.display = 'block';
        // find user profile by nick
        const q = await db.collection('users').where('nick', '==', nick).limit(1).get();
        if (q.empty) {
            alert('Usuario no encontrado');
            document.getElementById('login-loading').style.display = 'none';
            return;
        }
        const u = q.docs[0].data();
        const email = u.email || `${nick}@notas-ut.local`;
        await firebase.auth().signInWithEmailAndPassword(email, password);
    } catch (err) {
        document.getElementById('login-error').style.display = 'block';
        console.error('Login error', err);
    } finally {
        document.getElementById('login-loading').style.display = 'none';
    }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
    await firebase.auth().signOut();
    document.getElementById('login-form').reset();
    document.getElementById('login-error').style.display = 'none';
});

function showApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'flex';
    document.getElementById('logout-btn').style.display = 'inline-block';
    // show admin if role
    if (currentUserProfile && currentUserProfile.role === 'admin') {
        document.getElementById('admin-panel-btn').style.display = 'inline-block';
    }
    // show nick in header
    const nickEl = document.getElementById('header-nick');
    const avatarEl = document.getElementById('header-avatar');
    if (currentUserProfile) {
        nickEl.textContent = currentUserProfile.nick || currentUserProfile.email || 'Usuario';
        avatarEl.textContent = (currentUserProfile.nick || currentUserProfile.email || 'U').slice(0,1).toUpperCase();
    } else {
        nickEl.textContent = 'Invitado';
        avatarEl.textContent = 'U';
    }
    renderDashboard();
    switchView('dashboard-view');
    if (window.feather) feather.replace();
}

// --- NAVEGACIÓN ---
function switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}

document.getElementById('back-to-dash').addEventListener('click', () => {
    currentSemester = null;
    switchView('dashboard-view');
});

// Admin panel handlers
document.getElementById('admin-panel-btn').addEventListener('click', async () => {
    switchView('admin-panel');
    await loadUsersForAdmin();
});

document.getElementById('admin-back').addEventListener('click', () => {
    switchView('dashboard-view');
});

// Admin logout from panel
document.getElementById('admin-logout').addEventListener('click', async () => {
    try {
        await firebase.auth().signOut();
    } catch (err) {
        console.error('Error signing out from admin panel:', err);
    }
    // Ensure UI shows login
    document.getElementById('app-screen').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('logout-btn').style.display = 'none';
    document.getElementById('admin-panel-btn').style.display = 'none';
    document.getElementById('login-form').reset();
    document.getElementById('login-error').style.display = 'none';
});

async function loadUsersForAdmin() {
    const list = document.getElementById('admin-users-list');
    list.innerHTML = '';
    try {
        const snap = await db.collection('users').orderBy('createdAt').get();
        snap.forEach(doc => {
            const u = doc.data();
            const el = document.createElement('div');
            el.style.display = 'flex';
            el.style.justifyContent = 'space-between';
            el.style.alignItems = 'center';
            el.style.padding = '8px 0';
            const display = u.nick ? `${u.nick} (${u.email})` : u.email;
            el.innerHTML = `<div><strong>${display}</strong> <small style="color:#666">${u.role||'user'}</small></div>`;
            const btn = document.createElement('button');
            btn.className = 'btn btn-secondary';
            btn.textContent = 'Ver notas';
            btn.addEventListener('click', () => viewUserData(u.uid));
            el.appendChild(btn);
            list.appendChild(el);
        });
    } catch (err) {
        list.textContent = 'Error cargando usuarios: ' + err.message;
    }
}

async function viewUserData(uid) {
    const target = document.getElementById('admin-user-data');
    target.innerHTML = 'Cargando...';
    try {
        const snap = await db.collection('userdata').doc(uid).get();
        if (!snap.exists) {
            target.textContent = 'Usuario sin datos.';
            return;
        }
        const data = snap.data();
        // Simple render: list semesters and subjects
        let html = '<h3>Notas del usuario</h3>';
        for (const s in data.semesters) {
            const sem = data.semesters[s];
            if (!sem.initialized) continue;
            html += `<h4>Semestre ${romanize(Number(s))}</h4><ul>`;
            for (const sub of (sem.subjects||[])) {
                const { final } = calculateSubjectFinal(sub);
                html += `<li><strong>${sub.name}</strong> — Nota: ${final.toFixed(2)}</li>`;
            }
            html += '</ul>';
        }
        target.innerHTML = html;
    } catch (err) {
        target.textContent = 'Error: ' + err.message;
    }
}

// --- DOM RENDER: DASHBOARD ---
function renderDashboard() {
    const grid = document.getElementById('semesters-grid');
    grid.innerHTML = '';

    for (let i = 1; i <= 9; i++) {
        const semData = appState.semesters[i];

        let statusClass = 'status-empty';
        let statusText = 'Sin configurar';
        let hasDataClass = '';

        if (semData.initialized) {
            hasDataClass = 'has-data';
            const subjects = semData.subjects;
            const allApproved = subjects.length > 0 && subjects.every(sub => calculateSubjectFinal(sub).final >= 3.0);
            if (allApproved) {
                statusClass = 'status-approved';
                statusText = 'Aprobado';
                hasDataClass += ' approved';
            } else {
                statusClass = 'status-progress';
                statusText = 'En curso';
            }
        }

        const card = document.createElement('div');
        card.className = `semester-card ${hasDataClass}`;
        card.innerHTML = `
            <div class="semester-status ${statusClass}">${statusText}</div>
            <h2>Semestre ${romanize(i)}</h2>
            <p>${semData.initialized ? (semData.subjects || []).length + ' materias' : 'Clic para iniciar'}</p>
        `;
        card.addEventListener('click', () => openSemester(i));
        grid.appendChild(card);
    }
}

function romanize(num) {
    const lookup = [
        ['M', 1000], ['CM', 900], ['D', 500], ['CD', 400],
        ['C', 100], ['XC', 90], ['L', 50], ['XL', 40],
        ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]
    ];
    let roman = '';
    for (const [letter, value] of lookup) {
        while (num >= value) { roman += letter; num -= value; }
    }
    return roman;
}

// --- DOM RENDER: SEMESTER VIEW ---
function openSemester(semNum) {
    currentSemester = semNum;
    document.getElementById('semester-title').textContent = `Semestre ${romanize(semNum)}`;

    if (!appState.semesters[semNum].initialized) {
        // Populate from pensum
        const subjects = PENSUM[semNum] || [];
        appState.semesters[semNum].subjects = subjects.map(item => {
            if (typeof item === 'string') return createNewSubjectObj(item);
            return { ...createNewSubjectObj(item.name), ...item };
        });
        appState.semesters[semNum].initialized = true;
        saveState(); // will trigger render
    } else {
        // Reparación: Si las materias existen pero no tienen ID (caso Semestre 2 previo)
        let needsRepair = false;
        appState.semesters[semNum].subjects = appState.semesters[semNum].subjects.map(sub => {
            if (!sub.id) {
                needsRepair = true;
                return { ...createNewSubjectObj(sub.name || 'Materia'), ...sub };
            }
            return sub;
        });
        if (needsRepair) saveState();
        renderSemesterView(semNum);
    }

    switchView('semester-view');
}

function createNewSubjectObj(name) {
    return {
        id: generateId(), name: name, teacher: '', email: '', room: '', shift: 'Sábado 1',
        tutos: [0, 0, 0, 0, 0], exam: 0, tutoDates: [], examDate: ''
    };
}

function calculateSubjectFinal(sub) {
    const tutos = sub.tutos || [];
    const validTutos = tutos.map(t => parseFloat(t) || 0);
    const sumTutos = validTutos.reduce((a, b) => a + b, 0);
    const avgTutos = validTutos.length > 0 ? sumTutos / validTutos.length : 0;
    const final = (avgTutos * 0.6) + ((parseFloat(sub.exam) || 0) * 0.4);
    return { avgTutos, final };
}

function renderSemesterView(semNum) {
    if (currentSemester !== semNum) return;
    const list = document.getElementById('subjects-list');
    list.innerHTML = '';

    const subjects = appState.semesters[semNum].subjects;
    subjects.forEach(sub => {
        const { final } = calculateSubjectFinal(sub);
        let gradeClass = 'grade-none';
        if (final > 0) gradeClass = final >= 3.0 ? 'grade-pass' : 'grade-fail';

        const card = document.createElement('div');
        card.className = 'subject-card';
        card.addEventListener('click', () => openSubjectModal(sub.id));
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <h3 style="margin-bottom: 8px; font-size: 16px;">${sub.name}</h3>
                <button class="delete-subject-btn" onclick="deleteSubject('${sub.id}', event)">✕</button>
            </div>
            <div style="font-size: 13px; color: #555; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
                <div><strong>Docente:</strong> ${sub.teacher || '--'}</div>
                <div><strong>Salón:</strong> ${sub.room || '--'}</div>
                <div><strong>Jornada:</strong> ${sub.shift || '--'}</div>
                <div><strong>Examen:</strong> ${sub.examDate || '--'}</div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #eee; padding-top: 10px;">
                <div style="font-size: 13px;">
                    <strong>Tutorías:</strong> [${(sub.tutos || []).map(t => Number(t) > 0 ? Number(t).toFixed(1) : '-').join(', ')}]
                    <br>
                    <strong>Examen 40%:</strong> ${sub.exam > 0 ? Number(sub.exam).toFixed(1) : '--'}
                </div>
                <div class="subject-grade ${gradeClass}" style="font-size: 24px;">
                    ${final.toFixed(1)}
                </div>
            </div>
        `;
        list.appendChild(card);
    });
}

document.getElementById('btn-add-subject').addEventListener('click', () => {
    const name = prompt("Nombre de la nueva materia:");
    if (name && name.trim() !== '') {
        appState.semesters[currentSemester].subjects.push(createNewSubjectObj(name.trim()));
        saveState();
    }
});

window.deleteSubject = function (id, e) {
    e.stopPropagation();
    if (confirm('¿Eliminar esta materia?')) {
        appState.semesters[currentSemester].subjects = appState.semesters[currentSemester].subjects.filter(s => s.id !== id);
        saveState();
    }
}

// --- SUBJECT MODAL ---
function getSubjectById(id) {
    return appState.semesters[currentSemester].subjects.find(s => s.id === id);
}

window.openSubjectModal = function (id) {
    currentSubjectId = id;
    const sub = getSubjectById(id);
    if (!sub) return;

    document.getElementById('modal-subject-title').textContent = sub.name;

    // Tab Info
    document.getElementById('inp-sub-name').value = sub.name;
    document.getElementById('inp-sub-teacher').value = sub.teacher;
    document.getElementById('inp-sub-email').value = sub.email;
    document.getElementById('inp-sub-room').value = sub.room;
    document.getElementById('inp-sub-shift').value = sub.shift;

    // Tab Grades
    renderGradesUI(sub);

    // Tab Calendar
    document.getElementById('inp-exam-date').value = sub.examDate;
    renderTutoDatesList(sub);

    // Reset to info tab
    document.querySelectorAll('.tab-btn')[0].click();
    document.getElementById('subject-modal').classList.add('active');

    // Set calendar to exam date or current
    if (sub.examDate) {
        calCurrentDate = new Date(sub.examDate + "T12:00:00");
    } else if (sub.tutoDates.length > 0) {
        calCurrentDate = new Date(sub.tutoDates[0] + "T12:00:00");
    } else {
        calCurrentDate = new Date();
    }
    renderCalendar();
}

document.getElementById('close-modal').addEventListener('click', () => {
    document.getElementById('subject-modal').classList.remove('active');
    saveState(); // Save any pending changes on close
});

// Tabs logic
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        e.target.classList.add('active');
        document.getElementById(e.target.dataset.target).classList.add('active');
        if (e.target.dataset.target === 'tab-calendar') renderCalendar();
    });
});

// Save info
document.getElementById('btn-save-info').addEventListener('click', () => {
    const sub = getSubjectById(currentSubjectId);
    sub.name = document.getElementById('inp-sub-name').value;
    sub.teacher = document.getElementById('inp-sub-teacher').value;
    sub.email = document.getElementById('inp-sub-email').value;
    sub.room = document.getElementById('inp-sub-room').value;
    sub.shift = document.getElementById('inp-sub-shift').value;
    saveState();
    document.getElementById('modal-subject-title').textContent = sub.name;
    alert('Información guardada');
});

// --- GRADES LOGIC ---
function renderGradesUI(sub) {
    const container = document.getElementById('tuto-container');
    container.innerHTML = '';

    sub.tutos.forEach((val, index) => {
        const pill = document.createElement('div');
        pill.className = 'grade-pill';
        pill.innerHTML = `
            <span>T${index + 1}</span>
            <input type="number" step="0.1" min="0" max="5" value="${val}" data-idx="${index}">
            <span class="del-note" onclick="removeNote(${index})">✕</span>
        `;
        container.appendChild(pill);
    });

    // Add events to inputs
    container.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('input', (e) => {
            let v = parseFloat(e.target.value);
            if (v < 0) v = 0; if (v > 5) v = 5;
            sub.tutos[e.target.dataset.idx] = isNaN(v) ? 0 : v;
            updatePrediction(sub);
        });
    });

    document.getElementById('inp-exam-grade').value = sub.exam;

    updatePrediction(sub);
}

document.getElementById('btn-add-note').addEventListener('click', () => {
    const sub = getSubjectById(currentSubjectId);
    sub.tutos.push(0);
    renderGradesUI(sub);
    updatePrediction(sub);
});

window.removeNote = function (index) {
    const sub = getSubjectById(currentSubjectId);
    if (sub.tutos.length > 1) {
        sub.tutos.splice(index, 1);
        renderGradesUI(sub);
        updatePrediction(sub);
    } else {
        alert("Debe haber al menos 1 nota de tutoría.");
    }
}

document.getElementById('inp-exam-grade').addEventListener('input', (e) => {
    const sub = getSubjectById(currentSubjectId);
    let v = parseFloat(e.target.value);
    if (v < 0) v = 0; if (v > 5) v = 5;
    sub.exam = isNaN(v) ? 0 : v;
    updatePrediction(sub);
});

function updatePrediction(sub) {
    const { avgTutos, final } = calculateSubjectFinal(sub);
    document.getElementById('tuto-avg-display').textContent = avgTutos.toFixed(2);
    document.getElementById('display-final-grade').textContent = final.toFixed(2);

    const msgEl = document.getElementById('display-prediction');

    if (final >= 2.95) { // Aproximación estándar
        msgEl.textContent = "¡Aprobando la materia!";
        msgEl.style.color = "#a5d6a7";
    } else {
        const needed = Math.max(0, (3.0 - (avgTutos * 0.6)) / 0.4);
        if (needed > 5.0) {
            msgEl.textContent = `Imposible aprobar. Necesitas ${needed.toFixed(2)} en el examen.`;
            msgEl.style.color = "#ffcdd2";
        } else if (needed <= 0) {
            msgEl.textContent = "Ya pasaste con el 60%.";
            msgEl.style.color = "#a5d6a7";
        } else {
            msgEl.textContent = `Necesitas sacar ${needed.toFixed(2)} en el Examen de Convocatoria para pasar con 3.0.`;
            msgEl.style.color = "#fff59d";
        }
    }
}

// --- CALENDAR LOGIC ---
function renderTutoDatesList(sub) {
    const list = document.getElementById('tuto-dates-list');
    list.innerHTML = '';
    sub.tutoDates.forEach((dateStr, idx) => {
        const chip = document.createElement('div');
        chip.className = 'date-chip';
        chip.innerHTML = `${dateStr} <span onclick="removeTutoDate(${idx})">✕</span>`;
        list.appendChild(chip);
    });
}

document.getElementById('btn-add-date').addEventListener('click', () => {
    const val = document.getElementById('inp-new-tuto-date').value;
    if (!val) return;
    const sub = getSubjectById(currentSubjectId);
    if (!sub.tutoDates.includes(val)) {
        sub.tutoDates.push(val);
        sub.tutoDates.sort();
        renderTutoDatesList(sub);
        renderCalendar();
        document.getElementById('inp-new-tuto-date').value = '';
    }
});

window.removeTutoDate = function (idx) {
    const sub = getSubjectById(currentSubjectId);
    sub.tutoDates.splice(idx, 1);
    renderTutoDatesList(sub);
    renderCalendar();
}

document.getElementById('inp-exam-date').addEventListener('change', (e) => {
    const sub = getSubjectById(currentSubjectId);
    sub.examDate = e.target.value;
    renderCalendar();
});

function renderCalendar() {
    const sub = getSubjectById(currentSubjectId);
    const year = calCurrentDate.getFullYear();
    const month = calCurrentDate.getMonth();

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    document.getElementById('cal-month-year').textContent = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const grid = document.getElementById('calendar-days');
    grid.innerHTML = '';

    // Empty slots
    for (let i = 0; i < firstDay; i++) {
        grid.innerHTML += `<div class="day-cell empty"></div>`;
    }

    // Days
    for (let i = 1; i <= daysInMonth; i++) {
        const dateObj = new Date(year, month, i);
        const dayOfWeek = dateObj.getDay();

        // Format YYYY-MM-DD local
        const yyyy = year;
        const mm = String(month + 1).padStart(2, '0');
        const dd = String(i).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        let cellClass = 'day-cell';
        if (dayOfWeek === 6) cellClass += ' saturday';
        if (sub.tutoDates.includes(dateStr)) cellClass += ' tutoria';
        if (sub.examDate === dateStr) cellClass += ' examen';

        grid.innerHTML += `<div class="${cellClass}">${i}</div>`;
    }
}

document.getElementById('cal-prev').addEventListener('click', () => {
    calCurrentDate.setMonth(calCurrentDate.getMonth() - 1);
    renderCalendar();
});

document.getElementById('cal-next').addEventListener('click', () => {
    calCurrentDate.setMonth(calCurrentDate.getMonth() + 1);
    renderCalendar();
});

// Initialize App (basic UI state)
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('app-screen').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('logout-btn').style.display = 'none';
    document.getElementById('admin-panel-btn').style.display = 'none';
    if (window.feather) feather.replace();
});
