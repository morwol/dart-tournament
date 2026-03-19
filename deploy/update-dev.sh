#!/bin/bash
set -e
# ============================================================
# DartEvent Manager — Update script for the DEV server
# Pulls the 'dev' branch and rebuilds.
# Run on server: sudo bash /var/www/dartsturnier/deploy/update-dev.sh
# ============================================================

APP_DIR="/var/www/dartsturnier"
SERVICE_NAME="dartevent"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run as root: sudo bash update-dev.sh${NC}"
  exit 1
fi

echo -e "${YELLOW}=== DartEvent DEV update started ===${NC}"
echo ""

# --- 1. Pull latest dev branch ---
echo -e "${GREEN}>>> git pull (dev)...${NC}"
cd "$APP_DIR"
git fetch origin
git checkout dev
git pull origin dev

# --- 2. Update backend dependencies ---
echo -e "${GREEN}>>> Backend: npm install...${NC}"
cd "$APP_DIR/backend"
npm install --omit=dev

# --- 3. Build frontend ---
echo -e "${GREEN}>>> Frontend: npm install + build...${NC}"
cd "$APP_DIR/frontend"
npm install
npm run build

# --- 4. Fix permissions + restart service ---
echo -e "${GREEN}>>> Fixing data directory permissions...${NC}"
mkdir -p "$APP_DIR/backend/data/walkon"
chown -R "$SERVICE_NAME":"$SERVICE_NAME" "$APP_DIR/backend/data"

echo -e "${GREEN}>>> Restarting service...${NC}"
systemctl restart "$SERVICE_NAME"
sleep 3

# --- 5. Check status ---
if systemctl is-active --quiet "$SERVICE_NAME"; then
  echo -e "${GREEN}>>> $SERVICE_NAME is running. Update successful!${NC}"
else
  echo -e "${RED}>>> ERROR: $SERVICE_NAME is not running!${NC}"
  echo "Logs: journalctl -u $SERVICE_NAME -n 50"
  exit 1
fi

echo ""
echo -e "${GREEN}=== DEV update complete ===${NC}"
echo "Live logs: journalctl -u $SERVICE_NAME -f"
