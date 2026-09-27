// ═══════════ SUGERENCIA DE PRÓXIMO CONTACTO Y PRÓXIMO KM ═══════════
// Usa INTERVALOS_SERVICIO (js/config.js) y sumarMesesAFecha/soloDigitos/formatearMiles (js/utils.js).
// No modifica el envío a la API ni el formato de fechas guardadas: solo pre-llena inputs existentes.

function crearControlProximoContacto(cfg) {
  const categoriaEl = document.getElementById(cfg.categoriaId);
  const fechaActualEl = document.getElementById(cfg.fechaActualId);
  const fechaFuturaEl = document.getElementById(cfg.fechaFuturaId);
  const kmEl = document.getElementById(cfg.kmId);
  const kmSugeridoEl = document.getElementById(cfg.kmSugeridoId);
  if (!categoriaEl || !fechaActualEl || !fechaFuturaEl || !kmEl || !kmSugeridoEl) return null;

  let fechaFuturaEditadaAMano = false;

  function calcularFechaSugerida() {
    const intervalo = INTERVALOS_SERVICIO[categoriaEl.value];
    if (!intervalo || !fechaActualEl.value) return '';
    return sumarMesesAFecha(fechaActualEl.value, intervalo.meses);
  }

  function aplicarFechaSugerida() {
    const sugerida = calcularFechaSugerida();
    if (sugerida) fechaFuturaEl.value = sugerida;
  }

  function actualizarKmSugerido() {
    const intervalo = INTERVALOS_SERVICIO[categoriaEl.value];
    const kmActual = soloDigitos(kmEl.value);
    if (!intervalo || intervalo.km == null || !kmActual) {
      kmSugeridoEl.textContent = '';
      return;
    }
    const total = parseInt(kmActual, 10) + intervalo.km;
    kmSugeridoEl.textContent = `Próximo cambio sugerido: ${formatearMiles(total)} km`;
  }

  // El usuario tocó la fecha futura directamente: a partir de ahora no se sobrescribe sola.
  fechaFuturaEl.addEventListener('input', () => { fechaFuturaEditadaAMano = true; });

  categoriaEl.addEventListener('change', () => {
    if (!fechaFuturaEditadaAMano) {
      aplicarFechaSugerida();
    } else {
      const sugerida = calcularFechaSugerida();
      if (sugerida && confirm('Ya cambiaste a mano la fecha de "Próximo Contacto". ¿Reemplazarla por la fecha sugerida para el nuevo servicio elegido?')) {
        fechaFuturaEl.value = sugerida;
        fechaFuturaEditadaAMano = false;
      }
    }
    actualizarKmSugerido();
  });

  fechaActualEl.addEventListener('change', () => {
    if (!fechaFuturaEditadaAMano) aplicarFechaSugerida();
  });

  // Solo normaliza a dígitos cuando el valor realmente cambió (no toca kilometrajes
  // antiguos en texto que el trabajador no llegó a editar).
  kmEl.addEventListener('change', () => {
    kmEl.value = soloDigitos(kmEl.value);
    actualizarKmSugerido();
  });
  kmEl.addEventListener('input', actualizarKmSugerido);

  return {
    reset() {
      fechaFuturaEditadaAMano = false;
      actualizarKmSugerido();
    }
  };
}

const controlProximoContactoPrincipal = crearControlProximoContacto({
  categoriaId: 'categoria',
  fechaActualId: 'fechaActual',
  fechaFuturaId: 'fechaFutura',
  kmId: 'kilometraje',
  kmSugeridoId: 'kmSugerido'
});

const controlProximoContactoEdicion = crearControlProximoContacto({
  categoriaId: 'editCategoria',
  fechaActualId: 'editFechaActual',
  fechaFuturaId: 'editFechaFutura',
  kmId: 'editKm',
  kmSugeridoId: 'editKmSugerido'
});

// El formulario principal se resetea (clienteForm.reset()) tras guardar un cliente;
// aprovechamos ese evento nativo para volver a permitir el autocompletado.
const clienteFormEl = document.getElementById('clienteForm');
if (clienteFormEl && controlProximoContactoPrincipal) {
  clienteFormEl.addEventListener('reset', () => controlProximoContactoPrincipal.reset());
}

// El modal de edición reutiliza los mismos inputs para cada cliente que se abre;
// al mostrarse de nuevo, se resetea el flag de edición manual y se recalcula el km sugerido
// con los valores que abrirModalEditar() ya haya cargado.
const modalEditarEl = document.getElementById('modalEditar');
if (modalEditarEl && controlProximoContactoEdicion) {
  const observerModalEditar = new MutationObserver(() => {
    if (modalEditarEl.classList.contains('active')) controlProximoContactoEdicion.reset();
  });
  observerModalEditar.observe(modalEditarEl, { attributes: true, attributeFilter: ['class'] });
}
