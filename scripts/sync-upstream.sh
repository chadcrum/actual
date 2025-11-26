#!/bin/bash
set -euo pipefail

# Script to sync upstream/master changes into the current branch
# This uses merge (not rebase) to preserve history and allow pushing to origin

echo "🔄 Syncing upstream/master changes..."

# Get current branch name
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"

# Check if upstream remote exists
if ! git remote get-url upstream &>/dev/null; then
  echo "❌ Error: 'upstream' remote not found."
  echo "   Add it with: git remote add upstream https://github.com/actualbudget/actual.git"
  exit 1
fi

# Fetch latest changes from upstream
echo "📥 Fetching latest changes from upstream/master..."
git fetch upstream master

# Check if there are any changes to merge
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse upstream/master)

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "✅ Already up to date with upstream/master"
  exit 0
fi

# Show what commits will be merged
echo ""
echo "📊 Commits to be merged:"
git log --oneline HEAD..upstream/master | head -10
if [ "$(git rev-list --count HEAD..upstream/master)" -gt 10 ]; then
  echo "... and $(($(git rev-list --count HEAD..upstream/master) - 10)) more"
fi
echo ""

# Merge upstream/master into current branch
echo "🔀 Merging upstream/master into $CURRENT_BRANCH..."
git merge upstream/master --no-edit

echo ""
echo "✅ Successfully synced upstream/master changes into $CURRENT_BRANCH"
echo "💡 You can now push to origin with: git push origin $CURRENT_BRANCH"

