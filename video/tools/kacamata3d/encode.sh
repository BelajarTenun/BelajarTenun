#!/bin/bash
# Ubah urutan PNG hasil render 3D menjadi video untuk Remotion.
cd "$(dirname "$0")/out"; P=../../../public/3d; mkdir -p $P
for n in hand glass glassphone; do [ -d $n ] && ffmpeg -loglevel error -y -framerate 30 -i $n/%04d.png -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 22 -row-mt 1 -auto-alt-ref 0 $P/$n.webm && cp $n/anchors.json $P/$n-anchors.json; done
for n in fade walkmap unravel; do [ -d $n ] && ffmpeg -loglevel error -y -framerate 30 -i $n/%04d.png -c:v libx264 -crf 16 -pix_fmt yuv420p $P/$n.mp4 && cp $n/anchors.json $P/$n-anchors.json; done
ls -la $P
