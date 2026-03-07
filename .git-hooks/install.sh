#!/bin/bash

# ══════════════════════════════════════════════════════════════════════════════
# AXION Git Hooks — Installer
# تثبيت Git hooks تلقائياً
# ══════════════════════════════════════════════════════════════════════════════

set -e

HOOKS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GIT_HOOKS_DIR=".git/hooks"

echo ""
echo "🔧 Installing AXION Git Hooks..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if .git directory exists
if [ ! -d ".git" ]; then
  echo "❌ Not a Git repository. Run 'git init' first."
  exit 1
fi

# Create hooks directory if it doesn't exist
mkdir -p "$GIT_HOOKS_DIR"

# Install hooks
for hook in pre-commit pre-push post-merge; do
  if [ -f "$HOOKS_DIR/$hook" ]; then
    echo "📝 Installing $hook..."
    
    # Copy hook
    cp "$HOOKS_DIR/$hook" "$GIT_HOOKS_DIR/$hook"
    
    # Make executable
    chmod +x "$GIT_HOOKS_DIR/$hook"
    
    echo "✅ $hook installed"
  fi
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Git hooks installed successfully!"
echo ""
echo "Installed hooks:"
echo "  • pre-commit:  Linting, tests, formatting"
echo "  • pre-push:    Tests, build check, large file check"
echo "  • post-merge:  Dependencies, changelog, rebuild"
echo ""
echo "To test: git commit -m 'test'"
echo ""
