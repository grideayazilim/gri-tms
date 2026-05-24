#!/usr/bin/env bash
# =============================================================================
# list-backups.sh — Mevcut backupları listele
#
# Kullanım:
#   ./docker/backup/list-backups.sh
# =============================================================================

BACKUP_DIR="${BACKUP_DIR:-/var/backups/timesheet}"

echo ""
echo "════════════════════════════════════════════════════════"
echo "  Mevcut Backuplar"
echo "════════════════════════════════════════════════════════"

if ! ls "${BACKUP_DIR}"/timesheet_*.sql.gz 2>/dev/null | head -1 > /dev/null; then
  echo "  Henüz backup yok."
  echo "════════════════════════════════════════════════════════"
  echo ""
  exit 0
fi

echo ""
printf "  %-40s %8s  %s\n" "Dosya Adı" "Boyut" "Tarih"
printf "  %-40s %8s  %s\n" "─────────────────────────────────────────" "────────" "───────────────────"

find "$BACKUP_DIR" -name "timesheet_*.sql.gz" -printf "%f\t%s\t%TY-%Tm-%Td %TH:%TM\n" \
  | sort -r \
  | while IFS=$'\t' read -r filename size date; do
      human_size=$(echo "$size" | awk '{
        if ($1 >= 1073741824) printf "%.1f GB", $1/1073741824
        else if ($1 >= 1048576) printf "%.1f MB", $1/1048576
        else if ($1 >= 1024) printf "%.1f KB", $1/1024
        else printf "%d B", $1
      }')
      printf "  %-40s %8s  %s\n" "$filename" "$human_size" "$date"
    done

TOTAL=$(find "$BACKUP_DIR" -name "timesheet_*.sql.gz" | wc -l | tr -d ' ')
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" 2>/dev/null | cut -f1)

echo ""
printf "  Toplam: %d backup, %s disk alanı\n" "$TOTAL" "$TOTAL_SIZE"
echo "════════════════════════════════════════════════════════"
echo ""
