'use strict';

// ─── Constants ───────────────────────────────────────────────────────────────

const TRANSLATE_API = 'https://translate.googleapis.com/translate_a/single';

// ─── Initialisation ───────────────────────────────────────────────────────────



// ─── Écoute des messages du content script (sélection de texte) ──────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SELECTION_CHANGED' && sender.tab) {
    handleSelectionChanged(message.text, sender.tab.id);
  }
  return false;
});

// Met à jour l'icône en temps réel lors de la sélection (sans traduction)
async function handleSelectionChanged(text, tabId) {
  if (!text || text.length < 3) return;
  try {
    const lang = await detectLanguage(text);
    await updateIcon(tabId, lang);
  } catch (_) { /* ignore */ }
}


// ─── Action bouton barre d'outils ────────────────────────────────────────────
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  // Exécuter un script pour récupérer la sélection sur la page
  let [result] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => window.getSelection()?.toString() || ''
  });
  const text = (result?.result || '').trim();
  if (!text || text.length < 2) {
    await chrome.tabs.sendMessage(tab.id, {
      type: 'TRANSLATION_ERROR',
      message: 'Sélectionnez d\'abord du texte sur la page.'
    });
    return;
  }
  try {
    const translation = await translateText(text);
    await chrome.storage.local.set({
      lastTranslation: {
        original: text.substring(0, 150),
        translated: translation.translatedText.substring(0, 150),
        sourceLang: translation.sourceLang,
        targetLang: translation.targetLang,
        timestamp: Date.now()
      }
    });
    await updateIcon(tab.id, translation.sourceLang);
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'TRANSLATION_DONE',
        translatedText: translation.translatedText,
        sourceLang: translation.sourceLang,
        targetLang: translation.targetLang
      });
    } catch (_) {
      try {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
        await chrome.tabs.sendMessage(tab.id, {
          type: 'TRANSLATION_DONE',
          translatedText: translation.translatedText,
          sourceLang: translation.sourceLang,
          targetLang: translation.targetLang
        });
      } catch (injectErr) {
        console.warn('[Translate] Impossible d\'injecter content.js:', injectErr.message);
      }
    }
  } catch (error) {
    console.error('[Translate] Erreur:', error);
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'TRANSLATION_ERROR',
        message: 'Erreur de traduction. Vérifiez votre connexion internet.'
      });
    } catch (_) { /* ignore */ }
  }
});

// ─── Traduction ───────────────────────────────────────────────────────────────

/**
 * Traduit le texte en détectant automatiquement la langue source.
 * FR → EN  |  EN (ou autre) → FR
 */
async function translateText(text) {
  // Appel 1 : détection automatique + traduction vers l'anglais
  const data1 = await callTranslateAPI(text, 'auto', 'en');
  const detectedLang = data1[2] || 'und';

  // Si la source est le français → traduction anglaise est correcte
  if (detectedLang === 'fr') {
    return {
      translatedText: extractTranslation(data1),
      sourceLang: 'fr',
      targetLang: 'en'
    };
  }

  // Sinon → traduire vers le français
  const sl = (detectedLang !== 'und') ? detectedLang : 'auto';
  const data2 = await callTranslateAPI(text, sl, 'fr');
  return {
    translatedText: extractTranslation(data2),
    sourceLang: detectedLang,
    targetLang: 'fr'
  };
}

async function callTranslateAPI(text, sl, tl) {
  const params = new URLSearchParams({ client: 'gtx', sl, tl, dt: 't', q: text });
  const response = await fetch(`${TRANSLATE_API}?${params}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function extractTranslation(data) {
  if (!Array.isArray(data?.[0])) return '';
  return data[0]
    .filter(seg => seg?.[0])
    .map(seg => seg[0])
    .join('');
}

// ─── Détection de langue locale (chrome.i18n) ─────────────────────────────────

function detectLanguage(text) {
  return new Promise(resolve => {
    chrome.i18n.detectLanguage(text, result => {
      if (chrome.runtime.lastError || !result?.languages?.length) {
        resolve('en');
      } else {
        resolve(result.languages[0].language);
      }
    });
  });
}

// ─── Icônes dynamiques ────────────────────────────────────────────────────────

/**
 * Met à jour l'icône de la barre d'outils avec le drapeau de la langue détectée.
 * @param {number} tabId
 * @param {string} sourceLang  code de langue ISO (ex: 'fr', 'en')
 */
async function updateIcon(tabId, sourceLang) {
  const size = 19; // Taille standard icône barre Chrome
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');

  if (sourceLang === 'fr') {
    drawEnglishFlag(ctx, size);
    await chrome.action.setTitle({ tabId, title: 'Translate FR↔EN\n🇬🇧 Français détecté → traduction EN' });
  } else if (sourceLang === 'en') {
    drawFrenchFlag(ctx, size);
    await chrome.action.setTitle({ tabId, title: 'Translate FR↔EN\n🇫🇷 English détecté → traduction FR' });
  } else {
    drawFrenchFlag(ctx, size); // Par défaut : drapeau FR pour "→ EN"
    await chrome.action.setTitle({ tabId, title: `Translate FR↔EN\n(${sourceLang?.toUpperCase() || '?'}) → traduction EN` });
  }

  const imageData = ctx.getImageData(0, 0, size, size);
  try {
    await chrome.action.setIcon({ tabId, imageData });
  } catch (_) { /* tab fermé */ }
}

// Drapeau tricolore français (bleu / blanc / rouge vertical)
function drawFrenchFlag(ctx, size) {
  const third = Math.floor(size / 3);
  ctx.fillStyle = '#002395';
  ctx.fillRect(0, 0, third, size);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(third, 0, third, size);
  ctx.fillStyle = '#ED2939';
  ctx.fillRect(third * 2, 0, size - third * 2, size);

  // Bordure subtile
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(0.25, 0.25, size - 0.5, size - 0.5);
}

// Croix de Saint-Georges — drapeau anglais (fond blanc, croix rouge)
function drawEnglishFlag(ctx, size) {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  const crossWidth = Math.max(3, Math.round(size * 0.28));
  const offset = Math.floor((size - crossWidth) / 2);

  ctx.fillStyle = '#CF142B';
  ctx.fillRect(offset, 0, crossWidth, size);      // barre verticale
  ctx.fillRect(0, offset, size, crossWidth);      // barre horizontale

  // Bordure subtile
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(0.25, 0.25, size - 0.5, size - 0.5);
}
