#!/usr/bin/env bash

set -Eeuo pipefail

deploy_dir="${SUNSEA_DEPLOY_DIR:-/opt/sunsea}"
target_sha="${1:?Missing the Git commit SHA to deploy}"
compose_file="$deploy_dir/docker-compose.production.yml"
env_file="$deploy_dir/.env"

if [[ ! -d "$deploy_dir/.git" ]]; then
  echo "Deployment directory is not a Git worktree: $deploy_dir" >&2
  exit 1
fi

if [[ ! -f "$compose_file" || ! -f "$env_file" ]]; then
  echo "Production compose file or environment file is missing." >&2
  exit 1
fi

# The production checkout is intentionally owned by root while the runner uses
# a dedicated non-root account. Trust only this explicit worktree so Git's
# ownership protection remains active for every other path on the VPS.
if ! git config --global --get-all safe.directory | grep --fixed-strings --quiet --line-regexp "$deploy_dir"; then
  git config --global --add safe.directory "$deploy_dir"
fi

# Compose resolves relative paths from the current directory. The runner service
# starts in its own home directory, so always execute from the deployment tree.
cd "$deploy_dir"

if [[ -n "$(git -C "$deploy_dir" status --porcelain --untracked-files=no)" ]]; then
  echo "Production worktree has tracked local changes; refusing to overwrite it." >&2
  exit 1
fi

previous_sha="$(git -C "$deploy_dir" rev-parse HEAD)"
deployment_complete=false

rollback() {
  local exit_code="$?"
  trap - EXIT

  if [[ "$deployment_complete" != true ]]; then
    echo "Deployment failed; restoring the previous revision."
    git -C "$deploy_dir" checkout --force -B main "$previous_sha" || true
    docker compose --env-file "$env_file" -f "$compose_file" up -d --build || true
  fi

  exit "$exit_code"
}
trap rollback EXIT

git -C "$deploy_dir" fetch --no-tags origin main
if ! git -C "$deploy_dir" cat-file -e "${target_sha}^{commit}"; then
  echo "Requested commit is not available after fetching main: $target_sha" >&2
  exit 1
fi

if ! git -C "$deploy_dir" merge-base --is-ancestor "$target_sha" origin/main; then
  echo "Requested commit is not reachable from origin/main; refusing deployment." >&2
  exit 1
fi

git -C "$deploy_dir" checkout --force -B main "$target_sha"
docker compose --env-file "$env_file" -f "$compose_file" config --quiet
docker compose --env-file "$env_file" -f "$compose_file" up -d --build

wait_for_url() {
  local url="$1"
  local label="$2"

  for attempt in $(seq 1 40); do
    if curl --fail --silent --show-error --max-time 5 "$url" >/dev/null; then
      echo "$label is healthy."
      return 0
    fi
    sleep 3
  done

  echo "$label did not become healthy: $url" >&2
  return 1
}

wait_for_url 'http://127.0.0.1:13001/api/v1/health' 'Backend health check'
wait_for_url 'http://127.0.0.1:13000/login' 'Frontend health check'

deployment_complete=true
echo "Production deployment completed at revision $target_sha."
