
// ═══════════ LOGIN ═══════════
// La sesión se guarda en localStorage (compartida entre pestañas del mismo
// navegador) con marca de expiración, para que un enlace de ServiFlow abierto
// en pestaña nueva no vuelva a pedir login. Se mantiene un espejo en
// sessionStorage porque otros módulos (agenda.js, listaCitas.js, usuarios.js)
// leen `ag_role` directamente de sessionStorage; así no hay que tocarlos.
const SESION_KEY = 'ag_sesion';
const SESION_ROLE_KEY = 'ag_role';
const SESION_EXP_KEY = 'ag_sesion_exp';

function calcularExpiracionSesion(inicioMs) {
  const finDelDia = new Date(inicioMs);
  finDelDia.setHours(23, 59, 59, 999);
  return Math.min(finDelDia.getTime(), inicioMs + SESSION_MAX_DURACION_MS);
}

function guardarSesion(role) {
  const expira = calcularExpiracionSesion(Date.now());
  try {
    localStorage.setItem(SESION_KEY, 'ok');
    localStorage.setItem(SESION_ROLE_KEY, role || '');
    localStorage.setItem(SESION_EXP_KEY, String(expira));
  } catch (e) { console.warn('No se pudo guardar la sesión en localStorage:', e); }
  try {
    sessionStorage.setItem(SESION_KEY, 'ok');
    sessionStorage.setItem(SESION_ROLE_KEY, role || '');
  } catch (e) { /* no-op */ }
}

function limpiarSesion() {
  try {
    localStorage.removeItem(SESION_KEY);
    localStorage.removeItem(SESION_ROLE_KEY);
    localStorage.removeItem(SESION_EXP_KEY);
  } catch (e) { /* no-op */ }
  try {
    sessionStorage.removeItem(SESION_KEY);
    sessionStorage.removeItem(SESION_ROLE_KEY);
  } catch (e) { /* no-op */ }
}

function sesionLocalValida() {
  let sesion, exp;
  try {
    sesion = localStorage.getItem(SESION_KEY);
    exp = Number(localStorage.getItem(SESION_EXP_KEY));
  } catch (e) { return false; }
  return sesion === 'ok' && !!exp && Date.now() < exp;
}

// Migra una sesión vieja (guardada solo en sessionStorage, de antes de este
// cambio) a localStorage, para no cerrarle la sesión a nadie de golpe.
function migrarSesionAntiguaSiExiste() {
  let habiaSesionVieja = false;
  let role = '';
  try {
    habiaSesionVieja = sessionStorage.getItem(SESION_KEY) === 'ok';
    role = sessionStorage.getItem(SESION_ROLE_KEY) || '';
  } catch (e) { /* no-op */ }
  if (!habiaSesionVieja) return false;
  guardarSesion(role);
  return true;
}

function verificarSesion() {
  if (sesionLocalValida()) {
    // Refresca el espejo en sessionStorage de esta pestaña (p.ej. una
    // pestaña nueva abierta desde un enlace de ServiFlow no lo tiene aún).
    try {
      sessionStorage.setItem(SESION_KEY, 'ok');
      sessionStorage.setItem(SESION_ROLE_KEY, localStorage.getItem(SESION_ROLE_KEY) || '');
    } catch (e) { /* no-op */ }
    mostrarApp();
    return;
  }

  // Sesión en localStorage vencida: bórrala y exige login otra vez.
  let habiaLocal = false;
  try { habiaLocal = localStorage.getItem(SESION_KEY) !== null; } catch (e) { /* no-op */ }
  if (habiaLocal) limpiarSesion();

  if (migrarSesionAntiguaSiExiste()) mostrarApp();
}

// Si se cierra la sesión (o vence) en otra pestaña, esta también vuelve al login.
window.addEventListener('storage', (e) => {
  if (e.key !== SESION_KEY) return;
  if (e.newValue === 'ok') return; // sesión iniciada/renovada en otra pestaña: no forzar nada aquí
  try { sessionStorage.removeItem(SESION_KEY); sessionStorage.removeItem(SESION_ROLE_KEY); } catch (err) { /* no-op */ }
  const appVisible = document.getElementById('appWrapper')?.style.display !== 'none';
  if (appVisible) mostrarPantallaLogin();
});
function intentarLogin(e) {
  e.preventDefault();
  const usuario = document.getElementById('loginUser').value.trim();
  const clave = document.getElementById('loginPass').value;
  const error = document.getElementById('loginError');
  const btn = document.getElementById('loginBtn');
  const txtBtn = document.getElementById('loginBtnText');
  const loader = document.getElementById('loginBtnLoader');

  btn.disabled = true; txtBtn.style.display = 'none'; loader.style.display = 'inline-block';
  error.classList.remove('visible');
  setTimeout(() => {
    try {
      fetch(API_BACKEND_URL + 'login/validateLogin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usuario, password: clave })
      })
        .then(res => res.json())
        .then(data => {
          console.log(data);
          if (data.status === true) {
            guardarSesion(data.role);
            document.getElementById('loginScreen').classList.add('saliendo');
            setTimeout(() => mostrarApp(), 400);
            console.log('Login exitoso');
          } else {

            error.classList.add('visible');
            btn.disabled = false; txtBtn.style.display = 'inline'; loader.style.display = 'none';
            document.getElementById('loginPass').value = '';
            document.getElementById('loginPass').focus();
          }

        })
    } catch (error) { console.error('Error al validar login:', error); }
  }, 600);
}

function mostrarApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appWrapper').style.display = 'block';
  if (Notification.permission !== "granted") Notification.requestPermission();

  //migrarClientesAHistorial();
  actualizarStats();
  mostrarAlertas();
  revisarCitasDeHoy();
  actualizarBadgeContactados();
  actualizarBadgeUsuarios();
  actualizarBadgeAgenda();
  actualizarBadgeCitasProgramadas();

  sincronizarConSheets();
  const role = sessionStorage.getItem('ag_role');
  if (role !== 'admin') {
    document.getElementById('nav-trabajadores')?.style.setProperty('display', 'none');
    document.getElementById('nav-estadisticas')?.style.setProperty('display', 'none');

    document.querySelectorAll('.btn-editar-usuario, .btn-eliminar-usuario').forEach(btn => {
      btn.style.display = 'none';
    });
    // cualquier otro elemento que quieras ocultar
  }
}

function cerrarSesion() {
  limpiarSesion();
  mostrarPantallaLogin();
}

function mostrarPantallaLogin() {
  document.getElementById('appWrapper').style.display = 'none';
  const ls = document.getElementById('loginScreen');
  ls.style.display = 'flex'; ls.classList.remove('saliendo');
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  document.getElementById('loginError').classList.remove('visible');
}
function togglePassword() {
  const i = document.getElementById('loginPass');
  i.type = i.type === 'password' ? 'text' : 'password';
}
