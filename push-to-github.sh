#!/bin/bash
# One-time GitHub push setup script
# Run this in the Replit Shell: bash push-to-github.sh

if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ GITHUB_TOKEN secret not found. Make sure it's set in Replit Secrets."
  exit 1
fi

# Store credentials so Replit's Git UI works too
git config --global credential.helper store
echo "https://x-access-token:${GITHUB_TOKEN}@github.com" > ~/.git-credentials
chmod 600 ~/.git-credentials

echo "✅ Credentials configured"

# Push all commits
git push origin main

echo ""
echo "✅ Done! Your code is now on GitHub."
echo "   Replit's Git UI will also work from now on."
