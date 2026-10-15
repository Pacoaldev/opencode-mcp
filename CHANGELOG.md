# Change Log

All notable changes to the "opencode-mcp" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Released]

## [1.0.56] - 2026-10-15

### Publicación y paquete
- **CHANGELOG.md**: incorporados los cambios del release 1.0.55 que se publicaban en el VSIX pero no estaban documentados (ver sub-secciones a continuación).
- Versión sincronizada en `package.json` y `package-lock.json` para corregir el desfase del badge de Open VSX frente a la versión realmente publicada (1.0.55).

### Logo del Marketplace — peso reducido
- **resources/logo.png**: reducido de **1079 KB a 102 KB** (re-encoded a 256x256). El Marketplace rechaza paquetes con logos que superen 1 MB o que no cumplan las dimensiones/peso recomendados; con esto se supera el límite y el icono se publica correctamente en VS Code Marketplace y Open VSX.

### `.vscodeignore` — blindado
- Excluidos del VSIX los artefactos y notas privadas que aún podían colarse en el paquete publicado tras el cierre de 1.0.54:
  - `Proveedores.md`, `plan_ruta_api_balancer.md` (notas privadas del mantenedor).
  - Patrón `.bypasser*` (logs y estado de la herramienta de bypass local).
  - `*.tmp`, `.tmp-*`, `*.log` y `*.vsix` (artefactos temporales que ya estaban listados informalmente; ahora Blindados explícitamente).
- Verificado que el `.vsix` resultante sigue sin contener `docs/`, `test/`, `.engram/`, `.env*`, ni rutas personales.

## [1.0.55] - 2026-10-13

### Costes reales de AI y conversión a EUR
- **Coste real de OpenCode**: el panel de *Costos Acumulativos* usa ahora el coste **real** en USD reportado por OpenCode (`assistant.info.cost`), calculado por el servidor con los precios, cache y descuentos del proveedor. Antes se descartaba y se sustituía por una tabla de precios hardcodeada (un único modelo real; el resto caía a un valor por defecto ficticio).
- **`src/pricing.ts`** (nuevo módulo): centraliza la resolución de coste final y la conversión de divisa.
  - `resolveCost()` prioriza el coste real; solo estima con la tabla de respaldo cuando el proveedor no lo reporta (p. ej. LM Studio local, cuyo coste de API es 0).
  - Tipo de cambio **USD→EUR en vivo** (BCE vía `frankfurter.app`, sin API key), con caché de 24 h, persistido en `globalState` y **fallback fijo** si no hay red. El panel muestra el tipo vigente y su origen (*tipo en vivo* / *tipo fijo*).
- **`src/opencodeService.ts`**: se propaga `assistant.info.cost` a través de `StreamUpdate.costUsd` hasta el webview.
- **`src/chatViewProvider.ts`**: eliminado el cálculo duplicado `calculateCost()`; nuevo `recordCost()` que acumula en `globalState` y reenvía el estado al webview (`costDataUpdate`).
- **`resources/webview/main.js`**: el webview ya **no recalcula ni acumula** coste; solo pinta el estado canónico del host. Eliminada la segunda copia de `calculateCost()`. Esto corrige una doble acumulación que desincronizaba los totales.
- **`resources/webview/index.html`**: nuevo indicador `#costRateBadge` con el tipo de cambio activo.
- **Tests**: añadido `test/pricing.test.js` (conversión, fallback y prioridad del coste real).

## [1.0.54] - 2026-09-30

### Documentación y empaquetado
- **CHANGELOG.md**: reconstruido el historial completo (46 versiones, de 1.0.53 a 1.0.0). Se restauraron las entradas perdidas **1.0.34, 1.0.33, 1.0.32 y 1.0.31**, eliminadas accidentalmente en el commit `4de5fe3`, y se reparó la entrada **1.0.20** que había quedado truncada a mitad de frase.
- **README.md**: actualizada la sección *Estructura* con los 20 módulos de `src/` (antes solo 10) y la tabla de *Comandos* con los 16 comandos registrados (antes 8). Añadida la entrada de **1.0.47** (conexión Windows `spawn UNKNOWN`) en *Novedades recientes*.
- **README.md**: eliminados los enlaces a `docs/` (documentación privada, no distribuida) y la referencia al comando inexistente *Añadir información de Git al contexto*.
- **package.nls.json / package.nls.es.json**: eliminada la clave muerta `command.addGitContext`, traducida al inglés `config.localModeEnabled.desc` (estaba en español en el fichero EN) y corregido el puerto de ejemplo de LM Studio (`1234` → `5555`).

### Seguridad del paquete
- **.vscodeignore**: excluidos del VSIX `docs/**` (documentación privada de proveedores), `test/**`, `.engram/**` y `.env*`. Hasta 1.0.53 el paquete publicado incluía `docs/` con las guías internas.
- Verificado que el VSIX resultante no contiene claves, rutas personales ni documentación privada.

## [1.0.53] - 2026-08-31

### Publicación
- Sincronización de versión en `package.json`, `package-lock.json` y documentación para publicar en Marketplace / Open VSX.
- Incluye los arreglos de **1.0.52** (watchdog de chat, errores sin Reload Window, blocklist Phi 4 Multimodal).

## [1.0.52] - 2026-08-31

### Chat silencioso — errores sin Reload Window
- **opencodeService.ts**: watchdog que consulta mensajes cada 2s si SSE `session.idle` no llega; `finalizePromptSession` unifica cierre de petición (idle + polling).
- Respuesta vacía del asistente se trata como error visible en el chat.
- Timeout también cancela cuando solo queda `pendingPrompts` (sin burbuja de stream).
- Bloqueo inmediato de modelos EOL conocidos (p. ej. `microsoft/phi-4-multimodal-instruct`) antes de llamar a la API.
- **main.js**: si `assistantDone` llega sin texto, muestra error en lugar de dejar el chat en blanco.
- **chatViewProvider.ts**: agente por defecto con `.trim()` para no perder `@Experto` por cadenas vacías.

## [1.0.51] - 2026-08-31

### Errores en el chat sin recargar
- **opencodeService.ts**: `session.idle` ya no se ignora si el stream se vació pero la petición sigue pendiente; detecta `Gone:` / 410 en el texto del asistente.
- La promesa de envío se registra antes de `prompt_async` (reintentos EOL no dejan el chat colgado).
- **main.js**: al recibir error, elimina la burbuja de streaming vacía y vuelve a estado idle.
- **chatViewProvider.ts**: evita duplicar el mensaje de error cuando ya lo mostró el stream.

### Documentación — catálogo OpenCode y modelos EOL
- **README.md**: nueva sección *Modelos retirados (EOL / 410 Gone)* con modelos a evitar, alternativas por proveedor (según [opencode.ai/docs/providers](https://opencode.ai/docs/providers) y catálogo `GET /provider`), y ejemplos de `blacklist`/`whitelist` para `~/.config/opencode/opencode.json`.
- Aclaración: OpenCode 1.18.25 puede listar modelos ya retirados (p. ej. en **nvidia**); la extensión filtra y aprende EOL, el CLI requiere `blacklist` manual.
- Tabla de solución de problemas ampliada para errores `410 Gone`.

## [1.0.50] - 2026-08-31

### Modelos EOL — caché dinámica y auto-reintento
- **modelPolicy.ts**: blocklist inicial con `nvidia/nemotron-nano-12b-v2-vl`; cualquier 410 aprendido se guarda en `globalState` y se filtra del listado.
- Normaliza IDs (`nvidia::nvidia/foo` ↔ `nvidia/foo`) para detectar EOL aunque el error use otro formato.
- Fallback Nvidia → `nemotron-3-nano-30b-a3b` (u otro Nemotron disponible).
- **opencodeService.ts**: al recibir 410, registra el modelo, cambia selección y **reintenta el mensaje** una vez con modelo válido.
- **chatViewProvider.ts**: actualiza el selector al cambiar modelo; limpia favoritos EOL.

## [1.0.49] - 2026-08-31

### Modelos EOL (410 Gone) — p. ej. `z-ai/glm-5.2`
- **modelPolicy.ts** (nuevo): blocklist de modelos retirados, detección de errores EOL/410, remapeo `z-ai` → `zhipuai`, fallback a `glm-5.3`.
- **httpClient.ts**: filtra modelos EOL conocidos del listado en vivo.
- **opencodeService.ts**: no hace failover ante 410; limpia selección, sugiere reemplazo y mensaje accionable.
- **chatViewProvider.ts**: valida el modelo guardado al iniciar (cloud y local).

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

## [1.0.34] - 2026-07-07

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

## [1.0.33] - 2026-07-02

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

## [1.0.32] - 2026-07-02

### Soporte de Tool Calling para Modo Local
- **opencodeService.ts**: Implementado soporte nativo para *Function Calling* en modo local (LM Studio).
  - La IA ahora tiene autonomía para usar las herramientas `list_directory` y `read_file` y explorar el código fuente directamente.
  - Ejecución de herramientas desde el cliente de VS Code para el modo LM Studio, sin requerir un backend MCP.

### Persistencia de Historial en Modo Local
- **localSessionManager.ts, opencodeService.ts**: Implementada persistencia de sesiones locales para LM Studio.
  - Al usar LM Studio, las conversaciones ahora se guardan localmente utilizando el almacenamiento global seguro de VS Code (`globalStorageUri`).
  - El panel muestra el historial y permite reanudar conversaciones previas en el modo local, recordando todo el contexto entre reinicios del editor o cambios de proyecto.

## [1.0.31] - 2026-07-02

### Soporte de Tool Calling para Modo Local
- **opencodeService.ts**: Implementado soporte nativo para *Function Calling* en modo local (LM Studio).
  - La IA ahora tiene autonomía para usar las herramientas `list_directory` y `read_file` y explorar el código fuente directamente.
  - Ejecución de herramientas desde el cliente de VS Code para el modo LM Studio, sin requerir un backend MCP.

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
