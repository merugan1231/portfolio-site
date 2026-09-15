#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Генерация слайдов видео-обзора через Nano Banana (gemini-2.5-flash-image).

Ключ передаётся первым аргументом: python3 gen_slides.py <GEMINI_API_KEY>
Слайды 16:9 (1536x864) сохраняются в /tmp/videogen/slides/NN.png
"""
import json
import os
import sys
import time
import urllib.request

KEY = sys.argv[1] if len(sys.argv) > 1 else ""
if not KEY:
    print("Нужен API-ключ: python3 gen_slides.py <GEMINI_API_KEY>")
    sys.exit(1)

OUT = "/tmp/videogen/slides"
os.makedirs(OUT, exist_ok=True)

# 10 сцен обзора: единый тёмный стиль DevShelf, простая понятная композиция
SCENES = [
    {
        "name": "01-hero",
        "prompt": (
            "Cinematic dark hero shot for a developer portfolio website called DevShelf. "
            "A glowing digital bookshelf floating in dark space, each shelf holds small glowing "
            "app windows and code cards. Deep charcoal background #0b0c10, indigo and lime green "
            "neon accents, soft rim light, minimal, premium, 16:9. No text, no words, no letters."
        ),
    },
    {
        "name": "02-verify",
        "prompt": (
            "Dark UI concept: a glowing shield with a checkmark hologram above a laptop showing "
            "source code, green verification beam scanning the code. Charcoal background, indigo "
            "and lime neon palette, cinematic depth, premium tech aesthetic, 16:9. No text, no words."
        ),
    },
    {
        "name": "03-profile",
        "prompt": (
            "Dark futuristic ID card floating in space showing a glowing avatar silhouette and "
            "holographic number 1, subtle grid background, indigo and violet neon glow, premium "
            "minimal style, cinematic lighting, 16:9. No text, no words, no letters."
        ),
    },
    {
        "name": "04-ratings",
        "prompt": (
            "Five glowing amber stars hovering above a dark glass surface, one star slightly "
            "dimmer, soft amber bokeh particles, charcoal background, elegant premium fintech "
            "aesthetic, cinematic, 16:9. No text, no words."
        ),
    },
    {
        "name": "05-people",
        "prompt": (
            "Dark network of glowing avatar orbs connected by thin light lines, a search beam "
            "highlighting one orb, indigo and cyan neon palette on charcoal background, cinematic "
            "depth of field, premium minimal tech style, 16:9. No text, no words."
        ),
    },
    {
        "name": "06-explore",
        "prompt": (
            "Elegant masonry wall of floating dark glass cards with tiny glowing previews "
            "(charts, code, art thumbnails), cards at different heights like a Pinterest board, "
            "indigo lime violet neon accents on charcoal, cinematic, 16:9. No readable text."
        ),
    },
    {
        "name": "07-admin",
        "prompt": (
            "Mission control desk in dark room: three floating holographic panels with graphs "
            "and gauges glowing indigo and green over a desk, silhouette of a chair, cinematic "
            "rim light, premium sci-fi minimal, 16:9. No text, no words, no letters."
        ),
    },
    {
        "name": "08-pro",
        "prompt": (
            "Single premium crown hologram glowing amber floating above a dark glass pedestal, "
            "subtle gold particles rising, charcoal background with faint indigo aura, luxury "
            "minimal cinematic style, 16:9. No text, no words."
        ),
    },
    {
        "name": "09-stack",
        "prompt": (
            "Elegant exploded view of glowing translucent layers stacked in dark space (database "
            "layer, app layer, cloud layer), thin light connections between layers, indigo lime "
            "violet neon on charcoal, isometric premium tech illustration, cinematic, 16:9. No text."
        ),
    },
    {
        "name": "10-cta",
        "prompt": (
            "Dark cinematic finale: glowing empty pedestal spot on a digital bookshelf inviting "
            "the viewer to place their work, soft spotlight from above, indigo and lime neon "
            "accents, charcoal background, inspiring premium minimal style, 16:9. No text, no words."
        ),
    },
]

API = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent"

def gen(scene, idx):
    body = json.dumps({
        "contents": [{"parts": [{"text": scene["prompt"]}]}],
        "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": "16:9"}},
    }).encode()
    req = urllib.request.Request(
        f"{API}?key={KEY}",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            data = json.loads(r.read())
        for part in data["candidates"][0]["content"]["parts"]:
            if "inlineData" in part:
                path = os.path.join(OUT, f"{scene['name']}.png")
                with open(path, "wb") as f:
                    import base64
                    f.write(base64.b64decode(part["inlineData"]["data"]))
                print(f"OK {scene['name']}")
                return path
        print(f"NO_IMAGE {scene['name']}: {json.dumps(data)[:200]}")
    except Exception as e:
        print(f"ERR {scene['name']}: {e}")
    return None

made = 0
for i, scene in enumerate(SCENES):
    out_path = os.path.join(OUT, f"{scene['name']}.png")
    if os.path.exists(out_path):
        print(f"SKIP {scene['name']}")
        made += 1
        continue
    if gen(scene, i):
        made += 1
    time.sleep(2)  # бережём rate limit

print(f"DONE {made}/{len(SCENES)}")
sys.exit(0 if made == len(SCENES) else 2)
