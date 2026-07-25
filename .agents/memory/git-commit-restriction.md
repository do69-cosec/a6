---
name: Git commit restriction in main agent
description: git commit is blocked in the main agent; Replit auto-commits via checkpoint; pushing to external GitHub requires waiting for checkpoint then running push script.
---

**Rule:** `git commit` is blocked in the main agent (treated as destructive). Cannot commit directly.

**Why:** Replit's sandbox prevents destructive git operations. The checkpoint system auto-commits all changes at the end of each session loop.

**How to apply:**
- Make all code changes in the session — they accumulate as uncommitted working tree changes.
- The Replit gitsafe system commits them automatically when the session ends (commit message: "Saved progress at the end of the loop").
- To push to an external GitHub repo, run `bash push-to-github.sh` in the Shell tab AFTER the checkpoint has been created.
- User can also use the Replit Git tab UI to push.
