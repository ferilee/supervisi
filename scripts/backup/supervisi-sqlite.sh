#!/usr/bin/env bash
set -euo pipefail

container_name="${SUPERVISI_CONTAINER:-supervisi}"
backup_dir="${1:-/srv/backups/supervisi/sqlite}"
stamp="$(date +%Y%m%d-%H%M%S)"
container_backup="/tmp/supervisi-${stamp}.sqlite"
host_backup="${backup_dir}/supervisi-${stamp}.sqlite"

mkdir -p "$backup_dir"
docker exec "$container_name" node --input-type=module -e "import Database from 'better-sqlite3'; const db = new Database('/app/data/supervisi.sqlite', { readonly: true }); await db.backup('${container_backup}'); db.close();"
docker cp "${container_name}:${container_backup}" "$host_backup"
docker exec "$container_name" rm -f "$container_backup"

echo "Backup SQLite tersimpan di ${host_backup}"
