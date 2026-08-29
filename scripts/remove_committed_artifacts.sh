#!/usr/bin/env bash
set -euo pipefail

BRANCH=${1:-v1.1-dev}

echo "This script will remove tracked DWIP DB files and Python cache artifacts from branch: $BRANCH"

# Fetch and checkout branch
git fetch origin
git checkout "$BRANCH"

echo "Ensure .gitignore is up-to-date and committed"
if git ls-files --error-unmatch .gitignore >/dev/null 2>&1; then
  git add .gitignore || true
  if ! git diff --staged --quiet -- .gitignore; then
    git commit -m "chore: add Python, DB, and cache ignores to .gitignore" || true
  fi
else
  echo "No .gitignore found in repo root. Please ensure .gitignore exists before running this script."
fi

# Preview matched tracked files
echo "\nPreview of tracked files matching patterns:"
git ls-files | grep -E 'DWIP/database/.*\.(db|sqlite)$|(^|/)__pycache__|\.pyc$' || true

# Remove tracked files from the index (stop tracking) and optionally delete locally
MATCHES=$(git ls-files | grep -E 'DWIP/database/.*\.(db|sqlite)$|(^|/)__pycache__|\.pyc$' || true)
if [ -z "$MATCHES" ]; then
  echo "No tracked artifact files found. Exiting."
  exit 0
fi

# Stop tracking the files
echo "Removing tracked files from git index (git rm --cached)"
printf "%s\n" $MATCHES | xargs -r git rm -r --cached || true

# Optionally remove them from working tree as well
read -p "Also delete these files from your working tree? (y/N): " DELETE_LOCAL
if [[ "$DELETE_LOCAL" =~ ^[Yy]$ ]]; then
  printf "%s\n" $MATCHES | xargs -r rm -rf || true
fi

# Commit the removal
git commit -m "chore: remove committed DB files and Python cache artifacts" || true

echo "Pushing changes to origin/$BRANCH"
git push origin "$BRANCH"

echo "Cleanup complete. Verify with:\n  git ls-files | grep -E '\\.(db|sqlite)$|\\.pyc$|__pycache__' || echo 'No matches'"
