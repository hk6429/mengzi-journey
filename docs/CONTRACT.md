# 四線分工契約：孟子・憂患之旅（mengzi-journey 第二版）

**第二版＝整站改用陋室銘引擎重建**。整合者已從 `~/projects/ailianshuo-journey`（愛蓮說第三輪，陋室銘引擎最新定稿）複製 `src/`、`parts/`、`scripts/`、`test/`、`tools/`、`build.mjs`；`src/data.js` 已轉成本作六站（文字沿用第一版）。第一版（Codex 寫的扁平圓柱島）在 git tag `v1-codex`，舊契約、考據、驗收在 `docs/v1/`。
**卡住先讀愛蓮說／陋室銘的同名檔案與它們的 `docs/CONTRACT.md`**：架構、P API、鏡頭、介面都驗過。內部變數名（`LP_BUILD`、`lpKit`、`lp-*`、`planets`、`adults`）沿用不改名。愛蓮說第三輪四專家審查的修正（鏡頭俯角、直式判斷 <560、a11y、LOD）全部保留，不要退回。

單檔串接：`src/core.js → src/data.js → parts/chibi.js → parts/planets-a.js → parts/planets-b.js → parts/scene.js → parts/ui.js → src/boot.js`，同一個 module scope。
`npm run build` → `public/`、`dist/`；`npm run dev -- --port <埠>`；`npm run shot -- "<網址>" review/x.png [寬x高]`（會列 console 錯誤）。

**上線網址**：`https://3dislands.pages.dev/mengzi-journey/`＋`https://mengzi-journey.netlify.app/`。localStorage 改 `mengzi-v2`（程式裡的 `als-` 前綴全部改掉；第一版 key 格式不同，不沿用）。
**古文作品模式**：沒有英文版。「古文｜白話」、每站 5 題（答對 3 題過站，可重考）、六站完成領兩版證書（文言「結業狀」＋白話「結業證書」），`n/6`。

## 本作風格（風格轉換：不可沿用陋室銘／愛蓮說外觀）
| 項目 | 陋室銘 | 愛蓮說 | **孟子（本作）** |
|---|---|---|---|
| 站點造型 | 浮空青綠仙山島 | 蓮池大荷葉 | **河中崖體島**：六座赭石崖島從一條大河裡立起來，島頂平台、崖壁層理＋斧劈皴、崖腳入水處有漣漪與水草 |
| 世界下方 | 雲海 | 仙池水面 | **大河**：黛青偏灰綠、帶赭黃泥沙色的河水（不是碧綠仙池）；河面寬，遠處交給全景；薄霧貼水 |
| 站與站相連 | 航道金線 | 荷葉跳石 | **看得見的水路＋木橋**：相鄰兩島之間一條航道（竹竿浮標／水草標出），旁邊一座低矮木棧橋架在木樁上（使用者第一版指定「島跟島要有線相連」，總覽要一眼看出六島依序相連） |
| 移動 | 乘仙鶴 | 騎青蛙跳 | **乘戰國扁舟**：Q 版船夫在船尾撐篙，孟子坐船中；沿航道划到下一島碼頭靠岸 |
| 時代 | 中唐 | 北宋 | **戰國**（孟子）；典故人物各依其時代（見下） |
| 配色 | 青綠 | 淡彩粉綠 | **赭石、黛青、竹木、土黃，朱砂點綴**；低彩度 |
| 全景畫風 | 青綠山水 | 宋院體荷花 | **水墨寫意＋赭石淡彩**：淡墨層疊遠山、赭土河岸、留白河霧、少量朱砂；下半部是河面 |
| 朱印／題簽 | 陋室／陋室銘 | 君子／愛蓮說 | **憂患**／**生於憂患** |
| 按鈕 | 乘鶴前往〇〇 | 騎蛙跳往〇〇 | **乘舟前往〇〇** |
| 人物 | Q 版 | Q 版 | **全部 Q 版**（第一版的寫實 Dzine 孟子不用；`public/models/*.glb` 是寫實風，預設不載入，A/B 想用書齋或竹簡 GLB 要截圖確認跟 Q 版不衝突才用） |

### 崖島規格（取代陋室銘 §3）
- 每站一座島：島頂平台半徑 5、頂面 y=0 可站（內容放半徑 4.6 內）；崖體往下延伸到河面（河面高度固定 `SC_WATER_Y`，各島平台離水 1.0–3.2 錯落，`pos[1]` 就是平台高度）。崖壁用陋室銘的 `lpIsland` 鋸齒層理＋空城計的 `lpCunTex` 斧劈皴（`~/projects/kongcheng-journey/src/core.js`），**不要平面著色低多邊形**（會像紙板）。
- 每島一座小碼頭 `userData.dock`（角度，度，0＝+z），A/B 決定、避開主建築；C 在那裡畫木碼頭＋石階通往平台，船靠在碼頭。
- 每站自建 mesh ≤220（InstancedMesh 算 1），材質一律 `lpCel`；主角站 (0,0,2.6) 半徑 0.7 淨空；360° 可繞，主建築放 z<0 但背面完整；`userData.rim` 照陋室銘。

### 扁舟（C 線）
- 戰國扁舟：窄長木船（長約 2.6）、船頭微翹、船身木色帶深色船舷、中段可有低矮竹篷（不可擋主角臉）。Q 版船夫 `who:'boatman'`（斗笠、短褐、撐竹篙）站船尾；孟子坐船中。物件名 `name='boat'`、主角 `name='hero'`。
- **移動**：主角從平台走下石階到碼頭上船 → 船離岸，沿航道（平滑曲線，繞過其他島）划到下一島碼頭，船夫撐篙有動作、船身輕微起伏、船尾拖出水痕 → 靠岸，主角上岸走到 (0,0,2.6)。鏡頭跟拍平順（目標用低通平均），整段 5–9 秒，長按 0.5 秒或 Esc 可略過；`prefers-reduced-motion` 直接切站。
- **到站後**：船停在碼頭隨水輕晃，船夫坐下休息，不擋主角與鏡頭。
- 去過的航道：浮標上的小燈籠亮起（取代陋室銘的「去過航道變亮金」）。
- 開工先截船＋船夫的**正面、側面、背後**剪影各一張自己看（陋室銘仙鶴背後像「圓球插細棍」的坑），再接動作。手機直式 390×844 也要驗跟拍時船不跑出畫面。

## 原文與版權（四線都要遵守）
- 《孟子・告子下》屬公共領域。`DATA.planets[].yuan` 已切好，**不要改**。
- 白話故事、元素說明、生詞、思考題、測驗**一律自己改寫**，不抄課本語譯、注釋、題目，也不抄坊間譯本或網路翻譯。第一版故事是自寫的，可沿用。
- 舜、傅說屬傳說，故事用「傳說」口吻，不寫成史實；第一版已注意，保持。
- 時代考據（Q 版也要對）：
  - **孟子**（戰國中期，主角）：束髮戴小冠或幅巾、交領右衽寬袖深衣（黛青或赭色，腰繫大帶）、布履，Q 版短鬚、沉穩笑眼，手持一卷竹簡。**不要摺扇、不要唐宋襆頭、不要官帽**。
  - **舜**（上古傳說）：束髮、粗麻短衣、赤腳或草鞋，扶耒耜（木製雙齒掘土農具）。
  - **傅說**（商代，傳說）：短衣束腰、捲袖，持夯杵站在夾板土牆旁（版築：兩片木板夾土、層層夯實）。
  - **膠鬲**（商末）：販魚鹽的人：短衣、竹簍、鹽袋。
  - **管仲（管夷吾）**（春秋齊）：被押的囚徒：木囚車或手上木枷，衣服樸素。
  - **孫叔敖**（春秋楚）：海濱隱居的人：斗笠、布衣。
  - **百里奚**（春秋秦）：市集中的老人，傳說以五張羊皮被贖，可放羊皮。
  - **戰國士人／工匠／守城兵**：交領短衣或深衣、束髮；兵持戈，不要穿明清盔甲。建築：夯土台基、木構、茅草或瓦頂（戰國已有板瓦筒瓦），不要宋以後的翹角飛簷。

## 六站與元素（id／元素清單／shots 整合者已定）
| 站 | id | 平台高 | 內容（A 站 1–3、B 站 4–6） |
|---|---|---|---|
| 1 田畝與版築 | fields | 1.0 | `dock` 河岸渡口（碼頭邊立渡口木牌）、`field` 舜扶耒耕田（田壟、禾苗）、`banzhu` 傅說版築（夾板土牆、夯杵、半築的牆）。晨光、田野最有生氣 |
| 2 魚鹽與困境 | market | 1.6 | `fish` 膠鬲的魚鹽攤（竹棚、魚簍、鹽堆）、`prison` 管仲的木囚車、`coast` 孫叔敖的海濱（島緣一角礁石浪花、小茅舍）、`bazaar` 百里奚的市集（攤位、羊皮）。四個小場景一眼分得開，最熱鬧 |
| 3 大任與磨練 | road | 3.2（最高） | `road` 崎嶇山路（石階、亂石盤繞上坡）、`burden` 沉重行囊與風雨（斗笠、竹杖、風吹斜的雨絲）、`rest` 路邊歇腳亭（茅亭、水罐：休息與支持）、`fork` 岔路口（路標）。最陡最險，色調偏冷 |
| 4 動心忍性 | bridge | 2.2 | `bridge` 待修的小木橋（跨過島上一道溝，缺幾塊板）、`tools` 工具與方法（斧、鋸、繩、竹簡畫的圖樣）、`helpers` 一起修橋的人（2 位工匠合作扛木）。 |
| 5 知過能改 | study | 1.4 | `study` 靜思書齋（夯土台基木構，放 z<0、不可擋主角）、`desk` 書案與竹簡（攤開的竹簡、毛筆、硯）、`friend` 來訪的學生（交領短衣，正在說話）。書卷氣、暖 |
| 6 居安思危 | city | 2.6 | `court` 議事堂（大臣與敢於勸諫的士）、`wall` 城牆與烽火臺（守城兵）、`gate` 城門遠望（城門樓、遠方）。暮色，終站最開闊 |
- 每個 element 都 `P.tag`，配角臉朝 +z（cos≥0.5）。必須「一眼看懂原文」。
- `pos` 是暫定的河道 S 形排列；C 可以調，調完通知整合者。

## 分工
| 線 | 只能改的檔案 | 埠 |
|---|---|---|
| A 站 1–3（fields、market、road） | `parts/planets-a.js`、`test/planets-a.test.mjs`、`review/a-*` | 8881 |
| B 站 4–6（bridge、study、city） | `parts/planets-b.js`、`test/planets-b.test.mjs`、`review/b-*` | 8882 |
| C 崖島／大河／航道木橋／扁舟／Q 版人物／鏡頭 | `src/core.js`、`parts/scene.js`、`parts/chibi.js`、`test/scene.test.mjs`、`test/chibi.test.mjs`、`scripts/c-flight-check.mjs`、`scripts/cert-shots.mjs`、`src/data.js` 的 `pos` 數字、`review/c-*` | 8885 |
| D 文字／介面字樣／朗讀／全景／教學 | `src/data.js` 的文字（desc／next／adults；story 只在必要時改）、`parts/ui.*`、`src/shell.html`、`src/boot.js` 的字樣、`scripts/guide.mjs`、`scripts/d-*`、`tools/gen-voice.mjs`、`tools/gen-pano.py`、`public/voice/`、`public/pano/`、`test/ui.test.mjs`、`test/data.test.mjs`、`README.md`、`AGENTS.md`、`package.json` 的 description、`review/d-*` | 8884 |
`build.mjs`、`scripts/build.mjs`、DATA 的 id／元素清單／shots／yuan 由整合者維護。

### A／B
- 每站 `LP_BUILD.<id> = P => Group`，原點＝平台中心、平台頂 y=0。島本體由 C 畫，A/B 只放內容＋回傳 `userData.{standSpots, rim, dock}`。
- 檔頭工具（grp、who、faceTo、dress、rimOf、inst…）保留；把愛蓮說的四個 `LP_BUILD.*` 換成本作三站。荷葉相關的（notch、葉面鋪土）刪掉。
- 配角 `P.chibi({who, pose, face})`，who 用 C 的清單（見下）；C 還沒 commit 前 who 不存在會用預設人偶，照樣能截圖。
- 在 C 合併前場景還是荷葉，只要內容不超出半徑 4.6 就能截圖驗。

### C
- `src/core.js`：`LP_TONE` 換六站 id（fields 晨光田綠、market 赭黃熱鬧、road 冷灰青、bridge 竹木、study 暖褐、city 暮色赭紅）；移植 `lpIsland`＋`lpCunTex`（陋室銘／空城計）改成「河中崖島」（崖腳入水、水線有一圈淺色泥沙與漣漪）；刪 `lpLotusLeaf`。
- `parts/scene.js`：荷葉改崖島、仙池改大河（水面 shader 改色：黛青灰綠帶泥沙色、輕微流動感，遠處淡出交給全景）、青蛙改扁舟（見上）、荷葉跳石改「航道浮標＋木棧橋」、朱印「憂患」、題簽「生於憂患」、結尾 goHome 暮色俯瞰六島。
- `parts/chibi.js`：who 換成本作：`mengzi`（主角）、`shun`、`fuyue`、`jiaoge`、`guanzhong`、`sunshuao`、`baili`、`scholar`（戰國士人／學生）、`craftsman`（工匠）、`soldier`（守城兵）、`minister`（大臣）、`boatman`（船夫）；刪愛蓮說的 who。pose 可加 `plough`、`tamp`、`carry`、`bound`（戴枷）、`read`、`talk`、`spear`、`pole`（撐篙）。**先把 12 個 who 的基本造型做出來早點 commit**（A/B 會呼叫），再精修。
- `scripts/c-flight-check.mjs`、`scripts/cert-shots.mjs`、`test/scene.test.mjs`、`test/chibi.test.mjs` 改本作（`hero`／`boat`）。

### D
- `src/data.js`：寫每個 element 的 `desc`（40–90 字，孟子第一人稱口吻可，或說明口吻）、每站 `next`（往下一站的過場一句，「乘舟／船」說法；最後一站寫結尾）、`adults`＝統整表「六個人的起點」（who 人物、cares 原本處境、prince 後來被誰任用；舜／傅說標「傳說」）。story 已有、朗讀已錄，**不改就不必重錄**；若要改（例如加入船夫、扁舟），只改必要句子。
- `tools/gen-voice.mjs`：換成本作（站 id、`SAY_AS` 破音字：說ㄩㄝˋ→悅、鬲ㄍㄜˊ→格、拂ㄅㄧˋ→必、曾ㄗㄥ→增、衡ㄏㄥˊ、徵ㄓㄥ…先查再定）。**第一版 36 段已錄好**：manifest 格式不同，先寫一段把現有 mp3 依目前文字登記進新 manifest（文字沒改就不重錄），再只重錄改過的段。跑之前 `pgrep -fl -i voxcpm`，有別的在跑就等，**VoxCPM 不可並行**。原文段 `<pid>-y.mp3` 第一版是 1.1 倍速，保留。
- `parts/ui.*`、`src/shell.html`、`src/boot.js`：愛蓮說字樣全換本作（標題「孟子・憂患之旅」、導讀卡（孟子、戰國、儒家；本文選自《孟子・告子下》，論說文：先舉六例→提出論點→說明原因→推及國家→結論；「是人／斯人」版本差異）、按鈕「乘舟前往〇〇」、結尾卡、統整表「六個人的起點」、證書兩版文案、朱印「憂患」、`mengzi-v2`、證書檔名 `mengzi-certificate.png`、載入字樣「孟子登舟出發…」），「八站」→「六站」、`n/6`。頁尾原文出處。
- `tools/gen-pano.py`：六站 BG 全部重寫，**COMP：下半部是寬闊的大河水面（黛青灰綠、近岸帶赭黃泥沙、留白河霧），地平線附近淡墨層疊遠山與赭土河岸、遠處零星戰國夯土聚落剪影**；STYLE 改「水墨寫意＋赭石淡彩，宣紙底，少量朱砂」；時代戰國。各站：fields 春日晨光田野、market 午後熱鬧河港（遠方海口）、road 風雨山徑（最暗、雲壓低）、bridge 雨後初晴、study 黃昏暖光竹林、city 暮色城郭（遠方烽火臺）。用 codex 生圖（ChatGPT OAuth，不走 API），**一張一張序列跑、每張包逾時**；壓成 `public/pano/<id>.jpg`，`index.json` 照愛蓮說格式。
- `scripts/guide.mjs`：guide.html＋學習單；teacher.html（第一版 `docs/v1/` 與 tag `v1-codex` 的 teacher.html／guide.html 內容可搬：論證結構、舉例論證、層遞、版本差異、「苦難不必然使人成長」的提醒）。
- `test/ui.test.mjs`、`test/data.test.mjs`、`scripts/d-ui-check.mjs`（SEGS 每站 5）、`d-station-shots.mjs`、`d-perf.mjs` 改本作；0 失敗。

## 共同驗收
每線只改自己的檔案 → `npm run build && npm test`（別線未完成造成的失敗在回報中註明即可）→ 在自己的埠截圖桌機 1440×900、手機 390×844，**自己看截圖**，console 零錯誤 → commit 到自己的分支。回報繁中：做了什麼、截圖路徑、還沒做到的。不 push、不部署、不 stash；git 用 `/usr/bin/git`；刪檔用 `/bin/rm`。
