# Change Log

All notable changes to the "opencode-mcp" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Released]

## [1.0.26] - 2026-06-28

### Documentación
- **README.md**: guía ampliada de modo local LM Studio, instalación desde VSIX, imágenes/visión y solución de problemas.
- **CHANGELOG.md**: historial de fixes v1.0.25 documentado.

## [1.0.25] - 2026-06-28

### Corrección de Bugs — Modo local LM Studio
- **opencodeService.ts, chatViewProvider.ts, main.js**:
  - Eliminado el **fallback silencioso a OpenCode** cuando el modo local está activo pero LM Studio no responde; ahora se muestra un error claro en lugar de enviar la petición a la nube.
  - Con `opencode.localModeEnabled` activo, el desplegable de modelos lista los modelos de **LM Studio** (`/v1/models`) en lugar de los proveedores cloud de OpenCode.
  - Indicador visual en la barra superior: **`LM Studio · nombre-del-modelo`** cuando el modo local está conectado.
  - Selección automática del primer modelo de LM Studio si el modelo persistido pertenece a OpenCode (p. ej. `moonshotai/kimi-k2.6`).
  - Solo se envía el parámetro `model` a LM Studio si el ID tiene prefijo `lmstudio::`; en caso contrario se usa el modelo cargado en LM Studio.
  - Detección al abrir el chat: si LM Studio está activo pero el modo local está desactivado, se ofrece activarlo con un clic.

### Corrección de Bugs — Imágenes y visión
- **chatViewProvider.ts, imageHelper.ts, opencodeService.ts, main.js**:
  - Corregido el envío de imágenes pegadas (Ctrl+V) o adjuntadas: ahora se envían como partes `file` con `mime` y `url` correctos, no como texto con rutas `file://file://...`.
  - Normalización de rutas legacy (`file://file://...`) y conversión a **Base64** en el payload multimodal (`image_url`) para LM Studio y OpenCode.
  - Las rutas `file://` ya no se inyectan como texto en el prompt; el modelo recibe los píxeles, no la ruta del disco.
  - Miniatura de previsualización en la barra de adjuntos al pegar imágenes (`previewUrl`).
  - Error explícito si la imagen adjunta no puede leerse desde disco.

### Documentación
- README actualizado con instrucciones de instalación desde VSIX, configuración del modo local en cualquier workspace y requisitos de modelos con visión.

## [1.0.23] - 2026-06-28

### Corrección de Bugs y Mejoras
- **Soporte Multimodal en Modo Local (LM Studio)**:
  - Se ha implementado el soporte completo para enviar contexto visual e imágenes a instancias locales de LM Studio a través del modo local.
  - La extensión ahora formatea correctamente el payload al formato multimodal de OpenAI, codificando las imágenes locales en Base64 cuando se detectan archivos adjuntos, permitiendo a los modelos de visión en LM Studio analizar el contenido visual.

## [1.0.22] - 2026-06-27

### Nuevas Funcionalidades
- **Modo Local con LM Studio**: Nuevo checkbox `opencode.localModeEnabled` permite dirigir todas las peticiones a una instancia local de LM Studio. Se verifica la disponibilidad antes de enviar y, si no está activo, la extensión muestra un aviso y vuelve a OpenCode.
- **Configuración de URL LM Studio**: Nueva opción `opencode.localModeUrl` para definir la URL base de LM Studio.
- **Validación en tiempo de ejecución**: La extensión comprueba la accesibilidad de LM Studio y notifica al usuario en caso de error.
- **Actualizaciones de documentación**: README y configuración actualizadas con los nuevos ajustes.

## [1.0.20] - 2026-06-22

### Corrección de Bugs en Manejo de Imágenes
- **chatViewProvider.ts, imageHelper.ts, main.js, extension.ts**:
  - Solucionado problema donde las imágenes adjuntadas (tanto desde portapapeles como desde el explorador de archivos) no podían ser leídas por la IA
  - Las imágenes ahora se guardan temporalmente como archivos locales y se envían como rutas `file://` en lugar de data URIs (`data:image/png;base64,...`)
  - El servidor OpenCode ahora puede acceder correctamente a las imágenes ya que tanto la extensión como el servidor corren en la misma máquina
  - Implementado limpieza automática de imágenes temporales antigüas (más de 24 horas) para evitar acumulación de archivos
  - Se mantiene compatibilidad con archivos no-imágenes que continúan usando rutas `file://` directas
  - Se añadió manejo robusto de errores al procesar imágenes para mostrar mensajes claros al usuario en caso de fallo

### Corrección de Bugs en Adjuntar Archivo
- **main.js, chatViewProvider.ts**:
  - Corregido el botón de adjuntar archivo que no funcionaba en la webview. El mensaje `attachFile` caía en el `default` del `switch` y nunca llegaba a llamar `handleAttachFileMessage()`.
  - Añadida la entrada `case 'attachFile':` en el `switch` del listener de mensajes de la webview, conectando correctamente el botón con el handler existente.
  - El botón de adjuntar carpeta (`attachFolder`) sí funcionaba; ahora el de archivo también.

## [1.0.17] - 2026-06-15

### Nuevas Funcionalidades
- **Plantillas de prompts inteligentes**: 
  - Añadido comando `opencode.addTemplate` para guardar prompts frecuentes como plantillas con nombre y contenido.
  - Añadido comando `opencode.selectTemplate` para insertar una plantilla guardada mediante selector rápido o mediante escribir `/` en el área de entrada y elegir de un dropdown.
  - Las plantillas se persisten en el workspace y se sincronizan con la webview.
- **Estimación de tokens y costo antes de enviar**:
  - Mientras el usuario escribe en el área de chat, se muestra en tiempo real la estimación aproximada de tokens de entrada y el costo asociado basado en el modelo seleccionado.
  - Utiliza la misma lógica de cálculo de costos que el seguimiento posterior para coherencia.

## [1.0.16] - 2026-06-14

### Corrección de Bugs y Estabilidad
- **chatViewProvider.ts**:
  - Corregido error de variable indefinida (`undefined`) en el cálculo de costos (`calculateCost`).
  - Añadido límite de profundidad (10 niveles) y detección de referencias circulares a `getFileCount` y `calculateFolderSize` para evitar desbordamiento de pila.
  - Mejorada la gestión de errores en `execFile` de `git diff` para mostrar errores reales al usuario.
  - Asegurada la exportación del chat capturando errores específicos de escritura en disco.
  - Clarificado el mensaje de confirmación al limpiar el chat indicando que crea una nueva sesión.
- **opencodeService.ts**:
  - Evitada la inconsistencia en el estado eliminando el `sessionId` del mapa `activeStream` en el bloque `catch` de `sendPrompt`.
  - Corregido el failover para que se ejecute de forma asíncrona y cree el archivo `auth.json` si no existe.
  - Evitado el reinicio erróneo de timeouts debido a eventos SSE recibidos de sesiones distintas a la activa.
- **main.js**:
  - Añadida robustez en el evento de pegado de imágenes validando `clipboardData`.
  - Solucionada vulnerabilidad XSS en `renderBody` escapando el texto de manera uniforme al inicio.
  - Ajustado el fallback de i18n para aplicar traducciones en inglés para todos los idiomas no soportados (distintos a español).
- **serverProcess.ts**:
  - Añadida llamada a `SIGKILL` en `stopProcess` tras un timeout de 5 segundos si el proceso hijo no responde a `SIGTERM`.

## [1.0.13] - 2026-06-10

### Nuevas Funcionalidades
- **Gestión de Costos**: Implementado seguimiento de costos de uso y reporte por modelo en el panel de chat de forma nativa (`ChatViewProvider`).
- **Contexto**: Añadida la opción de adjuntar carpetas completas y archivos múltiples directamente desde la interfaz del chat.
- **Integración LLM**: Mejorada la integración en `OpenCodeService` para procesar el streaming de respuestas de herramientas y texto de forma separada.

## [1.0.12] - 2026-06-10

### Documentación
- **README**: Corregida la alineación visual de las capturas de pantalla para el Marketplace usando tablas Markdown.
- **Marketplace**: Actualizadas las instrucciones de instalación añadiendo los enlaces directos a la tienda.

## [1.0.11] - 2026-06-10

### Nuevas Funcionalidades y Refactorización
- **OpenCodeService**: Nuevo servicio para gestionar conexiones del servidor, sesiones y el ciclo de vida del streaming.
- **Webview Controller**: Implementada lógica del controlador para la UI del chat, estado del streaming y seguimiento de costos.
- **Webview UI**: Añadida implementación de la interfaz de chat y seguimiento de ejecución de herramientas.
- **Branding**: Actualizada metadata de la extensión, branding y URLs de las imágenes del README.

## [1.0.8] - 2026-06-07

### Seguridad y Optimización
- **Protección de API Keys**: Se migró el almacenamiento de llaves maestras de failover de `apis.json` al almacenamiento seguro del sistema (SecretStorage). Se añadieron los comandos `opencode.setApiKeys` y `opencode.clearApiKeys`.
- **Límite de memoria**: Los archivos adjuntos al contexto se limitan a 1MB para prevenir cuelgues o problemas de tokens.
- **Soporte Multi-idioma (i18n)**: La interfaz y los comandos ahora se adaptan automáticamente al español o al inglés según la configuración de VS Code.

## [1.0.7] - 2026-06-07

### Integración con Git
- **Contexto de Git**: Nuevo botón en la barra de herramientas para añadir información completa del repositorio al contexto.
- **Detalles incluidos**: Branch actual, estado del repositorio (archivos modificados/staged), y los últimos 5 commits.
- **Nuevo comando**: `opencode.addGitContext` disponible para añadir información de Git rápidamente.
- **Sincronización en tiempo real**: Actualización automática de la información de Git en la interfaz mediante eventos `gitInfoUpdate`.

## [1.0.6] - 2026-06-07

### Mejoras en UI
- **Separación de controles**: Extraídos los selectores de "Agente" y "Modo" a sus propios botones desplegables independientes en la barra superior.
- **Acceso directo a opciones**: El botón de "Configuración" ahora filtra y abre directamente los ajustes específicos de la extensión (`@ext:local.opencode-mcp-vscode`).
- **Filtrado de agentes internos**: Se ocultan los agentes del sistema (`plan`, `compaction`, `summary`, `title`) del menú para evitar errores conversacionales.
- **Panel de costos**: Añadido un botón de cerrar explícito en la cabecera del panel de costos.

## [1.0.5] - 2026-06-07
### Mejoras en UI
- **Selección de botones**: Reemplazados selectores frágiles por IDs específicos en el frontend.
- **Feedback visual**: Implementada respuesta visual en botones de herramientas al hacer clic.
- **Menú de contexto**: Opciones expandidas con botones dedicados (archivo actual, selección, archivos abiertos).
- **Eventos seguros**: Validación de existencia de elementos al registrar eventos para evitar errores de inicialización.

## [1.0.4] - 2026-06-06

### Corrección de Bugs
- **Race condition en `activeStream`**: Asegurado que `handleTimeout` verifique existencia y borre antes de emitir, eliminando la doble emisión `done:true`.
- **Doble `done:true` en timeout**: Separada la lectura/borrado de `activeStream` de la llamada a `abortSession(true)`.
- **Múltiples `session.idle` ignorados**: Agregado guard `activeStream.has(sessionId)` para evitar procesar idles duplicados.
- **`sendPrompt` ahora espera la respuesta**: Implementado `pendingPrompts` Map que resuelve la promesa al recibir `done:true`, previniendo que el frontend quede colgado si la conexión SSE se cae.
- **`lastPromptInfo.model` ya no se muta en failover**: Creada variable local `failoverModel` en lugar de sobrescribir `this.lastPromptInfo.model`.
- **`partsToDisplayText` con placeholder incorrecto**: Agregada verificación `parts.length > 0` para no mostrar "(sin contenido de texto)" cuando hay partes de herramientas.
- **SSE parsing con saltos de línea mixtos CRLF/LF**: Cambiado `split('\n')` por `split(/\r?\n/)` y `split('\n\n')` por `split(/\r?\n\r?\n/)`; agregado `.trim()` al extraer JSON de `data:`.
- **Ruta relativa en `failoverAgent.js`**: Reemplazado `'config/apis.json'` por `path.resolve(__dirname, '..', '..', 'config', 'apis.json')`.
- **`addOpenFiles` con manejo de errores**: Envuelto `openTextDocument` en try/catch para ignorar tabs que no se pueden abrir como texto.
- **SSE caída permanente**: Emitido `done:true` con mensaje de error cuando la reconexión agota los intentos.

## [1.0.3] - 2026-06-06

### Mejoras y Limpieza
- Documentada la configuración `opencode.quickActions` en `README.md`.
- Eliminado archivo de prueba manual redundante `src/testFailover.js` para mantener el repositorio limpio.

## [1.0.2] - 2026-06-06

### Seguridad
- Reforzada CSP del webview: restringido `img-src` a solo `data: {{cspSource}}` (eliminados `https:` y `vscode-resource:`).
- Sanitizada la función `renderBody()` en el frontend para escapar HTML inline code y prevenir XSS.
- Reemplazado `child_process.exec` por `execFile` en el comando `git diff` para eliminar la dependencia en shell.
- Ruta de `auth.json` ahora configurable vía variable de entorno `OPENCODE_AUTH_PATH`.
- Eliminado `taskkill /F /IM node.exe` en el failover agent para evitar matar procesos Node.js no relacionados.

## [1.0.1] - 2026-06-05

- Refactor de `opencode-adapter.mjs` para usar HTTP API nativa.
- Creado subagente `@opencode-local` para integración con Antigravity.
- Añadida sección de Solución de problemas en `README.md`.

## [1.0.0] - 2026-06-04

- Panel lateral de chat conectado a OpenCode local (HTTP API)
- Auto-arranque de `opencode serve`, selector de agents, streaming SSE
- Contexto: archivo actual, selección, archivos abiertos
- Configuración de URL, auth, agente por defecto y permisos