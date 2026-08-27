#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example. Add local Supabase keys before continuing."
fi

bash scripts/supabase-cli.sh start
bash scripts/supabase-cli.sh db reset
pnpm start:dev
