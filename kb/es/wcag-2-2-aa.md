---
id: wcag-2-2-aa
title: WCAG 2.2 AA — Criterios de Conformidad de Alto Valor
sourceTitle: W3C — Cómo Cumplir con WCAG (Referencia Rápida)
sourceUrl: https://www.w3.org/WAI/WCAG22/quickref/
sourceTier: primary
signoffRequired: false
topics: [wcag, contrast, keyboard, focus, forms]
summary: Los criterios de conformidad que más importan para una aplicación web con asistente de voz.
order: 6
---

# Alternativas de texto

El Criterio de Conformidad 1.1.1 (Contenido no textual) requiere alternativas de texto para el contenido que no sea texto. Los iconos como el micrófono, enviar, cerrar o el indicador de estado necesitan un nombre accesible equivalente.

# Color y contraste

El texto y las imágenes de texto deben tener una relación de contraste de al menos 4.5 a 1 (SC 1.4.3). Los componentes de la interfaz de usuario y los objetos gráficos, incluidos los indicadores de foco, deben tener una relación de contraste de al menos 3 a 1 (SC 1.4.11). El color no debe ser la única forma de transmitir información (SC 1.4.1).

# Operabilidad por teclado

Toda la funcionalidad debe ser operable a través del teclado (SC 2.1.1) y el foco del teclado nunca debe quedar atrapado (SC 2.1.2). Cada control, incluido el interruptor del micrófono, debe funcionar sin ratón.

# Visibilidad y orden del foco

El orden del foco debe conservar el significado (SC 2.4.3) y el indicador de foco del teclado debe ser visible (SC 2.4.7). Según las WCAG 2.2, el control enfocado no debe quedar completamente oculto por otro contenido, como un encabezado fijo o un panel flotante (SC 2.4.11, Foco No Obscurecido).

# Etiquetas, errores y mensajes de estado

Se deben proporcionar etiquetas e instrucciones para las entradas (SC 3.3.2), los errores de entrada deben identificarse en texto (SC 3.3.1) y los mensajes de estado deben anunciarse mediante programación sin mover el foco (SC 4.1.3). El nombre accesible de un control debe incluir el texto de su etiqueta visible (SC 2.5.3, Etiqueta en el Nombre).

# Redistribución de contenido y zoom

El contenido debe redistribuirse sin pérdida de función y seguir siendo utilizable cuando se amplía al 200% (SC 1.4.4) y en anchos de pantalla estrechos (SC 1.4.10).

# Nombre, rol, valor

Para todos los componentes de la interfaz de usuario, el nombre, el rol, el estado y el valor deben poder determinarse mediante programación (SC 4.1.2) para que las tecnologías asistivas puedan presentarlos y operarlos.
