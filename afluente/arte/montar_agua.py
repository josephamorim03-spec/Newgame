"""Junta os 24 quadros da água numa folha WebP (6×4) com um leve ajuste de cor.
Uso: python montar_agua.py <pasta_quadros> <saida.webp>"""
import sys
from PIL import Image, ImageEnhance

src, out = sys.argv[1:3]
frames = [Image.open(f'{src}/agua_{i:02d}.png').convert('RGB') for i in range(24)]
w, h = frames[0].size
sheet = Image.new('RGB', (w * 6, h * 4))
import numpy as np
for i, f in enumerate(frames):
    # puxa para o turquesa de riacho limpo e dá vida (o render sai neutro e escuro)
    a = np.asarray(f).astype(np.float32)
    a[..., 0] *= 0.84
    a[..., 1] *= 1.05
    a[..., 2] *= 1.16
    f = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    f = ImageEnhance.Color(f).enhance(1.5)
    f = ImageEnhance.Brightness(f).enhance(1.22)
    f = ImageEnhance.Contrast(f).enhance(1.18)
    sheet.paste(f, ((i % 6) * w, (i // 6) * h))
sheet.save(out, 'WEBP', quality=84, method=6)
print(sheet.size)
