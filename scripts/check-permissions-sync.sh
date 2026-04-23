#!/usr/bin/env bash
# Checks that this repo's permissions.snapshot.json is byte-identical to the sibling repo's.
# Usage: ./scripts/check-permissions-sync.sh <sibling-repo-path>

set -euo pipefail

SIBLING="${1:-}"
if [[ -z "$SIBLING" ]]; then
  echo "Usage: $0 <sibling-repo-path>" >&2
  echo "Example: $0 ../campusly-backend" >&2
  exit 2
fi

LOCAL="src/lib/permissions.snapshot.json"
REMOTE="$SIBLING/src/common/permissions.snapshot.json"

if [[ ! -f "$LOCAL" ]]; then
  echo "Not found: $LOCAL" >&2; exit 2
fi
if [[ ! -f "$REMOTE" ]]; then
  echo "Not found: $REMOTE" >&2; exit 2
fi

if diff -q "$LOCAL" "$REMOTE" > /dev/null; then
  echo "OK: permissions snapshots match"
  exit 0
else
  echo "DIVERGED: permissions snapshots differ" >&2
  diff "$LOCAL" "$REMOTE" >&2 || true
  exit 1
fi
