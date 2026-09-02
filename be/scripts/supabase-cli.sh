#!/usr/bin/env bash
set -euo pipefail

if command -v supabase >/dev/null 2>&1; then
  exec supabase "$@"
fi

if command -v npx >/dev/null 2>&1; then
  echo "Supabase CLI not found; using the ephemeral npx CLI."
  exec npx --yes supabase "$@"
fi

echo "Supabase CLI requires either the supabase binary or npx from the supported Node runtime." >&2
exit 1
