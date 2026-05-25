#!/usr/bin/env bash
# =============================================================================
# list-backups.sh — Mevcut backupları listele
#
# Kullanım:
#   ./docker/backup/list-backups.sh
#
# Platform: macOS ve Linux (POSIX-uyumlu, GNU find -printf gerektirmez)
# Windows için: docker\backup\list-backups.ps1
# =============================================================================

BACKUP_DIR="${BACKUP_DIR:-/var/backups/timesheet}"

echo ""
echo "════════════════════════════════════════════════════════"
echo "  Mevcut Backuplar"
echo "════════════════════════════════════════════════════════"

# Backup var mı kontrol et
shopt -s nullglob 2>/dev/null || true
files=("$BACKUP_DIR"/timesheet_*.sql.gz)
if [ ${#files[@]} -eq 0 ] || [ ! -f "${files[0]}" ]; then
  echo "  Henüz backup yok."
  echo "════════════════════════════════════════════════════════"
  echo ""
  exit 0
fi

echo ""
printf "  %-40s %8s  %s\n" "Dosya Adı" "Boyut" "Tarih"
printf "  %-40s %8s  %s\n" "─────────────────────────────────────────" "────────" "───────────────────"

# -printf yerine taşınabilir yöntem: date -r (macOS ve Linux'ta çalışır)
for f in "$BACKUP_DIR"/timesheet_*.sql.gz; do
  [ -f "$f" ] || continue
  filename=$(basename "$f")
  size=$(wc -c < "$f" | tr -d ' ')
  # date -r: hem macOS hem Linux'ta dosya değiştirme tarihini döner
  mod_date=$(date -r "$f" "+%Y-%m-%d %H:%M" 2>/dev/null || echo "bilinmiyor")
  human_size=$(echo "$size" | awk '{
    if ($1 >= 1073741824) printf "%.1f GB", $1/1073741824
    else if ($1 >= 1048576) printf "%.1f MB", $1/1048576
    else if ($1 >= 1024) printf "%.1f KB", $1/1024
    else printf "%d B", $1
  }')
  printf "  %-40s %8s  %s\n" "$filename" "$human_size" "$mod_date"
done | sort -r

TOTAL=$(find "$BACKUP_DIR" -name "timesheet_*.sql.gz" | wc -l | tr -d ' ')
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" 2>/dev/null | cut -f1)

echo ""
printf "  Toplam: %d backup, %s disk alanı\n" "$TOTAL" "$TOTAL_SIZE"
echo "════════════════════════════════════════════════════════"
echo ""
