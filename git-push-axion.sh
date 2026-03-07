#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
#  AXION — Quick Push Script
#  رفع سريع لجميع التغييرات بأمر واحد
#  Usage:
#    bash git-push-axion.sh                  ← رسالة تلقائية بالتاريخ
#    bash git-push-axion.sh "رسالة مخصصة"   ← رسالة يدوية
#    bash git-push-axion.sh --watch          ← وضع المراقبة التلقائية (كل 60 ثانية)
# ═══════════════════════════════════════════════════════════════════════════════

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'
CYAN='\033[0;36m'; NC='\033[0m'; BOLD='\033[1m'

BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
TIMESTAMP=$(date '+%Y-%m-%d %H:%M')

push_changes() {
  local MSG="${1:-Auto commit from AXION — ${TIMESTAMP}}"

  # Check if there are changes
  if git diff --quiet && git diff --cached --quiet; then
    UNTRACKED=$(git ls-files --others --exclude-standard | wc -l | tr -d ' ')
    if [ "$UNTRACKED" = "0" ]; then
      echo -e "${YELLOW}[!]${NC} لا توجد تغييرات جديدة"
      return 0
    fi
  fi

  git add --all
  git commit -m "$MSG"
  git push origin "$BRANCH"
  echo -e "${GREEN}[✓]${NC} ${BOLD}تم الرفع:${NC} $MSG"
  echo -e "${CYAN}    الفرع:${NC} $BRANCH"
}

# Watch mode — auto push every 60 seconds
if [ "$1" = "--watch" ]; then
  INTERVAL="${2:-60}"
  echo -e "${CYAN}[i]${NC} وضع المراقبة التلقائية — كل ${INTERVAL} ثانية"
  echo -e "${YELLOW}    اضغط Ctrl+C للإيقاف${NC}"
  echo ""
  while true; do
    push_changes "Auto commit from AXION — $(date '+%Y-%m-%d %H:%M')"
    sleep "$INTERVAL"
  done
else
  push_changes "$1"
fi
