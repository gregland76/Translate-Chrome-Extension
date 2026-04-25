'use strict';

// ─── Détection de sélection → mise à jour de l'icône en temps réel ──────────

let _selectionTimer = null;

document.addEventListener('selectionchange', () => {
  clearTimeout(_selectionTimer);
  _selectionTimer = setTimeout(() => {
    const selected = window.getSelection()?.toString().trim();
    if (selected && selected.length >= 3) {
      chrome.runtime.sendMessage({
        type: 'SELECTION_CHANGED',
        text: selected.substring(0, 250)
      }).catch(() => { /* service worker non disponible */ });
    }
  }, 600);
});

// ─── Réception des messages du background ────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'TRANSLATION_DONE') {
    handleTranslationDone(message.translatedText, message.sourceLang, message.targetLang);
    sendResponse({ success: true });
  } else if (message.type === 'TRANSLATION_ERROR') {
    showToast(message.message || 'Erreur de traduction.', 'error');
    sendResponse({ success: false });
  }
  return true;
});

// ─── Gestion de la traduction reçue ──────────────────────────────────────────

async function handleTranslationDone(text, sourceLang, targetLang) {
  const copied = await copyToClipboard(text);
  showToast(null, copied ? 'success' : 'warning', sourceLang, targetLang, text);
}

// ─── Copie dans le presse-papiers ────────────────────────────────────────────

async function copyToClipboard(text) {
  // Méthode 1 : API moderne (nécessite contexte sécurisé HTTPS)
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_) { /* fallback */ }

  // Méthode 2 : execCommand (obsolète mais compatible partout)
  const el = document.createElement('textarea');
  el.value = text;
  el.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;';
  document.body.appendChild(el);
  el.focus();
  el.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch (_) { /* ignore */ }
  document.body.removeChild(el);
  return ok;
}

// ─── Toast de notification ───────────────────────────────────────────────────

const FLAGS = { fr: '🇫🇷', en: '🇬🇧' };
const NAMES = { fr: 'Français', en: 'English' };
const TOAST_ID = '__translate-ext-toast__';

/**
 * @param {string|null} customMsg   - Message personnalisé (ou null pour message auto)
 * @param {'success'|'warning'|'error'} type
 * @param {string} [sourceLang]
 * @param {string} [targetLang]
 * @param {string} [translatedText]  - Aperçu de la traduction
 */
function showToast(customMsg, type, sourceLang, targetLang, translatedText) {
  // Supprimer toast existant
  document.getElementById(TOAST_ID)?.remove();

  let message;
  if (customMsg) {
    message = customMsg;
  } else if (type === 'success' || type === 'warning') {
    const srcFlag = FLAGS[sourceLang] || '🌐';
    const tgtFlag = FLAGS[targetLang] || '🌐';
    const srcName = NAMES[sourceLang] || sourceLang?.toUpperCase() || '?';
    const tgtName = NAMES[targetLang] || targetLang?.toUpperCase() || '?';
    const copied = type === 'success' ? '✓ Copié dans le presse-papiers' : '⚠ Copie impossible — traduction :';
    message = `${copied}\n${srcFlag} ${srcName} → ${tgtFlag} ${tgtName}`;
    if (type === 'warning' && translatedText) {
      message += `\n\n"${translatedText.substring(0, 120)}"`;
    }
  } else {
    message = '✗ Erreur de traduction';
  }

  const BG = {
    success: '#1e7e34',
    warning: '#856404',
    error:   '#842029'
  };

  const toast = document.createElement('div');
  toast.id = TOAST_ID;
  // Réinitialiser tous les styles hérités de la page
  toast.setAttribute('style', [
    'all: initial',
    'position: fixed',
    'top: 20px',
    'right: 20px',
    `background: ${BG[type] || BG.success}`,
    'color: #fff',
    'padding: 13px 18px',
    'border-radius: 10px',
    'z-index: 2147483647',
    'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
    'font-size: 13.5px',
    'font-weight: 500',
    'line-height: 1.6',
    'max-width: 340px',
    'min-width: 210px',
    'box-shadow: 0 6px 24px rgba(0,0,0,0.28)',
    'white-space: pre-line',
    'pointer-events: none',
    'opacity: 0',
    'transition: opacity 0.25s ease, transform 0.25s ease',
    'transform: translateY(-6px)'
  ].join(';'));

  toast.textContent = message;
  document.body.appendChild(toast);

  // Animer l'entrée
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });
  });

  // Animer la sortie et supprimer
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-6px)';
    setTimeout(() => toast.remove(), 350);
  }, 3800);
}
