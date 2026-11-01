#!/bin/zsh
# 用法：tools/models/fetch.sh <name>　把 ~/Downloads 最新的 Dzine 下載（Untitled-*.zip 內含 pbr/mesh_textured_pbr.glb）搬到 art/models/raw/<name>.glb
set -e
cd "${0:A:h}/../.."
z=$(ls -t ~/Downloads/Untitled-*.zip | head -1)
d=art/models/raw/zip-$1; mkdir -p $d
mv "$z" $d/ && (cd $d && unzip -o -q *.zip)
mv $d/pbr/mesh_textured_pbr.glb art/models/raw/$1.glb
ls -l art/models/raw/$1.glb
