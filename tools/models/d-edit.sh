#!/bin/zsh
# 用法：tools/models/d-edit.sh <name> <beacon-nosmoke|backdoor>　就地修 public/models/<name>.glb（舊檔備份到 art/models/prev/）
set -e -o pipefail
cd "${0:A:h}/../.."
n=$1; mode=$2
mkdir -p art/models/tmp art/models/prev
[[ -f art/models/prev/$n.glb ]] || cp public/models/$n.glb art/models/prev/$n.glb
blender -b --python tools/models/d-edit.py -- art/models/prev/$n.glb art/models/tmp/$n-edit.glb $mode 2>&1 | grep -E 'EDIT|Error|Traceback|assert'
npx -y @gltf-transform/cli optimize art/models/tmp/$n-edit.glb public/models/$n.glb \
  --compress meshopt --texture-compress webp --texture-size 1024 --simplify false --palette false
ls -l public/models/$n.glb
