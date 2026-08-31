<div align="center">

<img src="https://raw.githubusercontent.com/Pacoaldev/opencode-mcp/main/resources/logo.png" alt="OpenCode Chat Panel" width="220" />

# OpenCode Chat Panel

**Panel lateral de chat para VS Code, Antigravity y Cursor** conectado a tu **OpenCode** local o a **LM Studio**.

[![Versión](https://img.shields.io/badge/versión-1.0.51-blue)](CHANGELOG.md)
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

### Nueva interfaz de modelos y providers

<table>
  <tr>
    <th align="center">Selector de modelos y API Keys</th>
    <th align="center">Configuración de proveedores</th>
  </tr>
  <tr>
    <td align="center"><a href="https://raw.githubusercontent.com/Pacoaldev/opencode-mcp/main/resources/5.png"><img src="https://raw.githubusercontent.com/Pacoaldev/opencode-mcp/main/resources/5.png" alt="Selector de modelos y API Keys" width="100%" /></a></td>
    <td align="center"><a href="https://raw.githubusercontent.com/Pacoaldev/opencode-mcp/main/resources/6.png"><img src="https://raw.githubusercontent.com/Pacoaldev/opencode-mcp/main/resources/6.png" alt="Configuración de proveedores horizontal" width="100%" /></a></td>
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
| **Lista de contexto** | Panel **Archivos (N)** con checkboxes, tamaño por archivo y quitar seleccionados |
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

Además, el flujo de envio ahora incluye:

- Validacion de seguridad previa al prompt (deteccion de patrones sensibles en contexto y adjuntos de texto).
- Control de acceso de lectura para archivos usados por herramientas locales (`read_file`).
- Auditoria de eventos de transmision y llamadas API con reporte interno.
- Diagnostico de errores comunes con guia integrada para red, timeout, auth y limites del proveedor.
- Recuperacion automatica en errores recuperables de envio (reconexion y reintento).

---

## Novedades recientes

<details open>
<summary><strong>v1.0.51</strong> — Errores en el chat y modelos EOL</summary>

- **Errores visibles al instante**: los `410 Gone` y mensajes `Gone:` aparecen en el chat sin recargar la ventana; se limpia la burbuja de streaming vacía.
- **Modelos EOL** (`modelPolicy.ts`): blocklist inicial, caché dinámica de 410 en `globalState`, filtro en el selector, auto-cambio de modelo y un reintento del mensaje.
- **Failover acotado** (v1.0.48): solo ante 429 o 5xx; ya no rota proveedores ante EOL o auth inválido.
- **Documentación**: guía de modelos retirados y `blacklist`/`whitelist` en OpenCode (ver sección [Modelos retirados (EOL)](#modelos-retirados-eol-410-gone)).

</details>

<details>
<summary><strong>v1.0.46</strong> — Auto-arranque de OpenCode más fiable</summary>

- Si el servidor cae o no arrancó al abrir el IDE, al refrescar el panel se **reconecta** y vuelve a lanzar `opencode serve` (con `autoStartServer` activo).
- Sigue cargando favoritos, costes y agente aunque OpenCode tarde en responder (desde v1.0.45).

</details>

<details>
<summary><strong>v1.0.44</strong> — Catálogo de modelos y documentación de proveedores</summary>

- **Listado de modelos fiable**: el selector usa solo el catálogo vivo de OpenCode (`GET /provider`). Eliminados modelos hardcodeados obsoletos (p. ej. Llama 3 en Replicate, Qwen 2.5 fijo, ElevenLabs TTS).
- **Heurísticas de visión**: palabras clave actualizadas (`claude-4`, `gpt-4.1`, `gpt-5`, `gemini-2.5`, `qwen-vl`, etc.) para el icono de imagen en el desplegable.
- **Failover**: plantilla `config/apis.example.json` ampliada (`google`, `huggingface`, `nvidia`, `meta`, `minimax`, …). Los IDs deben coincidir con OpenCode (`minimax` = internacional).
- **Documentación**: guía práctica en [`docs/providers-de-opencode-lista-completa-revisado.md`](docs/providers-de-opencode-lista-completa-revisado.md); catálogo completo de 176 nombres en [`docs/Proveedores.md`](docs/Proveedores.md).

</details>

<details>
<summary><strong>v1.0.43</strong> — Seguridad integrada y recuperacion automatica</summary>

- **Seguridad en envio**: validacion de payload antes de enviar prompts para bloquear contenido sensible por patrones configurables.
- **Control de acceso en herramientas locales**: `read_file` aplica validacion de acceso/seguridad antes de leer archivos.
- **Auditoria de seguridad**: registro persistente de eventos de transmision y llamadas API para diagnostico.
- **Manejo avanzado de errores**: mensajes con diagnostico accionable y reintento automatico en fallos recuperables de red/timeout/proveedor.
- **Estabilidad de compilacion**: correcciones de tipado en modulos de cache, metricas y prompts; compilacion y tests en verde.

</details>

<details>
<summary><strong>v1.0.41</strong> — Iconos de modalidades en modelos</summary>

- **Modalidades de Modelo**: Los modelos del desplegable muestran de manera visual y compacta las modalidades que aceptan (por ejemplo, entrada de imágenes). Se ha implementado un sistema robusto que incluye heurísticas para detectar modelos con soporte de visión, asegurando una correcta visualización incluso si la API no devuelve dichos detalles.

</details>

<details>
<summary><strong>v1.0.40</strong> — Corrección en selección de modelos y ocultamiento de razonamiento</summary>

- **Persistencia de Modelo**: Arreglado un bug que impedía retener el modelo seleccionado en el desplegable (siempre usaba el modelo por defecto).
- **IDs de Modelo Complejos**: Corregido el análisis de IDs de modelo que contienen múltiples `::`.
- **Razonamiento Oculto**: Los bloques de "pensamiento" interno generados por modelos de razonamiento (como Nemotron) ya no se muestran en el chat, dejándolo más limpio con solo la respuesta final.

</details>

<details>
<summary><strong>v1.0.39</strong> — Selector de modelos mejorado e indicadores de API Keys</summary>

- **Indicador de API Keys**: Se ha añadido un punto visual (● verde / ○ gris) junto a cada proveedor en el selector de modelos. La extensión lee automáticamente tu `auth.json` y los secretos locales de VS Code para indicarte en tiempo real qué proveedores tienen una clave activa y lista para usarse.
- **Selector UI**: Panel de "Gestión de proveedores" rediseñado a un formato horizontal más espacioso. Además, los proveedores ahora aparecen agrupados y colapsados por defecto para facilitar la navegación y el botón de favoritos funciona correctamente.

</details>

<details>
<summary><strong>v1.0.38</strong> — Carpetas en UI y Privacidad de rutas locales</summary>

- **UI Carpetas**: Al adjuntar una carpeta, los archivos ahora muestran su ruta relativa. El nombre/ruta de la carpeta se resalta en color dinámico (**verde** en modo OpenCode y **naranja** en modo LM Studio).
- **Privacidad y Seguridad**: Las rutas `file://` que pegues accidentalmente dentro del texto del chat ya no se leen ni adjuntan automáticamente. Solo se envía contenido local cuando adjuntas un archivo explícitamente (evitando fugas accidentales). *¡Gracias a [@fengjikui](https://github.com/fengjikui) por esta excelente contribución!*

</details>

<details>
<summary><strong>v1.0.35</strong> — Panel de gestión de contexto</summary>

- Botón **Archivos (N)** en la barra de contexto: lista desplegable con todos los adjuntos.
- Checkboxes + **Quitar seleccionados** para eliminar varios archivos de una vez.
- Tamaño estimado por archivo en KB en cada fila.
- También accesible desde **+ Añadir contexto → Ver archivos en contexto**.

</details>

<details>
<summary><strong>v1.0.34</strong> — Persistencia LM Studio, historial y tool calling</summary>

- Persistencia de sesiones locales entre reinicios del editor.
- Tool calling nativo en modo local (`list_directory`, `read_file`).
- UI de historial con conteo de mensajes guardados.

</details>

<details>
<summary><strong>v1.0.31</strong> — Tool Calling nativo & Persistencia de Sesiones para LM Studio</summary>

- Ahora la integración local (LM Studio) es capaz de explorar tu código fuente de forma autónoma con herramientas (`list_directory` y `read_file`).
- **Persistencia de Sesiones**: Las conversaciones de LM Studio ahora se guardan localmente en VS Code. Puedes cerrar el editor o cambiar de proyecto y tu historial seguirá ahí, permitiendo continuar la conversación con el contexto intacto.
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
- **Cursor (CLI):** `cursor --install-extension opencode-mcp-vscode-1.0.41.vsix --force`

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
| Ver y quitar archivos | — | Botón **Archivos (N)** o menú **+ Añadir contexto** |

También disponible desde el menú contextual del editor y del explorador.

**Lista de contexto:** pulsa **Archivos (N)** para abrir el panel con todos los adjuntos, su tamaño en KB y checkboxes. Marca los que quieras eliminar y usa **Quitar seleccionados**. Cada fila también tiene **×** para quitar uno solo.

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
2. Pega JSON por proveedor. Plantilla de referencia: [`config/apis.example.json`](config/apis.example.json).
3. Se guarda cifrado en **SecretStorage** de VS Code (el fichero local `config/apis.json` es solo borrador; no lo lee la extensión en runtime).

Ejemplo (IDs = slugs de OpenCode):

```json
{
  "openai": ["sk-..."],
  "anthropic": ["sk-ant-..."],
  "minimax": ["..."],
  "nvidia": ["nvapi-..."],
  "huggingface": ["hf_..."]
}
```

Ante HTTP 429 o errores 5xx, la extensión rota la key y reintenta; si no quedan keys en el proveedor actual, salta al siguiente con claves disponibles. El usuario ve mensaje de sistema, toast (primera vez) e indicador en la barra del modelo. Detalle en **Output → OpenCode Chat**.

Guía de proveedores: [`docs/providers-de-opencode-lista-completa-revisado.md`](docs/providers-de-opencode-lista-completa-revisado.md). Documentación oficial de OpenCode: [opencode.ai/docs/providers](https://opencode.ai/docs/providers).

---

## Modelos retirados (EOL / 410 Gone)

OpenCode **1.18.25** (y la extensión ≥ 1.0.49) listan modelos desde `GET /provider`. Ese catálogo **no siempre excluye modelos ya retirados** por Nvidia, DeepSeek, Z.AI, etc. La API responde `410 Gone` con `"has reached its end of life"`.

Esto afecta al **CLI de OpenCode** y al **panel VS Code**: si el modelo sigue en `/provider`, aparece en `/models` aunque esté muerto.

### Qué hace la extensión

| Comportamiento | Detalle |
|----------------|---------|
| Filtro en selector | Oculta EOL conocidos y los aprendidos tras un 410 (persistidos en `globalState`) |
| Sin failover en EOL | No rota API keys ni proveedor ante 410 |
| Auto-recuperación | Cambia a un modelo del mismo proveedor (p. ej. `glm-5.3`, `nemotron-3-nano-30b-a3b`) y reintenta el mensaje una vez |
| Validación al iniciar | Si el modelo guardado es EOL o legacy (`z-ai` → `zhipuai`), elige otro del catálogo |

### Modelos EOL frecuentes (agosto 2026)

Evítalos en CLI y extensión; suelen aparecer bajo **nvidia**, **deepseek**, **zhipuai**, **huggingface**, **openrouter**, **opencode** / **opencode-go**:

- `nvidia/nemotron-nano-12b-v2-vl`, `nvidia/nemotron-mini-4b-instruct`
- `deepseek-v4-flash` (y variantes `0731`, `vision-exp`)
- `qwen/qwen3.5-122b-a10b`
- `glm-5.2` / `z-ai/glm-5.2`

### Alternativas recomendadas (documentación OpenCode + catálogo vivo)

| Proveedor | Usar | Evitar |
|-----------|------|--------|
| **nvidia** | `nemotron-3-super-120b-a12b`, `nemotron-3-nano-30b-a3b`, `llama-3.3-nemotron-super-49b-v1` | mini-4b, nano-12b-v2-vl, deepseek-v4-flash en catálogo Nvidia |
| **deepseek** | `deepseek-v4-pro` | `deepseek-v4-flash` |
| **zhipuai** | `glm-5.3`, `glm-5`, `glm-4.7-flash` | `glm-5.2` |
| **google** / **groq** / **mistral** / **minimax** / **moonshotai** | Modelos actuales del picker (p. ej. `gemini-2.5-flash-lite`, `llama-3.3-70b-versatile`, `MiniMax-M2.5`, `kimi-k2.5`) | — |
| **opencode** (Zen) | `kimi-k3`, `claude-opus-4-7`, `deepseek-v4-pro` | `deepseek-v4-flash`, `glm-5.2` listados en Zen/Go |

La página [Providers](https://opencode.ai/docs/providers) describe **proveedores**, no un catálogo garantizado al día. Para uso diario, OpenCode recomienda **Zen** o **Go** (modelos verificados) y `blacklist` / `whitelist` en `~/.config/opencode/opencode.json`.

### Ocultar EOL en OpenCode CLI (`blacklist` / `whitelist`)

Ejemplo para Nvidia (IDs tal como aparecen en `/models`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "nvidia": {
      "blacklist": [
        "nvidia/nemotron-nano-12b-v2-vl",
        "nvidia/nemotron-mini-4b-instruct",
        "deepseek-ai/deepseek-v4-flash",
        "deepseek-ai/deepseek-v4-flash-0731",
        "qwen/qwen3.5-122b-a10b",
        "z-ai/glm-5.2"
      ]
    },
    "deepseek": {
      "blacklist": ["deepseek-v4-flash", "deepseek-v4-flash-vision-exp"]
    },
    "zhipuai": {
      "blacklist": ["glm-5.2"]
    }
  }
}
```

Whitelist más restrictiva (solo modelos citados en la docs de Nvidia):

```json
{
  "provider": {
    "nvidia": {
      "whitelist": [
        "nvidia/nemotron-3-super-120b-a12b",
        "nvidia/nemotron-3-nano-30b-a3b",
        "nvidia/llama-3.3-nemotron-super-49b-v1",
        "nvidia/llama-3.1-nemotron-70b-instruct"
      ]
    }
  }
}
```

Tras editar `opencode.json`, reinicia `opencode serve` o recarga el panel de la extensión.

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
config/apis.example.json # Plantilla JSON de failover por proveedor
docs/                   # Guías de proveedores OpenCode
opencode-adapter.mjs    # Servidor MCP
```

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
| Modelos que no responden / EOL (`410 Gone`) | No es un fallo de la extensión: OpenCode sigue listando modelos retirados en `/provider`. Usa otro modelo (tabla en [Modelos retirados](#modelos-retirados-eol-410-gone)), `blacklist` en `opencode.json`, o instala VSIX ≥ 1.0.51 para filtro y auto-cambio en el panel |
| Cambios del repo no aparecen | Reinstala el `.vsix` compilado; Reload Window no lee el repo directamente |
| Depurar envíos / failover | **View → Output → OpenCode Chat** |

---

## Licencia

MIT — ver [LICENSE](LICENSE).
