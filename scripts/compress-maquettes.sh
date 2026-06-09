#!/usr/bin/env bash
# Re-encode maquettes for small grid cells (~100px). 480p is enough for retina.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ARCHIVE="${MAQUETTES_ARCHIVE:-$HOME/Desktop/TERENCE/Archives }"
OUT="$ROOT/videos/maquettes"
PRESET="${MAQUETTES_PRESET:-PresetAppleM4V480pSD}"

declare -a SOURCES=(
  "01|96C7F993-A346-4471-8CC6-B722DA378F8A.mov"
  "03|How old is God.m4v"
  "04|My Father_s Graduation Party 2.mov"
  "05|My Graduation .mov"
  "06|My Mother_s Gratitude Party 2.mov"
  "07|Older Brother.mov"
)

mkdir -p "$OUT"

for entry in "${SOURCES[@]}"; do
  num="${entry%%|*}"
  file="${entry#*|}"
  src="$ARCHIVE/$file"
  dest="$OUT/${num}.m4v"
  echo "Encoding $num from $file"
  avconvert --source "$src" --preset "$PRESET" --output "$dest" --replace --progress
done

rm -f "$OUT"/*.mp4
echo "Done. Files in $OUT"
