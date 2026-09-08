#!/bin/bash
# Запуск портфолио-сайта как службы (используется launchd).
# Абсолютные пути, потому что launchd не загружает nvm из профиля.
NODE_BIN="/Users/a4444/.nvm/versions/node/v24.20.0/bin/node"
cd "$(dirname "$0")" || exit 1
exec "$NODE_BIN" node_modules/next/dist/bin/next start
