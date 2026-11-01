#!/bin/zsh
# 用法：tools/models/build.sh <name> [yaw度]　讀 art/models/raw/<name>.glb → public/models/<name>.glb
set -e
cd "${0:A:h}/../.."
n=$1; yaw=${2:-0}
mkdir -p art/models/tmp public/models
blender -b --python tools/models/process.py -- art/models/raw/$n.glb art/models/tmp/$n.glb $yaw 2>&1 | grep -E 'PROCESS|Error|Traceback'
npx -y @gltf-transform/cli optimize art/models/tmp/$n.glb public/models/$n.glb \
  --compress meshopt --texture-compress webp --texture-size 1024 --simplify false --palette false
ls -l public/models/$n.glb
