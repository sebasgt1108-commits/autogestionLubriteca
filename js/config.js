
const API_BACKEND_URL = "http://192.168.0.132:3000/api/";
const documento_autorizacion_datos_url = "https://docs.google.com/document/d/1JuuQcjqJRRoOjid0BEr6Yz_FpABXftCkNRBVhflbGLI/edit?usp=sharing";


// ═══════════ CREDENCIALES ═══════════
const USUARIOS = [
  { usuario: "admin", clave: "autogestion2024" },
  { usuario: "taller", clave: "taller1234" },
  { usuario: "juan", clave: "1234" }
];

// ═══════════ CONFIGURACIÓN DE ESPACIOS ═══════════
const ESPACIOS = {
  carcamo: { nombre: "Cárcamo", icono: "🔩", clase: "chip-carcamo", tag: "tag-carcamo" },
  gato_hidraulico: { nombre: "Gato Hidráulico", icono: "🔧", clase: "chip-gato_hidraulico", tag: "tag-gato_hidraulico" },
  gato_electrico: { nombre: "Gato Eléctrico", icono: "⚡", clase: "chip-gato_electrico", tag: "tag-gato_electrico" }
};

// ═══════════ PLANTILLAS WHATSAPP (RECORDATORIO) ═══════════
// Placeholders disponibles: {nombre} {placa} {servicio} {km}
const WA_RECORDATORIO_CON_KM = `Hola, {nombre}
En Lubri Repuestos Yumbo JRC SAS queremos recordarte que tu vehículo de placa {placa} se acerca la fecha de su próximo cambio de {servicio}.

Según nuestro registro, el próximo cambio está previsto aproximadamente a los {km} km.

¿Te separamos un turno esta semana? Puedes agendar tu cita directamente con nosotros o, si aún no es el momento, respóndenos y te lo recordamos más adelante.

Lubri Repuestos Yumbo JRC SAS
Cuidamos la vida de tu motor.`;

const WA_RECORDATORIO_SIN_KM = `Hola, {nombre}
En Lubri Repuestos Yumbo JRC SAS queremos recordarte que tu vehículo de placa {placa} se acerca la fecha de su próximo cambio de {servicio}.

Este recordatorio se genera teniendo en cuenta el tiempo transcurrido desde tu último servicio. Te recomendamos revisar el kilometraje actual de tu vehículo y compararlo con el kilometraje indicado para tu próximo cambio, ya sea en tu tarjeta de mantenimiento, factura o registro del último servicio.

¿Te separamos un turno esta semana? Puedes agendar tu cita directamente con nosotros o, si todavía no es el momento, respóndenos y te lo recordamos más adelante.

Lubri Repuestos Yumbo JRC SAS
Cuidamos la vida de tu motor.`;

const HORAS = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
const HORAS_DISPLAY = {
  '07:00': '7:00 AM', '08:00': '8:00 AM', '09:00': '9:00 AM', '10:00': '10:00 AM',
  '11:00': '11:00 AM', '12:00': '12:00 PM', '13:00': '1:00 PM', '14:00': '2:00 PM',
  '15:00': '3:00 PM', '16:00': '4:00 PM', '17:00': '5:00 PM', '18:00': '6:00 PM', '19:00': '7:00 PM'
};
