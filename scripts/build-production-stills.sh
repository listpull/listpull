#!/usr/bin/env bash
# Rebuild the production stills from ListPull's original fox cub edit.
# Requires ffmpeg with libwebp and the drawtext filter.
# Before: original passage at 1.0s. After: finished passage at 4.4s.
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"
source="listpull_production_before_and_after_editing.mp4"
output="assets/production"
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "FFmpeg is required to extract source video frames" >&2
  exit 1
fi
if [[ ! -s "$source" ]]; then
  echo "Missing required production video: $source" >&2
  exit 1
fi
mkdir -p "$output"
ffmpeg -hide_banner -loglevel error -y -ss 1.0 -i "$source" -frames:v 1 -vf "scale=810:-2" -c:v libwebp -quality 82 "$output/fox-cubs-before.webp"
ffmpeg -hide_banner -loglevel error -y -ss 4.4 -i "$source" -frames:v 1 -vf "scale=810:-2" -c:v libwebp -quality 82 "$output/fox-cubs-after.webp"
ffmpeg -hide_banner -loglevel error -y -i "$output/fox-cubs-before.webp" -i "$output/fox-cubs-after.webp" \
  -filter_complex "[0:v]scale=600:675:force_original_aspect_ratio=increase,crop=600:675,drawtext=text=BEFORE:fontcolor=white:fontsize=34:box=1:boxcolor=black@0.6:boxborderw=14:x=26:y=26[left];[1:v]scale=600:675:force_original_aspect_ratio=increase,crop=600:675,drawtext=text=AFTER:fontcolor=white:fontsize=34:box=1:boxcolor=black@0.6:boxborderw=14:x=26:y=26[right];[left][right]hstack=inputs=2[output]" \
  -map "[output]" -frames:v 1 -c:v libwebp -quality 80 "$output/fox-cubs-before-after-social.webp"
echo "Original video stills rebuilt in $output"
