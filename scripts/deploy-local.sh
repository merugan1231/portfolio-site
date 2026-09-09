#!/bin/bash
# Деплой локального сайта: Documents (мастер-копия, git) -> Library (рабочая копия службы).
# Использование: bash scripts/deploy-local.sh
set -e

SRC="/Users/a4444/Documents/freebuff/portfolio-site"
DST="/Users/a4444/Library/portfolio-site"
PLIST_LABEL="com.user.portfolio-site"

cd "$SRC"

# 1. Синхронизация кода (без лишних файлов: git-игноры и служебные папки копируются отдельно)
rsync -a --delete \
  --exclude '.git' \
  --exclude '.env.local' \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude 'data' \
  --exclude 'PROJECT-NOTES.md' \
  --exclude 'com.user.portfolio-site.plist' \
  "$SRC/" "$DST/"

# 2. Установка зависимостей, если появились новые
if [ -f package-lock.json ] && ! diff -q package-lock.json "$DST/package-lock.json" >/dev/null 2>&1; then
  echo "==> npm ci в рабочей копии..."
  (cd "$DST" && npm ci --silent)
fi

# 3. Сборка в рабочей копии
echo "==> npm run build..."
(cd "$DST" && npm run build)

# 4. Перезапуск службы
echo "==> перезапуск службы $PLIST_LABEL..."
launchctl kickstart -k "gui/$(id -u)/$PLIST_LABEL"

sleep 3
CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 || true)
echo "==> готово: локальный сайт отвечает HTTP $CODE"
