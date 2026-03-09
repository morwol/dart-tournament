# DartEvent Manager — Deployment (Fedora Linux)

## Voraussetzungen

- Fedora Linux Server
- Root-Zugang (sudo)
- Domain mit DNS-Eintrag auf den Server

## Dateien

| Datei | Beschreibung |
|---|---|
| `nginx.conf` | nginx Reverse Proxy Konfiguration |
| `dartevent.service` | systemd Unit File fuer das Backend |
| `setup.sh` | Automatisches Setup-Script |

## Installation

```bash
# 1. Repository auf den Server klonen
git clone <repo-url> /var/www/dartsturnier

# 2. Domain setzen und Setup ausfuehren
cd /var/www/dartsturnier/deploy
sudo DOMAIN=deine-domain.de bash setup.sh
```

Das Script installiert automatisch:
- nginx, Node.js, npm, git
- Firewall-Regeln (HTTP/HTTPS)
- SELinux-Policy (httpd_can_network_connect)
- Service-User `dartevent`
- Frontend Build (npm install + npm run build)
- Backend Dependencies (npm install)
- nginx Virtual Host
- systemd Service

## Umgebungsvariablen

Die Datei `/var/www/dartsturnier/backend/.env` muss folgende Werte enthalten:

| Variable | Beschreibung | Beispiel |
|---|---|---|
| `PORT` | Backend-Port | `3001` |
| `JWT_SECRET` | Geheimer Schluessel fuer JWT-Tokens | `ein-langer-zufaelliger-string` |
| `NODE_ENV` | Umgebung | `production` |

## Logs

```bash
# Backend-Logs live verfolgen
journalctl -u dartevent -f

# nginx-Logs
journalctl -u nginx -f

# Letzte 100 Zeilen
journalctl -u dartevent -n 100
```

## Update-Prozess

```bash
cd /var/www/dartsturnier

# 1. Neuen Code holen
git pull

# 2. Frontend neu bauen
cd frontend && npm install && npm run build

# 3. Backend Dependencies aktualisieren
cd ../backend && npm install

# 4. Service neu starten
sudo systemctl restart dartevent
```

## Troubleshooting

### SELinux blockiert nginx

```bash
# Pruefen ob SELinux aktiv ist
getenforce

# nginx erlauben, zu Node.js zu verbinden
sudo setsebool -P httpd_can_network_connect 1

# SELinux-Audit-Log pruefen
sudo ausearch -m AVC -ts recent
```

### Port 3001 bereits belegt

```bash
# Pruefen welcher Prozess den Port nutzt
sudo ss -tlnp | grep 3001
```

### Firewall blockiert Zugriff

```bash
# Offene Services anzeigen
sudo firewall-cmd --list-services

# HTTP/HTTPS freigeben
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### Backend startet nicht

```bash
# Service-Status pruefen
sudo systemctl status dartevent

# Manuell testen
cd /var/www/dartsturnier/backend
sudo -u dartevent node src/app.js
```

### SSL-Zertifikat einrichten

```bash
sudo dnf install certbot python3-certbot-nginx
sudo certbot --nginx -d deine-domain.de
```

Certbot richtet automatisch einen Cronjob fuer die Erneuerung ein.
