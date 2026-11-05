#!/usr/bin/env python3
"""Ambercross share cards composited from the game's own sprites.

Imagine and the xAI image API were both unavailable, so the card is built
from public/game art (not overwritten) plus a hand-set wordmark.
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter

GAME = "/workspace/public/game"
FONT_BOLD = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"

NAVY = (0x14, 0x1A, 0x27)
GOLD = (0xE4, 0xB1, 0x5A)
CREAM = (0xF3, 0xE6, 0xC8)
CORAL = (0xD4, 0x53, 0x4A)
BLUE = (0x3D, 0x8F, 0xD1)
STONE = (0xC1, 0x8C, 0x41)  # sampled from the fountain sprite
STONE_DK = (0x8C, 0x62, 0x2C)
STONE_LT = (0xF0, 0xD7, 0xA0)


def mix(a, b, t):
    return tuple(int(a[i] * (1 - t) + b[i] * t) for i in range(3))


def gradient(size, c0, c1, vertical=True):
    w, h = size
    im = Image.new("RGB", size)
    px = im.load()
    span = (h if vertical else w) - 1
    for i in range(span + 1):
        col = mix(c0, c1, i / span)
        if vertical:
            for x in range(w):
                px[x, i] = col
        else:
            for y in range(h):
                px[i, y] = col
    return im


def tile_into(base, tile, box):
    x0, y0, x1, y1 = box
    tw, th = tile.size
    region = Image.new(tile.mode, (x1 - x0, y1 - y0))
    for y in range(0, y1 - y0, th):
        for x in range(0, x1 - x0, tw):
            region.paste(tile, (x, y))
    if region.mode == "RGBA":
        base.alpha_composite(region, (x0, y0))
    else:
        base.paste(region, (x0, y0))


def soften_top(base, y0, y1, fade=48):
    """Blend the top of a pasted band back toward whatever is already above it."""
    # Called BEFORE the band is the only content: we fade by painting sky-colored
    # alpha over the seam. Implemented as a vertical alpha ramp on a copy.
    band = base.crop((0, y0, base.size[0], y1)).convert("RGBA")
    sky = base.crop((0, max(0, y0 - 2), base.size[0], max(1, y0 - 1))).resize((base.size[0], 1))
    ramp = Image.new("L", band.size, 255)
    rp = ramp.load()
    for y in range(min(fade, band.size[1])):
        a = int(255 * (y / fade))
        for x in range(band.size[0]):
            rp[x, y] = a
    # composite: sky color showing through the transparent top
    under = Image.new("RGB", band.size)
    sky_px = sky.getpixel((0, 0))[:3]
    # vary sky sample across width
    up = base.crop((0, max(0, y0 - 8), base.size[0], y0)).resize((base.size[0], band.size[1]))
    out = up.convert("RGBA")
    band.putalpha(ramp)
    out.alpha_composite(band)
    base.paste(out.convert("RGB"), (0, y0))


def load_frame(path, cols, rows, col, row):
    im = Image.open(path).convert("RGBA")
    cw, rh = im.size[0] // cols, im.size[1] // rows
    return im.crop((col * cw, row * rh, (col + 1) * cw, (row + 1) * rh))


def fit(im, height):
    w, h = im.size
    nh = height
    nw = max(1, int(w * (height / h)))
    return im.resize((nw, nh), Image.Resampling.LANCZOS)


def shadow(base, cx, cy, rx, ry, alpha=90):
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=(20, 16, 12, alpha))
    layer = layer.filter(ImageFilter.GaussianBlur(8))
    base.alpha_composite(layer)


def draw_cross(base, cx, cy, arm, thick):
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle([cx - thick / 2, cy - arm, cx + thick / 2, cy + arm], radius=thick / 3, fill=GOLD + (255,))
    d.rounded_rectangle([cx - arm, cy - thick / 2, cx + arm, cy + thick / 2], radius=thick / 3, fill=GOLD + (255,))
    j = thick * 0.42
    d.rectangle([cx - j, cy - j, cx + j, cy + j], fill=CORAL + (255,))
    base.alpha_composite(layer)


def text_layer(text, font, fill_top, fill_bot, stroke, stroke_w):
    probe = ImageDraw.Draw(Image.new("RGB", (4, 4)))
    bbox = probe.textbbox((0, 0), text, font=font, stroke_width=stroke_w)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    pad = stroke_w + 4
    w, h = tw + pad * 2, th + pad * 2
    stroke_im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(stroke_im)
    origin = (pad - bbox[0], pad - bbox[1])
    d.text(origin, text, font=font, fill=stroke + (255,), stroke_width=stroke_w, stroke_fill=stroke + (255,))
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).text(origin, text, font=font, fill=255)
    grad = Image.new("RGBA", (w, h))
    gp = grad.load()
    for y in range(h):
        col = mix(fill_top, fill_bot, y / max(1, h - 1)) + (255,)
        for x in range(w):
            gp[x, y] = col
    grad.putalpha(mask)
    stroke_im.alpha_composite(grad)
    return stroke_im


def paste_center(base, sprite, cx, foot_y):
    """Place sprite so its opaque feet sit on foot_y and its center x is cx."""
    bbox = sprite.getbbox()
    if bbox is None:
        return
    cropped = sprite.crop(bbox)
    x = int(cx - cropped.size[0] / 2)
    y = int(foot_y - cropped.size[1])
    base.alpha_composite(cropped, (x, y))
    return x, y, cropped.size


def make_gate(w, h):
    """Honey-stone south gate. Arch interior stays transparent."""
    sc = 2
    im = Image.new("RGBA", (w * sc, h * sc), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)

    def S(v):
        return int(v * sc)

    def tower(x, y, tw, th):
        d.rounded_rectangle([S(x), S(y), S(x + tw), S(y + th)], radius=S(8), fill=STONE + (255,))
        d.rectangle([S(x), S(y), S(x + 10), S(y + th)], fill=STONE_LT + (255,))
        d.rectangle([S(x + tw - 12), S(y), S(x + tw), S(y + th)], fill=STONE_DK + (255,))
        merlon, gap = 22, 12
        mx = x + 6
        while mx < x + tw - 16:
            d.rectangle([S(mx), S(y - 16), S(mx + merlon), S(y + 4)], fill=STONE + (255,))
            mx += merlon + gap
        # slit
        d.rounded_rectangle(
            [S(x + tw / 2 - 6), S(y + 36), S(x + tw / 2 + 6), S(y + 78)],
            radius=S(3),
            fill=NAVY + (255,),
        )
        d.rectangle([S(x + tw / 2 - 2), S(y + 44), S(x + tw / 2 + 2), S(y + 52)], fill=GOLD + (255,))

    def flag(x, y, fw, fh, flip=False):
        if not flip:
            d.polygon([(S(x), S(y)), (S(x + fw), S(y + 8)), (S(x), S(y + fh))], fill=CORAL + (255,))
        else:
            d.polygon([(S(x), S(y)), (S(x - fw), S(y + 8)), (S(x), S(y + fh))], fill=CORAL + (255,))
        d.line([(S(x), S(y - 4)), (S(x), S(y + fh + 6))], fill=GOLD + (255,), width=S(3))

    # proportions are relative to the gate image itself
    tower(18, 70, 150, 360)
    tower(w - 168, 70, 150, 360)
    flag(168, 120, 54, 70, flip=False)
    flag(w - 168, 120, 54, 70, flip=True)
    # curtain wall
    d.rectangle([S(150), S(250), S(w - 150), S(430)], fill=STONE + (255,))
    d.rectangle([S(150), S(250), S(168), S(430)], fill=STONE_LT + (255,))
    d.rectangle([S(w - 168), S(250), S(w - 150), S(430)], fill=STONE_DK + (255,))
    # arch rim then punch the opening
    cx = w / 2
    d.pieslice([S(cx - 150), S(210), S(cx + 150), S(510)], 180, 360, fill=STONE_DK + (255,))
    d.rectangle([S(cx - 150), S(360), S(cx + 150), S(450)], fill=STONE_DK + (255,))
    # erase opening
    hole = Image.new("L", im.size, 0)
    hd = ImageDraw.Draw(hole)
    hd.pieslice([S(cx - 118), S(242), S(cx + 118), S(478)], 180, 360, fill=255)
    hd.rectangle([S(cx - 116), S(360), S(cx + 116), S(450)], fill=255)
    px = im.load()
    hp = hole.load()
    for y in range(im.size[1]):
        for x in range(im.size[0]):
            if hp[x, y]:
                px[x, y] = (0, 0, 0, 0)
    # keystone
    d.polygon(
        [
            (S(cx - 16), S(228)),
            (S(cx + 16), S(228)),
            (S(cx + 12), S(258)),
            (S(cx - 12), S(258)),
        ],
        fill=STONE_LT + (255,),
    )
    return im.resize((w, h), Image.Resampling.LANCZOS)


def compose_cover():
    W, H = 1200, 630
    sky = gradient((W, H), mix(BLUE, NAVY, 0.15), mix(BLUE, CREAM, 0.55))
    base = sky.convert("RGBA")
    # soft clouds and sun, supersampled
    decor = Image.new("RGBA", (W * 2, H * 2), (0, 0, 0, 0))
    dd = ImageDraw.Draw(decor)
    cloud = mix(BLUE, CREAM, 0.72) + (230,)
    for box in (
        (160, 70, 340, 150),
        (240, 40, 420, 130),
        (860, 90, 1040, 170),
        (1480, 120, 1680, 210),
    ):
        dd.ellipse(box, fill=cloud)
    dd.ellipse((1760, 80, 1960, 280), fill=mix(CREAM, GOLD, 0.15) + (255,))
    dd.ellipse((1810, 130, 1910, 230), fill=GOLD + (255,))
    base.alpha_composite(decor.resize((W, H), Image.Resampling.LANCZOS))

    grass = Image.open(f"{GAME}/grass.png").convert("RGB")
    cobble = Image.open(f"{GAME}/cobble.png").convert("RGB")
    # meadow behind the gate
    tile_into(base, grass, (0, 250, W, 520))
    soften_top(base, 250, 520, fade=36)
    # plaza
    tile_into(base, cobble, (0, 430, W, H))

    gate = make_gate(W, 520)
    base.alpha_composite(gate, (0, 80))

    fountain = fit(Image.open(f"{GAME}/fountain.png").convert("RGBA"), 300)
    hero = fit(load_frame(f"{GAME}/hero.png", 4, 4, 0, 0), 210)
    hare = fit(load_frame(f"{GAME}/hare.png", 2, 2, 0, 0), 78)

    shadow(base, 600, 575, 150, 22, 80)
    shadow(base, 188, 575, 40, 12, 70)
    shadow(base, 980, 500, 28, 8, 60)
    paste_center(base, hare, 980, 455)
    paste_center(base, fountain, 600, 615)
    paste_center(base, hero, 188, 590)

    # wordmark — centered, clear of every edge
    title_font = ImageFont.truetype(FONT_BOLD, 92)
    tag_font = ImageFont.truetype(FONT_BOLD, 32)
    title = text_layer("Ambercross", title_font, CREAM, GOLD, NAVY, 8)
    tag = text_layer("Honey-stone capital", tag_font, CREAM, CREAM, NAVY, 4)
    draw_cross(base, W // 2, 58, 18, 8)
    tx = (W - title.size[0]) // 2
    base.alpha_composite(title, (tx, 78))
    gx = (W - tag.size[0]) // 2
    base.alpha_composite(tag, (gx, 78 + title.size[1] - 8))
    # gold rule under the word, no wider than the tagline
    rule = Image.new("RGBA", base.size, (0, 0, 0, 0))
    ImageDraw.Draw(rule).rectangle([gx + 10, 78 + title.size[1] - 16, gx + tag.size[0] - 10, 78 + title.size[1] - 11], fill=GOLD + (255,))
    base.alpha_composite(rule)

    # hard gate: title ink must not touch the frame
    assert tx > 40 and tx + title.size[0] < W - 40
    assert 78 > 20
    return base.convert("RGB")


def compose_banner():
    W, H = 1200, 264
    sky = gradient((W, H), mix(BLUE, NAVY, 0.12), mix(BLUE, CREAM, 0.5))
    base = sky.convert("RGBA")
    decor = Image.new("RGBA", (W * 2, H * 2), (0, 0, 0, 0))
    dd = ImageDraw.Draw(decor)
    cloud = mix(BLUE, CREAM, 0.72) + (230,)
    dd.ellipse((1500, 36, 1700, 120), fill=cloud)
    dd.ellipse((1980, 36, 2180, 236), fill=mix(CREAM, GOLD, 0.08) + (255,))
    dd.ellipse((2024, 80, 2136, 192), fill=GOLD + (255,))
    base.alpha_composite(decor.resize((W, H), Image.Resampling.LANCZOS))

    grass = Image.open(f"{GAME}/grass.png").convert("RGB")
    cobble = Image.open(f"{GAME}/cobble.png").convert("RGB")
    tile_into(base, grass, (0, 120, W, H))
    soften_top(base, 120, H, fade=28)
    tile_into(base, cobble, (0, 168, 760, H))

    gate = make_gate(1200, 520)
    gate = gate.crop(gate.getbbox())
    gate.thumbnail((360, 148), Image.Resampling.LANCZOS)
    gate_x = 620
    gate_y = H - gate.size[1] - 18
    assert gate_x > 560
    assert gate_y + gate.size[1] < H - 8
    base.alpha_composite(gate, (gate_x, gate_y))

    fountain = fit(Image.open(f"{GAME}/fountain.png").convert("RGBA"), 150)
    hero = fit(load_frame(f"{GAME}/hero.png", 4, 4, 1, 0), 118)
    hare = fit(load_frame(f"{GAME}/hare.png", 2, 2, 1, 1), 52)

    shadow(base, 430, 250, 70, 12, 75)
    shadow(base, 250, 250, 28, 8, 70)
    paste_center(base, hare, 1040, 200)
    paste_center(base, fountain, 430, 258)
    paste_center(base, hero, 250, 252)

    title_font = ImageFont.truetype(FONT_BOLD, 54)
    tag_font = ImageFont.truetype(FONT_BOLD, 22)
    title = text_layer("Ambercross", title_font, CREAM, GOLD, NAVY, 5)
    tag = text_layer("Honey-stone capital", tag_font, CREAM, CREAM, NAVY, 3)
    draw_cross(base, 36, 48, 14, 6)
    # left half, above the midline (132). Bottom fifth starts at 211.
    tx, ty = 64, 18
    base.alpha_composite(title, (tx, ty))
    base.alpha_composite(tag, (tx, ty + title.size[1] - 6))
    title_right = tx + title.size[0]
    title_bottom = ty + title.size[1]
    tag_bottom = ty + title.size[1] - 6 + tag.size[1]
    tag_right = tx + tag.size[0]
    assert title_right < 560, title_right
    assert tag_right < 560, tag_right
    assert title_bottom < 120, title_bottom
    assert tag_bottom < 132, tag_bottom
    return base.convert("RGB")


def main():
    cover = compose_cover()
    banner = compose_banner()
    assert cover.size == (1200, 630), cover.size
    assert banner.size == (1200, 264), banner.size
    cover.save("/workspace/.grok/og-raw.png")
    banner.save("/workspace/.grok/x-banner-raw.png")
    print("wrote", cover.size, banner.size)


if __name__ == "__main__":
    main()
