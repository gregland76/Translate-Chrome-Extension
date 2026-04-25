# Translate FR↔EN — Extension Chrome/Edge

Traduisez instantanément du texte sélectionné entre le français et l’anglais, en un clic sur l’icône de la barre d’outils. L’icône affiche le drapeau de la langue cible. La traduction est copiée dans le presse-papiers et un toast de confirmation s’affiche.

---

## Fonctionnalités

- **Traduction FR ↔ EN** : détecte automatiquement la langue du texte sélectionné
- **Un seul clic** : cliquez sur l’icône pour traduire la sélection
- **Copie automatique** : la traduction est copiée dans le presse-papiers
- **Icône dynamique** : drapeau anglais si texte FR, drapeau français si texte EN
- **Toast de notification** : confirmation visuelle de la traduction
- **Aucune donnée personnelle collectée**

---

## Installation

1. Cloner ou télécharger ce dossier
2. Ouvrir `chrome://extensions` (ou `edge://extensions`)
3. Activer le **Mode développeur**
4. Cliquer sur **Charger l’extension non empaquetée**
5. Sélectionner le dossier `translate-extension/`

---

## Utilisation

1. Sélectionnez du texte sur n’importe quelle page web
2. Cliquez sur l’icône de l’extension dans la barre d’outils
3. La traduction s’affiche en toast et est copiée dans le presse-papiers

- L’icône change selon la langue détectée :
    - 🇬🇧 si le texte est en français (traduction vers anglais)
    - 🇫🇷 si le texte est en anglais (traduction vers français)

---

## Structure du projet

```
translate-extension/
├── manifest.json         # Déclaration de l’extension (MV3)
├── background.js         # Service worker : traduction, gestion icône, clipboard
├── content.js            # Toast + gestion presse-papiers
├── create_icons.py       # Générateur d’icônes PNG (Python)
├── icons/                # Icônes générées (FR/EN)
├── popup.html/.css/.js   # (optionnel, non utilisé si action directe)
└── README.md             # Ce fichier
```

---

## Générer les icônes

Lancez le script Python pour générer les icônes PNG :

```bash
python3 create_icons.py
```

---

## API utilisée

- [Google Translate API non-officielle](https://translate.googleapis.com/)

---

## Limitations

- Ne fonctionne pas sur les pages Chrome internes (`chrome://`), PDF ou pages avec restrictions de scripts.
- Traduction uniquement entre français et anglais (toute autre langue → français).

---

## Licence

MIT — Utilisation libre, sans garantie.
