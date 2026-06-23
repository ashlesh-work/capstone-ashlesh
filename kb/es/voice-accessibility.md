---
id: voice-accessibility
title: Interfaces de Voz Accesibles
sourceTitle: Directrices web de ADA.gov + W3C WCAG 2.2 (sintetizado)
sourceUrl: https://www.ada.gov/resources/web-guidance/
sourceTier: primary
signoffRequired: false
topics: [voice, transcript, aria, multimodal]
summary: Cómo hacer accesible un bot de voz integrado — la voz como complemento, nunca como la única ruta.
order: 7
---

# El principio fundamental

Una interfaz de voz nunca debe ser la única forma de completar una tarea. Cada acción clave —iniciar una conversación, hacer una pregunta, revisar mensajes anteriores, corregir un error de reconocimiento o contactar a un humano— también debe ser posible con un teclado, un lector de pantalla y texto simple.

# Diseño centrado en la transcripción

Cada instrucción hablada por el asistente también debe aparecer como texto visible, y cada intervención reconocida del usuario debe mostrarse como texto antes de cualquier acción irreversible. Una transcripción persistente y en tiempo real es el equivalente de accesibilidad más confiable para el audio conversacional y sirve a usuarios sordos o con dificultades auditivas, que se encuentran en entornos ruidosos o que simplemente prefieren leer.

# El control del micrófono

El botón del micrófono debe tener un nombre accesible y un estado estables, como "Iniciar entrada de voz" y "Detener entrada de voz". Su etiqueta visible debe coincidir con su nombre accesible. No dependa únicamente de un gesto de presionar y mantener; proporcione un interruptor operable por teclado o una interacción de hacer clic para iniciar / hacer clic para detener.

# Anuncio de estados sin robar el foco

Utilice una región activa educada (`role="status"`) para anunciar los estados de conexión, escucha y finalización, y reserve las alertas asertivas (`role="alert"`) para fallos urgentes, de modo que el lector de pantalla no se vea abrumado por cada fragmento de texto transmitido.

# El patrón de diálogo

Si el asistente se abre en un diálogo, utilice el patrón de diálogo modal: mueva el foco al diálogo al abrirlo, mantenga el foco atrapado dentro, ciérrelo con Escape y devuelva el foco al control que lo inició.

# Recuperación de errores

Cuando falle el reconocimiento, muestre y diga lo que sucedió, conserve el texto anterior del usuario siempre que sea posible y ofrezca una recuperación inmediata: vuelva a intentar usar el micrófono, cambie a escribir o contacte al soporte técnico.
