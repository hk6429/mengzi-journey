"""六站 360 度水墨全景天空（貼在天空球上，下半部是大河水面）：用 codex exec（ChatGPT OAuth，不走 API）生圖，一張一張序列跑。
用法：python3 tools/gen-pano.py [只重生的 id ...]
原圖存 review/d-pano/<id>.png（review/ 不進 git），驗證落盤後壓成 public/pano/<id>.jpg，並寫 public/pano/index.json。
"""
import json, os, shutil, subprocess, sys, time
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / 'review' / 'd-pano'
OUT = ROOT / 'public' / 'pano'
CODEX_HOME = Path(os.environ.get('CODEX_HOME', Path.home() / '.codex'))
STYLE = ('中國傳統水墨寫意山水，加赭石淡彩：宣紙米白底色，淡墨層層渲染、濃淡乾濕變化，'
         '只用低彩度的赭石、土黃、黛青（偏灰的青綠），極少量朱砂點綴；大片留白當作河霧與天空，筆意疏朗，像明清文人山水長卷的局部。以墨為主、設色為輔，遠山要有明顯的墨線勾勒與皴擦筆觸，不要西洋水彩或寫實風景畫的感覺。')
COMP = ('最寬的橫式長卷全景，長寬比約 3:1（環繞 360 度用：左邊緣和右邊緣的內容必須能無縫接起來，兩端都是相同高度的河面與遠山，沒有被裁切的物件）。'
        '構圖：地平線正好在畫面垂直正中央；上半部是天空（雲、霞或日依內容）；地平線附近是一圈淡墨層疊的遠山與赭土色的河岸，遠處零星幾處戰國時代夯土台基、茅草屋頂的小聚落剪影（很小、很淡）；'
        '下半部全部是寬闊的大河水面：黛青偏灰綠的河水，近岸處帶一點赭黃泥沙色，細細的水波以淡墨線表現，薄霧貼著水面留白，越往下越淡，完全沒有陸地、沒有島。'
        '景物平均分布在整個寬度，不要集中在中間。畫面中完全不要任何人物、動物、船隻、近景建築；不要任何文字、題字、印章、落款、邊框；非照片、非 3D、非動漫、非工筆重彩。時代：中國戰國時代。')
BG = {
    'fields': '春日清晨：淡青天空、柔白晨雲、一抹淡淡朝霞；遠方河岸是平緩的田野，田壟層層、禾苗嫩綠點點（淡彩），幾棵柳樹，最有生氣。',
    'market': '午後晴朗：暖赭黃的天光、淡淡積雲；遠方河岸是熱鬧的河港與遠處開闊的海口，岸邊淡墨畫出一排低矮茅棚與夯土房舍的剪影；河水略帶泥沙黃。',
    'road': '風雨將至：天色最暗，濃淡墨雲層壓得很低、斜斜的雨絲；遠山陡峭高聳、山徑曲折隱入雲霧，整體偏冷灰青；河面灰暗、波紋較急。',
    'bridge': '雨後初晴：天空由灰轉亮，雲層裂開透出淡金色天光；遠山濕潤、山腰白霧繚繞；河面平靜，倒映著淡淡天光。',
    'study': '黃昏暖光：天空暖赭與淡金漸層；遠方河岸是一片濃淡墨竹林，竹林間隱約一座夯土台基的小書齋屋頂；河面映著暖色夕光，整體溫暖寧靜。',
    'city': '暮色：天空由赭紅轉暗紫灰、晚霞一抹朱砂；遠方地平線上是清楚可辨的戰國城郭剪影：長長的夯土城牆、方正的城門樓（不要飛簷翹角），城外山頭一座烽火臺升起一縷細煙；河面映著暮色，最開闊。',
}


def dims(p):
    o = subprocess.run(['sips', '-g', 'pixelWidth', '-g', 'pixelHeight', str(p)], capture_output=True, text=True).stdout
    v = [int(l.split()[-1]) for l in o.splitlines() if 'pixel' in l]
    return tuple(v) if len(v) == 2 else (0, 0)


def gen(pid):
    out = ART / f'{pid}.png'
    prompt = (f'請用你的圖像生成工具畫一張圖，畫好後把圖檔存到這個確切路徑：{out} （存在就覆寫）。不要做其他事。\n\n'
              f'{STYLE}{COMP}畫面內容：{BG[pid]}')
    before = time.time()
    try:
        subprocess.run([os.path.realpath(shutil.which('codex')), 'exec', '--skip-git-repo-check', '-'], input=prompt.encode(),
                       capture_output=True, timeout=600, cwd=ROOT)
    except subprocess.TimeoutExpired:
        print('  逾時', pid, flush=True)
    if not out.exists() or out.stat().st_mtime < before:  # codex 有時謊稱已存檔：改撈它自己的輸出資料夾
        found = sorted(CODEX_HOME.glob('generated_images/*/ig_*.png'), key=lambda p: p.stat().st_mtime)
        if found and found[-1].stat().st_mtime >= before:
            shutil.copy(found[-1], out)
    w, h = dims(out) if out.exists() else (0, 0)
    ok = out.exists() and out.stat().st_mtime >= before and out.stat().st_size > 500_000 and w >= 1500 and w >= 2 * h
    print(('OK   ' if ok else 'FAIL ') + f'{pid} {w}x{h}', flush=True)
    return ok


def pack(pid):
    # 寬度上限 4096（手機 WebGL 安全）；JPEG 品質 80
    src, dst = ART / f'{pid}.png', OUT / f'{pid}.jpg'
    w, _ = dims(src)
    cmd = ['sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', '80']
    if w > 4096:
        cmd += ['--resampleWidth', '4096']
    subprocess.run(cmd + [str(src), '--out', str(dst)], check=True, capture_output=True)


if __name__ == '__main__':
    ART.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    for pid in sys.argv[1:] or list(BG):
        if gen(pid):
            pack(pid)
    ids = [i for i in BG if (OUT / f'{i}.jpg').exists()]
    (OUT / 'index.json').write_text(json.dumps(ids))
    print('index.json：', ids)
