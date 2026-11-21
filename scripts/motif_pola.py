"""Pola latihan untuk modul motif (grafik petak) + render "foto" kain tenun dari grafik itu.

    python scripts/motif_pola.py            # tulis pola ke data/modules/*.json dan gambar ke public/img/kain/*.jpg

Pola di sini adalah POLA LATIHAN yang disusun dari deskripsi bentuk di jurnal (Ibrahim dkk. 2024), BUKAN grafik
asli Rumah Tenun Puta Dino Kayangan. Gambar adalah ilustrasi render (benang lungsi & pakan disimulasikan), bukan foto.
Ganti dengan foto kain asli lewat Editor begitu tersedia.
"""
import json, math, random
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
HITAM, KUNING, MERAH, KREM = '#1f1d1b', '#d9a81e', '#9b2f22', '#efe6d2'

def grid(w, h, fn):
    return [''.join(fn(x, y) for x in range(w)) for y in range(h)]

def jodati():
    def f(x, y):
        d = abs(x - 6) + abs(y - 6)
        if d == 0 or d == 4: return 'K'
        if d <= 6 and d % 2 == 0 and d > 4: return 'K'
        return '.'
    return grid(13, 13, f)

def tobaru():  # rantai: mata rantai oval yang saling mengait
    def f(x, y):
        for cx, cy in ((4, 3), (10, 8)):
            dx, dy = (x - cx) / 3.6, (y - cy) / 2.6
            r = math.hypot(dx, dy)
            if 0.72 <= r <= 1.18: return 'K' if cx == 4 else 'M'
        return '.'
    return grid(14, 11, f)

def marasante():  # keberanian: tumpal (segitiga) bertingkat berhadapan
    def f(x, y):
        if y < 7 and abs(x - 7) <= y: return 'K' if (x + y) % 4 else 'M'
        if y >= 8 and abs(x - 7) <= 14 - y: return 'M'
        return '.'
    return grid(15, 15, f)

def barakati():  # mahkota menghadap ke atas dan ke bawah
    crown = ['K...K...K', 'KK.KKK.KK', 'KKKKKKKKK', 'KKKKKKKKK', '.MMMMMMM.']
    rows = ['.' * 11]
    rows += ['.' + r + '.' for r in crown]
    rows += ['.' * 11]
    rows += ['.' + r + '.' for r in reversed(crown)]
    rows += ['.' * 11]
    return rows

def kalajengking():  # kalajengking distilisasi
    art = [
        '......KK.......',
        '.....K..K......',
        '.........K.....',
        '.........K.....',
        '........KK.....',
        '...K...KKK...K.',
        '....K.KKKKK.K..',
        '.KK..KKMKKK..KK',
        '....K.KKKKK.K..',
        '...K..KKKKK..K.',
        '.....K.KKK.K...',
        '....K..KKK..K..',
        '.K....K...K....',
        'K..............',
    ]
    return art

PALET = {
    '.': {'name': 'hitam (dasar)', 'color': HITAM},
    'K': {'name': 'kuning', 'color': KUNING},
    'M': {'name': 'merah', 'color': MERAH},
}
MOTIF = {
    'puta-dino-jodati': ('Pola latihan belah ketupat (bukan motif Jodati asli)', jodati()),
    'puta-dino-tobaru': ('Pola latihan rantai (bukan motif Tobaru asli)', tobaru()),
    'puta-dino-marasante': ('Pola latihan tumpal bertingkat (bukan motif Marasante asli)', marasante()),
    'puta-dino-barakati': ('Pola latihan mahkota atas-bawah (bukan motif Barakati asli)', barakati()),
    'puta-dino-kalajengking': ('Pola latihan kalajengking distilisasi (bukan motif Kalajengking asli)', kalajengking()),
}

def hexrgb(h): return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], dtype=np.float32)

def render(rows, palette, out, W=1200, H=900, cell=14, seed=1, polos=False):
    """Simulasi tenun polos: tiap petak = beberapa helai; lungsi/pakan bergantian atas-bawah, bayangan & serat acak."""
    rng = np.random.default_rng(seed)
    h, w = len(rows), len(rows[0])
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    # sedikit gelombang seperti kain yang tidak benar-benar rata
    xs2 = xs + 6 * np.sin(ys / 97.0) + 3 * np.sin(ys / 23.0)
    ys2 = ys + 5 * np.sin(xs / 131.0)
    gx = (xs2 // cell).astype(int) % w
    gy = (ys2 // cell).astype(int) % h
    lut = {k: hexrgb(v['color']) for k, v in palette.items()}
    grid_rgb = np.array([[lut[c] for c in r] for r in rows], dtype=np.float32)
    base = grid_rgb[(h - 1 - gy) % h, gx]
    # lungsi (vertikal) berwarna dasar krem-gelap, pakan membawa warna motif
    thread = 4.0
    tx = (xs2 / thread).astype(int); ty = (ys2 / thread).astype(int)
    warp_on_top = ((tx + ty) % 2 == 0)
    fx = (xs2 % thread) / thread; fy = (ys2 % thread) / thread
    warp_col = lut['.'] * 0.85 + 12
    col = np.where(warp_on_top[..., None], warp_col * 0.55 + base * 0.45, base)
    shade_w = 0.78 + 0.32 * np.sin(math.pi * fx)   # helai lungsi membulat
    shade_p = 0.78 + 0.32 * np.sin(math.pi * fy)   # helai pakan membulat
    shade = np.where(warp_on_top, shade_w, shade_p)
    noise = rng.normal(1.0, 0.06, (H // 2 + 1, W // 2 + 1)).repeat(2, 0).repeat(2, 1)[:H, :W]
    slub = 1 + 0.08 * np.sin(ys2 / 7.3 + rng.uniform(0, 6)) * np.sin(xs2 / 51.0)
    img = col * (shade * noise * slub)[..., None]
    # cahaya lembut dari kiri atas + vinyet
    light = 1.08 - 0.25 * ((xs / W) * 0.6 + (ys / H) * 0.4)
    vig = 1 - 0.35 * (((xs - W / 2) / (W / 1.2)) ** 2 + ((ys - H / 2) / (H / 1.1)) ** 2)
    img = np.clip(img * (light * vig)[..., None], 0, 255).astype(np.uint8)
    im = Image.fromarray(img).filter(ImageFilter.GaussianBlur(0.4))
    out.parent.mkdir(parents=True, exist_ok=True)
    im.save(out, quality=86, optimize=True, progressive=True)

def main():
    for mid, (label, rows) in MOTIF.items():
        p = ROOT / 'data' / 'modules' / f'{mid}.json'
        m = json.loads(p.read_text())
        pal = {k: v for k, v in PALET.items() if k == '.' or any(k in r for r in rows)}
        pattern = {'label': label, 'authentic': False, 'technique': 'pakan_tambahan', 'unit': '1 kolom = 2 helai lungsi',
                   'palette': pal, 'rows': list(reversed(rows)), 'validated_by': None}
        step = next(s for s in m['steps'] if s['id'] == 'bentuk-motif')
        step['pattern'] = pattern
        m['cover'] = f'/img/kain/{mid}.jpg'
        m['coverNote'] = 'Ilustrasi render dari pola latihan, bukan foto kain asli.'
        p.write_text(json.dumps(m, indent=2, ensure_ascii=False) + '\n')
        render(rows, pal, ROOT / 'public' / 'img' / 'kain' / f'{mid}.jpg', seed=hash(mid) % 1000)
        print('ok', mid)
    # Modul Dasar: kain polos bergaris tepi
    stripes = ['.' * 12] * 8 + ['KKKKKKKKKKKK', '.' * 12, 'MMMMMMMMMMMM', '.' * 12]
    pal = {'.': {'name': 'krem', 'color': '#e9dcc0'}, 'K': {'name': 'kuning', 'color': KUNING}, 'M': {'name': 'merah', 'color': MERAH}}
    render(stripes, pal, ROOT / 'public' / 'img' / 'kain' / 'tidore-dasar.jpg', cell=10, seed=7)
    p = ROOT / 'data' / 'modules' / 'tidore-dasar.json'
    m = json.loads(p.read_text()); m['cover'] = '/img/kain/tidore-dasar.jpg'; m['coverNote'] = 'Ilustrasi render, bukan foto kain asli.'
    m.setdefault('taskClass', 1)
    p.write_text(json.dumps(m, indent=2, ensure_ascii=False) + '\n')
    print('ok tidore-dasar')

if __name__ == '__main__':
    main()
