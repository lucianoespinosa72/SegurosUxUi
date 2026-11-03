import { solicitud, ui, leerCampo, escribirCampo, elegirPlan, irAPaso, reiniciar, restaurar, planElegido } from './estado.js';
import { render, formatearValorInput, formatearFecha, cuotaDe } from './render.js';
import { formatearMoneda } from './cotizador.js';
import { validarPaso, CAMPOS_POR_PASO, soloDigitos } from './validaciones.js';
import { simularPago, generarPoliza } from './pago.js';

// ---------- Carga de planes (una sola vez) ----------

let cargaPlanes = null;

function cargarPlanes() {
  cargaPlanes ??= fetch('data/planes.json')
    .then((respuesta) => {
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
      return respuesta.json();
    })
    .then((planes) => {
      ui.planes = planes;
      ui.errorPlanes = false;
    })
    .catch((error) => {
      console.warn('No se pudieron cargar los planes:', error);
      ui.errorPlanes = true;
      cargaPlanes = null; // permite reintentar
    });
  return cargaPlanes;
}

// ---------- Lectura de inputs: texto → valor del estado (+ máscaras) ----------

const MASCARAS = {
  'equipo.valor': (texto) => {
    const numero = Number(soloDigitos(texto).slice(0, 9)) || 0;
    return { valor: numero, texto: formatearValorInput(numero) };
  },
  'titular.dni': (texto) => {
    const limpio = soloDigitos(texto).slice(0, 8);
    return { valor: limpio, texto: limpio };
  },
  'pago.tarjeta': (texto) => {
    const agrupado = soloDigitos(texto).slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
    return { valor: agrupado, texto: agrupado };
  },
  'pago.vencimiento': (texto) => {
    const digitos = soloDigitos(texto).slice(0, 4);
    const conBarra = digitos.length > 2 ? `${digitos.slice(0, 2)}/${digitos.slice(2)}` : digitos;
    return { valor: conBarra, texto: conBarra };
  },
  'pago.cvv': (texto) => {
    const limpio = soloDigitos(texto).slice(0, 3);
    return { valor: limpio, texto: limpio };
  },
};

function alEscribir(evento) {
  const input = evento.target.closest('[data-campo]');
  if (!input || input.type === 'radio' || input.type === 'checkbox' || input.tagName === 'SELECT') return;
  const ruta = input.dataset.campo;
  const mascara = MASCARAS[ruta];
  if (mascara) {
    const { valor, texto } = mascara(input.value);
    input.value = texto;
    escribirCampo(ruta, valor);
  } else {
    escribirCampo(ruta, input.value);
  }
  render();
}

function alCambiar(evento) {
  if (evento.target.matches('[data-plan]')) {
    elegirPlan(evento.target.value);
    return;
  }
  const input = evento.target.closest('[data-campo]');
  if (!input || !(input.type === 'radio' || input.type === 'checkbox' || input.tagName === 'SELECT')) return;
  const ruta = input.dataset.campo;
  escribirCampo(ruta, input.type === 'checkbox' ? input.checked : input.value);
  ui.tocados.add(ruta);
  render();
}

// El error se muestra al salir del campo, no mientras se escribe la primera letra
function alSalir(evento) {
  const input = evento.target.closest('[data-campo]');
  if (!input) return;
  ui.tocados.add(input.dataset.campo);
  render();
}

// ---------- Avance entre pasos ----------

function pasoValido(paso) {
  const errores = validarPaso(paso, leerCampo);
  const rutas = Object.keys(errores);
  if (!rutas.length) return true;

  CAMPOS_POR_PASO[paso].forEach((ruta) => ui.tocados.add(ruta));
  render();
  document.querySelector(`[data-campo="${rutas[0]}"]`)?.focus();
  return false;
}

async function pagar() {
  if (ui.procesando || !pasoValido(4)) return;

  ui.procesando = true; // evita el doble click
  render();
  const resultado = await simularPago(solicitud.pago.tarjeta);
  ui.procesando = false;

  if (resultado.ok) {
    const hoy = new Date();
    solicitud.poliza = generarPoliza();
    solicitud.fechaEmision = [
      hoy.getFullYear(),
      String(hoy.getMonth() + 1).padStart(2, '0'),
      String(hoy.getDate()).padStart(2, '0'),
    ].join('-');
    irAPaso(5);
  } else {
    ui.motivoError = resultado.motivo;
    irAPaso(6);
  }
}

async function alEnviar(evento) {
  evento.preventDefault();
  switch (evento.target.id) {
    case 'form-paso-1':
      if (!pasoValido(1)) return;
      await cargarPlanes();
      irAPaso(2);
      break;
    case 'form-paso-2':
      irAPaso(3);
      break;
    case 'form-paso-3':
      if (pasoValido(3)) irAPaso(4);
      break;
    case 'form-paso-4':
      await pagar();
      break;
  }
}

const ACCIONES = {
  inicio: () => (solicitud.paso === 5 ? reiniciar() : irAPaso(0)),
  cotizar: () => irAPaso(1),
  volver: () => irAPaso(Math.max(0, solicitud.paso - 1)),
  reiniciar: () => reiniciar(),
  descargar: () => descargarPoliza(),
  reintentar: () => irAPaso(4),
  'cambiar-medio': () => {
    irAPaso(4);
    const tarjeta = document.getElementById('tarjeta');
    tarjeta.focus();
    tarjeta.select();
  },
};

// Genera un comprobante de texto con los datos de la póliza (todo sale del estado)
function descargarPoliza() {
  const plan = planElegido();
  const cuota = cuotaDe(plan);
  const { equipo, titular } = solicitud;
  const texto = [
    'Cubrí Seguros · Póliza de seguro de celular',
    '',
    `Póliza: ${solicitud.poliza}`,
    `Vigencia desde: ${formatearFecha(solicitud.fechaEmision)}`,
    `Titular: ${titular.nombre} ${titular.apellido} · DNI ${titular.dni}`,
    `Email: ${titular.email}`,
    `Equipo: ${equipo.marca} ${equipo.modelo} · ${formatearMoneda(equipo.valor)}`,
    `Plan: ${plan.nombre} (${plan.coberturas.join(', ')})`,
    `Cuota mensual: ${formatearMoneda(cuota)}`,
    '',
    'Documento simulado: no tiene validez legal.',
  ].join('\n');

  const url = URL.createObjectURL(new Blob([texto], { type: 'text/plain;charset=utf-8' }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `${solicitud.poliza}.txt`;
  enlace.click();
  URL.revokeObjectURL(url);
}

function alHacerClick(evento) {
  const boton = evento.target.closest('[data-accion]');
  if (!boton) return;
  evento.preventDefault();
  if (ui.procesando) return;
  ACCIONES[boton.dataset.accion]?.();
}

// ---------- Arranque ----------

async function iniciar() {
  document.addEventListener('input', alEscribir);
  document.addEventListener('change', alCambiar);
  document.addEventListener('focusout', alSalir);
  document.addEventListener('submit', alEnviar);
  document.addEventListener('click', alHacerClick);

  restaurar();
  if (solicitud.paso >= 2) await cargarPlanes();
  render();
}

iniciar();
