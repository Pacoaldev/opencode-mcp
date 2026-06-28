<div align="center">
  <img src="https://raw.githubusercontent.com/Pacoaldev/opencode-mcp/main/resources/logo.png" alt="OpenCode Panel Logo" width="300" />
</div>

# OpenCode Panel (VS Code / Antigravity)

Esta extensión para VS Code / Antigravity es un **panel lateral de chat** conectado directamente a tu instancia local de **OpenCode**. Permite interactuar con tus **agents**, **skills**, **MCP** y **providers** configurados en `~/.config/opencode/opencode.jsonc` e incorpora características avanzadas como **historial de chat persistente**, **gestión de errores**, **adaptador MCP**, **agente de failover** y **panel de costos acumulativos** en tiempo real.


| Interfaz principal | Panel de costos | Ajustes y modelos |
| :---: | :---: | :---: |
| [<img src="https://raw.githubusercontent.com/Pacoaldev/opencode-mcp/main/resources/1.png" alt="Interfaz principal" width="100%" />](https://raw.githubusercontent.com/Pacoaldev/opencode-mcp/main/resources/1.png) | [<img src="https://raw.githubusercontent.com/Pacoaldev/opencode-mcp/main/resources/2.png" alt="Panel de costos" width="100%" />](https://raw.githubusercontent.com/Pacoaldev/opencode-mcp/main/resources/2.png) | [<img src="https://raw.githubusercontent.com/Pacoaldev/opencode-mcp/main/resources/3.png" alt="Ajustes y modelos" width="100%" />](https://raw.githubusercontent.com/Pacoaldev/opencode-mcp/main/resources/3.png) |


## Características

- **Conexión directa** con tu servidor local de OpenCode.
- **Interfaz de chat** integrada en el panel lateral de VS Code.
- **Gestión de contexto**: añade archivos, selecciones o todos los archivos abiertos al contexto de la conversación.
- **Autenticación básica** para servidores protegidos.
- **Auto-inicio del servidor** si no está en ejecución.
- **Soporte para múltiples sesiones** de chat.
- **Historial persistente**: las sesiones se guardan y asocian automáticamente al workspace (proyecto) actual, manteniéndose entre reinicios.
- **Gestión de errores detallada**: los mensajes de error de los proveedores (ej. cuota excedida, saldo insuficiente) se parsean y muestran nativamente en el chat.
- **Adaptador MCP** (`opencode-adapter.mjs`) para acceder a OpenCode desde otros clientes MCP mediante la herramienta `ask_opencode`.
- **Agente de Failover y Balanceo API** (`FailoverAgent`) para rotar llaves de API automáticamente al detectar fallos o límites de cuota (429), con persistencia del modelo de respaldo sin mutar la selección original del usuario.
- **Panel de costos acumulativos**: seguimiento en tiempo real del costo por sesión agrupado por fecha y modelo, con soporte multi‑moneda (USD/EUR) y persistencia en el almacenamiento global de VS Code.
- **Seguridad reforzada**: CSP restrictiva en el webview, sanitización de salida HTML, comandos sin shell (`execFile`), y rutas de auth configurables vía `OPENCODE_AUTH_PATH`.
- **Robustez y estabilidad**: Timeout de 3 minutos con cancelación automática, reconexión automática (hasta 3 intentos con backoff exponencial), failover de API keys con rotación entre proveedores, parsing SSE tolerante a CRLF/LF, y detección de caídas de conexión SSE para no dejar el chat colgado.
- **Mejoras de Interfaz**: Botones de contexto dedicados, dropdowns independientes para Modelo, Agente y Modo (filtrando agentes internos), selecciones robustas por ID, panel de costos con cierre explícito, acceso directo a configuración de la extensión y feedback visual inmediato.
- **Plantillas de prompts inteligentes**: guarda e inserta prompts frecuentes como plantillas con nombre y contenido, accesibles mediante comando o escribir `/` en el chat.
- **Estimación de tokens y costo antes de enviar**: mientras el usuario escribe, se muestra en tiempo real la aproximación de tokens de entrada y costo basado en el modelo seleccionado.
- **Modo local con LM Studio**: con `opencode.localModeEnabled` activo, todas las peticiones van directo a LM Studio (sin pasar por OpenCode). La interfaz cambia a **identidad visual LM Studio**: acentos **naranjas** (estilo Claude), textos `LM Studio` en topbar, bienvenida y mensajes del asistente; el logo de la extensión no cambia. La barra del chat muestra **`LM Studio · modelo`** con indicador naranja cuando está conectado. El desplegable lista los modelos cargados en LM Studio. Si LM Studio no responde, la extensión **bloquea el envío** con un error claro (sin fallback silencioso a la nube). Al detectar LM Studio con el modo local desactivado, ofrece activarlo automáticamente.
- **Imágenes en el chat (Ctrl+V y adjuntos)**: las capturas pegadas o adjuntadas se codifican en Base64 y se envían en formato multimodal OpenAI (`image_url`) a LM Studio u OpenCode. Requiere un **modelo con visión** cargado en LM Studio (p. ej. LLaVA, Qwen2-VL); modelos solo texto como Gemma no analizan imágenes.
- **Corrección de cálculo de costos y prevención de desbordamiento de pila**: límites de profundidad y detección de referencias circulares en cálculos de tamaño de carpeta y conteo de archivos.
- **Mejores gestiones de errores en comandos git y failover**: muestra errores reales al usuario y maneja de forma asíncrona el failover, creando archivos de auth si faltan.
- **Seguridad XSS mejorada y validación de pegado de imágenes**: escapado uniforme de texto y validación de datos del portapapeles al pegar imágenes.
- **Uso de SIGKILL para terminar procesos colgados**: forzado de terminación tras timeout si el proceso hijo no responde a SIGTERM.

## Requisitos

- [OpenCode CLI](https://opencode.ai/) instalado y disponible en el `PATH`.
- Node.js (para la ejecución del adaptador MCP y scripts de Failover).
- VS Code 1.85 o superior.
- Carpeta de workspace abierta (recomendado).

## Instalación y uso

### Instalación

Puedes instalar la extensión directamente desde el **Marketplace de VS Code**:
1. Abre la vista de Extensiones en VS Code (`Ctrl+Shift+X`).
2. Busca `opencode-mcp-vscode` o visita el enlace [OpenCode Chat Panel](https://marketplace.visualstudio.com/items?itemName=Pacoaldev.opencode-mcp-vscode).
3. Haz clic en **Instalar**.

*(Alternativamente, puedes instalarla desde tu navegador a través del [Marketplace de VS Code](https://marketplace.visualstudio.com/items?itemName=Pacoaldev.opencode-mcp-vscode)).*

#### Instalación desde VSIX (desarrollo o versión manual)

Si compilas la extensión localmente o recibes un `.vsix`:

1. Compila y empaqueta:
   ```bash
   npm run compile
   npx @vscode/vsce package
   ```
2. En VS Code / Cursor: `Ctrl+Shift+P` → **Extensions: Install from VSIX...**
3. Selecciona el archivo `opencode-mcp-vscode-x.x.x.vsix`.
4. **Reload Window** cuando lo solicite.

> **Nota:** Recargar la ventana (*Reload Window*) no aplica cambios de código por sí solo; necesitas instalar el VSIX (o ejecutar con **F5** en modo desarrollo) para usar una versión nueva.

### Uso

1. Asegúrate de tener instalado y configurado [OpenCode CLI](https://opencode.ai/) en tu sistema.
2. Abre el panel de OpenCode desde la barra de actividad (icono de OpenCode) o usando el atajo `Ctrl+Alt+O`.
3. Escribe tu consulta en el panel de chat y envíala con **Enviar** o `Ctrl+Enter`.

Si el servidor de OpenCode no está en ejecución y la opción `opencode.autoStartServer` está activada (valor por defecto), la extensión iniciará automáticamente el servidor con `opencode serve` en el puerto configurado.

## Herramientas y Agentes

Al estar conectado directamente a OpenCode, el panel hereda todas sus herramientas (Tools/MCP) permitiendo al LLM interactuar con tu entorno:

### Herramientas Nativas (Tools)
- **Sistema y archivos**: Ejecución de comandos (`bash`), búsqueda (`glob`, `grep`), lectura (`read`), edición (`edit`) y escritura (`write`).
- **Memoria persistente**: Gestión de contexto a largo plazo (`mem_save`, `mem_search`, `mem_context`, `mem_update`).
- **Tareas complejas**: Delegación de subtareas (`task`) y listas de TODOs (`todowrite`).
- **Web y UI**: Acceso a internet (`webfetch`) y preguntas interactivas (`question`).
- **Skills**: Habilidades especializadas personalizadas (`skill`).

### Adaptador MCP (OpenCode MCP Server)
El archivo `opencode-adapter.mjs` funciona como un servidor [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) que permite a clientes MCP comunicarse con tu servidor OpenCode local.
- Expone la tool `ask_opencode` para el envío de consultas de manera estructurada.
- Se comunica por `stdio`, arranca automáticamente `opencode serve` si no está encendido, y devuelve respuestas de los agentes y herramientas de OpenCode.

#### Configuración en clientes MCP (ej. Claude Desktop)
Para integrar este adaptador en Claude Desktop, añade lo siguiente a tu archivo de configuración (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "opencode-mcp": {
      "command": "node",
      "args": ["/ruta/absoluta/a/opencode-mcp/opencode-adapter.mjs"]
    }
  }
}
```

### Agente Failover y Balanceo de API
La extensión incluye una solución nativa para garantizar resiliencia en llamadas al LLM integrada de forma segura.
- **Configuración Segura:** Ejecuta el comando **`OpenCode: Configurar API Keys de Failover`** (`opencode.setApiKeys`) y pega tu JSON con las baterías de APIs por proveedor (ej. `{"openai": ["sk-...", "sk-..."]}`). Esto se guardará cifrado en el llavero de tu sistema operativo mediante el `SecretStorage` de VS Code.
- **Rotación Automática:** Si la API devuelve error HTTP 429 (Rate Limit) o > 500, la extensión cambia dinámicamente a la siguiente llave y reintenta la petición de forma transparente al usuario.

## Gestión de contexto

Puedes añadir contenido al contexto de la conversación para que OpenCode lo tenga en cuenta al responder utilizando los botones de la interfaz del chat o los siguientes atajos:

| Acción | Atajo | Comando |
|--------|-------|---------|
| Añadir archivo actual | `Ctrl+Alt+Shift+F` | OpenCode: Añadir archivo actual al contexto |
| Añadir selección | `Ctrl+Alt+Shift+S` | OpenCode: Añadir selección al contexto |
| Añadir todos los abiertos | — | OpenCode: Añadir archivos abiertos al contexto |
| Añadir estado de Git | — | OpenCode: Añadir información de Git al contexto (`opencode.addGitContext`) |
| Adjuntar carpeta | — | *(Desde el botón en la interfaz de chat)* |

También puedes acceder a estas opciones desde el **menú contextual** del editor o del explorador de archivos. El estado de Git incluye tu rama actual, archivos modificados y los últimos 5 commits.

## Panel de Costos Acumulativos

El panel de costos muestra el gasto acumulado de tus interacciones con los LLMs, agrupado por fecha y modelo.

### Características
- **Cálculo automático**: cada respuesta del asistente registra los tokens de entrada y salida y calcula el costo según el modelo utilizado.
- **Agrupación por fecha y modelo**: los costos se organizan por día y por modelo de LLM.
- **Multi-moneda**: muestra el costo en USD y EUR (tasa fija EUR = USD × 0.92).
- **Persistencia**: los datos se guardan en el almacenamiento global de VS Code y se cargan automáticamente al abrir el chat.
- **Panel ocultable**: botón de mostrar/ocultar en la barra superior del chat.

### Precios por modelo

| Modelo | Precio Input (por 1M tokens) | Precio Output (por 1M tokens) |
|--------|------------------------------|-------------------------------|
| `mistral-medium-latest` | $2.00 | $6.00 |
| Default (otros) | $2.00 | $6.00 |

### Funcionamiento
1. Al abrir el chat, el panel carga los costos históricos desde el almacenamiento global de VS Code.
2. Cada respuesta del asistente acumula el costo automáticamente (tanto en el frontend como en el backend).
3. El backend persiste los costos en el almacenamiento global de VS Code tras cada interacción.
4. Puedes ocultar/mostrar el panel con el botón `$` en la barra superior.

## Configuración

### Activar modo local con LM Studio

1. Inicia el **servidor local** en LM Studio (Developer → Local Server) y anota la URL (p. ej. `http://127.0.0.1:5555`).
2. Abre **File → Preferences → Settings** (o `Ctrl+,`).
3. Busca `opencode` y activa **OpenCode: Local Mode Enabled**.
4. Configura **OpenCode: Local Mode Url** con la URL de tu instancia (por defecto `http://127.0.0.1:5555`).

> **Importante:** la configuración del modo local aplica al **workspace o perfil de usuario** donde la actives. Si trabajas en varios proyectos, activa `opencode.localModeEnabled` en la pestaña **User** para que funcione en todos, o repítela en cada workspace.

Comportamiento con el modo local activo:

| Aspecto | Comportamiento |
|---------|----------------|
| Apariencia del chat | Tema **naranja** (acentos, tags, avatares, botones); textos **LM Studio** en topbar, bienvenida y respuestas del asistente |
| Logo | Mismo logo de la extensión en ambos modos (OpenCode y LM Studio) |
| Barra del chat | Muestra `LM Studio · nombre-del-modelo` con punto naranja si está conectado |
| Modelos en el desplegable | Solo modelos expuestos por LM Studio (`/v1/models`) |
| LM Studio apagado | Error claro al enviar; **no** se redirige silenciosamente a OpenCode |
| LM Studio detectado sin modo local | Aviso con botón **Activar modo local** |
| Imágenes (Ctrl+V) | Base64 multimodal; requiere modelo **con visión** en LM Studio |

> Los modelos solo texto (p. ej. `google/gemma-4-e4b`) no pueden analizar capturas de pantalla aunque LM Studio esté activo. Carga un modelo multimodal (LLaVA, Qwen2-VL, Gemma 3 vision, etc.) para ese caso.

La extensión ofrece las siguientes opciones de configuración:

| Configuración | Valor por defecto | Descripción |
|---------------|-------------------|-------------|
| `opencode.serverUrl` | `http://127.0.0.1:4096` | URL del servidor OpenCode. |
| `opencode.serverPort` | `4096` | Puerto utilizado al iniciar el servidor automáticamente. |
| `opencode.autoStartServer` | `true` | Iniciar el servidor automáticamente si no está en ejecución. |
| `opencode.serverUsername` | `opencode` | Usuario para autenticación básica HTTP (si se usa contraseña). |
| `opencode.serverPassword` | `""` | Contraseña para autenticación básica HTTP (definida en `OPENCODE_SERVER_PASSWORD`). |
| `opencode.defaultAgent` | `""` | Nombre del agente por defecto (según tu configuración de OpenCode). |
| `opencode.autoApprovePermissions` | `false` | Aprobar automáticamente permisos para comandos bash o edición de archivos. |
| `opencode.bin` | `""` | Ruta al ejecutable de OpenCode (vacío = auto-detección en Windows/npm). |
| `opencode.localModeEnabled` | `false` | Activar modo local para enviar todas las peticiones a LM Studio. |
| `opencode.localModeUrl` | `http://127.0.0.1:5555` | URL base de la instancia de LM Studio. |
| `opencode.quickActions` | `[...]` | Acciones rápidas personalizadas en la pantalla de bienvenida. |

## Conexión con OpenCode LOCAL

La extensión se comunica con tu **instancia local de OpenCode** (que se inicia con `opencode serve`) a través de su HTTP API local (por defecto en `http://127.0.0.1:4096`):

- `GET /global/health`: Comprueba el estado del servidor.
- `POST /session`: Inicia una sesión de chat por workspace.
- `POST /session/:id/prompt_async`: Envía un mensaje al servidor (utiliza tus agents/MCP configurados).
- `GET /event`: Recibe el streaming de respuestas.
- `GET /agent`: Lista los agents disponibles en tu configuración.

Los **MCP** (Micro-Core Protocols) se gestionan directamente desde tu configuración de OpenCode, por lo que no es necesario configurarlos en la extensión.

## Comandos disponibles

| Comando | Descripción |
|--------|-------------|
| `opencode.ask` | Abre el panel de chat de OpenCode. |
| `opencode.reconnect` | Reconecta al servidor de OpenCode. |
| `opencode.newSession` | Inicia una nueva sesión de chat (equivalente al botón **Limpiar chat** de la interfaz). |
| `opencode.addFileToContext` | Añade el archivo actual al contexto. |
| `opencode.addSelectionToContext` | Añade la selección actual al contexto. |
| `opencode.addOpenFilesToContext` | Añade todos los archivos abiertos al contexto. |

## Desarrollo

Para contribuir al desarrollo de la extensión:

1. Instala las dependencias:
   ```bash
   npm install
   ```

2. Compila el proyecto:
   ```bash
   npm run compile
   ```

3. Durante el desarrollo, usa el modo watch para compilar automáticamente los cambios:
   ```bash
   npm run watch
   ```

4. Ejecuta las pruebas (si están disponibles):
   ```bash
   npm test
   ```

5. Para empaquetar la extensión:
   ```bash
   npm run package
   ```

## Estructura del proyecto

- **`src/`**: Contiene el código fuente de la extensión.
  - `extension.ts`: Punto de entrada principal.
  - `opencodeService.ts`: Lógica para la comunicación con el servidor de OpenCode.
  - `chatViewProvider.ts`: Implementación del panel de chat.
  - `serverProcess.ts`: Gestión del proceso del servidor de OpenCode.
  - `httpClient.ts`: Cliente HTTP para las solicitudes al servidor.
  - `contextAttachments.ts`: Lógica para manejar el contexto de archivos y selecciones.
  - `settings.ts`: Gestión de la configuración de la extensión.
  - `types.ts`: Definiciones de tipos TypeScript.
  - `agent/failoverAgent.js`: Lógica de balanceo de API y rotación de keys.
  - `opencode-adapter.mjs`: Servidor MCP que expone OpenCode.
  - `config/apis.json`: Configuración de llaves maestras para Failover.

  - `resources/webview/`: Contiene los assets del frontend del chat.
    - `index.html`: Estructura HTML del panel de chat (incluye el panel de costos).
    - `main.js`: Lógica del frontend (manejo de mensajes, renderizado, cálculo de costos).
    - `styles.css`: Estilos del panel de chat.
  - `package.json`: Configuración del proyecto y dependencias.

## Solución de problemas

- **OpenCode no responde:** Verifica que `opencode.autoStartServer` esté activo o ejecuta `opencode serve`.
- **Error de conexión (Timeout):** Asegúrate de que el puerto de `opencode.serverPort` esté libre.
- **Error de autenticación:** Ingresa la contraseña en `opencode.serverPassword` si tu servidor la requiere.
- **Bloqueo por permisos:** Activa `opencode.autoApprovePermissions` o aprueba manualmente si el chat se cuelga.
- **Sigo viendo modelos cloud (p. ej. kimi) en lugar de LM Studio:** Activa `opencode.localModeEnabled` en Settings (pestaña User si usas varios proyectos), instala la versión actual del VSIX y recarga la ventana. Debe aparecer `LM Studio · ...` en la barra del chat y el tema naranja.
- **Sigo viendo verde y textos `opencode` con LM Studio corriendo:** El modo local no está activo (`opencode.localModeEnabled`) o la extensión instalada es anterior a **v1.0.27**. Reinstala el VSIX compilado y recarga la ventana; el tema naranja solo aplica con el modo local activado.
- **LM Studio activo pero el chat responde como modelo en la nube:** El modo local no está activo en ese workspace o la extensión instalada es una versión anterior sin estos fixes.
- **Modo local activo pero error al enviar:** Comprueba que el servidor local de LM Studio esté arrancado y que `opencode.localModeUrl` coincida con la URL mostrada en LM Studio (p. ej. `:5555`).
- **La IA no ve imágenes pegadas:** Confirma que el adjunto muestra miniatura en la barra de contexto y que tienes un **modelo con visión** cargado en LM Studio; modelos solo texto ignoran imágenes.
- **Reload Window no aplica cambios:** Reinstala el `.vsix` compilado (p. ej. `opencode-mcp-vscode-1.0.27.vsix`); `Reload Window` carga la extensión instalada, no el código fuente del repo. Tras instalar, recarga la ventana una vez más.

## Licencia

MIT
