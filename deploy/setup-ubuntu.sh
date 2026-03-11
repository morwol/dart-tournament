#!/bin/bash
set -e

# ============================================================
# DartEvent Manager — Setup-Script fuer Ubuntu 24.04
# Mit Apache (statt nginx) als Reverse Proxy
# ============================================================

# --- Root-Check ---
if [ "$EUID" -ne 0 ]; then
  echo "Bitte als root ausfuehren: sudo bash setup-ubuntu.sh"
  exit 1
fi

# --- Variablen ---
DOMAIN="${DOMAIN:-dart.p-entertainment.at}"
APP_DIR="/var/www/dartsturnier"
SERVICE_USER="dartevent"

echo "=== DartEvent Manager Setup (Ubuntu 24.04) ==="
echo "Domain:       $DOMAIN"
echo "App-Pfad:     $APP_DIR"
echo "Service-User: $SERVICE_USER"
echo ""

# --- 1. System-Pakete installieren ---
echo ">>> System-Pakete installieren..."
apt-get update
apt-get install -y curl git apache2 ufw certbot python3-certbot-apache

# --- 2. Node.js 20 installieren (via NodeSource) ---
echo ">>> Node.js 20 installieren..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
node -v
npm -v

# --- 3. Firewall konfigurieren ---
echo ">>> Firewall konfigurieren..."
ufw allow OpenSSH
ufw allow 'Apache Full'
ufw --force enable

# --- 4. Apache Module aktivieren ---
echo ">>> Apache Module aktivieren..."
a2enmod proxy
a2enmod proxy_http
a2enmod rewrite
a2enmod ssl
a2enmod headers

# --- 5. Service-User anlegen ---
echo ">>> Service-User anlegen..."
useradd -r -s /bin/false -d "$APP_DIR" "$SERVICE_USER" 2>/dev/null || true

# --- 6. App-Verzeichnis erstellen ---
echo ">>> App-Verzeichnis erstellen..."
mkdir -p "$APP_DIR"

# --- 7. Quellcode klonen ---
echo ""
echo "============================================================"
echo ">>> Quellcode von GitHub klonen..."
git clone https://github.com/morwol/dart-tournament "$APP_DIR"
chown -R "$SERVICE_USER":"$SERVICE_USER" "$APP_DIR"

# --- 8. Frontend Build ---
echo ">>> Frontend Build..."
cd "$APP_DIR/frontend"
npm install
npm run build

# --- 9. Backend Setup ---
echo ">>> Backend Setup..."
cd "$APP_DIR/backend"
npm install
mkdir -p "$APP_DIR/backend/data"
chown "$SERVICE_USER":"$SERVICE_USER" "$APP_DIR/backend/data"

# --- 10. .env Setup ---
echo ">>> .env konfigurieren..."
if [ ! -f "$APP_DIR/backend/.env" ]; then
  if [ -f "$APP_DIR/backend/.env.example" ]; then
    cp "$APP_DIR/backend/.env.example" "$APP_DIR/backend/.env"
  else
    cat > "$APP_DIR/backend/.env" << EOF
PORT=3001
NODE_ENV=production
JWT_SECRET=$(openssl rand -base64 32)
DB_PATH=./data/dartevent.db
EOF
  fi
  chown "$SERVICE_USER":"$SERVICE_USER" "$APP_DIR/backend/.env"
  chmod 600 "$APP_DIR/backend/.env"
  echo "WICHTIG: $APP_DIR/backend/.env pruefen und anpassen!"
else
  echo ".env existiert bereits."
fi

# --- 11. systemd Service installieren ---
echo ">>> systemd Service installieren..."
cat > /etc/systemd/system/dartevent.service << EOF
[Unit]
Description=DartEvent Manager Backend
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$APP_DIR/backend
ExecStart=/usr/bin/node src/index.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=dartevent
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable dartevent
systemctl start dartevent

# --- 12. Apache VirtualHost konfigurieren ---
echo ">>> Apache VirtualHost konfigurieren..."
cat > /etc/apache2/sites-available/dartevent.conf << EOF
<VirtualHost *:80>
    ServerName $DOMAIN

    # Frontend (statische Dateien)
    DocumentRoot $APP_DIR/frontend/dist
    <Directory $APP_DIR/frontend/dist>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        # SPA Routing: alle Requests zur index.html
        FallbackResource /index.html
    </Directory>

    # Backend API Proxy
    ProxyPreserveHost On
    ProxyPass /api http://localhost:3001/api
    ProxyPassReverse /api http://localhost:3001/api

    ErrorLog \${APACHE_LOG_DIR}/dartevent_error.log
    CustomLog \${APACHE_LOG_DIR}/dartevent_access.log combined
</VirtualHost>
EOF

a2ensite dartevent.conf
apache2ctl configtest
systemctl reload apache2

# --- 13. SSL via Let's Encrypt ---
echo ""
echo "============================================================"
echo ">>> SSL-Zertifikat einrichten..."
echo "============================================================"
certbot --apache -d "$DOMAIN" --non-interactive --agree-tos --email admin@p-entertainment.at --redirect || \
  echo "WARNUNG: SSL fehlgeschlagen. Manuell ausfuehren: certbot --apache -d $DOMAIN"

# --- 14. Status anzeigen ---
echo ""
echo ">>> Service-Status:"
systemctl status dartevent --no-pager || true
echo ""
systemctl status apache2 --no-pager || true

echo ""
echo "=== Setup abgeschlossen ==="
echo "App erreichbar unter: https://$DOMAIN"
echo "Logs ansehen: journalctl -u dartevent -f"
echo "Apache Logs: tail -f /var/log/apache2/dartevent_error.log"
