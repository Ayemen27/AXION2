#!/bin/bash

# ══════════════════════════════════════════════════════════════════════════════
# AXION Git Auto-Sync — Automated Synchronization with Cron
# مزامنة تلقائية مع Git كل X دقائق
# ══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
PROJECT_DIR="${1:-$(pwd)}"
REPO_URL="${2:-}"
SYNC_INTERVAL="${3:-15}"  # minutes
LOG_FILE="${PROJECT_DIR}/git-auto-sync.log"
LOCK_FILE="/tmp/git-auto-sync.lock"
MAX_RETRIES=3
RETRY_DELAY=10  # seconds

# ── Logging ───────────────────────────────────────────────────────────────────
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "${LOG_FILE}"
}

# ── Lock Management ───────────────────────────────────────────────────────────
acquire_lock() {
    local retries=0
    
    while [ ${retries} -lt ${MAX_RETRIES} ]; do
        if mkdir "${LOCK_FILE}" 2>/dev/null; then
            trap 'rm -rf "${LOCK_FILE}"' EXIT
            return 0
        fi
        
        log "⏳ Lock exists. Waiting... (attempt $((retries + 1))/${MAX_RETRIES})"
        sleep ${RETRY_DELAY}
        retries=$((retries + 1))
    done
    
    log "❌ Failed to acquire lock after ${MAX_RETRIES} attempts"
    return 1
}

# ── Sync Function ─────────────────────────────────────────────────────────────
sync_repository() {
    log "🔄 Starting auto-sync..."
    
    cd "${PROJECT_DIR}" || {
        log "❌ Cannot access project directory: ${PROJECT_DIR}"
        return 1
    }
    
    # Check for changes
    if ! git diff --quiet || ! git diff --cached --quiet; then
        log "📝 Changes detected. Syncing..."
        
        # Stage all changes
        git add . || {
            log "❌ Failed to stage changes"
            return 1
        }
        
        # Commit
        git commit -m "Auto-sync: $(date +'%Y-%m-%d %H:%M:%S')" || {
            log "⚠️ Nothing to commit"
            return 0
        }
        
        # Pull with rebase
        git pull --rebase origin main 2>&1 | tee -a "${LOG_FILE}" || {
            log "❌ Pull failed"
            git rebase --abort 2>/dev/null
            return 1
        }
        
        # Push
        git push origin main 2>&1 | tee -a "${LOG_FILE}" || {
            log "❌ Push failed"
            return 1
        }
        
        log "✅ Sync completed successfully"
    else
        log "ℹ️ No changes to sync"
    fi
    
    return 0
}

# ── Main ──────────────────────────────────────────────────────────────────────
main() {
    # Acquire lock to prevent concurrent runs
    acquire_lock || exit 1
    
    # Run sync
    if sync_repository; then
        log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    else
        log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        log "⚠️ Sync failed. Will retry in ${SYNC_INTERVAL} minutes."
    fi
}

# ── Cron Setup Helper ─────────────────────────────────────────────────────────
setup_cron() {
    local script_path="$(readlink -f "$0")"
    local cron_line="*/${SYNC_INTERVAL} * * * * ${script_path} ${PROJECT_DIR} ${REPO_URL} ${SYNC_INTERVAL}"
    
    echo ""
    echo "To enable auto-sync every ${SYNC_INTERVAL} minutes, add this to crontab:"
    echo ""
    echo "  ${cron_line}"
    echo ""
    echo "Run: crontab -e"
    echo "Then paste the line above."
    echo ""
}

# ── Entry Point ───────────────────────────────────────────────────────────────
case "${1:-}" in
    --setup-cron)
        setup_cron
        ;;
    *)
        main
        ;;
esac
