import { solicitud, ui, leerCampo, planElegido } from './estado.js';
import { CAMPOS, validarPaso } from './validaciones.js';
import { calcularCuota, formatearMoneda } from './cotizador.js';

// Título grande (desktop) y título del app bar (mobile) de cada paso
const TITULOS = {
  1: { pagina: 'Contanos sobre tu celular', appbar: 'Cotizá tu seguro' },
  2: { pagina: 'Elegí tu plan', appbar: 'Elegí tu plan' },
  3: { pagina: 'Tus datos', appbar: 'Tus datos' },
  4: { pagina: 'Pago', appbar: 'Pago' },
};
const formatoNumero = new Intl.NumberFormat('es-AR');
const formatoLista = new Intl.ListFormat('es', { type: 'conjunction' });
const ICONO_SI = '<svg class="size-3.5 shrink-0 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
const ICONO_NO = '<svg class="size-3.5 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

let pasoAnterior = null;

export function render() {
  const { paso } = solicitud;

  document.querySelectorAll('[data-paso]').forEach((s) => {
    s.hidden = Number(s.dataset.paso) !== paso;
  });
  document.querySelector('[data-vista="checkout"]').hidden = paso < 1 || paso > 4;
  // En mobile el header del sitio solo aparece en el inicio (el checkout usa app bar)
  document.querySelector('[data-header-sitio]').classList.toggle('max-lg:hidden', paso !== 0);

  renderTitulos();
  renderStepper();
  sincronizarInputs();
  renderErrores();
  renderBotones();
  renderPlanes();
  renderResumen();
  renderExito();
  renderErrorPago();

  if (paso !== pasoAnterior) {
    if (pasoAnterior !== null) enfocarTitulo();
    pasoAnterior = paso;
  }
}

// ---------- Utilidades ----------

export function cuotaDe(plan) {
  if (!plan) return null;
  return calcularCuota(solicitud.equipo.valor, plan.tasaAnual, solicitud.equipo.antiguedad);
}

export function formatearValorInput(valor) {
  return valor ? `$ ${formatoNumero.format(valor)}` : '';
}

export function formatearFecha(iso) {
  if (!iso) return '';
  const [anio, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${anio}`;
}

function textoEquipo() {
  const { marca, modelo } = solicitud.equipo;
  return [marca, modelo].filter(Boolean).join(' ');
}

function pintarFilas(dl, filas) {
  dl.replaceChildren(...filas.map(([termino, detalle]) => {
    const fila = document.createElement('div');
    fila.className = 'flex items-start justify-between gap-4';
    const dt = document.createElement('dt');
    dt.className = 'text-slate-500';
    dt.textContent = termino;
    const dd = document.createElement('dd');
    dd.className = 'text-right font-semibold text-slate-900';
    dd.textContent = detalle;
    fila.append(dt, dd);
    return fila;
  }));
}

function enfocarTitulo() {
  const titulo = solicitud.paso >= 1 && solicitud.paso <= 4
    ? document.querySelector('[data-titulo-paso]')
    : document.querySelector(`[data-paso="${solicitud.paso}"]`)?.querySelector('h1, h2');
  window.scrollTo({ top: 0 });
  titulo?.focus({ preventScroll: true });
}

// ---------- Títulos y stepper ----------

function renderTitulos() {
  const titulos = TITULOS[solicitud.paso];
  if (!titulos) return;
  document.querySelector('[data-titulo-paso]').textContent = titulos.pagina;
  document.querySelector('[data-appbar-titulo]').textContent = titulos.appbar;
}

function renderStepper() {
  const { paso } = solicitud;
  document.querySelectorAll('[data-step]').forEach((item) => {
    const n = Number(item.dataset.step);
    const estado = n < paso ? 'completo' : n === paso ? 'activo' : 'pendiente';
    item.dataset.estado = estado;
    if (estado === 'activo') item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
  });
  document.querySelectorAll('.step-line').forEach((linea, i) => {
    linea.toggleAttribute('data-completa', i + 1 < paso);
  });
}

// ---------- Formularios ----------

// Rellena los inputs desde el estado: al volver atrás no se pierde nada.
function sincronizarInputs() {
  document.querySelectorAll('[data-campo]').forEach((input) => {
    const valor = leerCampo(input.dataset.campo);
    if (input.type === 'radio') {
      input.checked = input.value === valor;
    } else if (input.type === 'checkbox') {
      input.checked = Boolean(valor);
    } else if (input !== document.activeElement) {
      input.value = input.dataset.campo === 'equipo.valor' ? formatearValorInput(valor) : valor;
    }
  });
}

function renderErrores() {
  for (const [ruta, { validar }] of Object.entries(CAMPOS)) {
    const error = ui.tocados.has(ruta) ? validar(leerCampo(ruta)) : null;
    const campo = document.querySelector(`[data-field="${ruta}"]`);
    const mensaje = campo.querySelector('[role="alert"]')
      || document.querySelector(`[data-error-externo="${ruta}"]`);

    campo.toggleAttribute('data-invalid', Boolean(error));
    campo.querySelectorAll('[data-campo]').forEach((input) => {
      if (error) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    });
    mensaje.textContent = error || '';
    mensaje.hidden = !error;
  }
}

function renderBotones() {
  for (const paso of [1, 3, 4]) {
    const form = document.getElementById(`form-paso-${paso}`);
    const enviar = form.querySelector('[type="submit"]');
    const errores = validarPaso(paso, leerCampo);
    const faltantes = Object.keys(errores).map((ruta) => CAMPOS[ruta].etiqueta);

    enviar.disabled = faltantes.length > 0 || (paso === 4 && ui.procesando);
    form.querySelector(`[data-faltan="${paso}"]`).textContent = faltantes.length
      ? `Completá ${formatoLista.format(faltantes)} para continuar`
      : '';
  }

  const pagar = document.querySelector('[data-boton-pagar]');
  pagar.textContent = ui.procesando ? 'Procesando…' : 'Pagar y contratar';
  pagar.setAttribute('aria-busy', String(ui.procesando));
  document.querySelectorAll('[data-vista="checkout"] [data-accion="volver"]').forEach((boton) => {
    boton.disabled = ui.procesando;
  });
}

// ---------- Paso 2: planes ----------

function itemCobertura(texto, incluida) {
  const li = document.createElement('li');
  li.className = `flex items-center gap-2 ${incluida ? 'text-slate-700' : 'text-slate-400'}`;
  li.innerHTML = incluida ? ICONO_SI : ICONO_NO;
  li.append(texto);
  if (!incluida) li.setAttribute('aria-label', `No incluye: ${texto}`);
  return li;
}

function renderPlanes() {
  const lista = document.querySelector('[data-lista-planes]');
  document.querySelector('[data-planes-error]').hidden = !ui.errorPlanes;

  if (!lista.children.length && ui.planes.length) {
    const plantilla = document.getElementById('tpl-plan');
    ui.planes.forEach((plan) => {
      const card = plantilla.content.firstElementChild.cloneNode(true);
      const radio = card.querySelector('[data-plan]');
      radio.value = plan.id;
      radio.setAttribute('aria-label', `Plan ${plan.nombre}`);
      card.dataset.planId = plan.id;
      card.querySelector('[data-nombre]').textContent = plan.nombre;
      card.querySelector('[data-recomendado]').hidden = !plan.recomendado;
      card.querySelector('[data-coberturas]').replaceChildren(
        ...plan.coberturas.map((texto) => itemCobertura(texto, true)),
        ...(plan.excluidas || []).map((texto) => itemCobertura(texto, false)),
      );
      lista.append(card);
    });
  }

  lista.querySelectorAll('[data-plan-id]').forEach((card) => {
    const plan = ui.planes.find((p) => p.id === card.dataset.planId);
    const cuota = cuotaDe(plan);
    card.querySelector('[data-cuota]').textContent = cuota === null ? '—' : formatearMoneda(cuota);
    card.querySelector('[data-plan]').checked = plan.id === solicitud.plan;
  });
}

// ---------- Resumen: un solo <aside> para mobile y desktop ----------

function renderResumen() {
  const { paso } = solicitud;
  const aside = document.querySelector('[data-resumen]');
  aside.dataset.modo = paso;

  const plan = paso >= 2 ? planElegido() : null;
  const cuota = cuotaDe(plan);
  const { valor } = solicitud.equipo;
  const { nombre, apellido } = solicitud.titular;

  const filas = [
    ['Seguro', 'Celular'],
    ['Equipo', textoEquipo() || '—'],
  ];
  if (paso === 1) filas.push(['Valor', valor ? formatearMoneda(valor) : '—']);
  if (plan) filas.push(['Plan', plan.nombre]);
  if (paso === 4) filas.push(['Titular', `${nombre} ${apellido}`]);
  pintarFilas(aside.querySelector('[data-resumen-detalle]'), filas);

  const hayTotal = cuota !== null;
  aside.querySelector('[data-resumen-total-fila]').hidden = !hayTotal;
  aside.querySelector('[data-resumen-total]').textContent = hayTotal ? formatearMoneda(cuota) : '';
  aside.querySelector('[data-resumen-vacio]').hidden = hayTotal;

  aside.querySelector('[data-resumen-barra-texto]').textContent = plan
    ? `Plan ${plan.nombre} · ${solicitud.equipo.modelo}`
    : '';
  aside.querySelector('[data-resumen-barra-total]').textContent = hayTotal
    ? `${formatearMoneda(cuota)}/mes`
    : '';
}

// ---------- Éxito y error ----------

function renderExito() {
  if (solicitud.paso !== 5) return;
  const { nombre, email } = solicitud.titular;
  const plan = planElegido();
  const cuota = cuotaDe(plan);

  document.querySelector('[data-exito-titulo]').textContent = `¡Listo, ${nombre}! Tu celular ya está protegido`;
  document.querySelector('[data-exito-texto]').textContent = `Te enviamos la póliza a ${email}`;
  document.querySelector('[data-exito-poliza]').textContent = solicitud.poliza;
  pintarFilas(document.querySelector('[data-exito-detalle]'), [
    ['Plan', plan ? plan.nombre : '—'],
    ['Equipo', textoEquipo()],
    ['Vigencia desde', formatearFecha(solicitud.fechaEmision)],
    ['Cuota mensual', cuota === null ? '—' : formatearMoneda(cuota)],
  ]);
}

function renderErrorPago() {
  if (solicitud.paso !== 6) return;
  const motivo = ui.motivoError || 'El pago fue rechazado';
  document.querySelector('[data-error-motivo]').textContent = motivo === 'Tarjeta rechazada'
    ? 'La tarjeta fue rechazada.'
    : `${motivo}.`;
}
