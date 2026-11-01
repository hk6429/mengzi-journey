"""第五輪 D 線：已上線 GLB 的小修（不重跑 Dzine）。
用法：blender -b --python tools/models/d-edit.py -- <in.glb> <out.glb> <beacon-nosmoke|backdoor>
  beacon-nosmoke：刪掉臺頂白色實心煙（高處、低彩度、高亮度的連通塊），另留一個極小三角形在原頂點，
                  讓外框高度不變（P.glb 依外框高度縮放，B 線的火光／狼煙位置才對得上）。
  backdoor：在背面（glTF −z＝Blender +Y）中央補一扇拱形後門＋石框；顏色取自正面門板與牆腳石的貼圖 UV。
輸出未壓縮；接著用 tools/models/d-edit.sh 跑 gltf-transform（meshopt＋webp 1024），與 build.sh 同參數。
"""
import math, sys, colorsys
import bpy, bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree

src, dst, mode = sys.argv[sys.argv.index('--') + 1:][:3]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
ob = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
bpy.context.view_layer.objects.active = ob; ob.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)  # 解掉量化的節點縮放
me = ob.data
img = next(n.image for n in me.materials[0].node_tree.nodes if n.type == 'TEX_IMAGE')
IW, IH = img.size; PX = img.pixels[:]
def texel(uv):
    x = min(IW - 1, max(0, int(uv.x % 1 * IW))); y = min(IH - 1, max(0, int(uv.y % 1 * IH))); i = (y * IW + x) * 4
    return PX[i:i + 3]

bm = bmesh.new(); bm.from_mesh(me); uvl = bm.loops.layers.uv.active
bm.faces.ensure_lookup_table()
tris0 = len(bm.faces)
def face_uv(f): return sum((l[uvl].uv for l in f.loops), Vector((0, 0))) / len(f.loops)

if mode == 'beacon-nosmoke':
    top = max(bm.verts, key=lambda v: v.co.z).co.copy()
    H = top.z; seen = set(); kill = []
    for f in bm.faces:
        if f.index in seen: continue
        comp, st = [], [f]; seen.add(f.index)
        while st:
            g = st.pop(); comp.append(g)
            for e in g.edges:
                for h in e.link_faces:
                    if h.index not in seen: seen.add(h.index); st.append(h)
        cs = [texel(face_uv(g)) for g in comp]
        br = sum(sum(c) / 3 for c in cs) / len(cs); sat = sum(colorsys.rgb_to_hsv(*c)[1] for c in cs) / len(cs)
        if min(g.calc_center_median().z for g in comp) > 0.68 * H and br > 0.6 and sat < 0.3:
            kill += comp
    print(f'EDIT smoke faces removed {len(kill)}', flush=True)
    bmesh.ops.delete(bm, geom=kill, context='FACES')
    # shortcut: 1e-5 的三角形量化後退化、不會畫出來，只為保住外框高度；若 P.glb 改用別的縮放基準就可拿掉
    bm.faces.ensure_lookup_table(); uv0 = face_uv(bm.faces[0])
    vs = [bm.verts.new(top + Vector(d)) for d in ((0, 0, 0), (1e-5, 0, -1e-5), (0, 1e-5, -1e-5))]
    f = bm.faces.new(vs)
    for l in f.loops: l[uvl].uv = uv0

elif mode == 'backdoor':
    bm.faces.ensure_lookup_table(); tree = BVHTree.FromBMesh(bm)
    def cast(x, z, front):  # front: 從 −Y 往 +Y 打（正面）；否則從 +Y 往 −Y（背面）
        o, d = (Vector((x, -50, z)), Vector((0, 1, 0))) if front else (Vector((x, 50, z)), Vector((0, -1, 0)))
        loc, nrm, idx, dist = tree.ray_cast(o, d)
        return (loc, bm.faces[idx]) if loc else (None, None)
    def is_red(c): h, s, v = colorsys.rgb_to_hsv(*c); return (h < 0.06 or h > 0.94) and s > 0.35
    # 正面門板：從門中心往外掃，量出寬與高
    z0 = 0.12 * max(v.co.z for v in bm.verts)
    _, f = cast(0, z0, True); red_uv = face_uv(f); assert is_red(texel(red_uv)), texel(red_uv)
    red_at = lambda x, z: (lambda r: bool(r[1]) and is_red(texel(face_uv(r[1]))))(cast(x, z, True))
    def reach(f, lim):  # 往外掃到連續 4 格不是紅色（門釘、門縫不算斷）
        last, miss, t = 0.0, 0, 0.0
        while t < lim and miss < 4:
            t += 0.01
            if f(t): last, miss = t, 0
            else: miss += 1
        return last
    hw = reach(lambda t: red_at(t, z0), 0.6)
    top = z0 + reach(lambda t: red_at(0, z0 + t), 1.5)
    hw *= 0.9; top *= 0.9  # 後門比正門小一號
    xs = [v.co.x for v in bm.verts]; zmin = min(v.co.z for v in bm.verts)
    # 石色：正面牆腳（灰、低彩度）；門縫：整張貼圖最暗的像素
    stone_uv = None
    for x in (0.55, 0.6, 0.7, 0.45, 0.8):
        for z in (0.02, 0.04, 0.06):
            _, f = cast(x * max(xs), zmin + z, True)
            if f and colorsys.rgb_to_hsv(*texel(face_uv(f)))[1] < 0.25: stone_uv = face_uv(f); break
        if stone_uv: break
    assert stone_uv, 'no stone texel'
    best = min(range(0, IW * IH, 37), key=lambda i: sum(PX[i * 4:i * 4 + 3]))
    dark_uv = Vector(((best % IW + 0.5) / IW, (best // IW + 0.5) / IH))
    r = hw; straight = max(top - r, 0.05)
    def outline(k, n=12):  # 拱形輪廓（左下→左上→弧→右上→右下），k＝向外放大
        rr = r + k; pts = [(-rr, zmin)]
        for i in range(n + 1):
            a = math.pi - math.pi * i / n; pts.append((rr * math.cos(a), zmin + straight + rr * math.sin(a)))
        pts.append((rr, zmin)); return pts
    def back_y(x, z):
        loc, _ = cast(x, max(z, zmin + 0.005), False); return loc.y if loc else None
    new = []
    def face(vs, uv, kind=0):  # kind：0 朝 +Y、1 朝拱外、-1 朝拱內
        f = bm.faces.new([bm.verts.new(v) for v in vs]); new.append((f, kind))
        for l in f.loops: l[uvl].uv = uv
    fw = 0.22 * r  # 石框寬
    inner, outer = outline(0), outline(fw)
    yi = [back_y(x, z) for x, z in inner]; yo = [back_y(x, z) for x, z in outer]
    assert None not in yi + yo, 'back wall not found'
    P_ = lambda x, z, y: Vector((x, y, z))
    # 門板：扇形，比牆面凸 0.012；中線一道門縫
    # 門板與石框逐點貼著背牆（斜牆、牆腳石都跟著走）：門板外凸 0.012，石框正面外凸 0.04、外緣嵌進牆 0.01
    py = [y + 0.012 for y in yi]
    zt = zmin + straight + r * 0.98; s0, s1 = back_y(0, zmin) + 0.014, back_y(0, zt) + 0.014  # 門縫沿中線（先量好，加面後 BVH 索引就過期）
    c = P_(0, zmin, (py[0] + py[-1]) / 2)
    for i in range(len(inner) - 1):
        a, b = inner[i], inner[i + 1]
        face([c, P_(b[0], b[1], py[i + 1]), P_(a[0], a[1], py[i])], red_uv)
    w = 0.012 * r
    face([P_(-w, zmin, s0), P_(-w, zt, s1), P_(w, zt, s1), P_(w, zmin, s0)], dark_uv)
    for i in range(len(inner) - 1):
        a, b, A, B = inner[i], inner[i + 1], outer[i], outer[i + 1]
        fa, fb = yi[i] + 0.04, yi[i + 1] + 0.04
        face([P_(a[0], a[1], fa), P_(b[0], b[1], fb), P_(B[0], B[1], fb), P_(A[0], A[1], fa)], stone_uv)            # 正面
        face([P_(A[0], A[1], fa), P_(B[0], B[1], fb), P_(B[0], B[1], yo[i + 1] - 0.01), P_(A[0], A[1], yo[i] - 0.01)], stone_uv, 1)  # 外側
        face([P_(b[0], b[1], fb), P_(a[0], a[1], fa), P_(a[0], a[1], py[i] - 0.005), P_(b[0], b[1], py[i + 1] - 0.005)], stone_uv, -1)  # 內側
    print(f'EDIT backdoor halfwidth {r:.3f} top {zmin + straight + r:.3f} wall y {min(yi):.3f}..{max(yi):.3f} added {len(new)} faces', flush=True)
    for f, kind in new:  # 每片都是獨立頂點，直接依用途定朝向
        f.normal_update(); c = f.calc_center_median()
        out = Vector((c.x, 0, c.z - min(max(c.z, zmin), zmin + straight)))
        if (f.normal.y < 0) if kind == 0 else (kind * f.normal.dot(out) < 0): f.normal_flip()

bmesh.ops.triangulate(bm, faces=bm.faces)
bm.to_mesh(me); bm.free(); me.update()
print(f'EDIT tris {tris0} -> {len(me.polygons)}', flush=True)
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_yup=True, export_apply=True)
