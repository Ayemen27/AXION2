#!/bin/bash

# ══════════════════════════════════════════════════════════════════════════════
# AXION Git Manager — Professional Git Operations with Error Handling
# إدارة Git احترافية مع معالجة أخطاء شاملة
# ══════════════════════════════════════════════════════════════════════════════

set -e  # Exit on any error
set -u  # Exit on undefined variable
set -o pipefail  # Exit on pipe failure

# ── Configuration ─────────────────────────────────────────────────────────────
PROJECT_DIR="${PROJECT_DIR:-$(pwd)}"
REPO_URL="${REPO_URL:-}"
BRANCH="${BRANCH:-main}"
LOG_FILE="${PROJECT_DIR}/git-operations.log"
MAX_LOG_SIZE=10485760  # 10MB
COMMIT_MESSAGE="${COMMIT_MESSAGE:-Auto update $(date +'%Y-%m-%d %H:%M:%S')}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ── Logging Functions ─────────────────────────────────────────────────────────
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date +'%Y-%m-%d %H:%M:%S')
    
    echo "[${timestamp}] [${level}] ${message}" | tee -a "${LOG_FILE}"
}

log_info() {
    echo -e "${BLUE}ℹ${NC} $*"
    log "INFO" "$*"
}

log_success() {
    echo -e "${GREEN}✓${NC} $*"
    log "SUCCESS" "$*"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $*"
    log "WARNING" "$*"
}

log_error() {
    echo -e "${RED}✗${NC} $*" >&2
    log "ERROR" "$*"
}

# ── Utility Functions ─────────────────────────────────────────────────────────
rotate_log() {
    if [ -f "${LOG_FILE}" ]; then
        local size=$(stat -f%z "${LOG_FILE}" 2>/dev/null || stat -c%s "${LOG_FILE}" 2>/dev/null || echo 0)
        if [ "${size}" -gt "${MAX_LOG_SIZE}" ]; then
            log_info "Rotating log file (size: ${size} bytes)"
            mv "${LOG_FILE}" "${LOG_FILE}.old"
            touch "${LOG_FILE}"
        fi
    fi
}

check_command() {
    local cmd="$1"
    if ! command -v "${cmd}" >/dev/null 2>&1; then
        log_error "Command '${cmd}' not found"
        return 1
    fi
    return 0
}

install_git() {
    log_info "Git not found. Installing Git..."
    
    if command -v apt-get >/dev/null 2>&1; then
        sudo apt-get update -qq && sudo apt-get install -y git
    elif command -v yum >/dev/null 2>&1; then
        sudo yum install -y git
    elif command -v apk >/dev/null 2>&1; then
        sudo apk add git
    elif command -v brew >/dev/null 2>&1; then
        brew install git
    else
        log_error "Cannot install Git: no supported package manager found"
        return 1
    fi
    
    if check_command git; then
        log_success "Git installed successfully"
        git --version
        return 0
    else
        log_error "Git installation failed"
        return 1
    fi
}

# ── Git Operations ────────────────────────────────────────────────────────────
ensure_git_installed() {
    log_info "Step 1/10: Checking Git installation..."
    
    if check_command git; then
        log_success "Git is already installed ($(git --version))"
        return 0
    else
        install_git || exit 1
    fi
}

verify_project_directory() {
    log_info "Step 2/10: Verifying project directory..."
    
    if [ ! -d "${PROJECT_DIR}" ]; then
        log_error "Project directory does not exist: ${PROJECT_DIR}"
        exit 1
    fi
    
    cd "${PROJECT_DIR}" || {
        log_error "Cannot access project directory: ${PROJECT_DIR}"
        exit 1
    }
    
    log_success "Project directory verified: ${PROJECT_DIR}"
}

configure_git_user() {
    log_info "Step 3/10: Configuring Git user..."
    
    local git_name=$(git config user.name 2>/dev/null || echo "")
    local git_email=$(git config user.email 2>/dev/null || echo "")
    
    if [ -z "${git_name}" ]; then
        read -p "Enter your Git username: " git_name
        git config --global user.name "${git_name}"
    fi
    
    if [ -z "${git_email}" ]; then
        read -p "Enter your Git email: " git_email
        git config --global user.email "${git_email}"
    fi
    
    log_success "Git user configured: ${git_name} <${git_email}>"
}

initialize_repository() {
    log_info "Step 4/10: Initializing Git repository..."
    
    if [ -d ".git" ]; then
        log_success "Git repository already initialized"
        return 0
    fi
    
    git init || {
        log_error "Failed to initialize Git repository"
        exit 1
    }
    
    log_success "Git repository initialized"
}

configure_remote() {
    log_info "Step 5/10: Configuring remote repository..."
    
    if [ -z "${REPO_URL}" ]; then
        read -p "Enter repository URL: " REPO_URL
    fi
    
    # Remove existing origin
    git remote remove origin 2>/dev/null || true
    
    # Add new origin
    git remote add origin "${REPO_URL}" || {
        log_error "Failed to add remote origin"
        exit 1
    }
    
    log_success "Remote origin configured: ${REPO_URL}"
}

fetch_remote() {
    log_info "Step 6/10: Fetching from remote..."
    
    if ! git fetch origin 2>&1 | tee -a "${LOG_FILE}"; then
        log_warning "Fetch failed (this is normal for new repositories)"
        return 0
    fi
    
    log_success "Fetched from remote successfully"
}

pull_changes() {
    log_info "Step 7/10: Pulling latest changes..."
    
    # Check if remote branch exists
    if ! git ls-remote --heads origin "${BRANCH}" | grep -q "${BRANCH}"; then
        log_warning "Remote branch '${BRANCH}' does not exist yet. Skipping pull."
        return 0
    fi
    
    # Check if there are any commits
    if ! git rev-parse HEAD >/dev/null 2>&1; then
        log_warning "No commits yet. Skipping pull."
        return 0
    fi
    
    if git pull --rebase origin "${BRANCH}" 2>&1 | tee -a "${LOG_FILE}"; then
        log_success "Pulled changes successfully"
    else
        local exit_code=$?
        log_error "Pull failed with exit code ${exit_code}"
        
        # Handle merge conflicts
        if git status | grep -q "both modified"; then
            log_warning "Merge conflicts detected. Attempting auto-resolve..."
            git add .
            git rebase --continue || {
                log_error "Cannot auto-resolve conflicts. Manual intervention required."
                git rebase --abort
                exit 1
            }
        else
            exit 1
        fi
    fi
}

stage_changes() {
    log_info "Step 8/10: Staging changes..."
    
    git add . || {
        log_error "Failed to stage changes"
        exit 1
    }
    
    local changes=$(git diff --cached --stat)
    if [ -n "${changes}" ]; then
        log_success "Changes staged:"
        echo "${changes}" | tee -a "${LOG_FILE}"
    else
        log_warning "No changes to stage"
    fi
}

commit_changes() {
    log_info "Step 9/10: Committing changes..."
    
    # Check if there are changes to commit
    if git diff --cached --quiet; then
        log_warning "No changes to commit"
        return 0
    fi
    
    git commit -m "${COMMIT_MESSAGE}" || {
        log_error "Failed to commit changes"
        exit 1
    }
    
    log_success "Changes committed: ${COMMIT_MESSAGE}"
}

push_changes() {
    log_info "Step 10/10: Pushing to remote..."
    
    # Set upstream branch
    git branch -M "${BRANCH}" || {
        log_error "Failed to set branch name"
        exit 1
    }
    
    if git push -u origin "${BRANCH}" 2>&1 | tee -a "${LOG_FILE}"; then
        log_success "Pushed to ${BRANCH} successfully"
    else
        local exit_code=$?
        log_error "Push failed with exit code ${exit_code}"
        
        # Try force push if requested
        read -p "Force push? (y/N): " force_push
        if [ "${force_push}" = "y" ] || [ "${force_push}" = "Y" ]; then
            git push -u origin "${BRANCH}" --force 2>&1 | tee -a "${LOG_FILE}" || {
                log_error "Force push failed"
                exit 1
            }
            log_success "Force pushed successfully"
        else
            exit 1
        fi
    fi
}

# ── Status & Info ─────────────────────────────────────────────────────────────
show_status() {
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "                    Git Repository Status                      "
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    
    echo "📁 Project Directory: ${PROJECT_DIR}"
    echo "🌿 Current Branch: $(git branch --show-current 2>/dev/null || echo 'N/A')"
    echo "🔗 Remote URL: $(git remote get-url origin 2>/dev/null || echo 'N/A')"
    echo ""
    
    echo "📊 Repository Status:"
    git status --short 2>/dev/null || echo "Not a git repository"
    echo ""
    
    echo "📜 Recent Commits:"
    git log --oneline -5 2>/dev/null || echo "No commits yet"
    echo ""
    
    echo "═══════════════════════════════════════════════════════════════"
}

# ── Main Execution ────────────────────────────────────────────────────────────
main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║           AXION Git Manager — Professional Edition             ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    
    # Rotate log if needed
    rotate_log
    
    log_info "Starting Git operations at $(date)"
    log_info "═══════════════════════════════════════════════════════════════"
    
    # Execute all steps sequentially with error handling
    ensure_git_installed
    verify_project_directory
    configure_git_user
    initialize_repository
    configure_remote
    fetch_remote
    pull_changes
    stage_changes
    commit_changes
    push_changes
    
    log_info "═══════════════════════════════════════════════════════════════"
    log_success "All operations completed successfully!"
    log_info "Ended at $(date)"
    
    # Show final status
    show_status
    
    echo ""
    echo -e "${GREEN}✓ Success!${NC} All changes have been synchronized."
    echo "📋 Full log: ${LOG_FILE}"
    echo ""
}

# ── Error Handler ─────────────────────────────────────────────────────────────
trap 'log_error "Script failed at line ${LINENO}. Exit code: $?"; exit 1' ERR

# ── Script Entry Point ────────────────────────────────────────────────────────
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi
