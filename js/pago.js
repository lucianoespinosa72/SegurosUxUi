// Pago simulado: 4000 0000 0000 0002 se rechaza, cualquier otra tarjeta válida se aprueba.
export function simularPago(numero) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const limpio = numero.replace(/\s/g, '');
      resolve(limpio === '4000000000000002'
        ? { ok: false, motivo: 'Tarjeta rechazada' }
        : { ok: true });
    }, 1500);
  });
}

const CLAVE_CONTADOR = 'cubri-contador-poliza';

function siguienteContador() {
  let contador = 0;
  try {
    contador = Number(localStorage.getItem(CLAVE_CONTADOR)) || 0;
  } catch { /* sin localStorage: arrancamos de 0 */ }
  contador += 1;
  try {
    localStorage.setItem(CLAVE_CONTADOR, String(contador));
  } catch { /* no se pudo guardar: no es crítico */ }
  return contador;
}

// Número de póliza: POL-AAAA-NNNNNN
export function generarPoliza(contador = siguienteContador()) {
  return `POL-${new Date().getFullYear()}-${String(contador).padStart(6, '0')}`;
}
