"""Dzine 原始 GLB → 遊戲用 GLB（未壓縮）。
用法：blender -b --python tools/models/process.py -- <in.glb> <out.glb> [yaw度]
步驟：合併網格 → 焊接 UV 縫(merge by distance) → decimate 到 ≤14k 三角 → 依 yaw 轉正面到 +z → 原點移到底面中心。
壓縮（meshopt＋webp 1024）由 tools/models/build.sh 接著用 gltf-transform 做。
"""
import math, sys
import bpy, bmesh
from mathutils import Matrix, Vector

src, dst = sys.argv[sys.argv.index('--') + 1:][:2]
yaw = float((sys.argv[sys.argv.index('--') + 1:] + [0, 0, 0])[2])
MAX_TRIS = 14000  # 規格 15k，留一點餘裕

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
assert meshes, 'no mesh in ' + src
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1:
    bpy.ops.object.join()
ob = bpy.context.view_layer.objects.active
ob.parent = None
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for o in [o for o in bpy.context.scene.objects if o is not ob]:
    bpy.data.objects.remove(o)

me = ob.data
# 只留 baseColor 貼圖：拔掉金屬粗糙度貼圖（lpCel 只用 map），金屬 0、粗糙 1
for mat in me.materials:
    if not mat or not mat.use_nodes: continue
    bsdf = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if not bsdf: continue
    for k, v in (('Metallic', 0.0), ('Roughness', 1.0)):
        for l in list(bsdf.inputs[k].links): mat.node_tree.links.remove(l)
        bsdf.inputs[k].default_value = v
    for n in [n for n in mat.node_tree.nodes if n.type == 'TEX_IMAGE' and not n.outputs['Color'].links]:
        mat.node_tree.nodes.remove(n)
    for n in [n for n in mat.node_tree.nodes if n.type == 'SEPARATE_COLOR']:
        mat.node_tree.nodes.remove(n)
size = max(ob.dimensions)
bm = bmesh.new(); bm.from_mesh(me)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=size * 1e-4)  # 焊接 UV 縫，避免 decimate 撕開
bmesh.ops.triangulate(bm, faces=bm.faces)
bm.to_mesh(me); bm.free()
tris0 = len(me.polygons)
if tris0 > MAX_TRIS:
    mod = ob.modifiers.new('dec', 'DECIMATE')
    mod.ratio = MAX_TRIS / tris0
    bpy.ops.object.modifier_apply(modifier='dec')
bm = bmesh.new(); bm.from_mesh(me)
bmesh.ops.triangulate(bm, faces=bm.faces)
bm.to_mesh(me); bm.free()

# Blender Z-up；glTF +z 正面 = Blender -Y。yaw 繞垂直軸轉（度，逆時針俯視）
me.transform(Matrix.Rotation(math.radians(yaw), 4, 'Z'))
vs = [v.co for v in me.vertices]
mn = Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs)))
mx = Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
me.transform(Matrix.Translation(Vector((-(mn.x + mx.x) / 2, -(mn.y + mx.y) / 2, -mn.z))))
me.update()
d = mx - mn
print(f'PROCESS tris {tris0} -> {len(me.polygons)}  size(x,y-depth,z-up)={d.x:.3f},{d.y:.3f},{d.z:.3f}', flush=True)

bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_yup=True, export_apply=True)
