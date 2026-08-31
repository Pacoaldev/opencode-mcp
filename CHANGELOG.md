# Change Log

All notable changes to the "opencode-mcp" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Released]

## [1.0.48] - 2026-08-31

### Corrección crítica — failover rompía todos los proveedores
- **opencodeService.ts**:
  - El failover solo se activa ante **429 / rate limit** o **errores 5xx** del proveedor (antes se disparaba con cualquier error, incluidos auth/modelo inválido).
  - Deja de sobrescribir `auth.json` con claves de otro proveedor ante fallos que no son de cuota/servidor.
  - `ensureCloudConnection` ya no hace `reconnect()` en cada listado de modelos (evitaba cortar peticiones en curso).
  - No envía `agent: ""` vacío en `prompt_async`.

## [1.0.47] - 2026-08-31

### Conexión Windows — `spawn UNKNOWN` con OpenCode CLI
- **serverProcess.ts**:
  - Detecta `opencode.exe` stub/inválido (< 64 KB, sin cabecera PE) tras postinstall bloqueado por npm.
  - Busca el binario real en paquetes `opencode-windows-*` o usa `npx opencode-ai` como fallback.
  - Mensaje de error con comando de reparación: `npm install -g opencode-ai --allow-scripts=opencode-ai`.

## [1.0.46] - 2026-08-31

### Conexión — reintento de auto-arranque de OpenCode
- **opencodeService.ts**:
  - `ensureCloudConnection()` comprueba salud del servidor antes de listar agentes/modelos.
  - Si el cliente existe pero OpenCode no responde, reconecta y vuelve a lanzar `opencode serve` cuando `autoStartServer` está activo.

## [1.0.45] - 2026-08-31

### Corrección — datos de UI no borrados al fallar OpenCode
- **chatViewProvider.ts**:
  - `refreshState` ya no aborta el `init` si OpenCode no responde (`fetch failed`). Costes, favoritos y proveedores ocultos se cargan siempre desde `globalState`.
  - El agente seleccionado se persiste por workspace (`agent.<workspace>`) y deja de resetearse a `defaultAgent` en cada recarga.
- **main.js**:
  - El panel de costes y favoritos se renderiza aunque la lista de modelos esté vacía (servidor caído).
  - Favoritos guardados visibles aunque el catálogo remoto no cargue.

## [1.0.44] - 2026-08-31

### Proveedores y catálogo de modelos
- **httpClient.ts**:
  - El listado de modelos usa únicamente el catálogo de OpenCode (`GET /provider`) para proveedores conectados o con API key en `auth.json`.
  - Eliminada la inyección de modelos hardcodeados obsoletos (Replicate/Llama 3, Qwen 2.5 fijo, ElevenLabs TTS).
- **main.js**:
  - Heurísticas de visión ampliadas (`claude-4`, `gpt-4.1`, `gpt-5`, `gemini-2.5`, `qwen-vl`, etc.) para el icono de imagen en el selector.

### Failover y documentación
- **config/apis.example.json**:
  - Plantilla alineada con IDs de OpenCode: `google`, `huggingface`, `nvidia`, `meta`, `minimax`, entre otros.
- **docs/providers-de-opencode-lista-completa-revisado.md**:
  - Reescrita como guía práctica (integración con la extensión, IDs, failover, LM Studio).
  - Enlace al catálogo completo en `docs/Proveedores.md`.

## [1.0.43] - 2026-07-30

### Caché de contexto inteligente
- **contextCache.ts, opencodeService.ts**:
  - Implementación de un sistema de caché inteligente (`ContextCache`) para la preparación del contexto, evitando lecturas redundantes de archivos y optimizando el consumo de tokens.
  - Integración del estado de Git y de los archivos abiertos para invalidación automática de la caché.

### Seguridad integrada 
- **securityManager.ts, opencodeService.ts**:
  - Integrada validacion de seguridad en el flujo principal de envio de prompts (deteccion de contenido sensible en texto de prompt/contexto/adjuntos).
  - Añadido control de acceso para lectura de archivos en tool-calling local (`read_file`) con bloqueo por politicas de seguridad.
  - Añadida auditoria de eventos de transmision y llamadas API para trazabilidad de seguridad.
  - Endurecida la implementacion de cifrado para datos sensibles con `aes-256-gcm` y persistencia segura de clave/eventos en `globalState`.

### Manejo avanzado de errores 
- **opencodeService.ts**:
  - Diagnostico automatico de errores comunes (red, timeout, auth, rate limit, proveedor) con guias de solucion integradas en el mensaje de error.
  - Recuperacion automatica en errores recuperables durante el envio (`prompt_async`): reconexion silenciosa y reintento automatico.
  - Emision de errores enriquecidos en fallos de SSE y modo LM Studio para mejorar soporte y depuracion.

### Estabilidad TypeScript
- **chatViewProvider.ts, contextCache.ts, metricsCollector.ts, promptManager.ts**:
  - Corregidos errores de tipado y uso de API para recuperar compilacion limpia.
  - Ajustado almacenamiento persistente para historial/metricas usando `ExtensionContext.globalState`.
  - Validacion: `npm run compile` y `npm test` exitosos.

## [1.0.42] - 2026-07-21

- **Mantenimiento**: Actualización de versión interna del proyecto.

## [1.0.41] - 2026-07-11

### Interfaz — Modalidades de Modelos
- **index.html, main.js, httpClient.ts, opencodeService.ts**:
  - Añadido soporte para visualizar las modalidades soportadas por cada modelo en el menú desplegable mediante pequeños iconos compactos.
  - Se visualiza si el modelo admite entrada de imágenes (icono verde de imagen) junto al soporte de texto.
  - Implementada una heurística para detectar automáticamente soporte de visión basado en palabras clave (`vision`, `vl`, `gpt-4o`, `claude-3`, `gemini`, etc.) para suplir modelos en los que la API no informa de forma explícita de sus capacidades.

## [1.0.40] - 2026-07-11

### Corrección de Bugs — Modelo y Respuestas
- **chatViewProvider.ts, opencodeService.ts**:
  - Corregido un bug donde el modelo seleccionado en la interfaz no se utilizaba en la petición a la API, provocando que se usara siempre el modelo por defecto. Ahora se lee correctamente el valor enviado desde el webview.
  - Solucionado el problema al analizar identificadores de modelo que contenían múltiples separadores (`::`).
- **parts.ts, opencodeService.ts**:
  - Ocultado el bloque de razonamiento (pensamiento interno de la IA) tanto en el streaming en vivo como en el historial del chat, mostrando únicamente la respuesta final al usuario.

## [1.0.39] - 2026-07-11

### Interfaz — Selector de modelos y proveedores
- **index.html, main.js, chatViewProvider.ts**:
  - Rediseñado el panel de "Configurar Proveedores", cambiando a una distribución horizontal fluida en lugar de vertical.
  - Al abrir el desplegable de modelos, los proveedores aparecen colapsados por defecto para una navegación más limpia.
  - Arreglado el botón de "Favoritos" (★) para que marque y guarde correctamente los modelos favoritos.
  - Solucionado un problema al desmarcar proveedores en el panel de configuración (ahora se ocultan inmediatamente en la lista principal).
  - Añadido un indicador visual (● verde / ○ gris) junto al nombre de cada proveedor para mostrar si tiene o no una API Key configurada. La extensión lee automáticamente `auth.json` de OpenCode y el almacenamiento local (`opencode.apis`) para detectar la disponibilidad real de la clave.

## [1.0.38] - 2026-07-10

### Interfaz — Contexto de carpetas
- **fileContext.ts, main.js**:
  - Al adjuntar una carpeta, los archivos ahora muestran su ruta relativa dentro de la carpeta en lugar de solo su nombre base.
  - El nombre/ruta de la carpeta se resalta con colores dinámicos en la lista de archivos adjuntos y en las "píldoras" de contexto: color **verde** en modo OpenCode y **naranja** en modo LM Studio.

### Seguridad y Privacidad
- **fileContext.ts, opencodeService.ts**:
  - Se ha dejado de resolver y leer silenciosamente el contenido de rutas `file://` que aparecen embebidas dentro de bloques de texto normales en el prompt. Esto previene fugas accidentales de datos si el usuario pega logs de error con rutas locales.
  - El contenido de archivos locales solo se lee y se envía a la IA cuando la URL `file://` se envía como un adjunto limpio sin texto extra a su alrededor, manteniendo la funcionalidad esperada de adjuntos explícitos.
  - Añadidas pruebas de regresión unitarias en `test/` (Mocha).

## [1.0.37] - 2026-07-07

### Build — Empaquetado VSIX
- **.vscodeignore**: Excluidos del `.vsix` archivos de desarrollo que no deben distribuirse (`.atl/`, `ROADMAP.md`, `REGLAS.md`, `PROVIDERS.md`, `comandos.md`, workspace, tests, capturas del README, `config/`).
- **resources/icon.svg, resources/logo.svg**: Eliminado `<!DOCTYPE>` externo que provocaba falsos errores del validador XML en el IDE.

## [1.0.36] - 2026-07-07

### Interfaz — Barra de contexto
- **index.html, main.js**: Reorganizada la barra de contexto en zona con scroll (tags) y columna fija a la derecha (**Archivos (N)** + badge de tokens), siempre visible aunque haya muchos archivos.

## [1.0.35] - 2026-07-07

### Gestión de contexto en el panel de chat
- **contextAttachments.ts, chatViewProvider.ts, main.js, index.html**:
  - Panel desplegable **Archivos (N)** en la barra de contexto para ver la lista completa de adjuntos antes de enviar.
  - Selección múltiple con checkboxes y acción **Quitar seleccionados** (eliminación por lotes vía `removeContextBatch`).
  - Tamaño estimado por archivo en la lista (`<1 KB`, decimales hasta 99 KB, enteros a partir de 100 KB).
  - Acceso también desde **+ Añadir contexto → Ver archivos en contexto**.
  - Los tags horizontales con **×** individual y las acciones de recorte existentes se mantienen.

### Corrección de Bug — Sesiones y Historial
- **localSessionManager.ts, opencodeService.ts**: Resuelto un problema que hacía que las sesiones locales se perdieran al cerrar el editor o cambiar de proyecto.
- Se añadió persistencia adicional usando la API `globalState` de VS Code para mantener el historial entre reinicios del workspace.
- La UI ahora muestra correctamente el número de mensajes guardados y permite reanudar conversaciones previas sin perder contexto.

### Soporte de Tool Calling para Modo Local
- **opencodeService.ts**: Implementado soporte nativo para *Function Calling* en modo local (LM Studio).
  - La IA ahora tiene autonomía para usar las herramientas `list_directory` y `read_file` y explorar el código fuente directamente.
  - Ejecución de herramientas desde el cliente de VS Code para el modo LM Studio, sin requerir un backend MCP.

### Persistencia de Historial en Modo Local
- **localSessionManager.ts, opencodeService.ts**: Implementada persistencia de sesiones locales para LM Studio.
  - Al usar LM Studio, las conversaciones ahora se guardan localmente utilizando el almacenamiento global seguro de VS Code (`globalStorageUri`).
  - El panel muestra el historial y permite reanudar conversaciones previas en el modo local, recordando todo el contexto entre reinicios del editor o cambios de proyecto.

## [1.0.30] - 2026-06-28

### Sprint 2 — Contexto inteligente lite + sesiones por rama
- **contextBudget.ts, contextAttachments.ts, settings.ts, opencodeService.ts, chatViewProvider.ts, extension.ts, main.js, index.html, package.json**:
  - Contador `~X tokens` en la barra de contexto con umbrales soft/hard configurables (`contextWarnTokens`, `contextHardWarnTokens`).
  - Guard de presupuesto antes de enviar: aviso informativo (soft) o confirmación modal con opción de recortar (hard).
  - Acciones de recorte: quitar todo, quitar archivos grandes (`contextTrimLargeKb`), dejar solo el último adjunto.
  - Sesiones por rama Git (`sessionPerBranch`): clave `workspace::branch`, prompt al cambiar de rama, polling cada 4s.
  - Tags de contexto opcionales `[CRÍTICO]` / `[REF]` (clic derecho en tag); prefijo incluido en el payload enviado al LLM.

## [1.0.29] - 2026-06-28

### Sprint 1 — Visibilidad y depuración
- **logger.ts, opencodeService.ts, httpClient.ts, chatViewProvider.ts, extension.ts, main.js, index.html**:
  - Output Channel **OpenCode Chat**: logs de envío (modo, modelo, agente, parts, ~tokens), errores HTTP, SSE (start/end/abort/reconnect) y failover.
  - Failover visible: mensaje de sistema en chat, toast en el primer failover de la sesión, punto pulsante en la barra del modelo y estado `failover` mientras reintenta.
  - Failover ya no inyecta markdown en la respuesta del asistente; usa mensajes `system` dedicados.

## [1.0.28] - 2026-06-28

### Corrección de Bugs — Adjuntos locales
- **fileContext.ts, chatViewProvider.ts, opencodeService.ts**: archivos y carpetas adjuntos envían contenido inline, no rutas `file://`.

## [1.0.27] - 2026-06-28

### Mejoras de Interfaz — Identidad visual LM Studio
- **index.html, main.js, chatViewProvider.ts, extension.ts**:
  - Con `opencode.localModeEnabled` activo, el chat adopta un **tema naranja** (acento tipo Claude) en lugar del verde de OpenCode.
  - Textos de marca actualizados automáticamente: topbar, pantalla de bienvenida, rol del asistente (`LM Studio` / avatar `LS`) y título del webview.
  - El **logo de la extensión se mantiene igual** en ambos modos; solo cambian colores y textos.
  - Branding aplicado **desde el servidor** al cargar el HTML (sin esperar al mensaje `init` del webview).
  - Recarga del webview al cambiar `opencode.localModeEnabled` o `opencode.localModeUrl` en Settings.
  - Cache-bust de `main.js` por versión de la extensión para evitar JS en caché tras actualizar el VSIX.

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
  - Solucionado problema donde las imágenes adj