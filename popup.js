'use strict';

const FLAGS = { fr: '🇫🇷', en: '🇬🇧' };
const NAMES = { fr: 'Français', en: 'English' };

document.addEventListener('DOMContentLoaded', async () => {
  const { lastTranslation: last } = await chrome.storage.local.get('lastTranslation');
  if (!last) return;

  const section = document.getElementById('last-block');
  section.classList.remove('hidden');

  const srcFlag = FLAGS[last.sourceLang] || '🌐';
  const tgtFlag = FLAGS[last.targetLang] || '🌐';
  const srcName = NAMES[last.sourceLang] || last.sourceLang?.toUpperCase() || '?';
  const tgtName = NAMES[last.targetLang] || last.targetLang?.toUpperCase() || '?';

  document.getElementById('card-header').textContent =
    `${srcFlag} ${srcName} → ${tgtFlag} ${tgtName}`;
  document.getElementById('card-original').textContent = last.original;
  document.getElementById('card-translated').textContent = last.translated;

  const d = new Date(last.timestamp);
  document.getElementById('card-time').textContent =
    d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' · ' +
    d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
});
