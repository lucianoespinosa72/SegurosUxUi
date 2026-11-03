// Funciones puras: reciben un valor y devuelven un mensaje de error o null.

const soloDigitos = (texto) => String(texto).replace(/\D/g, '');
const contarLetras = (texto) => (String(texto).match(/\p{L}/gu) || []).length;

export function validarMarca(valor) {
  return valor ? null : 'Elegí una marca';
}

export function validarModelo(valor) {
  const largo = valor.trim().length;
  return largo >= 2 && largo <= 40 ? null : 'Ingresá el modelo del equipo';
}

export function validarValor(valor) {
  return valor >= 100000 && valor <= 2500000
    ? null
    : 'El valor debe estar entre $100.000 y $2.500.000';
}

export function validarAntiguedad(valor) {
  return valor ? null : 'Indicá la antigüedad';
}

export function validarNombre(valor) {
  return contarLetras(valor) >= 2 && /^[\p{L}' -]+$/u.test(valor.trim())
    ? null
    : 'Ingresá tu nombre';
}

export function validarApellido(valor) {
  return contarLetras(valor) >= 2 && /^[\p{L}' -]+$/u.test(valor.trim())
    ? null
    : 'Ingresá tu apellido';
}

export function validarDni(valor) {
  return /^\d{7,8}$/.test(valor) ? null : 'El DNI debe tener 7 u 8 números';
}

export function validarNacimiento(valor, hoy = new Date()) {
  if (!valor) return 'Ingresá tu fecha de nacimiento';
  const [anio, mes, dia] = valor.split('-').map(Number);
  if (!anio || !mes || !dia) return 'Ingresá tu fecha de nacimiento';
  let edad = hoy.getFullYear() - anio;
  const yaCumplio = hoy.getMonth() + 1 > mes
    || (hoy.getMonth() + 1 === mes && hoy.getDate() >= dia);
  if (!yaCumplio) edad -= 1;
  return edad >= 18 && edad < 120 ? null : 'Tenés que ser mayor de edad';
}

export function validarEmail(valor) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim()) ? null : 'Ingresá un email válido';
}

// 10 dígitos sin el 0 del área ni el 15 (se ignoran espacios y guiones)
export function validarCelular(valor) {
  const limpio = valor.replace(/[\s-]/g, '');
  const ok = /^\d{10}$/.test(limpio) && !limpio.startsWith('0') && !limpio.startsWith('15');
  return ok ? null : 'Ingresá 10 dígitos, sin 0 ni 15. Ej.: 11 5555-1234';
}

export function validarTerminos(valor) {
  return valor === true ? null : 'Tenés que aceptar los términos';
}

export function validarTarjeta(valor) {
  return /^\d{16}$/.test(valor.replace(/\s/g, '')) ? null : 'Número de tarjeta inválido';
}

export function validarVencimiento(valor, hoy = new Date()) {
  const partes = /^(\d{2})\/(\d{2})$/.exec(valor);
  if (!partes) return 'Vencimiento inválido';
  const mes = Number(partes[1]);
  const anio = 2000 + Number(partes[2]);
  if (mes < 1 || mes > 12) return 'Vencimiento inválido';
  // La tarjeta vale hasta el último día del mes de vencimiento
  const mesActual = hoy.getFullYear() * 12 + hoy.getMonth();
  const mesVencimiento = anio * 12 + (mes - 1);
  return mesVencimiento >= mesActual ? null : 'Vencimiento inválido';
}

export function validarCvv(valor) {
  return /^\d{3}$/.test(valor) ? null : 'CVV inválido';
}

export function validarTitularTarjeta(valor) {
  return valor.trim() ? null : 'Ingresá el nombre del titular';
}

// Qué valida cada campo del estado y cómo se llama en los mensajes de "qué falta"
export const CAMPOS = {
  'equipo.marca': { validar: validarMarca, etiqueta: 'marca' },
  'equipo.modelo': { validar: validarModelo, etiqueta: 'modelo' },
  'equipo.valor': { validar: validarValor, etiqueta: 'valor del equipo' },
  'equipo.antiguedad': { validar: validarAntiguedad, etiqueta: 'antigüedad' },
  'titular.nombre': { validar: validarNombre, etiqueta: 'nombre' },
  'titular.apellido': { validar: validarApellido, etiqueta: 'apellido' },
  'titular.dni': { validar: validarDni, etiqueta: 'DNI' },
  'titular.nacimiento': { validar: validarNacimiento, etiqueta: 'fecha de nacimiento' },
  'titular.email': { validar: validarEmail, etiqueta: 'email' },
  'titular.celular': { validar: validarCelular, etiqueta: 'celular' },
  'titular.terminos': { validar: validarTerminos, etiqueta: 'aceptar los términos' },
  'pago.tarjeta': { validar: validarTarjeta, etiqueta: 'número de tarjeta' },
  'pago.vencimiento': { validar: validarVencimiento, etiqueta: 'vencimiento' },
  'pago.cvv': { validar: validarCvv, etiqueta: 'CVV' },
  'pago.titular': { validar: validarTitularTarjeta, etiqueta: 'titular de la tarjeta' },
};

export const CAMPOS_POR_PASO = {
  1: ['equipo.marca', 'equipo.modelo', 'equipo.valor', 'equipo.antiguedad'],
  3: ['titular.nombre', 'titular.apellido', 'titular.dni', 'titular.nacimiento',
    'titular.email', 'titular.celular', 'titular.terminos'],
  4: ['pago.tarjeta', 'pago.vencimiento', 'pago.cvv', 'pago.titular'],
};

// Devuelve { 'equipo.modelo': 'mensaje', ... } solo con los campos inválidos del paso
export function validarPaso(paso, leerCampo) {
  const errores = {};
  for (const ruta of CAMPOS_POR_PASO[paso] || []) {
    const error = CAMPOS[ruta].validar(leerCampo(ruta));
    if (error) errores[ruta] = error;
  }
  return errores;
}

export { soloDigitos };
