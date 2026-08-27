# SunSea Hotel Management

Hệ thống quản lý khách sạn SUNSEA gồm hai codebase độc lập:

- [`be/`](./be): NestJS API, Supabase integration và Socket.IO realtime.
- [`fe/`](./fe): Next.js dashboard cho vận hành khách sạn.

Mỗi ứng dụng có tài liệu và hướng dẫn chạy riêng:

- [Backend README](./be/README.md)
- [Frontend README](./fe/README.md)

Không commit file `.env` hoặc bất kỳ secret, token hay khóa kết nối nào.

## Production deployment

Production uses one public origin: `https://sunsea.phucpink.io.vn`. The VPS Nginx instance terminates HTTPS and routes `/` to `fe`, while `/api/*`, `/socket.io/*`, `/docs*` and `/openapi.json` go to `be`; the Backend and Frontend containers are only bound to loopback ports.

On the VPS, place the real environment file at `/opt/sunsea/.env` based on [`deploy/production.env.example`](./deploy/production.env.example), then run:

```bash
cd /opt/sunsea
docker compose --env-file .env -f docker-compose.production.yml up -d --build
```

The only required public DNS record is `sunsea.phucpink.io.vn → VPS IPv4`. Open ports `80` and `443` for Nginx (and `22` only for SSH administration). Install [`deploy/nginx/sunsea.phucpink.io.vn.conf`](./deploy/nginx/sunsea.phucpink.io.vn.conf) into Nginx and use Certbot to issue the certificate before serving traffic.

## CI/CD production

Every push to `main` runs the root GitHub Actions workflow at [`.github/workflows/production.yml`](./.github/workflows/production.yml). Its quality gate runs Backend and Frontend install, lint, typecheck, existing unit tests, build, and a secret scan on GitHub-hosted runners. Only after that succeeds does the `sunsea-production` self-hosted runner deploy the exact pushed commit to `/opt/sunsea`.

The deploy runner never runs on pull requests or forks. It runs [`deploy/ci/deploy-production.sh`](./deploy/ci/deploy-production.sh), validates the Docker Compose configuration, rebuilds both services, checks Backend and Frontend health endpoints, and rolls the VPS back to the previous Git revision if deployment or health verification fails. Production secrets remain only in `/opt/sunsea/.env`; do not add them to GitHub Actions secrets or this repository.
