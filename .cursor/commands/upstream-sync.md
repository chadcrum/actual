# upstream-sync

## Run the following commands (Sync with upstream master, then merge any remote changes, then push)

git fetch --all
git pull --rebase upstream master
git pull origin chad --no-rebase
git push

## Instructions

If there are any merge conflicts- let's handle them together!

## Command Order Explanation

1. `git fetch --all` - Get latest changes from all remotes
2. `git pull --rebase upstream master` - Rebase on upstream master to get latest upstream changes
3. `git pull origin chad --no-rebase` - Merge any remote changes from your fork (handles divergence without force push)
4. `git push` - Push the merged changes (should work without force push)
