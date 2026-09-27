
function limpiarTelefono(valor) {
  return String(valor || '').replace(/\D/g, '');
}

// Quita el prefijo de país 57 si el número quedó guardado con él (12 dígitos: 57 + 10)
function normalizarTelefonoCO(valor) {
  let t = limpiarTelefono(valor);
  if (t.length === 12 && t.startsWith('57')) t = t.slice(2);
  return t;
}

// Celular colombiano válido para WhatsApp: 10 dígitos que empiezan por 3
function telefonoValidoWA(telefonoNormalizado) {
  return telefonoNormalizado.length === 10 && telefonoNormalizado.startsWith('3');
}

// El nombre se guarda en MAYÚSCULAS; para el saludo se usa solo el primer nombre, capitalizado
function primerNombreCapitalizado(nombreCompleto) {
  const primero = String(nombreCompleto || '').trim().split(/\s+/)[0] || '';
  return primero.charAt(0).toUpperCase() + primero.slice(1).toLowerCase();
}

function getHoy() { return new Date().toLocaleDateString('en-CA'); }
function setFechaHoyEnInput(inputId) {
  const input = document.getElementById(inputId);
  if (input && !input.value) input.value = getHoy();
}
function diasRestantes(fechaStr) {
  return Math.ceil((new Date(String(fechaStr).trim()) - new Date(getHoy())) / 86400000);
}
function fechaHoraActual() {
  return new Date().toLocaleString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function formatearFechaLarga(fechaStr) {
  const [y, m, d] = fechaStr.split('-');
  return new Date(+y, +m - 1, +d).toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function normalizarBooleanContactado(valor) {
  if (typeof valor === 'boolean') return valor;
  if (typeof valor === 'number') return valor === 1;
  if (typeof valor === 'string') {
    const v = valor.trim().toLowerCase();
    return v === 'true' || v === '1' || v === 'si' || v === 'sí' || v === 'yes';
  }
  return false;
}

function normalizarBooleanConcluido(valor) {
  if (typeof valor === 'boolean') return valor;
  if (typeof valor === 'number') return valor === 1;
  if (typeof valor === 'string') {
    const v = valor.trim().toLowerCase();
    return v === 'true' || v === '1' || v === 'si' || v === 'sí' || v === 'yes';
  }
  return false;
}

// Generar ID numérico consistente a partir de placa + fecha
function generarIdCliente(placa, fecha) {
  const str = String(placa) + String(fecha);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash) || Date.now();
}
