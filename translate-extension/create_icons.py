#!/usr/bin/env python3
"""
Génère les icônes PNG de l'extension Chrome/Edge Translate FR↔EN.
Utilise uniquement la bibliothèque standard Python (struct + zlib).

Usage :
    python3 create_icons.py
"""

import struct
import zlib
import os
import math


# ─── Encodage PNG ─────────────────────────────────────────────────────────────

def _chunk(tag: bytes, data: bytes) -> bytes:
    """Crée un chunk PNG (longueur + tag + données + CRC)."""
    crc = zlib.crc32(tag + data) & 0xFFFFFFFF
    return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', crc)


def make_png(width: int, height: int, pixels: list) -> bytes:
    """
    Encode une image en PNG 24-bit (RGB, pas de transparence).
    pixels : liste de tuples (R, G, B), ligne par ligne.
    """
    signature = b'\x89PNG\r\n\x1a\n'
    ihdr = _chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0))

    raw = bytearray()
    for y in range(height):
        raw.append(0)  # filtre "None" par ligne
        for x in range(width):
            r, g, b = pixels[y * width + x]
            raw += bytes([r, g, b])

    idat = _chunk(b'IDAT', zlib.compress(bytes(raw), 9))
    iend = _chunk(b'IEND', b'')
    return signature + ihdr + idat + iend


# ─── Dessin des drapeaux ─────────────────────────────────────────────────────

def french_flag(size: int) -> list:
    """Drapeau tricolore français : bleu | blanc | rouge."""
    pixels = []
    third = size // 3
    for y in range(size):
        for x in range(size):
            if x < third:
                pixels.append((0, 35, 149))     # Bleu  #002395
            elif x < 2 * third:
                pixels.append((255, 255, 255))  # Blanc
            else:
                pixels.append((237, 41, 57))    # Rouge #ED2939
    return pixels


def english_flag(size: int) -> list:
    """Croix de Saint-Georges : fond blanc, croix rouge."""
    pixels = []
    cross_w = max(3, round(size * 0.28))
    offset = (size - cross_w) // 2
    for y in range(size):
        for x in range(size):
            if offset <= x < offset + cross_w or offset <= y < offset + cross_w:
                pixels.append((207, 20, 43))    # Rouge #CF142B
            else:
                pixels.append((255, 255, 255))  # Blanc
    return pixels


def default_icon(size: int) -> list:
    """Icône par défaut : disque bleu avec demi-cercles FR/EN."""
    pixels = []
    blue  = (26, 115, 232)   # Bleu Google #1A73E8
    white = (255, 255, 255)
    gray  = (240, 241, 243)  # Fond gris clair
    cx = cy = (size - 1) / 2
    radius = cx - 0.5

    for y in range(size):
        for x in range(size):
            dist = math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
            if dist <= radius:
                # Moitié gauche = bleu, moitié droite = blanc
                if x < size // 2:
                    pixels.append(blue)
                else:
                    pixels.append(white)
            else:
                pixels.append(gray)

    # Trait vertical central (séparateur)
    mid = size // 2
    sep_w = max(1, size // 16)
    for y in range(size):
        for dx in range(-sep_w // 2, sep_w // 2 + 1):
            xi = mid + dx
            if 0 <= xi < size:
                cx_d = math.sqrt((xi - cx) ** 2 + (y - cy) ** 2)
                if cx_d <= radius:
                    pixels[y * size + xi] = gray

    return pixels


# ─── Génération ──────────────────────────────────────────────────────────────

def save(path: str, size: int, draw_fn) -> None:
    pixels = draw_fn(size)
    data = make_png(size, size, pixels)
    with open(path, 'wb') as f:
        f.write(data)
    print(f'  ✓  {path}')


def main() -> None:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    icons_dir = os.path.join(script_dir, 'icons')
    os.makedirs(icons_dir, exist_ok=True)

    print('Génération des icônes PNG…\n')

    for size in (16, 48, 128):
        save(os.path.join(icons_dir, f'icon{size}.png'),       size, default_icon)
        save(os.path.join(icons_dir, f'fr_flag_{size}.png'),   size, french_flag)
        save(os.path.join(icons_dir, f'en_flag_{size}.png'),   size, english_flag)

    print('\n✅ Toutes les icônes ont été générées dans icons/\n')
    print('── Charger l\'extension ──────────────────────────────────────')
    print('  1. Ouvrir  chrome://extensions  (ou  edge://extensions)')
    print('  2. Activer le « Mode développeur »')
    print('  3. Cliquer « Charger l\'extension non empaquetée »')
    print('  4. Sélectionner ce dossier : translate-extension/')
    print('─────────────────────────────────────────────────────────────')


if __name__ == '__main__':
    main()
