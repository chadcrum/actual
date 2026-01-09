#!/bin/bash
set -euo pipefail

# Script to sync upstream/master changes into the integration branch
# This uses merge (not rebase) to preserve history and allow pushing to origin

echo "🔄 Syncing upstream/master changes..."

# Checkout the integration branch
echo "📍 Checking out integration branch..."
if ! git checkout integration; then
  echo "❌ Error: Failed to checkout integration branch"
  exit 1
fi

# Get current branch name (should be integration)
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"

# Check if upstream remote exists
if ! git remote get-url upstream &>/dev/null; then
  echo "❌ Error: 'upstream' remote not found."
  echo "   Add it with: git remote add upstream https://github.com/actualbudget/actual.git"
  exit 1
fi

# Fetch all remotes
echo "📥 Fetching from all remotes..."
git fetch --all

# Ensure we have the latest upstream master
echo "📥 Pulling latest changes from upstream/master..."
git pull upstream master

# Check if there are any changes to merge
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse upstream/master)

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "✅ Already up to date with upstream/master"
  exit 0
fi

# Show what commits are ahead of upstream
echo ""
echo "📊 Your local commits ahead of upstream:"
git log --oneline upstream/master..HEAD | head -10
if [ "$(git rev-list --count upstream/master..HEAD)" -gt 10 ]; then
  echo "... and $(($(git rev-list --count upstream/master..HEAD) - 10)) more"
fi
echo ""

# Merge upstream/master into current branch
echo "🔀 Merging upstream/master into $CURRENT_BRANCH..."
git merge upstream/master

echo ""
echo "✅ Successfully synced upstream/master changes into $CURRENT_BRANCH"
echo "💡 You can now push to origin with: git push origin $CURRENT_BRANCH"

