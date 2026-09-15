#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Сборка видео: слайды -> масштаб в 1920x1080 -> кроссфейд xfade между сценами
-> склейка с озвучкой. Результат: ~/Desktop/DEVSHELF-обзор.mp4"""
import json
import os
import subprocess

FF = "/tmp/animbuild/ffmpeg"
SLIDES = "/tmp/videogen/slides"
AUDIO = "/tmp/videogen/audio"
OUT = os.path.expanduser("~/Desktop/DEVSHELF-обзор.mp4")

durations = json.load(open("/tmp/videogen/durations.json"))
n = len(durations)
XFADE = 0.8  # длительность кроссфейда

# 1) Каждую картинку -> видео-сегмент длительностью dur (30fps, 1920x1080, yuv420p)
segs = []
for i in range(n):
    seg = f"/tmp/videogen/seg{i:02d}.mp4"
    segs.append(seg)
    if not os.path.exists(seg):
        subprocess.run([
            FF, "-y", "-loglevel", "error",
            "-loop", "1", "-i", f"{SLIDES}/slide{i:02d}.png",
            "-t", f"{durations[i]:.2f}",
            "-r", "30",
            "-vf", "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1",
            "-c:v", "libx264", "-preset", "medium", "-crf", "18",
            "-pix_fmt", "yuv420p", seg,
        ], check=True)
    print(f"seg {i:02d} ok ({durations[i]}s)")

# 2) Последовательный xfade: сег0+сег1 -> v01; v01+сег2 -> v02 ...
inputs = []
for s in segs:
    inputs += ["-i", s]
cmd = [FF, "-y", "-loglevel", "error"] + inputs
current = "0:v"
offset = durations[0] - XFADE
filters = []
for i in range(1, n):
    out_label = f"v{i}"
    filters.append(
        f"[{current}][{i}:v]xfade=transition=fade:duration={XFADE}:offset={offset:.2f}[{out_label}]"
    )
    current = out_label
    if i < n - 1:
        offset += durations[i] - XFADE

filters.append(f"[{current}]format=yuv420p[vout]")
video_len = sum(durations) - XFADE * (n - 1)

cmd += [
    "-filter_complex", ";".join(filters),
    "-map", "[vout]",
    "-t", f"{video_len:.2f}",
    "-c:v", "libx264", "-preset", "medium", "-crf", "18",
    "-r", "30", "/tmp/videogen/silent.mp4",
]
subprocess.run(cmd, check=True)
print(f"silent ok: {video_len:.1f}s")

# 3) Озвучка: 10 mp3 с паузами -> один AAC
audio_parts = []
for i in range(n):
    audio_parts += ["-i", f"{AUDIO}/{i:02d}.mp3"]
afilters = []
cur = "0:a"
pos = 0.0
for i in range(n):
    d = durations[i] - (0 if i == 0 else 0)
    if i == 0:
        afilters.append(f"[{i}:a]adelay=0|0[a0]")
        cur = "a0"
        pos = durations[0] - 0.7  # речь первой сцены + пауза
        continue
    nxt = i
    out_a = f"a{nxt}"
    afilters.append(f"[{cur}][{i}:a]adelay={int(pos*1000)}|{int(pos*1000)}[a{nxt}]")
    # amix по мере добавления сложнее; проще: собираем через amix с задержанными входами
    cur = out_a
    pos += durations[i] - 0.7

# Надёжнее:concat c аперсэмплингом — собираем задержанные потоки в amix
afilters = []
delayed = []
pos = 0.0
for i in range(n):
    start = 0.0 if i == 0 else sum(durations[:i]) - XFADE * i
    afilters.append(f"[{i}:a]aresample=44100,adelay={int(start*1000)}|{int(start*1000)}[d{i}]")
    delayed.append(f"[d{i}]")
afilters.append(f"{''.join(delayed)}amix=inputs={n}:normalize=0[aout]")

cmd2 = [FF, "-y", "-loglevel", "error"] + audio_parts + [
    "-i", "/tmp/videogen/silent.mp4",
    "-filter_complex", ";".join(afilters),
    "-map", f"{n}:v", "-map", "[aout]",
    "-c:v", "copy",
    "-c:a", "aac", "-b:a", "160k",
    "-shortest", OUT,
]
subprocess.run(cmd2, check=True)
size = os.path.getsize(OUT) / 1e6
print(f"DONE: {OUT} ({size:.1f} MB, {video_len:.1f}s)")
