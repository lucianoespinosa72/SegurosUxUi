# Cubrí Seguros · Contratación digital de seguro de celular

Trabajo práctico de Diseño UX/UI 2026 (Licenciatura en Sistemas de Información, FCyT).
Front-end de un checkout de contratación: el usuario elige un producto, cotiza, elige un plan, carga sus datos, paga (simulado) y recibe su número de póliza.

**Stack:** HTML5 · Tailwind CSS v4 (CDN) · Basecoat UI 1.1.0 · JavaScript vanilla (módulos ES, sin frameworks).

**Sitio publicado:** _(completar con la URL de GitHub Pages / Netlify)_

## Cómo correrlo

Los planes se cargan con `fetch`, así que hace falta un servidor local (con doble click en `index.html` / `file://` el fetch falla).

```bash
npx serve .
```

o, con Python:

```bash
python -m http.server 5500
```

y abrir `http://localhost:5500`. También funciona con Live Server de VS Code.

## Estructura

```
├── index.html          ← una sola página; cada paso es un <section data-paso>
├── css/tokens.css      ← tokens del Figma (sobrescriben variables de Basecoat) + chips, cards de plan y stepper
├── data/planes.json    ← Básico, Plus y Premium
└── js/
    ├── app.js          ← arranque, eventos (delegados) y navegación
    ├── estado.js       ← objeto `solicitud` + funciones para modificarlo
    ├── render.js       ← pinta cada paso a partir del estado
    ├── validaciones.js ← funciones puras: reciben un valor y devuelven error o null
    ├── cotizador.js    ← calcularCuota() y formato de moneda
    └── pago.js         ← simularPago() y generarPoliza()
```

## Pantallas

| # | Pantalla | Qué hace |
|---|----------|----------|
| 01 | Inicio / Catálogo | 4 productos; solo Celular habilitado, el resto "Próximamente" |
| 02 | Cotizar (Paso 1) | Marca, modelo, valor y antigüedad. "Ver planes" deshabilitado hasta que todo sea válido |
| 03 | Elegir plan (Paso 2) | Cuotas calculadas, Plus preseleccionado con badge "Recomendado" |
| 04 | Datos personales (Paso 3) | Validación en línea + checkbox de términos |
| 05 | Pago (Paso 4) | Resumen final desde el estado, tarjeta, "Procesando…" 1,5 s |
| 06 | Éxito | Titular, email, póliza `POL-AAAA-NNNNNN` y detalle |
| 07 | Error de pago | "Reintentar pago" y "Cambiar medio de pago" vuelven al Paso 4 con todo cargado |

### Tarjetas de prueba

| Número | Resultado |
|--------|-----------|
| 4111 1111 1111 1111 | Aprobado |
| 4000 0000 0000 0002 | Rechazado |
| Cualquier otro número válido | Aprobado |

## Casos de prueba de la cuota (verificados)

`cuota = Math.round(valor × tasaAnual / 12 × factorAntiguedad)`

| Valor | Antigüedad | Básico | Plus | Premium |
|-------|-----------|--------|------|---------|
| $ 600.000 | menos de 1 año | $ 2.000 | $ 3.000 | $ 4.500 |
| $ 600.000 | 1 a 2 años | $ 2.200 | $ 3.300 | $ 4.950 |
| $ 1.200.000 | más de 2 años | $ 5.000 | $ 7.500 | $ 11.250 |

## Decisiones tomadas

- **Un único estado.** Todo vive en `solicitud` (`js/estado.js`). Cada evento modifica el estado y después llama a `render()`; el DOM nunca se lee para calcular nada. Al volver atrás los inputs se rellenan desde el estado, así no se pierden datos.
- **Una sola función de cálculo.** `calcularCuota()` se usa en las cards de plan, en el resumen lateral, en el resumen final y en la pantalla de éxito.
- **Fiel al Figma.** Mobile (390) usa app bar con flecha "atrás" y botón fijo abajo; desktop (1440) usa header con navegación, título + stepper en card y checkout en 2 columnas con resumen de 380 px, como en las páginas "Mobile · 390" y "Desktop · 1440".
- **Un solo resumen.** `renderResumen()` pinta un único `<aside>` y CSS decide cómo se ve: card lateral en desktop; en mobile, línea "Plan · equipo · $/mes" arriba del botón en el Paso 2 y card de resumen arriba del pago en el Paso 4 (seguro, equipo, plan, titular y total).
- **Coberturas excluidas.** `planes.json` agrega `excluidas` a cada plan para mostrar con ✕ lo que el plan no cubre, como en el diseño.
- **Validación en el momento justo.** El error aparece al salir del campo (`blur`) y se corrige en vivo una vez mostrado. Al intentar avanzar se revalida todo y se enfoca el primer campo con error.
- **Botones deshabilitados con explicación.** Junto al botón se lista qué falta completar ("Completá fecha de nacimiento y email para continuar").
- **Descargar póliza.** Genera un `.txt` con los datos de la póliza a partir del estado.
- **Accesibilidad.** Cada input tiene su `<label for>`; los errores usan `aria-invalid`, `aria-describedby` y `role="alert"`; el stepper marca `aria-current="step"` y al cambiar de paso el foco va al título.
- **Sin doble pago.** El botón "Pagar" se deshabilita al hacer click y muestra "Procesando…" hasta que responde `simularPago()`.
- **Basecoat solo CSS.** Botones, inputs (`.field`), cards, badges y alerts son de Basecoat; el stepper, los chips de antigüedad y las cards de plan están hechos con Tailwind + `css/tokens.css`.
- **Eventos delegados.** No hay `onclick` en el HTML: los botones usan `data-accion` y un único listener en `app.js`.

## Bonus implementados

- **Persistencia:** la solicitud se guarda en `localStorage` y sobrevive a un F5; se limpia con "Volver al inicio". Por seguridad, el número de tarjeta y el CVV **no** se guardan nunca.
- **Máscaras de input:** valor del equipo con separador de miles, tarjeta en grupos de 4 y vencimiento con barra automática (`MM/AA`).
- **Contador de pólizas persistente:** el número de póliza sigue la secuencia entre contrataciones.

## Capturas

_(agregar capturas mobile 390 px y desktop 1440 px de las 7 pantallas en `docs/capturas/`)_

## Checklist

- [x] Las 7 pantallas existen en 390 px y 1440 px
- [x] Los 3 casos de prueba dan exactamente el valor esperado
- [x] No se puede avanzar con datos inválidos y cada error tiene su mensaje
- [x] "Volver" conserva los datos en todos los pasos
- [x] 4000 0000 0000 0002 lleva al error y "Reintentar" vuelve al pago con todo cargado
- [x] La póliza tiene formato `POL-AAAA-NNNNNN`
- [x] Sin errores en la consola
- [ ] Sitio publicado y README con capturas y URL
