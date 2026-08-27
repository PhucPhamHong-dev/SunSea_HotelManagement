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
