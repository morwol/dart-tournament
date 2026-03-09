#!/bin/bash
set -e

# ============================================================
# DartEvent Manager — Setup-Script fuer Fedora Linux
# ============================================================

# --- Root-Check ---
if [ "$EUID" -ne 0 ]; then
  echo "Bitte als root ausfuehren: sudo bash setup.sh"
  exit 1
fi

# --- Variablen ---
DOMAIN="${DOMAIN:-DEINE-DOMAIN.DE}"
APP_DIR="/var/www/dartsturnier"
SERVICE_USER="dartevent"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== DartEvent Manager Setup ==="
echo "Domain:       $DOMAIN"
echo "App-Pfad:     $APP_DIR"
echo "Service-User: $SERVICE_USER"
echo ""

# --- 1. System-Pakete installieren ---
echo ">>> System-Pakete installieren..."
dnf install -y nginx nodejs npm git

# --- 2. Firewall konfigurieren ---
echo ">>> Firewall konfigurieren..."
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload

# --- 3. SELinux: nginx darf zu Node.js verbinden ---
echo ">>> SELinux konfigurieren..."
setsebool -P httpd_can_network_connect 1

# --- 4. Service-User anlegen ---
echo ">>> Service-User anlegen..."
useradd -r -s /bin/false -d "$APP_DIR" "$SERVICE_USER" 2>/dev/null || true

# --- 5. App-Verzeichnis erstellen ---
echo ">>> App-Verzeichnis erstellen..."
mkdir -p "$APP_DIR"
chown "$SERVICE_USER":"$SERVICE_USER" "$APP_DIR"

# --- Hinweis: Quellcode kopieren ---
echo ""
echo "============================================================"
echo "WICHTIG: Bitte Quellcode nach $APP_DIR kopieren!"
echo "  z.B.: git clone <repo-url> $APP_DIR"
echo "  oder: rsync -av ./frontend ./backend $APP_DIR/"
echo "============================================================"
echo ""
read -p "Quellcode kopiert? Weiter mit Enter..." _

# --- 6. Frontend Build ---
echo ">>> Frontend Build..."
cd "$APP_DIR/frontend"
npm install
npm run build

# --- 7. Backend Setup ---
echo ">>> Backend Setup..."
cd "$APP_DIR/backend"
npm install
mkdir -p "$APP_DIR/backend/data"
chown "$SERVICE_USER":"$SERVICE_USER" "$APP_DIR/backend/data"

# --- 8. .env Setup ---
echo ">>> .env konfigurieren..."
if [ ! -f "$APP_DIR/backend/.env" ]; then
  if [ -f "$APP_DIR/backend/.env.example" ]; then
    cp "$APP_DIR/backend/.env.example" "$APP_DIR/backend/.env"
    chown "$SERVICE_USER":"$SERVICE_USER" "$APP_DIR/backend/.env"
    chmod 600 "$APP_DIR/backend/.env"
    echo "WICHTIG: $APP_DIR/backend/.env anpassen!"
  else
    echo "WARNUNG: Keine .env.example gefunden. Bitte .env manuell erstellen."
  fi
else
  echo ".env existiert bereits."
fi

# --- 9. nginx konfigurieren ---
echo ">>> nginx konfigurieren..."
# Domain in nginx.conf ersetzen
sed "s/DEINE-DOMAIN.DE/$DOMAIN/g" "$SCRIPT_DIR/nginx.conf" > /etc/nginx/conf.d/dartevent.conf
nginx -t
systemctl enable --now nginx

# --- 10. systemd Service installieren ---
echo ">>> systemd Service installieren..."
cp "$SCRIPT_DIR/dartevent.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now dartevent

# --- 11. SSL Hinweis ---
echo ""
echo "============================================================"
echo "Fuer SSL-Zertifikat (Let's Encrypt):"
echo "  dnf install certbot python3-certbot-nginx"
echo "  certbot --nginx -d $DOMAIN"
echo "============================================================"
echo ""

# --- 12. Status anzeigen ---
echo ">>> Service-Status:"
systemctl status dartevent --no-pager || true
echo ""
systemctl status nginx --no-pager || true

echo ""
echo "=== Setup abgeschlossen ==="
echo "Logs ansehen: journalctl -u dartevent -f"
