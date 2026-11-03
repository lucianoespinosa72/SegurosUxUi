import { render } from './render.js';

const CLAVE_STORAGE = 'cubri-solicitud';

function solicitudInicial() {
  return {
    paso: 0, // 0 = inicio, 1..4 = checkout, 5 = éxito, 6 = error
    equipo: { marca: '', modelo: '', valor: 0, antiguedad: '' },
    plan: 'plus',
    titular: { nombre: '', apellido: '', dni: '', nacimiento: '',
      email: '', celular: '', terminos: false },
    pago: { metodo: 'credito', tarjeta: '', vencimiento: '', cvv: '', titular: '' },
    poliza: null,
    fechaEmision: null, // 'AAAA-MM-DD', se muestra como "Vigencia desde"
  };
}

// Toda la información del flujo vive acá. El DOM solo muestra lo que dice este objeto.
export const solicitud = solicitudInicial();

// Datos que no son de la solicitud pero que la interfaz necesita para pintarse
export const ui = {
  planes: [],          // se cargan desde data/planes.json
  errorPlanes: false,
  tocados: new Set(),  // campos que ya perdieron el foco: recién ahí mostramos su error
  procesando: false,   // pago en curso
  motivoError: '',
};

export function leerCampo(ruta) {
  const [grupo, campo] = ruta.split('.');
  return solicitud[grupo][campo];
}

export function escribirCampo(ruta, valor) {
  const [grupo, campo] = ruta.split('.');
  solicitud[grupo][campo] = valor;
  guardar();
}

export function elegirPlan(id) {
  solicitud.plan = id;
  guardar();
  render();
}

export function irAPaso(n) {
  solicitud.paso = n;
  guardar();
  render(); // siempre después de cambiar el estado
}

export function reiniciar() {
  Object.assign(solicitud, solicitudInicial());
  ui.tocados.clear();
  ui.motivoError = '';
  try {
    localStorage.removeItem(CLAVE_STORAGE);
  } catch { /* nada que limpiar */ }
  render();
}

export function planElegido() {
  return ui.planes.find((p) => p.id === solicitud.plan) || null;
}

// --- Persistencia (bonus): la solicitud sobrevive a un F5 ---
// Por seguridad, el número de tarjeta y el CVV nunca se guardan.
function guardar() {
  const copia = structuredClone(solicitud);
  copia.pago.tarjeta = '';
  copia.pago.cvv = '';
  try {
    localStorage.setItem(CLAVE_STORAGE, JSON.stringify(copia));
  } catch { /* modo privado o storage lleno: seguimos sin persistir */ }
}

export function restaurar() {
  let guardada = null;
  try {
    guardada = JSON.parse(localStorage.getItem(CLAVE_STORAGE));
  } catch { /* storage vacío o corrupto */ }
  if (!guardada || typeof guardada !== 'object') return;

  const base = solicitudInicial();
  solicitud.paso = Number(guardada.paso) || 0;
  solicitud.plan = guardada.plan || base.plan;
  solicitud.poliza = guardada.poliza || null;
  solicitud.fechaEmision = guardada.fechaEmision || null;
  for (const grupo of ['equipo', 'titular', 'pago']) {
    solicitud[grupo] = { ...base[grupo], ...guardada[grupo] };
  }
  // Un pago rechazado o en curso al recargar vuelve al formulario de pago
  if (solicitud.paso === 6) solicitud.paso = 4;
}
