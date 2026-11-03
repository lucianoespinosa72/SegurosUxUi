// Factor según la antigüedad del equipo (sección 5.1)
export const FACTORES_ANTIGUEDAD = {
  'menos-1': 1.0,
  '1-2': 1.1,
  'mas-2': 1.25,
};

export const ETIQUETAS_ANTIGUEDAD = {
  'menos-1': 'Menos de 1 año',
  '1-2': '1 a 2 años',
  'mas-2': 'Más de 2 años',
};

// Única función que calcula la cuota: planes, resumen y pago usan esta.
export function calcularCuota(valor, tasaAnual, antiguedad) {
  const factor = FACTORES_ANTIGUEDAD[antiguedad];
  if (!valor || !tasaAnual || !factor) return null;
  return Math.round(valor * tasaAnual / 12 * factor);
}

const formatoMoneda = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export function formatearMoneda(numero) {
  return formatoMoneda.format(numero);
}
