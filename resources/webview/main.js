(function () {
  const vscode = acquireVsCodeApi();
  
  const messagesEl = document.getElementById('messages');
  const inputEl    = document.getElementById('chatInput');
  const sendBtn    = document.getElementById('sendBtn');
  const typingEl   = document.getElementById('typing');
  const welcomeEl  = document.getElementById('opencode-welcome');
  const modelBtn   = document.getElementById('modelBtn');
  const modelNameEl = document.getElementById('modelName');
  const dropdown   = document.getElementById('modelDropdown');
  const dropOverlay = document.getElementById('dropOverlay');
  const modePill = document.getElementById('modePill');
  const contextBar = document.getElementById('contextBar');
  const contextBarScroll = document.getElementById('contextBarScroll');
  const contextBarActions = document.getElementById('contextBarActions');
  const ctxTokenBadge = document.getElementById('ctxTokenBadge');
  const contextArea = document.getElementById('contextArea');
  const contextListBtn = document.getElementById('contextListBtn');
  const contextListCount = document.getElementById('contextListCount');
  const contextListPanel = document.getElementById('contextListPanel');
  const contextListBody = document.getElementById('contextListBody');
  const contextSelectAll = document.getElementById('contextSelectAll');
  const contextRemoveSelectedBtn = document.getElementById('contextRemoveSelectedBtn');
  const contextRemoveAllBtn = document.getElementById('contextRemoveAllBtn');
  const contextListCloseBtn = document.getElementById('contextListCloseBtn');
  const stopBtn    = document.getElementById('stopBtn');
  const stopBtnSep = document.getElementById('stopBtnSep');

// Seleccionamos los botones de las herramientas usando IDs específicos
   const attachFileBtn = document.getElementById('attachFileBtn');
   const attachFolderBtn = document.getElementById('attachFolderBtn');
   const insertCodeBtn = document.getElementById('insertCodeBtn');
   const currentFileBtn = document.getElementById('currentFileBtn');
   const selectionBtn = document.getElementById('selectionBtn');
   const gitDiffBtn = document.getElementById('gitDiffBtn');
   const gitContextBtn = document.getElementById('gitContextBtn');
   const contextAddBtn = document.getElementById('contextAddBtn');

    let contextWarnTokens = 32000;
    let contextHardWarnTokens = 64000;
    let currentContextItems = [];
    let contextListOpen = false;

    let streamingNode = null;
    let streamingBodyNode = null;
    let streamingMetaNode = null;
    let selectedModel = '';
    let allModels = [];
    let favoritedModels = [];
    let hiddenProviders = [];
    let configuredProviders = [];
    let selectedAgent = '';
    let localModeEnabled = false;
    const BRANDING = {
      opencode: {
        productName: 'OpenCode',
        logoText: 'opencode',
        aiRole: 'opencode',
        aiAvatar: 'OC',
        readyEs: 'OpenCode listo',
        readyEn: 'OpenCode ready',
      },
      lmstudio: {
        productName: 'LM Studio',
        logoText: 'LM Studio',
        aiRole: 'LM Studio',
        aiAvatar: 'LS',
        readyEs: 'LM Studio listo',
        readyEn: 'LM Studio ready',
      },
    };
    let selectedMode = 'auto'; // agent / auto
    let attachments = [];
    let costData = {};
    let generationInterval = null;
    let generationStartTime = null;
    let templateDropdown = document.getElementById('templateDropdown');
    let templates = [];
    let selectedTemplateName = '';



  
  const TRANSLATIONS = {
    en: {
      'agent': 'Agent',
      'mode': 'Mode',
      'clearChat': 'Clear chat',
      'settings': 'Settings',
      'costs': 'Cumulative Costs',
      'hideCosts': 'Hide costs',
      'gitContext': 'Add Git info to context',
      'ready': 'OpenCode ready',
      'readyDesc': 'Ask a question, generate code or open a file as context.',
      'thinking': 'Thinking...'
    }
  };

  function applyI18n() {
    const isSpanish = window.vscodeLang?.startsWith('es');
    const lang = isSpanish ? null : 'en';
    if (!lang) return;
    
    const t = TRANSLATIONS[lang];
    if (!t) return;

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (t[key]) el.textContent = t[key];
    });

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (t[key]) el.setAttribute('title', t[key]);
    });
  }

  applyI18n();

  if (typeof window.__localModeEnabled === 'boolean') {
    localModeEnabled = window.__localModeEnabled;
  }

  function getBranding() {
    return localModeEnabled ? BRANDING.lmstudio : BRANDING.opencode;
  }

  function applyBranding() {
    const b = getBranding();
    document.body.classList.toggle('theme-lmstudio', localModeEnabled);
    document.title = b.productName;

    const logoText = document.querySelector('.logo-text');
    if (logoText) logoText.textContent = b.logoText;

    const welcomeH2 = document.querySelector('.opencode-welcome h2');
    if (welcomeH2) {
      const isEnglish = window.vscodeLang && !window.vscodeLang.startsWith('es');
      welcomeH2.textContent = isEnglish ? b.readyEn : b.readyEs;
    }

    const typingAvatar = document.querySelector('.typing-avatar');
    if (typingAvatar) typingAvatar.textContent = b.aiAvatar;

    document.querySelectorAll('.logo-icon img, .opencode-welcome-icon img').forEach((img) => {
      img.alt = b.logoText;
    });

    updateTopbarDisplay();
  }

  applyBranding();

  function setStatus(state, detail) {
    const modelDot = document.querySelector('.model-dot');
    if (state === 'busy' || state === 'failover') {
      showTyping(detail || (state === 'failover' ? 'Failover: reintentando…' : undefined));
      if (modelDot) modelDot.classList.toggle('failover-pulse', state === 'failover');
      if (!generationInterval) {
        generationStartTime = Date.now();
        generationInterval = setInterval(() => {
          const elapsed = ((Date.now() - generationStartTime) / 1000).toFixed(1);
          const timerEl = document.getElementById('typingTimer');
          if (timerEl) {
            timerEl.textContent = `(${elapsed}s)`;
          }
        }, 100);
      }
      sendBtn.disabled = true;
      inputEl.disabled = true;
       // Switch send button to abort mode
       sendBtn.innerHTML = `<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`;
       sendBtn.title = "Cancelar (Esc)";
       sendBtn.classList.add('abort');
       sendBtn.onclick = () => { vscode.postMessage({ type: 'abort' }); };
       sendBtn.disabled = false;
       if (stopBtn) stopBtn.style.display = 'inline-flex';
       if (stopBtnSep) stopBtnSep.style.display = 'block';

    } else {
      if (modelDot) modelDot.classList.remove('failover-pulse');
      if (generationInterval) {
        clearInterval(generationInterval);
        generationInterval = null;
      }
      const timerEl = document.getElementById('typingTimer');
      if (timerEl) {
        timerEl.textContent = '';
      }
      hideTyping();
      sendBtn.disabled = false;
      inputEl.disabled = false;
       // Restore send button to send mode
       sendBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg>`;
       sendBtn.title = "Enviar (Enter)";
       sendBtn.classList.remove('abort');
       sendBtn.onclick = sendMessage;
       sendBtn.disabled = false;
       if (stopBtn) stopBtn.style.display = 'none';
       if (stopBtnSep) stopBtnSep.style.display = 'none';

      if (state === 'idle') inputEl.focus();
    }
  }
  
  

   function appendMeta(node, metrics) {
     if (!metrics) return;
     const meta = document.createElement('div');
     meta.className = 'msg-meta';
     meta.style.fontSize = '10px';
     meta.style.color = 'var(--text-sec)';
     meta.style.marginTop = '6px';
     meta.style.textAlign = 'right';
     let timeStr = '';
     if (generationStartTime) {
       timeStr = ` | Tiempo: ${((Date.now() - generationStartTime) / 1000).toFixed(1)}s`;
     }
     meta.textContent = `Tokens - In: ${metrics.input || 0} | Out: ${metrics.output || 0}${timeStr}`;
     node.appendChild(meta);
   }

   function updateMonthlyTotal() {
        const totalDiv = document.getElementById('monthlyTotal');
        if (!totalDiv) return;
        // Aggregate by month (YYYY-MM)
        const monthMap = {};
        for (const date in costData) {
            const month = date.slice(0,7); // YYYY-MM
            if (!monthMap[month]) monthMap[month] = { usd: 0, eur: 0 };
            const models = costData[date];
            for (const model in models) {
                monthMap[month].usd += models[model].usd;
                monthMap[month].eur += models[model].eur;
            }
        }
        // Get latest month
        const months = Object.keys(monthMap).sort((a,b)=> new Date(b)-new Date(a));
        if (months.length===0) {
            totalDiv.textContent='';
            return;
        }
        const latest = months[0];
        const data = monthMap[latest];
        totalDiv.innerHTML = `Total: ${latest}<br>${data.usd.toFixed(2)}$ || ${data.eur.toFixed(2)}€`;
    }

   function updateCostPanel() {
      // Also update monthly total card
      updateMonthlyTotal();
     const costContent = document.getElementById('costContent');
     if (!costContent) return;

     costContent.innerHTML = '';

     const dates = Object.keys(costData).sort((a, b) => new Date(b) - new Date(a));

     dates.forEach(date => {
       const dateEntry = document.createElement('div');
       dateEntry.className = 'cost-entry';

       const dateHeader = document.createElement('div');
       dateHeader.className = 'cost-date';
       dateHeader.textContent = date;

       const models = costData[date];
       const modelEntries = Object.keys(models).map(model => {
         const modelEntry = document.createElement('div');
         modelEntry.className = 'cost-model';

         const modelName = document.createElement('span');
         modelName.className = 'cost-model-name';
         modelName.textContent = model;
         modelName.title = model;

         const modelCost = document.createElement('span');
         modelCost.className = 'cost-amount';
          modelCost.textContent = `${models[model].usd.toFixed(2)} | €${models[model].eur.toFixed(2)}`;

         modelEntry.appendChild(modelName);
         modelEntry.appendChild(modelCost);

         return modelEntry;
       });

       dateEntry.appendChild(dateHeader);
       modelEntries.forEach(entry => dateEntry.appendChild(entry));

       costContent.appendChild(dateEntry);
     });
   }

  function showTyping(detail) {
    const typingTextEl = document.getElementById('typingText');
    if (typingTextEl) {
      typingTextEl.textContent = detail || 'Pensando...';
    }
    typingEl.classList.add('visible');
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function hideTyping() {
    typingEl.classList.remove('visible');
  }

  function renderBody(text) {
    let escaped = escHtml(text);
    let html = escaped
      .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
        `<pre><code>${code.trim()}</code></pre>`)
      .replace(/`([^`]+)`/g, (_, code) => `<code>${code}</code>`);

    // Reemplazar indicadores de llamadas a herramientas con spinners y estilos Premium
    html = html.replace(/[>&gt;]\s*⚙️\s*Ejecutando:\s*<code>([^<]+)<\/code>\.\.\./g, (_, tool) => {
      return `<div class="tool-status running">
        <span class="tool-spinner"></span>
        <span>Ejecutando herramienta: <strong>${tool}</strong></span>
      </div>`;
    });

    html = html.replace(/[>&gt;]\s*✅\s*Completado:\s*<code>([^<]+)<\/code>/g, (_, tool) => {
      return `<div class="tool-status success">
        <span class="tool-icon-check">✓</span>
        <span>Completado: <strong>${tool}</strong></span>
      </div>`;
    });

    html = html.replace(/[>&gt;]\s*❌\s*Error en\s*<code>([^<]+)<\/code>/g, (_, tool) => {
      return `<div class="tool-status error">
        <span class="tool-icon-error">✗</span>
        <span>Error en: <strong>${tool}</strong></span>
      </div>`;
    });

    html = html.replace(/[>&gt;]\s*🔐\s*Esperando permiso:\s*<code>([^<]+)<\/code>\.\.\./g, (_, permTitle) => {
      return `<div class="tool-status error" style="border-color: var(--accent-dim); color: var(--text-pri);">
        <span class="tool-spinner" style="border-top-color: #ffb300; border-right-color: #ffb300;"></span>
        <span>Esperando permiso: <strong>${permTitle}</strong> (revisa la notificación en la esquina inferior derecha)</span>
      </div>`;
    });

    html = html.replace(/\n/g, '<br>');
    return html;
  }

  function escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function createMsgElement(role, text) {
    if (welcomeEl && (role === 'user' || role === 'ai')) {
      welcomeEl.style.display = 'none';
    }

    const now = new Date();
    const time = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');

    const msgEl = document.createElement('div');
    msgEl.className = 'msg ' + role;
    msgEl.dataset.rawText = text; // Guardar texto original para edición

    const isSystem = role === 'system' || role === 'error';
    const brand = getBranding();
    const displayRole = isSystem ? role : (role === 'ai' ? brand.aiRole : 'tú');
    const avatarTxt = isSystem ? '!' : (role === 'ai' ? brand.aiAvatar : 'Tú');
    
    let bodyHtml = renderBody(text);
    if (role === 'error') {
      bodyHtml = `<span style="color: #ff6b6b">${escHtml(text)}</span>`;
      msgEl.style.backgroundColor = 'rgba(255, 0, 0, 0.05)';
      msgEl.style.border = '1px solid rgba(255, 0, 0, 0.2)';
    } else if (role === 'system') {
      bodyHtml = `<span style="color: var(--text-muted); font-style: italic">${escHtml(text)}</span>`;
      msgEl.style.backgroundColor = 'transparent';
      msgEl.style.border = 'none';
    }

    msgEl.innerHTML = `
      <div class="msg-header">
        <div class="msg-avatar ${role}">${avatarTxt}</div>
        <span class="msg-role">${displayRole}</span>
        <span class="msg-time">${time}</span>
      </div>
      <div class="msg-body">${bodyHtml}</div>
      <div class="msg-actions">
        ${role === 'user' ? `
          <button class="msg-act-btn btn-edit">
            <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            editar
          </button>
        ` : ''}
        <button class="msg-act-btn btn-copy">
          <svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          copiar
        </button>
        ${role === 'ai' ? `<button class="msg-act-btn"><svg viewBox="0 0 24 24"><path d="M23 7L16 12L23 17V7zM1 5h12a2 2 0 012 2v10a2 2 0 01-2 2H1a2 2 0 01-2-2V7a2 2 0 012-2z"/></svg>insertar</button>` : ''}
      </div>
    `;

    return msgEl;
  }

  function appendMessage(role, text) {
    const threshold = 120;
    const isNearBottom = messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight <= threshold;

    const msgEl = createMsgElement(role, text);
    typingEl.before(msgEl);

    if (role === 'user' || isNearBottom) {
      messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' });
    }
    return msgEl;
  }

  function clearChat() {
    vscode.postMessage({ type: 'clearChat' });
  }

  function updateStream(text) {
    const threshold = 120;
    const isNearBottom = messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight <= threshold;

    if (!streamingNode) {
      streamingNode = appendMessage('ai', text);
      streamingBodyNode = streamingNode.querySelector('.msg-body');
    } else {
      if (streamingBodyNode) {
        streamingBodyNode.innerHTML = renderBody(text);
      }
    }
    if (isNearBottom) {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }

  function finishStream(text, metrics) {
    const threshold = 120;
    const isNearBottom = messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight <= threshold;

    if (streamingNode) {
      if (streamingBodyNode && text) {
         streamingBodyNode.innerHTML = renderBody(text);
      }
    } else if (text) {
      streamingNode = appendMessage('ai', text);
      streamingBodyNode = streamingNode.querySelector('.msg-body');
    }
    
    if (streamingNode && metrics) {
      appendMeta(streamingNode.querySelector('.msg-body'), metrics);
    }
    
    streamingNode = null;
    streamingBodyNode = null;
    streamingMetaNode = null;

    if (isNearBottom) {
      messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' });
    }
  }

  window.copyMsg = function(btn) {
    const body = btn.closest('.msg').querySelector('.msg-body');
    vscode.postMessage({ type: 'copyToClipboard', text: body.innerText });
    btn.textContent = 'copiado ✓';
    setTimeout(() => {
      btn.innerHTML = `<svg viewBox="0 0 24 24" style="width:11px;height:11px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> copiar`;
    }, 1500);
  };

  messagesEl.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.btn-edit');
    if (editBtn) {
      window.editMsg(editBtn);
      return;
    }
    const copyBtn = e.target.closest('.btn-copy');
    if (copyBtn) {
      window.copyMsg(copyBtn);
      return;
    }
  });

  /* auto-resize textarea */
  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
  });

  /* envio con Enter (Shift+Enter = salto) */
  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

     /* mostrar plantillas con \"/\" */
   inputEl.addEventListener('keydown', e => {
     if (e.key === '/' && !e.shiftKey) {
       e.preventDefault();
       closeAllDropdowns();
       if (templateDropdown) {
         templateDropdown.classList.add('open');
         dropOverlay.classList.add('open');
       }
     }
   });
	
   // Initial mode set; actual handler updated via setStatus

  function closeContextMenu() {
    const contextMenu = document.getElementById('contextMenu');
    if (contextMenu) contextMenu.classList.remove('show');
  }

  function updateContextTokenBadge(estimatedTokens, warnTokens, hardWarnTokens) {
    if (warnTokens !== undefined) contextWarnTokens = warnTokens;
    if (hardWarnTokens !== undefined) contextHardWarnTokens = hardWarnTokens;
    const badge = ctxTokenBadge;
    if (!badge) return;
    if (!badge.onclick) {
      badge.onclick = () => vscode.postMessage({ type: 'trimContext', action: 'menu' });
    }
    const est = estimatedTokens || 0;
    badge.textContent = `~${est.toLocaleString()} tokens`;
    badge.classList.remove('warn', 'hard');
    if (est >= contextHardWarnTokens) badge.classList.add('hard');
    else if (est >= contextWarnTokens) badge.classList.add('warn');
  }

  function getContextTagInsertPoint() {
    const scroll = contextBarScroll || contextBar;
    const dropdown = scroll.querySelector('.context-dropdown');
    return { scroll, dropdown };
  }

  function closeContextListPanel() {
    contextListOpen = false;
    if (contextListPanel) {
      contextListPanel.classList.remove('open');
      contextListPanel.setAttribute('aria-hidden', 'true');
    }
    if (contextListBtn) contextListBtn.classList.remove('open');
  }

  function openContextListPanel() {
    contextListOpen = true;
    if (contextListPanel) {
      contextListPanel.classList.add('open');
      contextListPanel.setAttribute('aria-hidden', 'false');
    }
    if (contextListBtn) contextListBtn.classList.add('open');
    renderContextListPanel(currentContextItems);
  }

  function toggleContextListPanel() {
    if (contextListOpen) closeContextListPanel();
    else openContextListPanel();
  }

  function updateContextListSelectionState() {
    if (!contextListBody || !contextRemoveSelectedBtn || !contextSelectAll) return;
    const boxes = contextListBody.querySelectorAll('.context-list-row-check');
    const checked = [...boxes].filter((b) => b.checked);
    contextRemoveSelectedBtn.disabled = checked.length === 0;
    if (boxes.length === 0) {
      contextSelectAll.checked = false;
      contextSelectAll.indeterminate = false;
      return;
    }
    contextSelectAll.checked = checked.length === boxes.length;
    contextSelectAll.indeterminate = checked.length > 0 && checked.length < boxes.length;
  }

  function formatContextSize(bytes) {
    const n = Number(bytes) || 0;
    if (n < 1024) return '<1 KB';
    const kb = n / 1024;
    return kb < 100 ? `${kb.toFixed(1)} KB` : `${Math.round(kb)} KB`;
  }

  function formatLabelColor(label) {
    if (!label) return '';
    const parts = label.split('/');
    if (parts.length > 1) {
      const fileName = parts.pop();
      const folderPath = parts.join('/') + '/';
      const color = localModeEnabled ? '#ff9800' : '#4caf50';
      return `<span style="color: ${color}; font-weight: 500;">${escHtml(folderPath)}</span>${escHtml(fileName)}`;
    }
    return escHtml(label);
  }

  function renderContextListPanel(items) {
    if (!contextListBody) return;
    contextListBody.innerHTML = '';
    if (!items || items.length === 0) {
      contextListBody.innerHTML = '<div class="context-list-empty">No hay archivos en contexto</div>';
      updateContextListSelectionState();
      return;
    }
    items.forEach((item) => {
      const label = typeof item === 'string' ? item : item.label;
      const index = typeof item === 'string' ? undefined : item.index;
      const priority = typeof item === 'string' ? undefined : item.priority;
      const sizeLabel = typeof item === 'string' ? '' : formatContextSize(item.sizeBytes);
      const row = document.createElement('div');
      row.className = 'context-list-row';
      if (priority === 'critical') row.classList.add('ctx-priority-critical');
      else if (priority === 'ref') row.classList.add('ctx-priority-ref');
      row.innerHTML = `
        <input type="checkbox" class="context-list-row-check" data-index="${index ?? ''}" />
        <span class="context-list-row-label" title="${escHtml(label)}">${formatLabelColor(label)}</span>
        ${sizeLabel ? `<span class="context-list-row-size">${escHtml(sizeLabel)}</span>` : ''}
        <span class="context-list-row-close" title="Quitar del contexto">
          <svg viewBox="0 0 10 10" width="8" height="8" fill="none" stroke="currentColor" stroke-width="2"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7"/></svg>
        </span>
      `;
      const checkbox = row.querySelector('.context-list-row-check');
      checkbox.addEventListener('change', updateContextListSelectionState);
      row.querySelector('.context-list-row-close').onclick = (e) => {
        e.stopPropagation();
        if (index !== undefined) vscode.postMessage({ type: 'removeContext', index });
      };
      contextListBody.appendChild(row);
    });
    updateContextListSelectionState();
  }

  function renderContextItems(items) {
    currentContextItems = items || [];
    const count = currentContextItems.length;
    if (contextListBtn) {
      contextListBtn.style.display = count > 0 ? 'flex' : 'none';
    }
    if (contextListCount) {
      contextListCount.textContent = String(count);
    }
    if (count === 0) {
      closeContextListPanel();
    } else if (contextListOpen) {
      renderContextListPanel(currentContextItems);
    }
    const scrollRoot = contextBarScroll || contextBar;
    const existingCtx = scrollRoot.querySelectorAll('.ctx-tag:not(.ctx-att)');
    existingCtx.forEach(el => el.remove());
    (items || []).forEach((item) => {
      const label = typeof item === 'string' ? item : item.label;
      const index = typeof item === 'string' ? undefined : item.index;
      const priority = typeof item === 'string' ? undefined : item.priority;
      const tag = document.createElement('div');
      tag.className = 'ctx-tag';
      if (priority === 'critical') tag.classList.add('ctx-priority-critical');
      else if (priority === 'ref') tag.classList.add('ctx-priority-ref');
      tag.innerHTML = `
        <svg viewBox="0 0 16 16"><path d="M4 4h8M4 8h6M4 11h4" stroke-linecap="round"/></svg>
        ${formatLabelColor(label)}
        <span class="ctx-tag-close">
          <svg viewBox="0 0 10 10" width="8" height="8" fill="none" stroke="currentColor" stroke-width="2"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7"/></svg>
        </span>
      `;
      tag.querySelector('.ctx-tag-close').onclick = (e) => {
        e.stopPropagation();
        if (index !== undefined) vscode.postMessage({ type: 'removeContext', index });
      };
      tag.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (index !== undefined) vscode.postMessage({ type: 'contextTagMenu', index });
      });
      const { scroll, dropdown } = getContextTagInsertPoint();
      if (dropdown) scroll.insertBefore(tag, dropdown);
      else scroll.appendChild(tag);
    });
  }

  window.trimContextAll = function () {
    vscode.postMessage({ type: 'trimContext', action: 'all' });
    closeContextMenu();
  };
  window.trimContextLarge = function () {
    vscode.postMessage({ type: 'trimContext', action: 'large' });
    closeContextMenu();
  };
  window.trimContextLast = function () {
    vscode.postMessage({ type: 'trimContext', action: 'last' });
    closeContextMenu();
  };

  window.openContextList = function () {
    closeContextMenu();
    openContextListPanel();
  };

  function renderAttachments() {
    const scrollRoot = contextBarScroll || contextBar;
    const existingAtts = scrollRoot.querySelectorAll('.ctx-att');
    existingAtts.forEach(el => el.remove());
    
    attachments.forEach((att, index) => {
      const tag = document.createElement('div');
      tag.className = 'ctx-tag ctx-att';
      tag.style.backgroundColor = '#1a334d';
      tag.style.borderColor = '#29527a';
      tag.style.color = '#7ab8ff';

      const isImg = att.mime && att.mime.startsWith('image/');
      const previewSrc = att.previewUrl || (att.url && att.url.startsWith('data:') ? att.url : '');
      const iconOrThumb = isImg && previewSrc
        ? `<img src="${previewSrc}" style="width:16px;height:16px;object-fit:cover;border-radius:2px;" />`
        : `<svg viewBox="0 0 24 24" style="width:10px;height:10px;fill:none;stroke:currentColor;stroke-width:2;"><path d="M21.44 11.05L12.25 20.24a6 6 0 01-8.49-8.49l9.2-9.19a4 4 0 015.66 5.65L9.41 17.41a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>`;

      tag.innerHTML = `
        ${iconOrThumb}
        <span style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:0 4px;">${escHtml(att.filename || (att.text && att.text.startsWith('Archivo: ') ? att.text.split('\n')[0].slice(9) : 'Adjunto'))}</span>
        <span class="ctx-tag-close">
          <svg viewBox="0 0 10 10" width="8" height="8" fill="none" stroke="currentColor" stroke-width="2"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7"/></svg>
        </span>
      `;
      tag.querySelector('.ctx-tag-close').onclick = () => {
        attachments.splice(index, 1);
        renderAttachments();
      };
      
      const { scroll, dropdown } = getContextTagInsertPoint();
      if (dropdown) {
          scroll.insertBefore(tag, dropdown);
      } else {
          scroll.appendChild(tag);
      }
   });
   }

function renderTemplateDropdown() {
    const list = templateDropdown.querySelector('.dropdown-models-list');
    if (!list) {
        // Create models list if not exists
        const modelsList = document.createElement('div');
        modelsList.className = 'dropdown-models-list';
        const section = templateDropdown.querySelector('.dropdown-section');
        if (section) {
            section.appendChild(modelsList);
        } else {
            // fallback: create section
            const section = document.createElement('div');
            section.className = 'dropdown-section';
            section.innerHTML = '<div class="dropdown-label">Plantillas</div>';
            templateDropdown.appendChild(section);
            section.appendChild(modelsList);
        }
    } else {
        list.innerHTML = '';
    }
    templates.forEach(t => {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        item.dataset.template = t.name;
        item.innerHTML = `
            <div class="dropdown-check">${selectedTemplateName === t.name ? '✓' : ''}</div>
            <div style="flex:1;">${t.name}</div>
        `;
        list.appendChild(item);
    });
}

   window.editMsg = function(btn) {
     const msgEl = btn.closest('.msg');
     const rawText = msgEl.dataset.rawText || '';
     inputEl.value = rawText;
    inputEl.focus();
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
  };

  function sendMessage() {
    const text = inputEl.value.trim();
    if (!text && attachments.length === 0) return;

    appendMessage('user', text || '(Solo adjuntos)');
    setStatus('busy');
    
    inputEl.value = '';
    inputEl.style.height = 'auto';
    
    vscode.postMessage({ 
      type: 'send', 
      text, 
      agent: selectedAgent || '',
      model: selectedModel,
      attachments: [...attachments]
    });
    
    attachments = [];
    renderAttachments();
  }

  window.sendQuick = function(text) {
    appendMessage('user', text);
    setStatus('busy');
    vscode.postMessage({
      type: 'quickAction',
      text: text,
      model: selectedModel,
      agent: selectedAgent || ''
    });
  };

   window.addCtxTag = function() {
     vscode.postMessage({ type: 'addContextFile' });
   };

   window.addContextFile = function() {
     showButtonFeedback(contextAddBtn, contextAddBtn.innerHTML, 500);
     vscode.postMessage({ type: 'addContextFile' });
   };

   window.addCurrentFile = function() {
     showButtonFeedback(contextAddBtn, contextAddBtn.innerHTML, 500);
     vscode.postMessage({ type: 'addCurrentFileToContext' });
   };

   window.addSelection = function() {
     showButtonFeedback(contextAddBtn, contextAddBtn.innerHTML, 500);
     vscode.postMessage({ type: 'addSelectionToContext' });
   };

   window.addOpenFiles = function() {
     showButtonFeedback(contextAddBtn, contextAddBtn.innerHTML, 500);
     vscode.postMessage({ type: 'addOpenFilesToContext' });
   };

   window.attachFolder = function() {
     showButtonFeedback(contextAddBtn, contextAddBtn.innerHTML, 500);
     vscode.postMessage({ type: 'attachFolder' });
   };

   function showButtonFeedback(button, originalContent, duration = 1000) {
     const originalHTML = button.innerHTML;
     button.style.opacity = '0.5';
     button.disabled = true;
     setTimeout(() => {
       button.innerHTML = originalContent;
       button.style.opacity = '1';
       button.disabled = false;
     }, duration);
   }

  function updateTopbarDisplay() {
    const agentText = selectedAgent ? `@${selectedAgent}` : 'Default';
    const modelText = selectedModel ? selectedModel.split('::').pop() : 'default';
    const prefix = localModeEnabled ? 'LM Studio · ' : '';
    if (modelNameEl) modelNameEl.innerHTML = `<span class="model-display">${escHtml(prefix + modelText)}</span>`;
    const agentNameEl = document.getElementById('agentName');
    if (agentNameEl) agentNameEl.textContent = agentText;
  }

  // Header buttons
   const exportChatBtn = document.getElementById('exportChatBtn');
   if (exportChatBtn) {
     exportChatBtn.addEventListener('click', () => {
       vscode.postMessage({ type: 'exportChat' });
     });
   }

    const toggleCostPanelBtn = document.getElementById('toggleCostPanelBtn');
    const closeCostPanelBtn = document.getElementById('closeCostPanelBtn');

    function toggleCostPanel() {
      document.body.classList.toggle('cost-panel-open');
    }

    if (toggleCostPanelBtn) {
      toggleCostPanelBtn.addEventListener('click', toggleCostPanel);
    }
    if (closeCostPanelBtn) {
      closeCostPanelBtn.addEventListener('click', toggleCostPanel);
    }
     if (stopBtn) {
       stopBtn.addEventListener('click', () => {
         vscode.postMessage({ type: 'abort' });
       });
     }
  document.getElementById('clearChatBtn').addEventListener('click', () => {
    clearChat();
  });
  document.querySelector('[title="Nueva sesión"]').addEventListener('click', () => vscode.postMessage({ type: 'newSession' }));
  document.querySelector('[title="Historial"]').addEventListener('click', () => vscode.postMessage({ type: 'showHistory' }));
  document.querySelector('[title="Configuración"]').addEventListener('click', () => vscode.postMessage({ type: 'openSettings' }));
  
  if (attachFileBtn) {
    attachFileBtn.addEventListener('click', () => {
      showButtonFeedback(attachFileBtn, attachFileBtn.innerHTML, 500);
      vscode.postMessage({ type: 'attachFile' });
    });
  }

  if (attachFolderBtn) {
    attachFolderBtn.addEventListener('click', () => {
      showButtonFeedback(attachFolderBtn, attachFolderBtn.innerHTML, 500);
      vscode.postMessage({ type: 'attachFolder' });
    });
  }

  if (insertCodeBtn) {
    insertCodeBtn.addEventListener('click', () => {
      showButtonFeedback(insertCodeBtn, insertCodeBtn.innerHTML, 500);
      vscode.postMessage({ type: 'insertCodeBlock' });
    });
  }

  if (currentFileBtn) {
    currentFileBtn.addEventListener('click', () => {
      showButtonFeedback(currentFileBtn, currentFileBtn.innerHTML, 500);
      vscode.postMessage({ type: 'addCurrentFileToContext' });
    });
  }

  if (selectionBtn) {
    selectionBtn.addEventListener('click', () => {
      showButtonFeedback(selectionBtn, selectionBtn.innerHTML, 500);
      vscode.postMessage({ type: 'addSelectionToContext' });
    });
  }

if (gitDiffBtn) {
     gitDiffBtn.addEventListener('click', () => {
       showButtonFeedback(gitDiffBtn, gitDiffBtn.innerHTML, 500);
       vscode.postMessage({ type: 'gitDiff' });
     });
   }

   if (gitContextBtn) {
     gitContextBtn.addEventListener('click', () => {
       showButtonFeedback(gitContextBtn, gitContextBtn.innerHTML, 500);
       vscode.postMessage({ type: 'addGitToContext' });
     });
   }

  if (contextAddBtn) {
    contextAddBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const contextMenu = document.getElementById('contextMenu');
      if (contextMenu) {
        contextMenu.classList.toggle('show');
      }
      showButtonFeedback(contextAddBtn, contextAddBtn.innerHTML, 500);
    });
  }

  if (contextListBtn) {
    contextListBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleContextListPanel();
    });
  }

  if (contextSelectAll) {
    contextSelectAll.addEventListener('change', () => {
      if (!contextListBody) return;
      const boxes = contextListBody.querySelectorAll('.context-list-row-check');
      boxes.forEach((b) => { b.checked = contextSelectAll.checked; });
      updateContextListSelectionState();
    });
  }

  if (contextRemoveSelectedBtn) {
    contextRemoveSelectedBtn.addEventListener('click', () => {
      if (!contextListBody) return;
      const indices = [...contextListBody.querySelectorAll('.context-list-row-check:checked')]
        .map((el) => parseInt(el.dataset.index, 10))
        .filter((n) => !Number.isNaN(n));
      if (indices.length > 0) {
        vscode.postMessage({ type: 'removeContextBatch', indices });
      }
    });
  }

  if (contextRemoveAllBtn) {
    contextRemoveAllBtn.addEventListener('click', () => {
      vscode.postMessage({ type: 'trimContext', action: 'all' });
      closeContextListPanel();
    });
  }

  if (contextListCloseBtn) {
    contextListCloseBtn.addEventListener('click', closeContextListPanel);
  }

  // Cerrar el menú cuando se hace clic fuera
  document.addEventListener('click', (e) => {
    const contextDropdown = document.querySelector('.context-dropdown');
    const contextMenu = document.getElementById('contextMenu');
    if (contextDropdown && !contextDropdown.contains(e.target) && contextMenu) {
      contextMenu.classList.remove('show');
    }
    if (contextArea && contextListOpen && !contextArea.contains(e.target)) {
      closeContextListPanel();
    }
  });

  /* dropdown modelo, agente, modo */
  const agentBtn = document.getElementById('agentBtn');
  const agentDropdown = document.getElementById('agentDropdown');
  const modeBtn = document.getElementById('modeBtn');
  const modeDropdown = document.getElementById('modeDropdown');

   function closeAllDropdowns() {
     dropdown.classList.remove('open');
     if(agentDropdown) agentDropdown.classList.remove('open');
     if(modeDropdown) modeDropdown.classList.remove('open');
     if(templateDropdown) templateDropdown.classList.remove('open');
     const manageProvidersDropdown = document.getElementById('manageProvidersDropdown');
     if (manageProvidersDropdown) manageProvidersDropdown.style.display = 'none';
     dropOverlay.classList.remove('open');
   }
  modelBtn.addEventListener('click', e => {
    e.stopPropagation();
    closeAllDropdowns();
    dropdown.classList.add('open');
    dropOverlay.classList.add('open');
  });

  if (agentBtn) {
    agentBtn.addEventListener('click', e => {
      e.stopPropagation();
      closeAllDropdowns();
      agentDropdown.classList.add('open');
      dropOverlay.classList.add('open');
    });
  }

  if (modeBtn) {
    modeBtn.addEventListener('click', e => {
      e.stopPropagation();
      closeAllDropdowns();
      modeDropdown.classList.add('open');
      dropOverlay.classList.add('open');
    });
  }

  dropOverlay.addEventListener('click', closeAllDropdowns);

  function handleDropdownClick(e) {
    const item = e.target.closest('.dropdown-item');
    if (!item) return;

    if (item.dataset.value !== undefined || item.dataset.model !== undefined) {
      selectedModel = item.dataset.value || item.dataset.model;
      dropdown.querySelectorAll('[data-value], [data-model]').forEach(i => {
        const check = i.querySelector('.dropdown-check');
        if(check) check.textContent = '';
        i.classList.remove('active');
      });
      const check = item.querySelector('.dropdown-check');
      if(check) check.textContent = '✓';
      item.classList.add('active');
      closeAllDropdowns();
      updateTopbarDisplay();
      vscode.postMessage({ type: 'setModel', model: selectedModel });
    } else if (item.dataset.agent !== undefined) {
      selectedAgent = item.dataset.agent;
      const list = document.querySelector('.dropdown-agents-list');
      if (list) {
        list.querySelectorAll('[data-agent]').forEach(i => {
          const check = i.querySelector('.dropdown-check');
          if(check) check.textContent = '';
          i.classList.remove('active');
        });
      }
      const check = item.querySelector('.dropdown-check');
      if(check) check.textContent = '✓';
      item.classList.add('active');
      closeAllDropdowns();
      updateTopbarDisplay();
      vscode.postMessage({ type: 'setAgent', agent: selectedAgent });
    } else if (item.dataset.mode !== undefined) {
      selectedMode = item.dataset.mode;
      const mPill = document.getElementById('modePill');
      if (mPill) mPill.textContent = selectedMode;
      const mName = document.getElementById('modeName');
      if (mName) mName.textContent = selectedMode;
      
      const p = item.closest('.dropdown');
      if (p) {
        p.querySelectorAll('[data-mode]').forEach(i => {
          const check = i.querySelector('.dropdown-check');
          if(check) check.textContent = '';
        });
      }
      const check = item.querySelector('.dropdown-check');
      if(check) check.textContent = '✓';
      closeAllDropdowns();
    }
  }

   dropdown.addEventListener('click', handleDropdownClick);
   if (agentDropdown) agentDropdown.addEventListener('click', handleDropdownClick);
   if (modeDropdown) modeDropdown.addEventListener('click', handleDropdownClick);
   if (templateDropdown) templateDropdown.addEventListener('click', handleDropdownClick);

  // Manejar pegar imágenes
  inputEl.addEventListener('paste', (e) => {
    const clipboardData = e.clipboardData || (e.originalEvent && e.originalEvent.clipboardData);
    if (!clipboardData || !clipboardData.items) return;
    const items = clipboardData.items;
    let pastedImage = false;
    for (const item of items) {
      if (item.type && item.type.indexOf('image/') === 0) {
        pastedImage = true;
        const blob = item.getAsFile();
        const reader = new FileReader();
        reader.onload = (event) => {
          const ext = item.type.split('/')[1] || 'png';
          const attachment = {
            type: 'file',
            mime: item.type,
            filename: `image-${Date.now()}.${ext}`,
            url: event.target.result
          };
          vscode.postMessage({
            type: 'processImageAttachment',
            attachment: attachment
          });
        };
        reader.readAsDataURL(blob);
      }
    }
    if (pastedImage) {
      e.preventDefault();
    }
  });

   function calculateCost(inputTokens, outputTokens, model) {
     const modelPrices = {
       'mistral-medium-latest': { input: 2.00, output: 6.00 },
       'default': { input: 2.00, output: 6.00 }
     };

     const price = modelPrices[model] || modelPrices['default'];
     const usd = (inputTokens * price.input + outputTokens * price.output) / 1000000;
     const eur = usd * 0.92;

     return { usd, eur };
   }

   window.addEventListener('message', (event) => {
    const msg = event.data;
    switch (msg.type) {
       case 'init':
          costData = msg.costData || {};
          updateCostPanel();
          templates = msg.templates || [];
          renderTemplateDropdown();
          if (msg.localMode) {
            localModeEnabled = !!msg.localMode.enabled;
            if (localModeEnabled && !msg.localMode.connected) {
              appendMessage('system',
                `Modo LM Studio activo pero no conectado en ${msg.localMode.url}. Inicia el servidor local.`);
            }
          } else {
            localModeEnabled = false;
          }
          applyBranding();
        // Clear existing messages
        const msgs = messagesEl.querySelectorAll('.msg');
        msgs.forEach(m => m.remove());
        if (welcomeEl) welcomeEl.style.display = 'block';

        if (msg.messages && msg.messages.length > 0) {
          if (welcomeEl) welcomeEl.style.display = 'none';
          msg.messages.forEach(m => {
            const role = m.role === 'assistant' ? 'ai' : m.role;
            const node = appendMessage(role, m.text);
            if (role === 'ai' && m.metrics) {
              appendMeta(node.querySelector('.msg-body'), m.metrics);
            }
          });
        }

        // Renderizar agentes en el desplegable
        if (msg.selectedAgent !== undefined) {
          selectedAgent = msg.selectedAgent;
        }
        if (msg.agents) {
          let agentSection = agentDropdown.querySelector('.dropdown-section-agents');
          if (!agentSection) {
            agentSection = document.createElement('div');
            agentSection.className = 'dropdown-section dropdown-section-agents';
            agentDropdown.appendChild(agentSection);
          }
          agentSection.innerHTML = '<div class="dropdown-label">Agente</div>';
          const agentsList = document.createElement('div');
          agentsList.className = 'dropdown-agents-list';
          agentsList.style.maxHeight = '150px';
          agentsList.style.overflowY = 'auto';

          // Opción Default
          const defaultItem = document.createElement('div');
          defaultItem.className = 'dropdown-item' + (!selectedAgent ? ' active' : '');
          defaultItem.dataset.agent = '';
          defaultItem.innerHTML = `
            <div class="dropdown-check">${!selectedAgent ? '✓' : ''}</div>
            <div style="flex:1;">Default</div>
          `;
          agentsList.appendChild(defaultItem);

          const internalAgents = ['compaction', 'plan', 'summary', 'title'];
          msg.agents.forEach(agent => {
            if (internalAgents.includes(agent.name)) return;
            
            const item = document.createElement('div');
            item.className = 'dropdown-item' + (selectedAgent === agent.name ? ' active' : '');
            item.dataset.agent = agent.name;
            item.title = agent.description || '';
            item.innerHTML = `
              <div class="dropdown-check">${selectedAgent === agent.name ? '✓' : ''}</div>
              <div style="flex:1;">${escHtml(agent.name)}</div>
            `;
            agentsList.appendChild(item);
          });
          agentSection.appendChild(agentsList);
        }

        // Renderizar Quick Actions configurables
        if (msg.quickActions && msg.quickActions.length > 0) {
          const container = document.getElementById('quickActionsContainer');
          if (container) {
            container.innerHTML = '';
            msg.quickActions.forEach(qa => {
              const btn = document.createElement('button');
              btn.className = 'qa-btn';
              btn.onclick = () => sendQuick(qa.text);
              let svg = '';
              if (qa.icon === 'info') {
                svg = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>';
              } else if (qa.icon === 'bug') {
                svg = '<svg viewBox="0 0 24 24"><path d="M9 9l-3-3M15 9l3-3M9 15l-3 3M15 15l3 3M12 21a9 9 0 100-18 9 9 0 000 18z"/></svg>';
              } else if (qa.icon === 'test') {
                svg = '<svg viewBox="0 0 24 24"><path d="M9 12l2 2 4-4M7 2h10l2 2v16l-2 2H7l-2-2V4l2-2z"/></svg>';
              } else if (qa.icon === 'refactor') {
                svg = '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
              } else {
                svg = '<svg viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2z"/></svg>';
              }
              btn.innerHTML = `${svg} ${escHtml(qa.label)}`;
              container.appendChild(btn);
            });
          }
        }

        if (msg.favoritedModels) favoritedModels = msg.favoritedModels;
        if (msg.hiddenProviders) hiddenProviders = msg.hiddenProviders;
        if (msg.configuredProviders) configuredProviders = msg.configuredProviders;
        if (msg.models && msg.models.length > 0) {
          allModels = msg.models;
          if (msg.selectedModel) {
            selectedModel = msg.selectedModel;
            const foundModel = msg.models.find(m => (typeof m === 'string' ? m : m.id) === selectedModel);
            if (!foundModel) selectedModel = '';
          }
          if (!selectedModel) {
            const first = msg.models[0];
            selectedModel = typeof first === 'string' ? first : first.id;
          }
          renderModels();
          renderProvidersToggle();
          updateTopbarDisplay();
        }

        if (msg.contextWarnTokens !== undefined) contextWarnTokens = msg.contextWarnTokens;
        if (msg.contextHardWarnTokens !== undefined) contextHardWarnTokens = msg.contextHardWarnTokens;
        renderContextItems(msg.context);
        updateContextTokenBadge(msg.contextTokens, msg.contextWarnTokens, msg.contextHardWarnTokens);
        break;
      case 'updateFavorites':
        favoritedModels = msg.favoritedModels;
        renderModels();
        break;
      case 'updateHiddenProviders':
        hiddenProviders = msg.hiddenProviders;
        renderModels();
        renderProvidersToggle();
        break;
      case 'chatCleared':
        // Eliminar todos los mensajes del DOM
        const msgsToClear = messagesEl.querySelectorAll('.msg');
        msgsToClear.forEach(m => m.remove());
        if (welcomeEl) welcomeEl.style.display = 'block';
        break;
        break;
      case 'connection':
        setStatus(msg.state, msg.detail);
        break;
      case 'status':
        if (msg.state === 'failover') {
          setStatus('failover', msg.detail);
        } else {
          setStatus(msg.state === 'busy' ? 'busy' : 'idle', msg.detail);
        }
        break;
      case 'user':
        appendMessage('user', msg.text);
        break;
      case 'assistantStream':
        updateStream(msg.text);
        if (msg.statusDetail) {
          const typingTextEl = document.getElementById('typingText');
          if (typingTextEl) {
            typingTextEl.textContent = msg.statusDetail;
          }
        }
        break;
       case 'assistantDone':
         finishStream(msg.text, msg.metrics);
         setStatus('idle');
         if (msg.metrics) {
           const today = new Date().toISOString().split('T')[0];
           const model = selectedModel || 'default';
           const cost = calculateCost(msg.metrics.input, msg.metrics.output, model);

           if (!costData[today]) {
             costData[today] = {};
           }

           if (!costData[today][model]) {
             costData[today][model] = { usd: 0, eur: 0 };
           }

           costData[today][model].usd += cost.usd;
           costData[today][model].eur += cost.eur;

           updateCostPanel();
         }
         break;
      case 'system':
        appendMessage('system', msg.text);
        break;
      case 'error':
        appendMessage('error', msg.message);
        streamingNode = null;
        streamingBodyNode = null;
        streamingMetaNode = null;
        break;
case 'context':
         renderContextItems(msg.items || msg.context || []);
         if (msg.estimatedTokens !== undefined) {
           updateContextTokenBadge(msg.estimatedTokens, msg.warnTokens, msg.hardWarnTokens);
         } else if ((msg.items || msg.context || []).length === 0) {
           updateContextTokenBadge(0);
         }
         break;
       case 'gitInfoUpdate':
         // Actualizar visualización de Git en tiempo real
         if (msg.gitInfo) {
           const gitSummary = `${msg.gitInfo.hasChanges ? '⚠️' : '✅'} \`${msg.gitInfo.branch}\` | ${msg.gitInfo.commits.length} commits`;
           // Podrías mostrar esto en un panel de Git si existe
           const gitStatusEl = document.getElementById('gitStatus');
           if (gitStatusEl) {
             gitStatusEl.textContent = gitSummary;
             gitStatusEl.style.display = 'block';
           }
         } else {
           const gitStatusEl = document.getElementById('gitStatus');
           if (gitStatusEl) {
             gitStatusEl.style.display = 'none';
           }
         }
         break;
      case 'insertText':
        if (msg.text) {
          const start = inputEl.selectionStart;
          const end = inputEl.selectionEnd;
          const val = inputEl.value;
          inputEl.value = val.substring(0, start) + msg.text + val.substring(end);
          inputEl.focus();
          inputEl.selectionStart = inputEl.selectionEnd = start + msg.text.length;
          inputEl.style.height = 'auto';
          inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
        }
        break;
      case 'fileAttached':
        attachments.push(msg.attachment);
        renderAttachments();
        break;
      default:
        break;
    }
  });

  function renderModels() {
    const searchVal = (document.getElementById('modelSearchInput')?.value || '').toLowerCase();
    const providers = {};
    const visibleModels = allModels.filter(m => {
      const mName = (typeof m === 'string' ? m : m.name).toLowerCase();
      const mId = (typeof m === 'string' ? m : m.id).toLowerCase();
      return mName.includes(searchVal) || mId.includes(searchVal);
    });

    visibleModels.forEach(model => {
      const mId = typeof model === 'string' ? model : model.id;
      const mName = typeof model === 'string' ? model : model.name;
      let providerId = 'otros';
      let providerName = 'Otros';
      let modelDisplayName = mName;
      
      if (mId.includes('::')) {
        const parts = mId.split('::');
        providerId = parts[0];
        const nameParts = mName.split(' - ');
        if (nameParts.length > 1) {
          providerName = nameParts[0];
          modelDisplayName = nameParts.slice(1).join(' - ');
        } else {
          providerName = providerId;
        }
      }
      
      if (!providers[providerId]) {
        providers[providerId] = { id: providerId, name: providerName, models: [] };
      }
      providers[providerId].models.push({ id: mId, name: modelDisplayName, fullName: mName });
    });

    const favsList = document.getElementById('favoritesList');
    const favsSection = document.getElementById('favoritesSection');
    const provsList = document.getElementById('providersList');
    
    if (favsList) favsList.innerHTML = '';
    if (provsList) provsList.innerHTML = '';
    
    let renderedFavs = 0;

    Object.values(providers).forEach(prov => {
      if (hiddenProviders.includes(prov.id)) return;
      
      const group = document.createElement('div');
      group.className = 'provider-group';
      
      let providerStateIcon = '';
      if (configuredProviders.includes(prov.id.toLowerCase())) {
        providerStateIcon = '<span style="color:var(--accent); margin-left:6px; font-size:10px;" title="API Key Configurada">●</span>';
      } else {
        providerStateIcon = '<span style="color:var(--text-muted); margin-left:6px; font-size:10px;" title="Sin API Key">○</span>';
      }
      
      const header = document.createElement('div');
      header.className = 'provider-header';
      header.innerHTML = `<span class="provider-name">${escHtml(prov.name)}${providerStateIcon}</span><span class="provider-arrow">▾</span>`;
      
      const modelsContainer = document.createElement('div');
      modelsContainer.className = 'provider-models';
      
      prov.models.forEach(m => {
        const isFav = favoritedModels.includes(m.id);
        if (isFav && favsList) {
          favsList.appendChild(createModelItem(m, true, true));
          renderedFavs++;
        }
        modelsContainer.appendChild(createModelItem(m, isFav, false));
      });
      
      header.addEventListener('click', (e) => {
        e.stopPropagation();
        group.classList.toggle('open');
        const arrow = header.querySelector('.provider-arrow');
        if (arrow) arrow.textContent = group.classList.contains('open') ? '▾' : '▸';
      });
      
      group.appendChild(header);
      group.appendChild(modelsContainer);
      if (provsList) provsList.appendChild(group);
    });

    if (favsSection) favsSection.style.display = renderedFavs > 0 ? 'block' : 'none';
  }

  function createModelItem(m, isFav, inFavSection) {
    const item = document.createElement('div');
    item.className = 'dropdown-item';
    item.dataset.value = m.id;
    
    const starClass = isFav ? 'dropdown-star active' : 'dropdown-star';
    const starIcon = isFav ? '★' : '☆';
    
    let modalitiesHtml = '';
    
    // Helper function to guess vision support based on model ID or name
    function hasVisionHeuristic(modelId, modelName) {
      const id = (modelId || '').toLowerCase();
      const name = (modelName || '').toLowerCase();
      const combined = id + ' ' + name;
      const visionKeywords = [
        'vision', '-vl', 'pixtral', 'gpt-4o', 'gpt-4-vision', 
        'claude-3', 'gemini-1.5', 'gemini-2', 'llava', 'minicpm-v'
      ];
      return visionKeywords.some(kw => combined.includes(kw));
    }
    
    // Comprobar la propiedad modalities/architecture del API o usar la heurística
    const hasImageInput = (m.modalities && m.modalities.input && m.modalities.input.includes('image')) || 
                          (m.architecture && m.architecture.modality && m.architecture.modality.includes('image')) ||
                          hasVisionHeuristic(m.id, m.name);
                          
    modalitiesHtml += `<div class="modality-pill" title="Soporta texto${hasImageInput ? ' e imágenes' : ''}">`;
    modalitiesHtml += '<span class="mod-icon mod-text" title="Soporta texto"><svg viewBox="0 0 16 16"><path d="M14 3.5V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h7.5L14 3.5zm-1 0H9.5V1L13 3.5zM3 2v12h10V4.5h-4A.5.5 0 0 1 8.5 4V2H3z"/><path d="M4.5 6a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5zm0 2.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5zm0 2.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5z"/></svg></span>';
    
    if (hasImageInput) {
      modalitiesHtml += '<span class="mod-icon mod-image" title="Soporta imágenes"><svg viewBox="0 0 16 16"><path d="M14 1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 2h12v9.5l-3.5-3.5a.5.5 0 0 0-.7 0L8 9.8 6.2 8a.5.5 0 0 0-.7 0L2 11.5V2zm0 11v-1l4-4 1.8 1.8a.5.5 0 0 0 .7 0L10.5 8l3.5 3.5V13H2z"/><circle cx="4.5" cy="4.5" r="1.5"/></svg></span>';
    }
    
    modalitiesHtml += '</div>';
    
    item.innerHTML = `
      <div class="dropdown-check">${selectedModel === m.id ? '✓' : ''}</div>
      <div class="${starClass}" title="Marcar como favorito">${starIcon}</div>
      <div style="flex:1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escHtml(inFavSection ? m.fullName : m.name)}</div>
      ${modalitiesHtml}
    `;
    
    const starEl = item.querySelector('.dropdown-star');
    starEl.addEventListener('click', (e) => {
      e.stopPropagation();
      vscode.postMessage({ type: 'toggleFavoriteModel', id: m.id });
    });
    
    item.addEventListener('click', () => {
      selectedModel = m.id;
      vscode.postMessage({ type: 'setModel', value: selectedModel });
      updateTopbarDisplay();
      closeAllDropdowns();
    });
    
    return item;
  }

  function renderProvidersToggle() {
    const toggleList = document.getElementById('providersToggleList');
    if (!toggleList) return;
    
    toggleList.innerHTML = '';
    
    const uniqueProvs = {};
    allModels.forEach(model => {
      const mId = typeof model === 'string' ? model : model.id;
      const mName = typeof model === 'string' ? model : model.name;
      let providerId = 'otros';
      let providerName = 'Otros';
      if (mId.includes('::')) {
        const parts = mId.split('::');
        providerId = parts[0];
        const nameParts = mName.split(' - ');
        providerName = nameParts.length > 1 ? nameParts[0] : providerId;
      }
      uniqueProvs[providerId] = providerName;
    });
    
    Object.keys(uniqueProvs).sort().forEach(pId => {
      const item = document.createElement('div');
      item.className = 'dropdown-item';
      const isHidden = hiddenProviders.includes(pId);
      
      item.innerHTML = `
        <label style="display:flex; align-items:center; width:100%; cursor:pointer;">
          <input type="checkbox" ${!isHidden ? 'checked' : ''} style="margin-right: 8px;">
          <span style="flex:1;">${escHtml(uniqueProvs[pId])}</span>
        </label>
      `;
      
      item.querySelector('input').addEventListener('change', (e) => {
        vscode.postMessage({ type: 'toggleProviderVisibility', providerId: pId, visible: e.target.checked });
      });
      
      toggleList.appendChild(item);
    });
  }

  const modelSearchInput = document.getElementById('modelSearchInput');
  if (modelSearchInput) {
    modelSearchInput.addEventListener('input', () => {
      renderModels();
    });
  }
  
  const manageProvidersBtn = document.getElementById('manageProvidersBtn');
  const manageProvidersDropdown = document.getElementById('manageProvidersDropdown');
  const closeManageProvidersBtn = document.getElementById('closeManageProvidersBtn');
  
  if (manageProvidersBtn) {
    manageProvidersBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const modelDropdown = document.getElementById('modelDropdown');
      if (modelDropdown) modelDropdown.classList.remove('open');
      if (manageProvidersDropdown) {
        manageProvidersDropdown.style.display = 'flex';
        manageProvidersDropdown.style.flexDirection = 'column';
      }
    });
  }
  
  if (closeManageProvidersBtn) {
    closeManageProvidersBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (manageProvidersDropdown) manageProvidersDropdown.style.display = 'none';
      const modelDropdown = document.getElementById('modelDropdown');
      if (modelDropdown) modelDropdown.classList.add('open');
    });
  }

  vscode.postMessage({ type: 'ready' });})();
