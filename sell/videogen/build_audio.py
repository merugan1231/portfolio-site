#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Озвучка 10 сцен через нейроголос SvetlanaNeural (edge-tts).
Пишет /tmp/videogen/audio/NN.mp3 и /tmp/videogen/durations.json."""
import json
import os
import subprocess
import sys

OUT = "/tmp/videogen/audio"
os.makedirs(OUT, exist_ok=True)

VOICE = "ru-RU-SvetlanaNeural"
RATE = "+6%"
PAUSE = 0.7  # пауза между сценами, сек

SCRIPT = [
    "DevShelf — витрина портфолио, где авторство каждой работы подтверждается автоматически.",
    "Вы публикуете работу и вставляете уникальный код в репозиторий. Сервис сам находит его на GitHub — и ставит знак: авторство подтверждено.",
    "Каждый участник получает цифровой идентификатор. У создателя сайта — первый номер. Его видно сразу.",
    "Оценки здесь честные: низкие только с обоснованием, а несправедливый отзыв можно оспорить.",
    "Раздел «Люди»: поиск по идентификатору, по роли и по специализации. Нужный специалист находится за секунды.",
    "Витрина работ — как галерея: живые карточки, фильтры по типу, мгновенный отклик.",
    "Админка на семь вкладок: модерация, пользователи, споры, тикеты, оплаты и промокоды. Управление сайтом — без доступа к серверу.",
    "Подписка Про снимает лимит работ и даёт премиальный значок. Цена — четыреста девяносто девять рублей в месяц.",
    "Под капотом — современный стек: Next.js, React и база данных с автопереключением. Расходы на инфраструктуру — ноль.",
    "Полка ждёт вашу работу. DevShelf — покажи, как ты это сделал. Сайт уже работает — ссылка в описании.",
]

durations = []
total_pause = 0.0
for i, text in enumerate(SCRIPT):
    mp3 = f"{OUT}/{i:02d}.mp3"
    if not os.path.exists(mp3):
        r = subprocess.run(
            [sys.executable, "-m", "edge_tts", "--voice", VOICE, "--rate", RATE,
             "--text", text, "--write-media", mp3],
            capture_output=True, text=True, timeout=120,
        )
        if r.returncode != 0:
            print(f"ERR {i}: {r.stderr[:200]}")
            sys.exit(1)
    # длительность через ffprobe
    probe = subprocess.run(
        ["/tmp/animbuild/ffmpeg", "-i", mp3, "-f", "null", "-"],
        capture_output=True, text=True,
    )
    dur = 0.0
    for line in probe.stderr.splitlines():
        if "time=" in line:
            t = line.split("time=")[1].split(" ")[0]
            h, m, s = t.split(":")
            dur = int(h) * 3600 + int(m) * 60 + float(s)
    if i < len(SCRIPT) - 1:
        dur += PAUSE
        total_pause += PAUSE
    durations.append(round(dur, 2))
    print(f"{i:02d}: {durations[-1]}s")

json.dump(durations, open("/tmp/videogen/durations.json", "w"))
total = sum(durations)
print(f"TOTAL: {total:.1f}s (речь {total - total_pause:.1f}s + паузы {total_pause:.1f}s)")
