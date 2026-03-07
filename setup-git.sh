#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
#  AXION — Git Setup Script
#  يُشغَّل مرة واحدة لتثبيت Git وربط المشروع بـ GitHub
#  Usage: bash setup-git.sh
# ═══════════════════════════════════════════════════════════════════════════════

set -e  # Stop on any error

# ── Colors ─────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'; BOLD='\033[1m'

log()     { echo -e "${GREEN}[✓]${NC} $1"; }
warn()    { echo -e "${YELLOW}[!]${NC} $1"; }
error()   { echo -e "${RED}[✗]${NC} $1"; exit 1; }
info()    { echo -e "${BLUE}[i]${NC} $1"; }
section() { echo -e "\n${CYAN}${BOLD}══ $1 ══${NC}"; }

# ── Banner ─────────────────────────────────────────────────────────────────────
echo -e "${CYAN}${BOLD}"
echo "  ___  _  _____ ___  _  _"
echo " / _ \| |/ /_ _/ _ \| \| |"
echo "| (_) |   < | || (_) | .\` |"
echo " \___/|_|\_\___\___/|_|\_|"
echo -e "  Git Setup Script v1.0${NC}"
echo ""

# ══════════════════════════════════════════════════════════════════════════════
# STEP 1 — Detect & Install Git
# ══════════════════════════════════════════════════════════════════════════════
section "STEP 1: Git Detection"

install_git() {
  warn "Git غير مثبت — محاولة التثبيت تلقائياً..."

  if command -v apt-get &>/dev/null; then
    info "نظام Debian/Ubuntu — استخدام apt"
    apt-get update -qq && apt-get install -y git
  elif command -v apk &>/dev/null; then
    info "نظام Alpine — استخدام apk"
    apk add --no-cache git
  elif command -v yum &>/dev/null; then
    info "نظام RHEL/CentOS — استخدام yum"
    yum install -y git
  elif command -v dnf &>/dev/null; then
    info "نظام Fedora — استخدام dnf"
    dnf install -y git
  elif command -v brew &>/dev/null; then
    info "macOS — استخدام Homebrew"
    brew install git
  elif command -v pacman &>/dev/null; then
    info "نظام Arch — استخدام pacman"
    pacman -Sy --noconfirm git
  else
    error "لم يتم العثور على مدير حزم مناسب. ثبّت git يدوياً من https://git-scm.com/downloads"
  fi
}

if ! command -v git &>/dev/null; then
  install_git
fi

GIT_VERSION=$(git --version 2>&1)
log "Git جاهز: $GIT_VERSION"

# ══════════════════════════════════════════════════════════════════════════════
# STEP 2 — GitHub Configuration
# ══════════════════════════════════════════════════════════════════════════════
section "STEP 2: GitHub Configuration"

# Load from .env if exists
if [ -f ".env" ]; then
  info "جاري تحميل الإعدادات من .env..."
  export $(grep -E '^(GITHUB_|VITE_GITHUB_)' .env | sed 's/#.*//' | xargs) 2>/dev/null || true
fi

# ── GitHub Username ────────────────────────────────────────────────────────────
GITHUB_USER="${GITHUB_USERNAME:-${VITE_GITHUB_USERNAME:-}}"
if [ -z "$GITHUB_USER" ]; then
  echo -e "${YELLOW}اسم مستخدم GitHub:${NC}"
  read -r GITHUB_USER
  [ -z "$GITHUB_USER" ] && error "اسم المستخدم مطلوب"
fi
log "المستخدم: $GITHUB_USER"

# ── GitHub Email ───────────────────────────────────────────────────────────────
GITHUB_MAIL="${GITHUB_EMAIL:-${VITE_GITHUB_EMAIL:-}}"
if [ -z "$GITHUB_MAIL" ]; then
  echo -e "${YELLOW}البريد الإلكتروني (اختياري، اضغط Enter للتخطي):${NC}"
  read -r GITHUB_MAIL
  GITHUB_MAIL="${GITHUB_MAIL:-${GITHUB_USER}@users.noreply.github.com}"
fi
log "البريد: $GITHUB_MAIL"

# ── GitHub Token ───────────────────────────────────────────────────────────────
GITHUB_PAT="${GITHUB_TOKEN:-${VITE_GITHUB_TOKEN:-}}"
if [ -z "$GITHUB_PAT" ]; then
  echo -e "${YELLOW}Personal Access Token (ghp_...):${NC}"
  echo -e "${BLUE}  أنشئه من: https://github.com/settings/tokens/new?scopes=repo${NC}"
  read -rs GITHUB_PAT
  echo ""
  [ -z "$GITHUB_PAT" ] && error "Token مطلوب"
fi

# Mask token in logs
TOKEN_PREVIEW="${GITHUB_PAT:0:7}...${GITHUB_PAT: -4}"
log "Token: $TOKEN_PREVIEW"

# ── Repository URL ─────────────────────────────────────────────────────────────
REPO_URL="${GITHUB_REPO_URL:-${VITE_GITHUB_REPO_URL:-}}"
if [ -z "$REPO_URL" ]; then
  echo -e "${YELLOW}رابط المستودع (مثل: https://github.com/Ayemen27/AXION2.git):${NC}"
  read -r REPO_URL
  [ -z "$REPO_URL" ] && REPO_URL="https://github.com/${GITHUB_USER}/AXION2.git"
fi

# Normalize URL (add .git if missing)
[[ "$REPO_URL" != *.git ]] && REPO_URL="${REPO_URL}.git"
log "المستودع: $REPO_URL"

# ── Branch ─────────────────────────────────────────────────────────────────────
BRANCH="${GITHUB_BRANCH:-main}"
log "الفرع: $BRANCH"

# ── Authenticated URL (token embedded) ────────────────────────────────────────
REPO_BASE=$(echo "$REPO_URL" | sed 's|https://||')
AUTH_URL="https://${GITHUB_USER}:${GITHUB_PAT}@${REPO_BASE}"

# ══════════════════════════════════════════════════════════════════════════════
# STEP 3 — Verify Token with GitHub API
# ══════════════════════════════════════════════════════════════════════════════
section "STEP 3: Token Verification"

if command -v curl &>/dev/null; then
  HTTP_CODE=$(curl -s -o /tmp/gh_verify.json -w "%{http_code}" \
    -H "Authorization: token ${GITHUB_PAT}" \
    -H "Accept: application/vnd.github.v3+json" \
    "https://api.github.com/user")

  if [ "$HTTP_CODE" = "200" ]; then
    if command -v python3 &>/dev/null; then
      GH_LOGIN=$(python3 -c "import json,sys; d=json.load(open('/tmp/gh_verify.json')); print(d.get('login',''))" 2>/dev/null || echo "$GITHUB_USER")
    else
      GH_LOGIN="$GITHUB_USER"
    fi
    log "Token صالح — مرحباً ${GH_LOGIN}!"
  else
    warn "تحقق Token أعاد كود HTTP: $HTTP_CODE"
    echo -e "${YELLOW}هل تريد المتابعة رغم ذلك? (y/N):${NC}"
    read -r CONTINUE_ANYWAY
    [[ "$CONTINUE_ANYWAY" =~ ^[Yy]$ ]] || error "تم الإلغاء"
  fi
else
  warn "curl غير متوفر — تخطي التحقق من Token"
fi

# ══════════════════════════════════════════════════════════════════════════════
# STEP 4 — Git Global Configuration
# ══════════════════════════════════════════════════════════════════════════════
section "STEP 4: Git Configuration"

git config --global user.name  "$GITHUB_USER"
git config --global user.email "$GITHUB_MAIL"
git config --global init.defaultBranch main
git config --global core.autocrlf input
git config --global push.default current

log "Git config: user.name  = $GITHUB_USER"
log "Git config: user.email = $GITHUB_MAIL"

# ══════════════════════════════════════════════════════════════════════════════
# STEP 5 — Initialize Local Repository
# ══════════════════════════════════════════════════════════════════════════════
section "STEP 5: Repository Initialization"

PROJECT_DIR="${PWD}"
info "مجلد المشروع: $PROJECT_DIR"

# Create .gitignore if it doesn't exist
if [ ! -f ".gitignore" ]; then
  cat > .gitignore << 'GITIGNORE'
# Dependencies
node_modules/
.pnp
.pnp.js

# Build output
dist/
dist-ssr/
build/
out/

# Env files — never commit secrets
.env
.env.local
.env.*.local

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Editor
.vscode/*
!.vscode/extensions.json
.idea/
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
.DS_Store
Thumbs.db

# Cache
.cache/
.parcel-cache/
*.tsbuildinfo

# Test coverage
coverage/

# Supabase local
.supabase/
GITIGNORE
  log "تم إنشاء .gitignore"
fi

# Init git repo if not already initialized
if [ ! -d ".git" ]; then
  git init
  log "تم تهيئة مستودع Git محلي"
else
  log "مستودع Git موجود مسبقاً"
fi

# Set branch
git checkout -B "$BRANCH" 2>/dev/null || git branch -M "$BRANCH" 2>/dev/null || true
log "الفرع النشط: $BRANCH"

# ══════════════════════════════════════════════════════════════════════════════
# STEP 6 — Connect to Remote
# ══════════════════════════════════════════════════════════════════════════════
section "STEP 6: Remote Connection"

# Remove existing remote if any
git remote remove origin 2>/dev/null || true

# Add remote with token embedded for auth
git remote add origin "$AUTH_URL"
log "تم إضافة remote origin"

# Verify remote (without exposing token)
DISPLAY_URL="https://github.com/${GITHUB_USER}/$(basename "$REPO_URL" .git)"
info "Remote URL: $DISPLAY_URL"

# ══════════════════════════════════════════════════════════════════════════════
# STEP 7 — Initial Commit & Push
# ══════════════════════════════════════════════════════════════════════════════
section "STEP 7: Initial Push"

# Stage all files
git add --all
log "تم إضافة جميع الملفات إلى staging"

# Check if there are files to commit
if git diff --cached --quiet 2>/dev/null; then
  warn "لا توجد تغييرات جديدة للـ commit"
else
  # Commit
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M')
  git commit -m "AXION: initial setup — ${TIMESTAMP}" \
    --author="${GITHUB_USER} <${GITHUB_MAIL}>"
  log "تم إنشاء commit"
fi

# Push
info "جاري الرفع إلى GitHub..."

if git push -u origin "$BRANCH" 2>&1; then
  log "تم الرفع بنجاح إلى $DISPLAY_URL"
elif git push -u origin "$BRANCH" --force 2>&1; then
  warn "تم الرفع بالقوة (force push)"
else
  # Try to pull first then push
  warn "محاولة pull أولاً ثم push..."
  git pull origin "$BRANCH" --rebase --allow-unrelated-histories 2>/dev/null || true
  git push -u origin "$BRANCH"
  log "تم الرفع بعد المزامنة"
fi

# ══════════════════════════════════════════════════════════════════════════════
# STEP 8 — Save Config to .env (local only)
# ══════════════════════════════════════════════════════════════════════════════
section "STEP 8: Saving Local Config"

ENV_FILE=".env.git-local"
cat > "$ENV_FILE" << ENVEOF
# AXION Git Config — Generated by setup-git.sh
# هذا الملف للاستخدام المحلي فقط — لا ترفعه إلى GitHub
GITHUB_USERNAME=${GITHUB_USER}
GITHUB_EMAIL=${GITHUB_MAIL}
GITHUB_REPO_URL=${REPO_URL}
GITHUB_BRANCH=${BRANCH}
# TOKEN محفوظ في قاعدة البيانات (user_github_settings) وليس هنا
ENVEOF

# Ensure .env.git-local is in .gitignore
if ! grep -q ".env.git-local" .gitignore 2>/dev/null; then
  echo ".env.git-local" >> .gitignore
fi

log "تم حفظ الإعدادات في $ENV_FILE (محمي من الرفع)"

# ══════════════════════════════════════════════════════════════════════════════
# STEP 9 — Auto-push Script (optional)
# ══════════════════════════════════════════════════════════════════════════════
section "STEP 9: Quick Push Alias"

cat > "git-push-axion.sh" << 'PUSHSCRIPT'
#!/usr/bin/env bash
# Quick Push — يرفع جميع التغييرات بأمر واحد
MSG="${1:-Auto commit from AXION — $(date '+%Y-%m-%d %H:%M')}"
git add --all
git commit -m "$MSG" 2>/dev/null || echo "لا توجد تغييرات جديدة"
git push origin "$(git branch --show-current)"
echo "✓ تم الرفع: $MSG"
PUSHSCRIPT

chmod +x git-push-axion.sh

log "تم إنشاء git-push-axion.sh للرفع السريع"
info "الاستخدام: bash git-push-axion.sh 'رسالة commit'"

# ══════════════════════════════════════════════════════════════════════════════
# DONE
# ══════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${GREEN}${BOLD}════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  ✓ الإعداد اكتمل بنجاح!${NC}"
echo -e "${GREEN}${BOLD}════════════════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}المستودع:${NC}  $DISPLAY_URL"
echo -e "  ${CYAN}الفرع:${NC}     $BRANCH"
echo -e "  ${CYAN}المستخدم:${NC}  $GITHUB_USER"
echo ""
echo -e "  ${YELLOW}أوامر سريعة:${NC}"
echo -e "  bash git-push-axion.sh           — رفع سريع بدون رسالة"
echo -e "  bash git-push-axion.sh 'رسالتك'  — رفع مع رسالة مخصصة"
echo -e "  git status                        — عرض حالة الملفات"
echo -e "  git log --oneline -10             — آخر 10 commits"
echo ""
echo -e "  ${BLUE}واجهة Git الرسومية:${NC} افتح التطبيق → Git Manager"
echo ""
