"""主物件概念圖：codex（ChatGPT OAuth，不走 API）生圖，線內序列，供 Dzine 圖轉 3D。
用法：python3 tools/models/gen-concept.py [只重生的 name ...]　輸出 art/models/<name>.png（art/ 不進 git）
"""
import os, shutil, subprocess, sys, threading, time
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent.parent
STYLE = ('水墨寫意＋赭石淡彩的國風插畫，低彩度（赭石、黛青、竹木、土黃，少量朱砂點綴），柔和的賽璐珞上色（兩階明暗、乾淨色塊），清晰的墨線勾邊；'
         '比例 Q 版、圓潤可愛（像日式 Q 版遊戲裡的道具模型），但結構完整清楚。時代：中國戰國；建築是夯土台基、木構、茅草或板瓦直坡頂，不要宋以後的翹角飛簷。')
COMP = ('構圖：正方形 1:1，純淺灰色（#d9d9d9）單色背景，畫面只有一個主體、置中、四周留白、完全不裁切；'
        '3/4 俯視角（約 30 度往下看），看得到正面和右側面；主體正面朝向觀者左前方。'
        '不要地面、不要投影、不要草地或底座以外的場景；不要任何人物；不要任何文字、題字、印章、邊框，牌匾一律留白；'
        '這張圖要拿來做圖轉 3D 模型，所以輪廓要清楚、主體要完整立體。')
OBJ = {
  'thatched-hut': '戰國庶民小茅舍：低矮的土黃夯土牆（看得到一層層夯土橫紋）、一扇半開的木門、一個小方窗，上面是一頂圓錐形、邊緣下垂的厚茅草屋頂，頂上一個草結；沒有翹角。',
  'tree': '田邊的一棵桑樹（Q 版）：微彎的深褐樹幹、三根往上分岔的粗枝，樹冠是五團圓潤的深綠與黃綠色葉團，整體像一朵蘑菇雲。',
  'fish-stall': '戰國魚鹽攤：四根竹竿撐著前低後高的草蓆頂，竹棚下一張木攤板（兩個木腳），攤上一只裝滿魚的竹簍、一小堆白鹽；棚前橫一根竹竿掛著四條曬乾的魚；地上兩袋鹽；不要招牌。',
  'prison-cart': '春秋時代押送犯人的木囚車：兩個大木輪、一根車軸、往後伸的兩根車轅，車上一個方形木籠（深色木柱框、四周一根根木柵欄、頂上一塊木板），正面只有兩根柵欄、中間敞開看得到籠內；籠內空的，沒有人。',
  'sheepskin-rack': '市集的羊皮木架：兩根深色木柱撐著一根橫桿，橫桿上掛著五張攤開的米白與淺棕色羊皮（有四腳的輪廓、毛茸茸厚實）。',
  'rest-pavilion': '路邊歇腳茅亭：圓形石台基、四根深色木柱、上面一頂圓錐形厚茅草亭頂（邊緣下垂、頂上草結），亭內後方一張木長凳，旁邊一只陶水罐和一個小陶碗；四面敞開。',
  'study-hall': '戰國靜思書齋：夯土台基與一級台階、六根深色木柱、後面與兩側是白粉土牆、正面完全敞開，室內地上鋪蓆、左邊一座三層木架擺滿成捆的竹簡卷，右開間竹簾半垂，上面是兩坡茅草屋頂（山牆白色）。',
  'beacon-tower': '戰國烽火臺：方形的夯土高臺（看得到一層層夯土橫紋，略呈上窄下寬），頂上放一個黑陶火盆；不要畫火焰與煙。',
  'city-gate': '戰國城門：兩座方形夯土門墩（看得到夯土橫紋），上面架一座小木構門樓（木柱、米白板牆、兩坡板瓦直坡頂，不翹角），中間兩扇深紅木門半開，門墩前兩支火把（不點火）。',
  'council-hall': '戰國議事堂：夯土台基與一級台階、四根深色木柱、後牆白粉、正面敞開，堂內正中一座黑漆朱心的屏風、屏風前一張草蓆君席，上面是兩坡板瓦直坡頂（不翹角）。',
}


def home(lane):
    h = ROOT / 'art' / 'models' / f'.codex-{lane}'
    h.mkdir(parents=True, exist_ok=True)
    for f in ('auth.json', 'config.toml'):
        s = Path.home() / '.codex' / f
        if s.exists():
            shutil.copy(s, h / f)  # 每次複製最新憑證
    return h


def gen(name, lane):
    out = ROOT / 'art' / 'models' / f'{name}.png'
    prompt = (f'請用你的圖像生成工具畫一張圖，畫好後把圖檔存到這個確切路徑：{out} （存在就覆寫）。不要做其他事。\n\n'
              f'{STYLE}{COMP}主體：{OBJ[name]}')
    h = home(lane)
    before = time.time()
    try:
        subprocess.run([os.path.realpath(shutil.which('codex')), 'exec', '--skip-git-repo-check', '-'], input=prompt.encode(),
                       capture_output=True, timeout=600, env={**os.environ, 'CODEX_HOME': str(h)}, cwd=ROOT)
    except subprocess.TimeoutExpired:
        pass
    if not out.exists() or out.stat().st_mtime < before:  # codex 有時沒照路徑存，改撈它自己的輸出資料夾
        found = sorted(h.glob('generated_images/*/ig_*.png'), key=lambda p: p.stat().st_mtime)
        if found and found[-1].stat().st_mtime >= before:
            shutil.copy(found[-1], out)
    ok = out.exists() and out.stat().st_mtime >= before and out.stat().st_size > 100_000 and out.read_bytes()[:8] == b'\x89PNG\r\n\x1a\n'
    print(('OK   ' if ok else 'FAIL ') + name, flush=True)


if __name__ == '__main__':
    # 第七輪：線內序列跑（同時最多 1 個 codex）；已存在且合格的圖一律跳過（要重生就先刪檔）
    ids = sys.argv[1:] or list(OBJ)
    for i in ids:
        out = ROOT / 'art' / 'models' / f'{i}.png'
        if out.exists() and out.stat().st_size > 100_000:
            print('HAVE ' + i, flush=True); continue
        gen(i, 'C')
