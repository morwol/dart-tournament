#!/bin/bash
set -e
# ============================================================
# DartEvent Manager — Full Setup Script for Ubuntu Server
#
# Installs and configures everything from scratch:
#   nginx, Node.js, SSL, systemd service, firewall
#
# One-liner on a fresh Ubuntu server (run as root):
#   apt-get update && apt-get install -y curl git && \
#   git clone https://github.com/morwol/dart-tournament.git /tmp/dartsturnier-setup && \
#   sudo bash /tmp/dartsturnier-setup/deploy/setup-ubuntu.sh
#
# Works for both production (main) and dev (dev) servers.
# ============================================================

# --- Colors ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# --- Root check ---
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run as root: sudo bash setup-ubuntu.sh${NC}"
  exit 1
fi

clear
echo -e "${BOLD}${CYAN}"
echo "╔══════════════════════════════════════════════╗"
echo "║       DartEvent Manager — Ubuntu Setup       ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"

# ── Interactive configuration ──────────────────────────────

echo -e "${YELLOW}Please answer the following questions:${NC}"
echo ""

# Domain
read -p "  Domain (e.g. darts.example.com): " DOMAIN
if [ -z "$DOMAIN" ]; then
  echo -e "${RED}Domain cannot be empty.${NC}"; exit 1
fi

# Branch
echo ""
echo "  Which branch should be deployed?"
echo "    [1] main  — production"
echo "    [2] dev   — development"
read -p "  Choice [1/2]: " BRANCH_CHOICE
if [ "$BRANCH_CHOICE" = "2" ]; then
  BRANCH="dev"
else
  BRANCH="main"
fi

# Repo URL
echo ""
read -p "  Git repository URL: " REPO_URL
if [ -z "$REPO_URL" ]; then
  echo -e "${RED}Repository URL cannot be empty.${NC}"; exit 1
fi

# Admin credentials
echo ""
echo -e "${YELLOW}Admin account (first login):${NC}"
read -p "  Admin username [admin]: " ADMIN_USER
ADMIN_USER="${ADMIN_USER:-admin}"
read -s -p "  Admin password: " ADMIN_PASS
echo ""
if [ -z "$ADMIN_PASS" ]; then
  echo -e "${RED}Admin password cannot be empty.${NC}"; exit 1
fi

# JWT Secret (auto-generate)
JWT_SECRET=$(openssl rand -hex 48)

# Summary
APP_DIR="/var/www/dartsturnier"
SERVICE_NAME="dartevent"

echo ""
echo -e "${CYAN}──────────────────────────────────────────────${NC}"
echo -e "  Domain:     ${BOLD}$DOMAIN${NC}"
echo -e "  Branch:     ${BOLD}$BRANCH${NC}"
echo -e "  App path:   ${BOLD}$APP_DIR${NC}"
echo -e "  Service:    ${BOLD}$SERVICE_NAME${NC}"
echo -e "${CYAN}──────────────────────────────────────────────${NC}"
echo ""
read -p "Continue? [Enter to confirm / Ctrl+C to abort] " _

# ── 1. System packages ──────────────────────────────────────

echo ""
echo -e "${GREEN}[1/10] Installing system packages...${NC}"
apt update -q
DEBIAN_FRONTEND=noninteractive apt upgrade -y -q
apt install -y curl git nginx ufw openssl

# Node.js 20 LTS via NodeSource
if ! command -v node &>/dev/null || [ "$(node -e 'process.exit(parseInt(process.version.slice(1)) < 18 ? 1 : 0)'; echo $?)" != "0" ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi

# ffmpeg + yt-dlp (for walk-on songs)
apt install -y ffmpeg
if ! command -v yt-dlp &>/dev/null; then
  curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
  chmod a+rx /usr/local/bin/yt-dlp
fi

# certbot
apt install -y certbot python3-certbot-nginx

echo -e "${GREEN}    ✓ Packages installed${NC}"

# ── 2. Firewall ─────────────────────────────────────────────

echo -e "${GREEN}[2/10] Configuring firewall (ufw)...${NC}"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
echo -e "${GREEN}    ✓ Firewall configured (SSH + HTTP/HTTPS open)${NC}"

# ── 3. Service user ─────────────────────────────────────────

echo -e "${GREEN}[3/10] Creating service user...${NC}"
if ! id "$SERVICE_NAME" &>/dev/null; then
  useradd -r -s /bin/false -d "$APP_DIR" "$SERVICE_NAME"
fi
echo -e "${GREEN}    ✓ User '$SERVICE_NAME' ready${NC}"

# ── 4. Clone repository ─────────────────────────────────────

echo -e "${GREEN}[4/10] Cloning repository (branch: $BRANCH)...${NC}"
if [ -d "$APP_DIR/.git" ]; then
  echo "    Repository already exists — pulling latest..."
  cd "$APP_DIR"
  git fetch origin
  git checkout "$BRANCH"
  git pull origin "$BRANCH"
else
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
  git checkout "$BRANCH"
fi
echo -e "${GREEN}    ✓ Code ready at $APP_DIR${NC}"

# ── 5. Environment file ─────────────────────────────────────

echo -e "${GREEN}[5/10] Creating .env...${NC}"
ENV_FILE="$APP_DIR/backend/.env"
if [ ! -f "$ENV_FILE" ]; then
  cat > "$ENV_FILE" <<EOF
PORT=3001
JWT_SECRET=$JWT_SECRET
DB_PATH=./data/dartevent.db
ADMIN_USERNAME=$ADMIN_USER
ADMIN_PASSWORD=$ADMIN_PASS
EOF
  chmod 600 "$ENV_FILE"
  chown "$SERVICE_NAME":"$SERVICE_NAME" "$ENV_FILE"
fi
echo -e "${GREEN}    ✓ .env created${NC}"

# ── 6. Backend setup ────────────────────────────────────────

echo -e "${GREEN}[6/10] Installing backend dependencies...${NC}"
cd "$APP_DIR/backend"
npm install --omit=dev
mkdir -p "$APP_DIR/backend/data/walkon"
chown -R "$SERVICE_NAME":"$SERVICE_NAME" "$APP_DIR/backend/data"
echo -e "${GREEN}    ✓ Backend ready${NC}"

# ── 7. Frontend build ───────────────────────────────────────

echo -e "${GREEN}[7/10] Building frontend...${NC}"
cd "$APP_DIR/frontend"
npm install
npm run build
echo -e "${GREEN}    ✓ Frontend built${NC}"

# ── 8. nginx configuration ──────────────────────────────────

echo -e "${GREEN}[8/10] Configuring nginx...${NC}"
NGINX_CONF="/etc/nginx/sites-available/dartevent"

cat > "$NGINX_CONF" <<EOF
limit_req_zone \$binary_remote_addr zone=api:10m rate=20r/s;

server {
    listen 80;
    server_name $DOMAIN;

    location /api {
        limit_req zone=api burst=50 nodelay;
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location / {
        root $APP_DIR/frontend/dist;
        try_files \$uri \$uri/ /index.html;

        location ~* \.(js|css|png|jpg|ico|svg|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
EOF

# Enable site
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/dartevent
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable --now nginx
echo -e "${GREEN}    ✓ nginx configured for $DOMAIN${NC}"

# ── 9. SSL certificate ──────────────────────────────────────

echo -e "${GREEN}[9/10] Obtaining SSL certificate...${NC}"
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect
echo -e "${GREEN}    ✓ SSL certificate installed${NC}"

# ── 10. systemd service ─────────────────────────────────────

echo -e "${GREEN}[10/10] Installing systemd service...${NC}"
cat > /etc/systemd/system/dartevent.service <<EOF
[Unit]
Description=DartEvent Manager Backend
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=$SERVICE_NAME
Group=$SERVICE_NAME
WorkingDirectory=$APP_DIR/backend
ExecStart=/usr/bin/node src/app.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=dartevent
EnvironmentFile=$APP_DIR/backend/.env

NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=$APP_DIR/backend/data
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now dartevent
sleep 2

# ── Final status ────────────────────────────────────────────

echo ""
echo -e "${CYAN}══════════════════════════════════════════════${NC}"
if systemctl is-active --quiet dartevent; then
  echo -e "${GREEN}${BOLD}✓ Setup complete! DartEvent is running.${NC}"
else
  echo -e "${RED}✗ Service failed to start. Check logs:${NC}"
  echo "  journalctl -u dartevent -n 50"
  exit 1
fi
echo ""
echo -e "  ${BOLD}URL:${NC}     https://$DOMAIN"
echo -e "  ${BOLD}Branch:${NC}  $BRANCH"
echo -e "  ${BOLD}Admin:${NC}   $ADMIN_USER"
echo ""
echo -e "  Update: ${CYAN}sudo bash $APP_DIR/deploy/update-dev.sh${NC}   (dev)"
echo -e "         ${CYAN}sudo bash $APP_DIR/deploy/update.sh${NC}        (prod)"
echo ""
echo -e "  Logs:   ${CYAN}journalctl -u dartevent -f${NC}"
echo -e "${CYAN}══════════════════════════════════════════════${NC}"
echo ""
