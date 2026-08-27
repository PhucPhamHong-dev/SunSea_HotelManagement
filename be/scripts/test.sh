#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
bash scripts/supabase-cli.sh start
bash scripts/supabase-cli.sh db reset
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm build
