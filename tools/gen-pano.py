"""八站 360 度國畫全景天空（貼在天空球上，下半部是仙界蓮池水面）：用 codex（ChatGPT OAuth，不走 API）生圖，雙線平行。
用法：python3 tools/gen-pano.py [只重生的 id ...]　輸出 art/pano/<id>.png（art/ 不進 git），再壓成 public/pano/<id>.jpg
"""
import os, shutil, subprocess, sys, threading, time
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
STYLE = ('中國傳統工筆設色國畫（宋代院體花鳥＋青綠山水），絹本／宣紙米黃底色，精緻細膩的墨線勾勒，'
         '礦物顏料淡彩、低彩度：石青、石綠、赭石、胭脂、藤黃，薄霧留白、層次深遠，氣韻清雅，像宋人荷花冊頁與手卷局部。')
COMP = ('最寬的橫式長卷全景（環繞 360 度用，左邊緣和右邊緣的內容必須能無縫接起來：兩端都是相同高度的水面與遠山，沒有被裁切的物件）。'
        '構圖：地平線正好在畫面垂直正中央；上半部是天空（雲、霞或日依內容）；地平線附近是一圈連綿的淡遠山；'
        '下半部全部是一望無際的仙界蓮池水面：清澈碧青、映著天光與雲影、細細的水波紋，零星的荷葉與荷花越遠越小、薄霧貼著水面，越往下越淡，完全沒有陸地。'
        '景物平均分布在整個寬度，不要集中在中間。畫面中完全不要任何人物、動物、青蛙、近景建築；不要任何文字、題字、印章、落款、邊框；非照片、非 3D、非動漫。時代：中國北宋。')
BG = {
  'baihua': '夏日清晨：淡青天空、柔白晨雲、一抹朝霞；遠方水鄉低丘上桃李、木槿、萱草等各色小花點點（淡彩繽紛）；水面清亮，浮萍與小白菱花點點。',
  'ju': '深秋薄霧：淡赭灰的天空、高遠稀疏的雲，一行雁；畫面中段地平線上一座清楚可辨、形狀優美的南山（青綠與淡墨，山形完整、比其他遠山高大一倍，是全畫主角；左右各重複出現一次讓 360 度都看得到），山腳竹籬茅舍與一片黃菊；水面帶淡淡秋黃，霧氣較濃。',
  'mudan': '春日午後：暖粉與淡金的霞光天空；地平線上是清楚可辨的長安城：高大的朱紅城門樓、灰瓦城牆、層層樓閣（工筆界畫、比例要大，佔畫面寬度三分之一以上，另一側再有一座塔與宮殿屋頂），城外一片粉紅花海；水面映著暖粉霞光，荷葉稀少、遠處有幾艘小遊船。',
  'yuni': '夏日正午：清朗淡青天空、白雲；遠山青綠柔和；水面清綠透亮，荷葉田田、白粉荷花較多，近處水色清澈可見淺淺的水底。',
  'jing': '夏日午後：淡青天空、薄雲；遠山青綠，山腳水岸一片蘆葦與荷田；水面碧綠，荷莖挺直、荷花亭亭。',
  'xiang': '夏日微風：粉白與淡青交融的天空、輕柔流雲；遠山淡青，遠處一座小小的攢尖水亭剪影；水面上大片粉白荷花，空氣中淡淡的花霧。',
  'pin': '午後素淡：米白與淡灰青的天空、平靜的雲；遠山淡墨、層次簡潔；水面平靜如鏡，荷葉疏落，整體素雅留白多。',
  'lianxi': '夕照：天空由金紅轉暖橙、晚霞燦爛；地平線上是清楚可辨、雄偉高聳的廬山群峰（青綠與赭石設色、峰巒重疊、有一道白色瀑布從山腰流下，山形高度佔天空三分之一，左右延伸環繞），山腳一道小溪流入蓮池；水面映著金紅夕光，荷葉剪影。',
}


def home(lane):
    h = ROOT / 'art' / f'.codex-p{lane}'
    h.mkdir(parents=True, exist_ok=True)
    for f in ('auth.json', 'config.toml'):
        s = Path.home() / '.codex' / f
        if s.exists():
            shutil.copy(s, h / f)  # 每次複製最新憑證
    return h


def gen(pid, lane):
    out = ROOT / 'art' / 'pano' / f'{pid}.png'
    prompt = (f'請用你的圖像生成工具畫一張圖，畫好後把圖檔存到這個確切路徑：{out} （存在就覆寫）。不要做其他事。\n\n'
              f'{STYLE}{COMP}畫面內容：{BG[pid]}')
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
    ok = out.exists() and out.stat().st_mtime >= before and out.stat().st_size > 500_000
    print(('OK   ' if ok else 'FAIL ') + pid, flush=True)


if __name__ == '__main__':
    (ROOT / 'art' / 'pano').mkdir(parents=True, exist_ok=True)
    ids = sys.argv[1:] or list(BG)
    lanes = [ids[0::2], ids[1::2]]
    ts = [threading.Thread(target=lambda L, n: [gen(i, n) for i in L], args=(L, n)) for L, n in zip(lanes, 'AB') if L]
    for t in ts:
        t.start()
    for t in ts:
        t.join()
