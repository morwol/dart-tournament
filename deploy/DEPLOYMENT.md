# DartEvent Manager — Deployment Guide

## Requirements

- Ubuntu 22.04 LTS or 24.04 LTS (fresh server)
- A domain pointing to the server's IP (DNS A-record must exist before setup)
- Root access
- For Oracle Cloud: open ports 80 and 443 in the VCN Security List

---

## Fresh Server Setup

Run this single block as root:

```bash
apt-get update && apt-get install -y curl git && \
git clone https://github.com/morwol/dart-tournament.git /tmp/dartsturnier-setup && \
sudo bash /tmp/dartsturnier-setup/deploy/setup-ubuntu.sh
```

The script will prompt for:
- **Domain** — e.g. `darts.example.com`
- **Branch** — `1` for production (main), `2` for dev
- **Git repository URL**
- **Admin username and password**

Everything else is automated: system upgrade, Node.js, nginx, SSL, firewall, systemd service.

---

## After Setup — GitHub Webhook (dev server only)

The setup script prints a webhook secret at the end. Use it to configure auto-deploy:

1. GitHub → Repository → **Settings → Webhooks → Add webhook**
2. Payload URL: `https://your-dev-domain/webhook`
3. Content type: `application/json`
4. Secret: shown at end of setup script (also in `/var/www/dartsturnier/backend/.env`)
5. Events: **Just the push event**

From this point on, every merge into `dev` automatically deploys to the dev server.

---

## Deployment Workflow

```
feature/xyz  →  PR → dev  →  auto-deploy to dev server
                          →  test
                          →  PR → main  →  manual update on prod server
```

**Manual update — production server:**
```bash
sudo bash /var/www/dartsturnier/deploy/update.sh
```

**Manual update — dev server:**
```bash
sudo bash /var/www/dartsturnier/deploy/update-dev.sh
```

---

## Useful Commands

```bash
# Service status
systemctl status dartevent

# Live logs
journalctl -u dartevent -f

# Webhook receiver logs (dev only)
journalctl -u dartevent-webhook -f

# Restart service
systemctl restart dartevent

# Database backup
sudo bash /var/www/dartsturnier/deploy/backup.sh
```

---

## File Overview

| File | Purpose |
|------|---------|
| `setup-ubuntu.sh` | Full setup for a fresh Ubuntu server |
| `update.sh` | Update production server (main branch) |
| `update-dev.sh` | Update dev server (dev branch) |
| `backup.sh` | On-demand database backup |
| `dartevent-webhook.service` | systemd unit for the GitHub webhook receiver |
| `nginx-dev.conf` | nginx config template for reference |
