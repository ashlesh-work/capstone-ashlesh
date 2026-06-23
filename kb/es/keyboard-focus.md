---
id: keyboard-focus
title: Gestión de Teclado y Foco
sourceTitle: W3C WAI-ARIA Prácticas de Autoría + WCAG 2.2
sourceUrl: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
sourceTier: primary
signoffRequired: false
topics: [keyboard, focus, aria, dialog]
summary: Operabilidad del teclado, orden de foco y el contrato del diálogo modal.
order: 8
---

# Todo funciona desde el teclado

Un usuario que solo utiliza el teclado debe poder alcanzar y operar cada elemento interactivo mediante Tabulador y Shift+Tabulador, activarlo con Enter o Espacio, y nunca quedar atrapado. Esto corresponde a los Criterios de Conformidad de las WCAG 2.1.1 (Teclado) y 2.1.2 (Sin trampa para el teclado).

# HTML nativo primero

Utilice botones, enlaces, entradas y áreas de texto reales antes de recurrir a ARIA. Las prácticas de autoría del W3C advierten que "Ninguna ARIA es mejor que una mala ARIA", porque los roles y estados incorrectos pueden hacer que la experiencia sea activamente engañosa para los usuarios de tecnologías asistivas.

# El contrato del diálogo modal

Cuando se abre un diálogo, mueva el foco al diálogo (su encabezado o primer control), mantenga el foco atrapado dentro mientras esté abierto, ciérrelo con la tecla Escape y devuelva el foco al elemento que lo abrió. El diálogo debe exponer `role="dialog"` y `aria-modal="true"` con un nombre accesible.

# Foco visible, nunca oculto

El indicador de foco debe ser claramente visible (SC 2.4.7) y no debe quedar completamente oculto detrás de encabezados fijos o elementos flotantes (SC 2.4.11). No elimine los contornos de foco sin proporcionar un reemplazo igualmente visible.

# Un recorrido solo con el teclado

Un flujo completo de teclado se ve así: presione Tabulador hasta el iniciador del asistente, presione Enter para abrirlo, llegue al encabezado o primer control, presione Tabulador a través del historial de chat, la caja de texto, el botón de micrófono, el de enviar y el de cerrar, active con Enter, presione Escape para cerrar y regrese al botón iniciador.
