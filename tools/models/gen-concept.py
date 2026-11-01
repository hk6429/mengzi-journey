"""九個主物件概念圖：codex（ChatGPT OAuth，不走 API）生圖，雙線平行，供 Dzine 圖轉 3D。
用法：python3 tools/models/gen-concept.py [只重生的 name ...]　輸出 art/models/<name>.png（art/ 不進 git）
"""
import os, shutil, subprocess, sys, threading, time
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent.parent
STYLE = ('國風工筆設色插畫，柔和的賽璐珞上色（兩階明暗、乾淨色塊），清晰的墨線勾邊；'
         '比例略 Q 版、圓潤可愛（像日式 Q 版遊戲裡的道具模型），但結構完整清楚。時代：中國北朝（北魏）。')
COMP = ('構圖：正方形 1:1，純淺灰色（#d9d9d9）單色背景，畫面只有一個主體、置中、四周留白、完全不裁切；'
        '3/4 俯視角（約 30 度往下看），看得到正面和右側面；主體正面朝向觀者左前方。'
        '不要地面、不要投影、不要草地或底座以外的場景；不要任何人物；不要任何文字、題字、印章、邊框；'
        '這張圖要拿來做圖轉 3D 模型，所以輪廓要清楚、主體要完整立體。')
OBJ = {
  'farmhouse': '北方農家小屋：夯土黃牆、灰瓦兩坡屋頂（有瓦當與屋脊）、木門一扇、木格窗兩扇、門口兩級石階，屋簷下掛一串乾辣椒與玉米，屋角一小堆柴。',
  'loom': '古代木製織布機（Q 版矮胖造型）：粗壯圓潤的原木框架（木料要粗，不要細桿），前方一捲已織好的淡紅布匹佔大面積、後方一捲米白經線布軸，中間經線畫成一整片半透明米白色面而非一根根細線，側面一個大木梭與兩塊踏板，整體像實心的木製玩具，結構簡單厚實、輪廓清楚。（Dzine 圖轉 3D 對細線失敗兩次，故改厚實版）',
  'gatehouse': '鄉村城郭門樓：夯土城牆一段、中間拱形木城門（兩扇朱紅門板、門釘）、上方一座小木構門樓（灰瓦歇山頂、朱紅柱、木欄杆），牆面一塊空白木告示板。',
  'market-tower': '北朝城中市樓：兩層木構樓閣，方形台基、朱紅柱子、灰瓦重簷歇山頂、二樓有回廊欄杆、一面紅色酒旗或幌子掛在簷角、一樓開敞。',
  'horse': '一匹健壯的棕紅色駿馬，全身側面 3/4 視角、四腳站立、頭微抬，配北朝高橋馬鞍（前後鞍橋高起）、彩色鞍韉（紅底金邊織毯）、轡頭與韁繩、胸帶，馬鬃與馬尾整齊；沒有騎者。',
  'tent': '北朝軍營圓頂氈帳：米白色氈布、深色木骨架、帳門掀起一角、帳頂有一面小紅色三角軍旗、帳周繫繩與木樁。',
  'fort-gate': '北方邊塞關城城樓：厚重夯土／磚石城台、中間一個拱形城門洞（厚木門）、城台上一座木構城樓（灰瓦廡殿頂、朱紅柱）、城垛整齊、兩面旌旗。',
  'beacon': '邊塞烽火臺：方形收分的夯土高臺、上窄下寬、頂端有矮牆與一個燃燒中的烽火盆冒出一縷灰白狼煙、側面有一道木梯。',
  'hall': '北朝京城宮殿明堂：漢白玉三層台階台基與欄杆、朱紅柱子一排、重簷廡殿頂（深灰琉璃瓦、屋脊兩端金色鴟吻）、斗拱彩繪、正中大門敞開。',
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
    ok = out.exists() and out.stat().st_mtime >= before and out.stat().st_size > 200_000
    print(('OK   ' if ok else 'FAIL ') + name, flush=True)


if __name__ == '__main__':
    ids = sys.argv[1:] or list(OBJ)
    lanes = [ids[0::2], ids[1::2]]
    ts = [threading.Thread(target=lambda L, n: [gen(i, n) for i in L], args=(L, n)) for L, n in zip(lanes, 'AB') if L]
    for t in ts:
        t.start()
    for t in ts:
        t.join()
