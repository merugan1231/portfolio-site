#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Озвучка 10 сцен: DmitryNeural + грубая обработка тембра (питч-даун, бас, компрессор).
Пишет /tmp/vg2/audio/NN.mp3, /tmp/vg2/mix.wav и /tmp/vg2/durations.json."""
import json
import os
import subprocess
import sys

FF = "/tmp/animbuild/ffmpeg"
OUT = "/tmp/vg2/audio"
os.makedirs(OUT, exist_ok=True)

VOICE = "ru-RU-DmitryNeural"
RATE = "-14%"     # заметно медленнее — размеренная прогулка
PAUSE = 0.8

SCRIPT = [
    "Заходим на ДевШелф. Перед нами главная страница: витрина портфолио, где авторство каждой работы подтверждается автоматически.",
    "Открываем любую работу. Вот как это устроено: ты вставляешь уникальный код в свой репозиторий, сервис сам находит его на ГитХабе и ставит знак — авторство подтверждено.",
    "Заходим в профиль участника. У каждого свой постоянный цифровой идентификатор. У создателя сайта — первый номер, его видно сразу.",
    "Оценки здесь честные. Низкие — только с обоснованием. Несправедливый отзыв можно оспорить через тикет.",
    "Переходим в раздел Люди. Поиск по идентификатору, по роли и по специализации. Клик по специализации — и вот они, все нужные специалисты.",
    "Смотрим витрину работ. Живые карточки, поиск, фильтры по типу — и всё летает, мгновенный отклик.",
    "Теперь заглянем в админку. Семь вкладок: модерация, пользователи, споры, тикеты, оплаты, промокоды, юзернеймы. Управление всем сайтом — без доступа к серверу.",
    "Есть и подписка Про: снимает лимит работ и даёт премиальный значок. Четыреста девяносто девять рублей в месяц.",
    "Под капотом — современный стек: НекстДжес, Реакт и база данных с автопереключением. Расходы на инфраструктуру — ноль рублей в месяц.",
    "Вот и вся прогулка. Полка ждёт твою работу. ДевШелф — покажи, как ты это сделал. Сайт уже работает — меруган точка ис-а-точка-дев.",
]

raw = []
for i, text in enumerate(SCRIPT):
    mp3 = f"{OUT}/{i:02d}_raw.mp3"
    if not os.path.exists(mp3):
        r = subprocess.run(
            [sys.executable, "-m", "edge_tts", f"--voice={VOICE}", f"--rate={RATE}",
             "--pitch=-12Hz", f"--text={text}", f"--write-media={mp3}"],
            capture_output=True, text=True, timeout=120)
        if r.returncode != 0:
            print(f"TTS ERR {i}: {r.stderr[:200]}"); sys.exit(1)
    raw.append(mp3)

def dur_of(f):
    # ВАЖНО: без '-f null -' ffmpeg не декодирует файл и time= не появится
    p = subprocess.run([FF, "-i", f, "-f", "null", "-"], capture_output=True, text=True)
    d = 0.0
    for line in p.stderr.splitlines():
        if "time=" in line:
            t = line.split("time=")[1].split(" ")[0]
            h, m, s = t.split(":")
            d = int(h) * 3600 + int(m) * 60 + float(s)
    return d

# Грубый мужской тембр v2: сильнее питч-даун, больше баса; шум добавляем отдельной дорожкой
CHAIN = ("asetrate=44100*0.88,aresample=44100,"
         "bass=g=10:f=95:w=0.7,"
         "equalizer=f=2600:t=q:w=1.2:g=-4,"
         "acompressor=threshold=0.07:ratio=6:attack=6:release=120:makeup=3.5,"
         "highpass=f=45,volume=1.3")

durations = []
for i, mp3 in enumerate(raw):
    proc = f"{OUT}/{i:02d}.wav"
    if not os.path.exists(proc):
        # голос + коричневый шум-подложка (эффект «студии», маскирует синтез)
        subprocess.run([FF, "-y", "-loglevel", "error", "-i", mp3,
                        "-f", "lavfi", "-i", "anoisesrc=color=brown:amplitude=0.012:seed=42",
                        "-filter_complex",
                        "[0:a]" + CHAIN + "[v];[v][1:a]amix=inputs=2:normalize=0,lowpass=f=7500[out]",
                        "-map", "[out]", "-ar", "44100", "-ac", "2", proc], check=True)
    d = dur_of(proc)
    if i < len(raw) - 1:
        d += PAUSE
    durations.append(round(d, 2))
    print(f"{i:02d}: {durations[-1]}s")

json.dump(durations, open("/tmp/vg2/durations.json", "w"))

# mix.wav: склейка с паузами
inputs = []
for i in range(len(raw)):
    inputs += ["-i", f"{OUT}/{i:02d}.wav"]
parts = []
cur = "0:a"
filters = []
pos = 0.0
for i in range(len(raw)):
    if i == 0:
        # первый вход сразу становится текущим потоком (без anull — он даёт «unconnected output»)
        pos = durations[0]
        continue
    filters.append(f"[{i}:a]adelay={int(pos*1000)}|{int(pos*1000)}[d{i}]")
    filters.append(f"[{cur}][d{i}]amix=inputs=2:normalize=0[a{i}]")
    cur = f"a{i}"
    pos += durations[i]
filters.append(f"[{cur}]apad=whole_dur={pos+0.5:.2f}[aout]")
subprocess.run([FF, "-y", "-loglevel", "error"] + inputs + [
    "-filter_complex", ";".join(filters),
    "-map", "[aout]", "-ar", "44100", "-ac", "2", "/tmp/vg2/mix.wav"], check=True)
print(f"TOTAL: {pos+0.5:.1f}s  mix.wav готов")
