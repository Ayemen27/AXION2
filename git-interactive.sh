#!/bin/bash

# ══════════════════════════════════════════════════════════════════════════════
# AXION Interactive Git Manager — Terminal UI
# واجهة تفاعلية لإدارة Git
# ══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

PROJECT_DIR="${1:-$(pwd)}"

# ── UI Functions ──────────────────────────────────────────────────────────────
clear_screen() {
    clear
    echo ""
}

print_banner() {
    echo -e "${CYAN}"
    cat << "EOF"
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║              █████╗ ██╗  ██╗██╗ ██████╗ ███╗   ██╗               ║
║             ██╔══██╗╚██╗██╔╝██║██╔═══██╗████╗  ██║               ║
║             ███████║ ╚███╔╝ ██║██║   ██║██╔██╗ ██║               ║
║             ██╔══██║ ██╔██╗ ██║██║   ██║██║╚██╗██║               ║
║             ██║  ██║██╔╝ ██╗██║╚██████╔╝██║ ╚████║               ║
║             ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝               ║
║                                                                   ║
║                    Git Interactive Manager                        ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

print_menu() {
    echo -e "${BOLD}Git Operations Menu:${NC}"
    echo ""
    echo -e "  ${GREEN}1${NC}) 📊 Show Status"
    echo -e "  ${GREEN}2${NC}) 🔄 Pull Changes"
    echo -e "  ${GREEN}3${NC}) ⬆️  Push Changes"
    echo -e "  ${GREEN}4${NC}) 🔄 Full Sync (Pull → Commit → Push)"
    echo -e "  ${GREEN}5${NC}) 📜 View Commit History"
    echo -e "  ${GREEN}6${NC}) 🌿 Manage Branches"
    echo -e "  ${GREEN}7${NC}) 📋 View Diff"
    echo -e "  ${GREEN}8${NC}) ↩️  Undo Last Commit"
    echo -e "  ${GREEN}9${NC}) 🔍 Search Commits"
    echo -e "  ${GREEN}10${NC}) ⚙️  Settings"
    echo -e "  ${RED}0${NC}) ❌ Exit"
    echo ""
}

read_choice() {
    echo -ne "${CYAN}Enter choice [0-10]:${NC} "
    read choice
    echo ""
}

press_enter() {
    echo ""
    echo -ne "${YELLOW}Press ENTER to continue...${NC}"
    read
}

# ── Git Operations ────────────────────────────────────────────────────────────
show_status() {
    clear_screen
    echo -e "${BLUE}━━━ Repository Status ━━━${NC}"
    echo ""
    
    ./git-status-checker.sh "${PROJECT_DIR}"
    
    press_enter
}

pull_changes() {
    clear_screen
    echo -e "${BLUE}━━━ Pulling Changes ━━━${NC}"
    echo ""
    
    cd "${PROJECT_DIR}"
    
    git pull --rebase origin main || {
        echo -e "${RED}✗ Pull failed${NC}"
        press_enter
        return 1
    }
    
    echo -e "${GREEN}✓ Pull completed successfully${NC}"
    press_enter
}

push_changes() {
    clear_screen
    echo -e "${BLUE}━━━ Pushing Changes ━━━${NC}"
    echo ""
    
    cd "${PROJECT_DIR}"
    
    # Check for uncommitted changes
    if ! git diff --quiet || ! git diff --cached --quiet; then
        echo -e "${YELLOW}⚠ Uncommitted changes detected${NC}"
        echo -ne "${CYAN}Commit message:${NC} "
        read commit_msg
        
        git add .
        git commit -m "${commit_msg}" || {
            echo -e "${RED}✗ Commit failed${NC}"
            press_enter
            return 1
        }
    fi
    
    git push origin main || {
        echo -e "${RED}✗ Push failed${NC}"
        press_enter
        return 1
    }
    
    echo -e "${GREEN}✓ Push completed successfully${NC}"
    press_enter
}

full_sync() {
    clear_screen
    echo -e "${BLUE}━━━ Full Synchronization ━━━${NC}"
    echo ""
    
    ./git-manager.sh
    
    press_enter
}

view_history() {
    clear_screen
    echo -e "${BLUE}━━━ Commit History ━━━${NC}"
    echo ""
    
    cd "${PROJECT_DIR}"
    
    git log --oneline --graph --decorate --all --color=always | less -R
    
    press_enter
}

manage_branches() {
    clear_screen
    echo -e "${BLUE}━━━ Branch Management ━━━${NC}"
    echo ""
    
    cd "${PROJECT_DIR}"
    
    echo "Current branches:"
    git branch -a
    echo ""
    
    echo -e "${CYAN}Options:${NC}"
    echo "  1) Create new branch"
    echo "  2) Switch branch"
    echo "  3) Delete branch"
    echo "  0) Back"
    echo ""
    
    echo -ne "${CYAN}Choose:${NC} "
    read branch_choice
    
    case ${branch_choice} in
        1)
            echo -ne "${CYAN}New branch name:${NC} "
            read branch_name
            git checkout -b "${branch_name}"
            echo -e "${GREEN}✓ Branch '${branch_name}' created${NC}"
            ;;
        2)
            echo -ne "${CYAN}Branch name:${NC} "
            read branch_name
            git checkout "${branch_name}"
            echo -e "${GREEN}✓ Switched to '${branch_name}'${NC}"
            ;;
        3)
            echo -ne "${CYAN}Branch to delete:${NC} "
            read branch_name
            git branch -d "${branch_name}"
            echo -e "${GREEN}✓ Branch '${branch_name}' deleted${NC}"
            ;;
    esac
    
    press_enter
}

view_diff() {
    clear_screen
    echo -e "${BLUE}━━━ Changes Diff ━━━${NC}"
    echo ""
    
    cd "${PROJECT_DIR}"
    
    git diff --color=always | less -R
    
    press_enter
}

undo_last_commit() {
    clear_screen
    echo -e "${BLUE}━━━ Undo Last Commit ━━━${NC}"
    echo ""
    
    cd "${PROJECT_DIR}"
    
    echo -e "${YELLOW}⚠ Warning: This will undo the last commit${NC}"
    echo -ne "${CYAN}Continue? (y/N):${NC} "
    read confirm
    
    if [ "${confirm}" = "y" ] || [ "${confirm}" = "Y" ]; then
        git reset --soft HEAD~1
        echo -e "${GREEN}✓ Last commit undone (changes preserved)${NC}"
    else
        echo -e "${YELLOW}✗ Cancelled${NC}"
    fi
    
    press_enter
}

search_commits() {
    clear_screen
    echo -e "${BLUE}━━━ Search Commits ━━━${NC}"
    echo ""
    
    cd "${PROJECT_DIR}"
    
    echo -ne "${CYAN}Search term:${NC} "
    read search_term
    
    git log --all --grep="${search_term}" --oneline --color=always
    
    press_enter
}

settings_menu() {
    clear_screen
    echo -e "${BLUE}━━━ Settings ━━━${NC}"
    echo ""
    
    cd "${PROJECT_DIR}"
    
    echo -e "${CYAN}Current Git Config:${NC}"
    echo ""
    echo "  User: $(git config user.name) <$(git config user.email)>"
    echo "  Remote: $(git remote get-url origin 2>/dev/null || echo 'N/A')"
    echo ""
    
    echo -e "${CYAN}Options:${NC}"
    echo "  1) Change user name/email"
    echo "  2) Change remote URL"
    echo "  3) View full config"
    echo "  0) Back"
    echo ""
    
    echo -ne "${CYAN}Choose:${NC} "
    read settings_choice
    
    case ${settings_choice} in
        1)
            echo -ne "${CYAN}New name:${NC} "
            read new_name
            echo -ne "${CYAN}New email:${NC} "
            read new_email
            git config user.name "${new_name}"
            git config user.email "${new_email}"
            echo -e "${GREEN}✓ User updated${NC}"
            ;;
        2)
            echo -ne "${CYAN}New remote URL:${NC} "
            read new_url
            git remote set-url origin "${new_url}"
            echo -e "${GREEN}✓ Remote updated${NC}"
            ;;
        3)
            git config --list
            ;;
    esac
    
    press_enter
}

# ── Main Loop ─────────────────────────────────────────────────────────────────
main() {
    while true; do
        clear_screen
        print_banner
        print_menu
        read_choice
        
        case ${choice} in
            1) show_status ;;
            2) pull_changes ;;
            3) push_changes ;;
            4) full_sync ;;
            5) view_history ;;
            6) manage_branches ;;
            7) view_diff ;;
            8) undo_last_commit ;;
            9) search_commits ;;
            10) settings_menu ;;
            0)
                clear_screen
                echo -e "${GREEN}Goodbye! 👋${NC}"
                echo ""
                exit 0
                ;;
            *)
                echo -e "${RED}Invalid choice. Please try again.${NC}"
                press_enter
                ;;
        esac
    done
}

# ── Entry Point ───────────────────────────────────────────────────────────────
main
