#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
#  AXION — First Run Setup Check
#  يُشغَّل تلقائياً عند `npm run dev` أو `npm start`
#  يتحقق من تثبيت Git ووجود مستودع مرتبط
# ═══════════════════════════════════════════════════════════════════════════════

NC='\033[0m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'

FIRST_RUN_FLAG=".axion-git-initialized"

# Already initialized — skip silently
[ -f "$FIRST_RUN_FLAG" ] && exit 0

echo -e "${CYAN}╔═══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     AXION — First Run Git Check       ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════╝${NC}"
echo ""

ISSUES=0

# ── Check 1: Git installed ──────────────────────────────────────────────────
if command -v git &>/dev/null; then
  echo -e "${GREEN}[✓]${NC} Git مثبت: $(git --version)"
else
  echo -e "${YELLOW}[!]${NC} Git غير مثبت"
  echo -e "    ${BLUE}لتثبيته:${NC} bash setup-git.sh"
  ISSUES=$((ISSUES + 1))
fi

# ── Check 2: Git repository initialized ────────────────────────────────────
if [ -d ".git" ]; then
  echo -e "${GREEN}[✓]${NC} مستودع Git محلي موجود"
else
  echo -e "${YELLOW}[!]${NC} لا يوجد مستودع Git محلي"
  echo -e "    ${BLUE}للإعداد الكامل:${NC} bash setup-git.sh"
  ISSUES=$((ISSUES + 1))
fi

# ── Check 3: Remote connected ───────────────────────────────────────────────
if git remote get-url origin &>/dev/null 2>&1; then
  REMOTE=$(git remote get-url origin 2>/dev/null | sed 's|https://[^@]*@||' | sed 's|\.git$||')
  echo -e "${GREEN}[✓]${NC} Remote متصل: $REMOTE"
else
  echo -e "${YELLOW}[!]${NC} لا يوجد remote مرتبط بـ GitHub"
  echo -e "    ${BLUE}للإعداد:${NC} bash setup-git.sh"
  ISSUES=$((ISSUES + 1))
fi

echo ""

if [ "$ISSUES" -eq 0 ]; then
  echo -e "${GREEN}✓ كل شيء جاهز — Git مُعدّ ومتصل${NC}"
  # Mark as initialized
  touch "$FIRST_RUN_FLAG"
else
  echo -e "${YELLOW}⚠ يوجد $ISSUES مشكلة — شغّل: bash setup-git.sh${NC}"
fi

echo ""
