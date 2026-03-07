#!/bin/bash

# ══════════════════════════════════════════════════════════════════════════════
# AXION Git Status Checker — Comprehensive Repository Analysis
# فحص شامل لحالة المستودع
# ══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

PROJECT_DIR="${1:-$(pwd)}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# ── Helper Functions ──────────────────────────────────────────────────────────
print_header() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  $1"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_section() {
    echo ""
    echo -e "${BLUE}▶ $1${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# ── Main Check ────────────────────────────────────────────────────────────────
main() {
    cd "${PROJECT_DIR}" || {
        echo -e "${RED}✗ Cannot access directory: ${PROJECT_DIR}${NC}"
        exit 1
    }
    
    if [ ! -d ".git" ]; then
        echo -e "${RED}✗ Not a Git repository: ${PROJECT_DIR}${NC}"
        exit 1
    fi
    
    print_header "AXION Git Status Report"
    
    # ── Basic Info ────────────────────────────────────────────────────────────
    print_section "📁 Repository Information"
    
    echo -e "${YELLOW}Project:${NC}      ${PROJECT_DIR}"
    echo -e "${YELLOW}Branch:${NC}       $(git branch --show-current)"
    echo -e "${YELLOW}Remote:${NC}       $(git remote get-url origin 2>/dev/null || echo 'N/A')"
    echo -e "${YELLOW}Last Commit:${NC}  $(git log -1 --format='%h - %s (%ar)' 2>/dev/null || echo 'N/A')"
    
    # ── File Status ───────────────────────────────────────────────────────────
    print_section "📊 Working Directory Status"
    
    local status_output=$(git status --short)
    if [ -z "${status_output}" ]; then
        echo -e "${GREEN}✓ Working directory clean${NC}"
    else
        echo "${status_output}"
        echo ""
        
        local modified=$(echo "${status_output}" | grep -c "^ M" || true)
        local added=$(echo "${status_output}" | grep -c "^A " || true)
        local deleted=$(echo "${status_output}" | grep -c "^D " || true)
        local untracked=$(echo "${status_output}" | grep -c "^??" || true)
        
        echo -e "${YELLOW}Modified:${NC}   ${modified} file(s)"
        echo -e "${GREEN}Added:${NC}      ${added} file(s)"
        echo -e "${RED}Deleted:${NC}    ${deleted} file(s)"
        echo -e "${CYAN}Untracked:${NC}  ${untracked} file(s)"
    fi
    
    # ── Commits ───────────────────────────────────────────────────────────────
    print_section "📜 Recent Commits (last 10)"
    
    git log --oneline --graph --decorate -10 --color=always || echo "No commits yet"
    
    # ── Branches ──────────────────────────────────────────────────────────────
    print_section "🌿 Branches"
    
    git branch -a --color=always
    
    # ── Remote Status ─────────────────────────────────────────────────────────
    print_section "🔗 Remote Status"
    
    git remote -v
    
    echo ""
    local ahead=$(git rev-list --count @{u}..HEAD 2>/dev/null || echo "0")
    local behind=$(git rev-list --count HEAD..@{u} 2>/dev/null || echo "0")
    
    if [ "${ahead}" -gt 0 ]; then
        echo -e "${YELLOW}↑ ${ahead} commit(s) ahead of remote${NC}"
    fi
    
    if [ "${behind}" -gt 0 ]; then
        echo -e "${YELLOW}↓ ${behind} commit(s) behind remote${NC}"
    fi
    
    if [ "${ahead}" -eq 0 ] && [ "${behind}" -eq 0 ]; then
        echo -e "${GREEN}✓ Up to date with remote${NC}"
    fi
    
    # ── Contributors ──────────────────────────────────────────────────────────
    print_section "👥 Contributors (Top 5)"
    
    git shortlog -sn --all | head -5
    
    # ── Repository Size ───────────────────────────────────────────────────────
    print_section "💾 Repository Size"
    
    local repo_size=$(du -sh .git 2>/dev/null | cut -f1)
    local total_files=$(git ls-files | wc -l)
    
    echo -e "${YELLOW}.git folder:${NC}     ${repo_size}"
    echo -e "${YELLOW}Tracked files:${NC}   ${total_files}"
    
    # ── Last Operations ───────────────────────────────────────────────────────
    print_section "⏱️ Last Operations"
    
    if [ -f "git-operations.log" ]; then
        echo "Last 5 operations from log:"
        tail -20 git-operations.log | grep -E "SUCCESS|ERROR" | tail -5
    else
        echo "No operations log found"
    fi
    
    # ── Health Check ──────────────────────────────────────────────────────────
    print_section "🏥 Repository Health"
    
    local issues=0
    
    # Check for large files
    local large_files=$(git ls-files | xargs du -h 2>/dev/null | awk '$1 ~ /M$/ {print}' | wc -l)
    if [ "${large_files}" -gt 0 ]; then
        echo -e "${YELLOW}⚠ ${large_files} file(s) larger than 1MB${NC}"
        issues=$((issues + 1))
    fi
    
    # Check for uncommitted changes
    if ! git diff --quiet; then
        echo -e "${YELLOW}⚠ Uncommitted changes detected${NC}"
        issues=$((issues + 1))
    fi
    
    # Check for untracked files
    if [ -n "$(git ls-files --others --exclude-standard)" ]; then
        echo -e "${YELLOW}⚠ Untracked files present${NC}"
        issues=$((issues + 1))
    fi
    
    # Check if remote is accessible
    if ! git ls-remote origin >/dev/null 2>&1; then
        echo -e "${RED}✗ Cannot reach remote repository${NC}"
        issues=$((issues + 1))
    fi
    
    if [ ${issues} -eq 0 ]; then
        echo -e "${GREEN}✓ Repository is healthy${NC}"
    else
        echo -e "${YELLOW}⚠ ${issues} issue(s) found${NC}"
    fi
    
    # ── Summary ───────────────────────────────────────────────────────────────
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}✓ Status check completed${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

main "$@"
