#!/data/data/com.termux/files/usr/bin/bash
# Push/pull do vlastního GitHub repa přímo z telefonu (Termux)
# Před prvním použitím: gh auth login  (nebo si nastav SSH klíč)
set -e
REPO_URL="${1:-}"
if [ -z "$REPO_URL" ]; then
  echo "Použití: bash scripts/termux/github-sync.sh git@github.com:USER/zoom-pro.git \"commit msg\""
  exit 1
fi
MSG="${2:-Zoom Pro update from Termux}"

cd "$(dirname "$0")/../.."

if [ ! -d .git ]; then
  git init
  git branch -M main
  git remote add origin "$REPO_URL"
fi

git add -A
git -c user.email="zoom-pro@termux.local" -c user.name="Zoom Pro Termux" commit -m "$MSG" || true
git push -u origin main
