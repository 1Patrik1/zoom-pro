#!/data/data/com.termux/files/usr/bin/bash
set -e
cd "$(dirname "$0")/../../apps/frontend"
npx vite --host 0.0.0.0 --port 5173
