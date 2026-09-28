
// ═══════════ PREFILL DESDE SERVIFLOW ═══════════
// Lee ?nombre&cedula&telefono&placa&servicio&autorizadoEn&origen=serviflow,
// guarda los datos saneados en sessionStorage y guía al operario por
// Registrar Usuario (si el cliente no existe) y luego Registrar Cliente.
// No cambia la lógica de guardado de usuarios.js ni clientes.js: solo
// rellena campos, cambia de pestaña y observa señales existentes
// (eventos SSE de sync.js, el toast de clienteForm) para saber cuándo
// avanzar de paso.

const PREFILL_STORAGE_KEY = 'ag_prefill_serviflow';
const PREFILL_INTERVALO_MS = 2000;
const PREFILL_MAX_INTENTOS = 10; // 10 × 2s = 20s

let prefillFlowIniciado = false;
let prefillBannerEl = null;
let prefillEventSource = null;
let prefillPasoActual = null; // 'usuario' | 'cliente' | null
let prefillEsperaTimer = null;
let prefillEsperaIntentos = 0;
let prefillEsperaTipo = null;
let prefillEsperaContexto = null;
let prefillEsperaAlConfirmar = null;

// ─── Saneamiento ───
function prefillLimpiarTexto(valor, maxLen) {
  let v = (valor === null || valor === undefined) ? '' : String(valor);
  v = v.replace(/<[^>]*>/g, ' ');
  v = v.replace(/[<>]/g, '');
  v = v.replace(/\s+/g, ' ').trim();
  if (maxLen && v.length > maxLen) v = v.slice(0, maxLen).trim();
  return v;
}

// ─── Lectura de la URL y almacenamiento en sessionStorage ───
function prefillLeerParametrosURL() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('origen') !== 'serviflow') return null;
  return {
    nombre: prefillLimpiarTexto(params.get('nombre'), 120),
    cedula: prefillLimpiarTexto(params.get('cedula'), 20),
    telefono: prefillLimpiarTexto(params.get('telefono'), 20),
    placa: prefillLimpiarTexto(params.get('placa'), 10).toUpperCase(),
    servicio: prefillLimpiarTexto(params.get('servicio'), 80),
    autorizadoEn: prefillLimpiarTexto(params.get('autorizadoEn'), 40),
    origen: 'serviflow'
  };
}

function prefillGuardarDatos(datos) {
  try { sessionStorage.setItem(PREFILL_STORAGE_KEY, JSON.stringify(datos)); } catch (e) { console.warn('No se pudo guardar el prefill de ServiFlow:', e); }
}
function prefillCargarDatos() {
  try {
    const raw = sessionStorage.getItem(PREFILL_STORAGE_KEY);
    if (!raw) return null;
    const datos = JSON.parse(raw);
    return (datos && typeof datos === 'object') ? datos : null;
  } catch (e) { return null; }
}
function prefillLimpiarDatos() {
  try { sessionStorage.removeItem(PREFILL_STORAGE_KEY); } catch (e) { /* no-op */ }
}

// Captura inmediata (antes de DOMContentLoaded) para no perder los parámetros
(function prefillCapturarURL() {
  const datosURL = prefillLeerParametrosURL();
  if (!datosURL) return;
  prefillGuardarDatos(datosURL);
  try {
    const url = new URL(window.location.href);
    url.search = '';
    window.history.replaceState(null, '', url.toString());
  } catch (e) { /* no-op */ }
})();

// ─── Enganche a mostrarApp() (definida en auth.js) sin editar ese archivo ───
(function prefillEnvolverMostrarApp() {
  if (typeof mostrarApp !== 'function' || mostrarApp.__prefillWrapped) return;
  const mostrarAppOriginal = mostrarApp;
  mostrarApp = function (...args) {
    const resultado = mostrarAppOriginal.apply(this, args);
    prefillIniciarFlujoUnaVez();
    return resultado;
  };
  mostrarApp.__prefillWrapped = true;
})();

function prefillIniciarFlujoUnaVez() {
  if (prefillFlowIniciado) return;
  const datos = prefillCargarDatos();
  if (!datos) return;
  prefillFlowIniciado = true;
  prefillEjecutarFlujo(datos);
}

// ─── Decidir si el cliente ya existe (por cédula o teléfono normalizado) ───
async function prefillEjecutarFlujo(datos) {
  const usuarios = await getUsuariosRegistrados();
  const lista = Array.isArray(usuarios) ? usuarios : [];
  const cedulaDatos = limpiarTelefono(datos.cedula || '');
  const telDatos = normalizarTelefonoCO(datos.telefono || '');

  const existe = lista.some(u => {
    const cedulaU = limpiarTelefono(u.id || '');
    const telU = normalizarTelefonoCO(u.telephone || '');
    return (cedulaDatos && cedulaU && cedulaU === cedulaDatos) ||
      (telDatos && telU && telU === telDatos);
  });

  if (existe) {
    prefillIniciarPasoCliente(datos);
  } else {
    prefillIniciarPasoUsuario(datos);
  }
}

// ─── Paso 1: Registrar Usuario ───
function prefillIniciarPasoUsuario(datos) {
  prefillAbrirEventos();
  prefillPasoActual = 'usuario';
  seleccionarTab('usuarios');

  const inputNombre = document.getElementById('usuarioNombre');
  const inputCedula = document.getElementById('usuarioCedula');
  const inputTelefono = document.getElementById('usuarioTelefono');
  if (inputNombre) inputNombre.value = datos.nombre || '';
  if (inputCedula) inputCedula.value = datos.cedula || '';
  if (inputTelefono) inputTelefono.value = datos.telefono || '';

  const botonWA = document.querySelector('.btn-auth-form');
  if (botonWA) botonWA.style.display = datos.autorizadoEn ? 'none' : '';

  const texto = datos.autorizadoEn
    ? `Autorización aceptada en ServiFlow el ${prefillFormatearAutorizadoEn(datos.autorizadoEn)}. Paso 1 de 2: revisa los datos y guarda.`
    : 'Paso 1 de 2: revisa los datos y guarda.';
  prefillMostrarBanner('usuarioForm', texto, { cancelar: true });

  const foco = inputCedula && !inputCedula.value ? inputCedula : inputNombre;
  if (foco) foco.focus();

  document.getElementById('usuarioForm')?.addEventListener('submit', () => {
    if (prefillPasoActual !== 'usuario') return;
    const cedulaEnviada = limpiarTelefono(document.getElementById('usuarioCedula')?.value || '');
    const telEnviado = normalizarTelefonoCO(document.getElementById('usuarioTelefono')?.value || '');
    prefillIniciarEspera('usuario', { cedulaEnviada, telEnviado }, () => prefillAvanzarAPasoCliente(datos));
  });
}

function prefillFormatearAutorizadoEn(valor) {
  const soloFecha = String(valor || '').slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(soloFecha)) {
    try { return formatearFechaLarga(soloFecha); } catch (e) { return valor; }
  }
  return valor;
}

function prefillAvanzarAPasoCliente(datos) {
  prefillPasoActual = null;
  prefillOcultarBanner();
  prefillIniciarPasoCliente(datos);
}

// ─── Paso 2: Registrar Cliente ───
function prefillIniciarPasoCliente(datos) {
  prefillAbrirEventos();
  prefillPasoActual = 'cliente';
  seleccionarTab('principal');

  const inputNombre = document.getElementById('nombre');
  const inputTelefono = document.getElementById('telefono');
  const inputPlaca = document.getElementById('placa');
  const selectCategoria = document.getElementById('categoria');
  const inputFechaActual = document.getElementById('fechaActual');
  const inputFechaFutura = document.getElementById('fechaFutura');

  if (inputNombre) inputNombre.value = datos.nombre || '';
  if (inputTelefono) inputTelefono.value = datos.telefono || '';
  if (inputPlaca) inputPlaca.value = (datos.placa || '').toUpperCase();
  if (selectCategoria) selectCategoria.value = prefillEmparejarServicio(datos.servicio);
  if (inputFechaActual) inputFechaActual.value = getHoy();
  if (inputFechaFutura) inputFechaFutura.value = '';

  prefillMostrarBanner('clienteForm', 'Paso 2 de 2: pon la fecha y el km recomendado y guarda.', { cancelar: true });

  if (inputFechaFutura) inputFechaFutura.focus();

  document.getElementById('clienteForm')?.addEventListener('submit', () => {
    if (prefillPasoActual !== 'cliente') return;
    prefillIniciarEspera('cliente', {}, () => prefillFinalizarFlujo());
  });
}

function prefillEmparejarServicio(texto) {
  const opciones = ['Cambio de Aceite', 'Revisión de Frenos', 'Mantenimiento General', 'Sistema Eléctrico', 'Otros'];
  const normalizar = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const t = normalizar(texto);
  if (!t) return '';

  const exacto = opciones.find(o => normalizar(o) === t);
  if (exacto) return exacto;

  const mapa = [
    { claves: ['aceite', 'oil'], valor: 'Cambio de Aceite' },
    { claves: ['freno', 'brake'], valor: 'Revisión de Frenos' },
    { claves: ['electric', 'bateria'], valor: 'Sistema Eléctrico' },
    { claves: ['general', 'mantenimiento'], valor: 'Mantenimiento General' },
    { claves: ['otro'], valor: 'Otros' }
  ];
  for (const { claves, valor } of mapa) {
    if (claves.some(c => t.includes(c))) return valor;
  }
  return ''; // sin coincidencia clara: se deja "Seleccione..." para que el operario elija
}

// ─── Confirmación de guardado: eventos en tiempo real + sondeo de respaldo ───
function prefillAbrirEventos() {
  if (prefillEventSource) return;
  try {
    prefillEventSource = new EventSource(API_BACKEND_URL + 'eventos');
    prefillEventSource.addEventListener('usuario-agregado', () => {
      if (prefillEsperaTipo === 'usuario') prefillConfirmarGuardado();
    });
    prefillEventSource.addEventListener('cliente-creado', () => {
      if (prefillEsperaTipo === 'cliente') prefillConfirmarGuardado();
    });
  } catch (e) { console.warn('No se pudo abrir el canal de eventos para el prefill:', e); }
}
function prefillCerrarEventos() {
  if (prefillEventSource) { prefillEventSource.close(); prefillEventSource = null; }
}

function prefillIniciarEspera(tipo, contexto, alConfirmar) {
  prefillLimpiarEspera();
  prefillEsperaTipo = tipo;
  prefillEsperaContexto = contexto;
  prefillEsperaAlConfirmar = alConfirmar;
  prefillEsperaIntentos = 0;

  prefillMostrarBanner(tipo === 'usuario' ? 'usuarioForm' : 'clienteForm', 'Esperando confirmación de guardado…', { cancelar: true });

  prefillEsperaTimer = setInterval(async () => {
    prefillEsperaIntentos++;
    const confirmado = await prefillVerificarSondeo(tipo, contexto);
    if (confirmado) { prefillConfirmarGuardado(); return; }
    if (prefillEsperaIntentos >= PREFILL_MAX_INTENTOS) {
      clearInterval(prefillEsperaTimer);
      prefillEsperaTimer = null;
      prefillMostrarBotonManual(tipo);
    }
  }, PREFILL_INTERVALO_MS);
}

async function prefillVerificarSondeo(tipo, contexto) {
  if (tipo === 'usuario') {
    const usuarios = await getUsuariosRegistrados();
    const lista = Array.isArray(usuarios) ? usuarios : [];
    return lista.some(u => {
      const cedulaU = limpiarTelefono(u.id || '');
      const telU = normalizarTelefonoCO(u.telephone || '');
      return (contexto.cedulaEnviada && cedulaU === contexto.cedulaEnviada) ||
        (contexto.telEnviado && telU === contexto.telEnviado);
    });
  }
  if (tipo === 'cliente') {
    const toast = document.getElementById('toastGuardado');
    return !!(toast && toast.style.display === 'block');
  }
  return false;
}

function prefillConfirmarGuardado() {
  if (prefillEsperaTimer) { clearInterval(prefillEsperaTimer); prefillEsperaTimer = null; }
  const callback = prefillEsperaAlConfirmar;
  prefillEsperaTipo = null;
  prefillEsperaContexto = null;
  prefillEsperaAlConfirmar = null;
  if (callback) callback();
}

function prefillLimpiarEspera() {
  if (prefillEsperaTimer) { clearInterval(prefillEsperaTimer); prefillEsperaTimer = null; }
  prefillEsperaTipo = null;
  prefillEsperaContexto = null;
  prefillEsperaAlConfirmar = null;
  prefillEsperaIntentos = 0;
}

function prefillMostrarBotonManual(tipo) {
  const textoBoton = tipo === 'usuario' ? 'Ya guardé, continuar al paso 2' : 'Ya guardé, finalizar';
  prefillMostrarBanner(tipo === 'usuario' ? 'usuarioForm' : 'clienteForm', 'No pudimos confirmar el guardado automáticamente.', {
    cancelar: true,
    botonManual: { texto: textoBoton, onClick: () => prefillConfirmarGuardado() }
  });
}

// ─── Banner de aviso + Cancelar ───
function prefillMostrarBanner(formId, texto, opciones = {}) {
  const form = document.getElementById(formId);
  if (!form || !form.parentElement) return;

  if (!prefillBannerEl) {
    prefillBannerEl = document.createElement('div');
    prefillBannerEl.id = 'prefillServiFlowBanner';
    prefillBannerEl.style.cssText = 'margin:0 20px 12px;padding:10px 14px;border-radius:8px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a8a;font-family:"DM Sans",sans-serif;font-size:0.85rem;display:flex;flex-wrap:wrap;align-items:center;gap:10px;justify-content:space-between;';
  }
  prefillBannerEl.innerHTML = '';

  const span = document.createElement('span');
  span.textContent = texto;
  span.style.flex = '1 1 220px';
  prefillBannerEl.appendChild(span);

  const acciones = document.createElement('div');
  acciones.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';

  if (opciones.botonManual) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = opciones.botonManual.texto;
    btn.className = 'btn-clear';
    btn.onclick = opciones.botonManual.onClick;
    acciones.appendChild(btn);
  }
  if (opciones.cancelar) {
    const btnCancelar = document.createElement('button');
    btnCancelar.type = 'button';
    btnCancelar.textContent = 'Cancelar';
    btnCancelar.className = 'btn-clear';
    btnCancelar.onclick = prefillCancelarFlujo;
    acciones.appendChild(btnCancelar);
  }
  prefillBannerEl.appendChild(acciones);

  form.parentElement.insertBefore(prefillBannerEl, form);
}

function prefillOcultarBanner() {
  if (prefillBannerEl && prefillBannerEl.parentElement) prefillBannerEl.parentElement.removeChild(prefillBannerEl);
}

// ─── Cierre del flujo ───
function prefillFinalizarFlujo() {
  prefillPasoActual = null;
  prefillOcultarBanner();
  prefillCerrarEventos();
  prefillLimpiarEspera();
  prefillLimpiarDatos();
}

function prefillCancelarFlujo() {
  prefillPasoActual = null;
  prefillOcultarBanner();
  prefillCerrarEventos();
  prefillLimpiarEspera();
  prefillLimpiarDatos();
}
