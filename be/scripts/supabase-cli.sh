#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if command -v supabase >/dev/null 2>&1; then
  exec supabase "$@"
fi

echo "Supabase CLI not found; using Docker fallback."
exec docker run --rm \
  -v "${ROOT_DIR}:/workspace" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -w /workspace \
  public.ecr.aws/supabase/cli:latest "$@"
