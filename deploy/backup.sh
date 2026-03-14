#!/bin/bash
set -e
# ============================================================
# DartEvent Manager — Datenbank-Backup Script
# Aufruf: sudo bash /var/www/dartsturnier/deploy/backup.sh
# Optionen:
#   list     — alle vorhandenen Backups anzeigen
#   restore  — Backup wiederherstellen (interaktiv)
# ============================================================

DB_PATH="/var/www/dartsturnier/backend/data/dartevent.db"
BACKUP_DIR="/var/www/dartsturnier/backups"
KEEP=20  # maximale Anzahl Backups die behalten werden

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# ── Rechte prüfen ──────────────────────────────────────────
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Bitte als root ausführen: sudo bash backup.sh${NC}"
  exit 1
fi

# ── Backup-Verzeichnis anlegen ─────────────────────────────
mkdir -p "$BACKUP_DIR"

# ── Liste anzeigen ─────────────────────────────────────────
if [ "$1" = "list" ]; then
  echo -e "${CYAN}=== Vorhandene Backups ===${NC}"
  if [ -z "$(ls -A $BACKUP_DIR 2>/dev/null)" ]; then
    echo "Keine Backups vorhanden."
  else
    ls -lh "$BACKUP_DIR" | grep "\.db$" | awk '{print $5, $9}'
  fi
  exit 0
fi

# ── Wiederherstellen ───────────────────────────────────────
if [ "$1" = "restore" ]; then
  echo -e "${CYAN}=== Backup wiederherstellen ===${NC}"
  BACKUPS=($(ls -t "$BACKUP_DIR"/*.db 2>/dev/null))
  if [ ${#BACKUPS[@]} -eq 0 ]; then
    echo -e "${RED}Keine Backups vorhanden.${NC}"
    exit 1
  fi

  echo "Verfügbare Backups:"
  for i in "${!BACKUPS[@]}"; do
    SIZE=$(du -h "${BACKUPS[$i]}" | cut -f1)
    echo "  [$i] $(basename ${BACKUPS[$i]}) ($SIZE)"
  done

  read -p "Nummer eingeben: " IDX
  SELECTED="${BACKUPS[$IDX]}"

  if [ -z "$SELECTED" ]; then
    echo -e "${RED}Ungültige Auswahl.${NC}"
    exit 1
  fi

  echo -e "${YELLOW}Stelle wieder her: $(basename $SELECTED)${NC}"
  read -p "Sicher? Aktuelle DB wird überschrieben! (ja/nein): " CONFIRM
  if [ "$CONFIRM" != "ja" ]; then
    echo "Abgebrochen."
    exit 0
  fi

  systemctl stop dartevent 2>/dev/null || true
  cp "$SELECTED" "$DB_PATH"
  systemctl start dartevent 2>/dev/null || true
  echo -e "${GREEN}Wiederherstellung abgeschlossen.${NC}"
  exit 0
fi

# ── Backup erstellen ───────────────────────────────────────
if [ ! -f "$DB_PATH" ]; then
  echo -e "${RED}Datenbank nicht gefunden: $DB_PATH${NC}"
  exit 1
fi

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="$BACKUP_DIR/dartevent_$TIMESTAMP.db"

echo -e "${YELLOW}=== DartEvent DB Backup ===${NC}"
echo -e "${GREEN}>>> Erstelle Backup...${NC}"

# SQLite WAL-sicheres Kopieren via .backup (falls sqlite3 verfügbar)
if command -v sqlite3 &>/dev/null; then
  sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"
else
  cp "$DB_PATH" "$BACKUP_FILE"
fi

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo -e "${GREEN}>>> Backup erstellt: $(basename $BACKUP_FILE) ($SIZE)${NC}"

# ── Alte Backups aufräumen ─────────────────────────────────
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/*.db 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt "$KEEP" ]; then
  DELETE_COUNT=$(($BACKUP_COUNT - $KEEP))
  echo -e "${YELLOW}>>> Aufräumen: $DELETE_COUNT alte Backups werden gelöscht...${NC}"
  ls -t "$BACKUP_DIR"/*.db | tail -n "$DELETE_COUNT" | xargs rm -f
fi

echo ""
echo -e "${GREEN}=== Backup abgeschlossen ===${NC}"
echo "Alle Backups: sudo bash /var/www/dartsturnier/deploy/backup.sh list"
echo "Wiederherstellen: sudo bash /var/www/dartsturnier/deploy/backup.sh restore"
