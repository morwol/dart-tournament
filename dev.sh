#!/bin/bash
# ============================================================
# DartEvent Manager — Lokaler Entwicklungsserver
# Startet Backend (Port 3001) + Frontend (Port 5173)
# Aufruf: bash dev.sh
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# Farben
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

cleanup() {
  echo -e "\n${YELLOW}>>> Stoppe alle Prozesse...${NC}"
  kill 0
  exit 0
}
trap cleanup SIGINT SIGTERM

echo -e "${CYAN}"
echo "  ██████╗  █████╗ ██████╗ ████████╗"
echo "  ██╔══██╗██╔══██╗██╔══██╗╚══██╔══╝"
echo "  ██║  ██║███████║██████╔╝   ██║   "
echo "  ██║  ██║██╔══██║██╔══██╗   ██║   "
echo "  ██████╔╝██║  ██║██║  ██║   ██║   "
echo "  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   DEV"
echo -e "${NC}"

# --- .env prüfen ---
if [ ! -f "$BACKEND_DIR/.env" ]; then
  if [ -f "$BACKEND_DIR/.env.example" ]; then
    cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
    echo -e "${YELLOW}>>> .env aus .env.example erstellt — bitte Werte anpassen!${NC}"
  else
    echo -e "${RED}>>> FEHLER: Keine .env gefunden in $BACKEND_DIR${NC}"
    exit 1
  fi
fi

# --- node_modules prüfen ---
if [ ! -d "$BACKEND_DIR/node_modules" ]; then
  echo -e "${YELLOW}>>> Backend: npm install...${NC}"
  cd "$BACKEND_DIR" && npm install
fi

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo -e "${YELLOW}>>> Frontend: npm install...${NC}"
  cd "$FRONTEND_DIR" && npm install
fi

# --- Backend starten ---
echo -e "${GREEN}>>> Backend starten  → http://localhost:3001${NC}"
cd "$BACKEND_DIR" && npm run dev &
BACKEND_PID=$!

# Kurz warten damit Backend hochläuft
sleep 1

# --- Frontend starten ---
echo -e "${GREEN}>>> Frontend starten → http://localhost:5173${NC}"
cd "$FRONTEND_DIR" && npm run dev &
FRONTEND_PID=$!

echo ""
echo -e "${CYAN}┌─────────────────────────────────────────┐${NC}"
echo -e "${CYAN}│  Frontend:  http://localhost:5173        │${NC}"
echo -e "${CYAN}│  Backend:   http://localhost:3001        │${NC}"
echo -e "${CYAN}│  Stoppen:   Ctrl+C                       │${NC}"
echo -e "${CYAN}└─────────────────────────────────────────┘${NC}"
echo ""

wait
