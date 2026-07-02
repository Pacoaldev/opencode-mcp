<div align="center">

<img src="https://raw.githubusercontent.com/Pacoaldev/opencode-mcp/main/resources/logo.png" alt="OpenCode Chat Panel" width="220" />

# OpenCode Chat Panel

**Panel lateral de chat para VS Code, Antigravity y Cursor** conectado a tu **OpenCode** local o a **LM Studio**.

[![Versión](https://img.shields.io/badge/versión-1.0.31-blue)](CHANGELOG.md)
[![VS Code](https://img.shields.io/badge/VS%20Code-≥1.85-007ACC?logo=visualstudiocode&logoColor=white)](https://code.visualstudio.com/)
[![Licencia](https://img.shields.io/badge/licencia-MIT-green)](LICENSE)

[Instalar](#instalación) · [Inicio rápido](#inicio-rápido) · [Configuración](#configuración) · [Changelog](CHANGELOG.md)

</div>

---

## Qué es

Extensión de chat multivitaminada en el IDE: envías prompts con contexto local (archivos, selección, Git) y recibes respuestas en streaming desde tus **agents**, **skills** y **MCP** configurados en OpenCode — o, en modo local, directamente desde **LM Studio**.

> La extensión no sustituye OpenCode ni el terminal del IDE. Orquesta conversación, contexto y sesiones; las herramientas pesadas las resuelve tu stack OpenCode.

---

## Inicio rápido

1. Instala [OpenCode CLI](https://opencode.ai/) y abre una carpeta de workspace.
2. Instala la extensión desde el [Marketplace VS Code](https://marketplace.visualstudio.com/items?itemName=Pacoaldev.opencode-mcp-vscode), [Marketplace Open VSX (Antogravity/Cursor)](https://open-vsx.org/extension/Pacoaldev/opencode-mcp-vscode), o desde un [VSIX](#instalación-desde-vsix).
3. Abre el panel con **`Ctrl+Alt+O`** (Mac: **`Cmd+Alt+O`**) y escribe tu primera pregunta.

Si `opencode.autoStartServer` está activo (por defecto), la extensión lanza `opencode serve` cuando no detecta servidor en `http://127.0.0.1:4096`.

---

## Capturas

<table>
  <tr>
    <th align="center">Chat principal</th>
    <th align="center">Panel de costos</th>
    <th align="center">Modelos y agentes</th>
    <th align="center">Modo LM Studio</th>
  </tr>
  <tr>
    <td align="center"><a href="https://raw.githubusercontent.com/Pacoaldev/opencode-mcp/main/resources/1.png"><img src="https://raw.githubusercontent.com/Pacoaldev/opencode-mcp/main/resources/1.png" alt="Interfaz principal" width="100%" /></a></td>
    <td align="center"><a href="https://raw.githubusercontent.com/Pacoaldev/opencode-mcp/main/resources/2.png"><img src="https://raw.githubusercontent.com/Pacoaldev/opencode-mcp/main/resources/2.png" alt="Panel de costos" width="100%" /></a></td>
    <td align="center"><a href="https://raw.githubusercontent.com/Pacoaldev/opencode-mcp/main/resources/3.png"><img src="https://raw.githubusercontent.com/Pacoaldev/opencode-mcp/main/resources/3.png" alt="Ajustes y modelos" width="100%" /></a></td>
    <td align="center"><a href="https://raw.githubusercontent.com/Pacoaldev/opencode-mcp/main/resources/4.png"><img src="https://raw.githubusercontent.com/Pacoaldev/opencode-mcp/main/resources/4.png" alt="Chat LM Studio" width="100%" /></a></td>
  </tr>
</table>

---

## Características

### Chat y conexión

| | |
|---|---|
| **OpenCode local** | HTTP API (`opencode serve`), auto-inicio opcional, auth básica, reconexión con backoff |
| **LM Studio** | Modo local alternativo con identidad visual naranja; sin fallback silencioso a la nube |
| **Streaming** | Respuestas en tiempo real vía SSE; timeout y cancelación |
| **Sesiones** | Historial persistente por workspace; opcionalmente **una sesión por rama Git** |
| **Failover** | Rotación de API keys ante 429/5xx; avisos visibles en chat y toast |

### Contexto

| | |
|---|---|
| **Adjuntos** | Archivo actual, selección, archivos abiertos, carpetas — contenido **inline**, no rutas `file://` |
| **Git** | Rama, cambios y últimos commits al contexto |
| **Presupuesto** | Contador `~X tokens`, umbrales soft/hard y acciones de recorte en un clic |
| **Prioridad** | Clic derecho en tag → `[CRÍTICO]` / `[REF]` (prefijo en el payload al LLM) |
| **Imágenes** | Ctrl+V y adjuntos multimodal (requiere modelo con visión en LM Studio) |

### Productividad

| | |
|---|---|
| **Plantillas** | Guardar e insertar prompts (`/` en el chat o comandos de plantilla) |
| **Costos** | Panel acumulativo por fecha y modelo (USD/EUR), persistido en VS Code |
| **Atajos** | Contexto con teclado; acciones rápidas en pantalla de bienvenida |
| **Depuración** | Canal **Output → OpenCode Chat** con logs de envío, HTTP, SSE y failover |

### Seguridad y robustez

CSP restrictiva en el webview, sanitización HTML, `execFile` sin shell, secrets en `SecretStorage`, parsing SSE tolerante a CRLF y detección de caídas de conexión.

---

## Novedades recientes

<details open>
<summary><strong>v1.0.31</strong> — Tool Calling nativo para LM Studio</summary>

- Ahora la integración local (LM Studio) es capaz de explorar tu código fuente de forma autónoma. Se han implementado herramientas (`list_directory` y `read_file`) que se envían directamente al modelo, permitiendo que lea archivos de tu workspace sin necesidad de adjuntarlos manualmente a través de la interfaz. ¡Asegúrate de usar modelos que soporten *Function Calling*!
</details>

<details>
<summary><strong>v1.0.30</strong> — Contexto inteligente lite + sesiones por rama</summary>

- Badge de tokens y guard de presupuesto antes de enviar (`contextWarnTokens`, `contextHardWarnTokens`).
- Recorte rápido: quitar todo, quitar archivos grandes, solo el último adjunto.
- Sesiones separadas por rama Git (`sessionPerBranch`); prompt al cambiar de rama.
- Tags de contexto `[CRÍTICO]` / `[REF]` con clic derecho.

</details>

<details>
<summary><strong>v1.0.29</strong> — Visibilidad y depuración</summary>

- Output Channel **OpenCode Chat** (envíos, errores HTTP, SSE, failover).
- Failover visible en chat, toast y barra del modelo (sin inyectar markdown en la respuesta).

</details>

<details>
<summary><strong>v1.0.28</strong> — Adjuntos locales</summary>

- Archivos y carpetas envían contenido inline al modelo, no rutas locales.

</details>

<details>
<summary><strong>v1.0.27</strong> — Identidad LM Studio</summary>

- Tema naranja y textos `LM Studio` cuando `localModeEnabled` está activo.

</details>

Ver historial completo en [CHANGELOG.md](CHANGELOG.md).

---

## Requisitos

- [OpenCode CLI](https://opencode.ai/) en el `PATH` (modo OpenCode).
- **VS Code ≥ 1.85** o **Cursor** compatible.
- Node.js (adaptador MCP y scripts de failover).
- Carpeta de workspace abierta (recomendado).

---

## Instalación

### Marketplace

1. Extensiones → `Ctrl+Shift+X`
2. Busca **`OpenCode Chat Panel`** o [`Pacoaldev.opencode-mcp-vscode`](https://marketplace.visualstudio.com/items?itemName=Pacoaldev.opencode-mcp-vscode)
3. **Instalar** → recargar ventana si lo pide

### Instalación desde VSIX

```bash
npm install
npm run compile
npm run package
```

Luego:

- **VS Code / Cursor:** `Ctrl+Shift+P` → **Extensions: Install from VSIX...**
- **Cursor (CLI):** `cursor --install-extension opencode-mcp-vscode-1.0.30.vsix --force`

> **Importante:** *Reload Window* carga la extensión **instalada**, no el código fuente del repo. Tras instalar un VSIX nuevo, recarga la ventana una vez.

---

## Gestión de contexto

| Acción | Atajo | Comando |
|--------|-------|---------|
| Añadir archivo actual | `Ctrl+Alt+Shift+F` | OpenCode: Añadir archivo actual al contexto |
| Añadir selección | `Ctrl+Alt+Shift+S` | OpenCode: Añadir selección al contexto |
| Añadir todos los abiertos | — | OpenCode: Añadir archivos abiertos al contexto |
| Estado Git | — | OpenCode: Añadir información de Git al contexto |
| Adjuntar carpeta | — | Botón **+ Añadir contexto** en el chat |

También disponible desde el menú contextual del editor y del explorador.

**Presupuesto de tokens:** la barra de contexto muestra `~X tokens`. Al superar el umbral soft aparece un aviso; al superar el hard, un diálogo ofrece recortar o enviar igual. Clic en el badge o menú **+ Añadir contexto** → acciones de recorte.

**Etiquetas:** clic derecho en un tag → `[CRÍTICO]`, `[REF]` o sin etiqueta.

---

## Modo local con LM Studio

1. Arranca el servidor local en LM Studio (Developer → Local Server).
2. Settings → busca `opencode` → activa **Local Mode Enabled**.
3. Configura **Local Mode Url** (p. ej. `http://127.0.0.1:5555`).

| Aspecto | Comportamiento |
|---------|----------------|
| Apariencia | Tema **naranja**, textos **LM Studio** en topbar, bienvenida y asistente |
| Logo | Mismo en ambos modos |
| Barra del chat | `LM Studio · modelo` con indicador naranja si conectado |
| Modelos | Solo los expuestos por LM Studio (`/v1/models`) |
| LM Studio apagado | Error claro al enviar; **no** redirige a OpenCode |
| Imágenes | Base64 multimodal; requiere modelo **con visión** (LLaVA, Qwen2-VL, etc.) |

> Activa `localModeEnabled` en la pestaña **User** si trabajas en varios proyectos. Los modelos solo texto (p. ej. Gemma sin visión) ignoran capturas aunque LM Studio esté activo.

---

## Configuración

### Servidor OpenCode

| Setting | Default | Descripción |
|---------|---------|-------------|
| `opencode.serverUrl` | `http://127.0.0.1:4096` | URL del servidor |
| `opencode.serverPort` | `4096` | Puerto al auto-iniciar |
| `opencode.autoStartServer` | `true` | Lanzar `opencode serve` si no hay servidor |
| `opencode.serverUsername` | `opencode` | Usuario HTTP Basic Auth |
| `opencode.serverPassword` | `""` | Contraseña (p. ej. `OPENCODE_SERVER_PASSWORD`) |
| `opencode.defaultAgent` | `""` | Agente por defecto (vacío = config OpenCode) |
| `opencode.autoApprovePermissions` | `false` | Aprobar permisos bash/edición automáticamente |
| `opencode.bin` | `""` | Ruta a `opencode` (vacío = auto) |

### LM Studio

| Setting | Default | Descripción |
|---------|---------|-------------|
| `opencode.localModeEnabled` | `false` | Enviar todo a LM Studio |
| `opencode.localModeUrl` | `http://127.0.0.1:5555` | URL base de LM Studio |

### Contexto y sesiones

| Setting | Default | Descripción |
|---------|---------|-------------|
| `opencode.contextWarnTokens` | `32000` | Umbral soft de tokens estimados |
| `opencode.contextHardWarnTokens` | `64000` | Umbral hard; pide confirmación o recorte |
| `opencode.contextTrimLargeKb` | `64` | Tamaño KB para “quitar archivos grandes” |
| `opencode.sessionPerBranch` | `true` | Sesión de chat separada por rama Git |

### Otros

| Setting | Default | Descripción |
|---------|---------|-------------|
| `opencode.quickActions` | `[...]` | Acciones rápidas en pantalla de bienvenida |

Configuración OpenCode del usuario: `~/.config/opencode/opencode.jsonc` (agents, skills, MCP, providers).

---

## Failover de API keys

1. Comando **`OpenCode: Configurar API Keys de Failover`** (`opencode.setApiKeys`).
2. Pega JSON por proveedor, p. ej. `{"openai": ["sk-...", "sk-..."]}`.
3. Se guarda cifrado en **SecretStorage** de VS Code.

Ante HTTP 429 o errores 5xx, la extensión rota la key y reintenta. El usuario ve mensaje de sistema, toast (primera vez) e indicador en la barra del modelo. Detalle en **Output → OpenCode Chat**.

---

## Panel de costos

Seguimiento acumulado por **fecha** y **modelo** (USD + EUR, tasa fija EUR = USD × 0.92). Persistido en almacenamiento global de VS Code. Toggle con el botón **`$`** en la barra superior.

| Modelo | Input / 1M tokens | Output / 1M tokens |
|--------|-------------------|---------------------|
| `mistral-medium-latest` | $2.00 | $6.00 |
| Default (otros) | $2.00 | $6.00 |

---

## Adaptador MCP

`opencode-adapter.mjs` expone OpenCode como servidor MCP (tool `ask_opencode`, transporte stdio). Útil para Claude Desktop u otros clientes MCP.

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

Los MCP del chat en VS Code se configuran en **OpenCode**, no en la extensión.

---

## API local (OpenCode)

| Endpoint | Uso |
|----------|-----|
| `GET /global/health` | Estado del servidor |
| `POST /session` | Crear sesión por workspace |
| `POST /session/:id/prompt_async` | Enviar mensaje |
| `GET /event` | Streaming SSE |
| `GET /agent` | Listar agents |

---

## Comandos

| Comando | Descripción |
|---------|-------------|
| `opencode.ask` | Abrir panel de chat (`Ctrl+Alt+O`) |
| `opencode.reconnect` | Reconectar al servidor |
| `opencode.newSession` | Nueva sesión (equivale a limpiar chat) |
| `opencode.addFileToContext` | Añadir archivo actual |
| `opencode.addSelectionToContext` | Añadir selección |
| `opencode.addOpenFilesToContext` | Añadir archivos abiertos |
| `opencode.setApiKeys` | Configurar API keys de failover |
| `opencode.clearApiKeys` | Borrar API keys de failover |

---

## Desarrollo

```bash
npm install
npm run compile      # TypeScript
npm run watch        # watch mode
npm run package      # genera .vsix
npm test             # si hay tests
```

**F5** en VS Code abre Extension Development Host con el código del repo (sin instalar VSIX).

### Estructura

```
src/
  extension.ts          # Activación y comandos
  opencodeService.ts    # OpenCode / LM Studio, sesiones, failover
  chatViewProvider.ts   # Webview y bridge de mensajes
  contextAttachments.ts # Contexto adjunto y recorte
  contextBudget.ts      # Estimación de tokens y prioridades
  fileContext.ts        # Inline de archivos/carpetas
  logger.ts             # Output Channel
  httpClient.ts         # Cliente HTTP
  gitProvider.ts        # Info Git
  settings.ts           # Configuración
resources/webview/      # index.html, main.js (UI del chat)
opencode-adapter.mjs    # Servidor MCP
```

Roadmap de próximas mejoras: [ROADMAP.md](ROADMAP.md).

---

## Solución de problemas

| Síntoma | Qué hacer |
|---------|-----------|
| OpenCode no responde | Activa `autoStartServer` o ejecuta `opencode serve` manualmente |
| Timeout / puerto ocupado | Revisa `serverPort` y que nada más use el puerto |
| Error de auth | Configura `serverPassword` si el servidor la exige |
| Chat colgado por permisos | `autoApprovePermissions` o aprueba el diálogo de OpenCode |
| Sigo viendo modelos cloud con LM Studio | Activa `localModeEnabled` (pestaña User), instala VSIX ≥ 1.0.27, recarga |
| Modo local pero error al enviar | Comprueba que LM Studio esté corriendo y que `localModeUrl` coincida |
| La IA no ve imágenes | Modelo con visión cargado en LM Studio; miniatura visible en barra de contexto |
| Cambios del repo no aparecen | Reinstala el `.vsix` compilado; Reload Window no lee el repo directamente |
| Depurar envíos / failover | **View → Output → OpenCode Chat** |

---

## Licencia

MIT — ver [LICENSE](LICENSE).
