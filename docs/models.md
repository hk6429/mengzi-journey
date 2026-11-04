# 模型清單（孟子第二版）

第一版的寫實 Dzine 模型在 review/v1-models（不算數、不載入）；第二版全部 Q 版，以下是第七輪要補的。

## 第七輪：程式建模全面換 GLB（C 線 Phase A，2026-11-04）

接線方式：`lpGlbSwap(name, 群組, { fit })`（src/core.js）把已擺好的程式建模群組整包收進 `glb-fb-<name>` 當 fallback；`models/index.json` 沒列這個名稱時畫面跟原本一模一樣，列了就載入 GLB 等比縮放（預設以 fallback 高度縮放；`fit:'w'` 改以水平最大邊長縮放，給扁平物件）、腳底貼地後換掉 fallback。bake 遇到 GLB 群組整棵保留（`lpBakeWalk`）。
檢查：`node scripts/glb-check.mjs <網址> <輸出資料夾> [假GLB 名稱,...]`（給假 GLB 會攔 index.json，檢查每個名稱都真的換上）。
概念圖：`python3 tools/models/gen-concept.py [name...]` → `art/models/<name>.png`（art/ 不進 git）。

高度／寬度＝目前程式建模的實測外框（寬為水平最大邊，旋轉過的物件略偏大），GLB 會照「縮放依據」那一項對齊。

| GLB 名稱 | 取代的程式建模（檔案／函式） | 出現站 | 高 | 約寬 | 縮放依據 | 狀態 |
|---|---|---|---|---|---|---|
| thatched-hut | planets-a.js hut()（孫叔敖海濱茅舍） | market | 1.17 | 2.53 | 高 | ✓ 預設，250KB |
| tree | planets-a.js tree()（田邊桑樹） | fields | 2.12 | 1.64 | 高 | Dzine 出平面卡片，保留程式建模 |
| fish-stall | planets-a.js 膠鬲魚鹽攤 fs（bake 後；「魚鹽」字牌另掛，不換） | market | 1.54 | 1.90 | 高 | ✓ 預設＋front（實測竹牌已在 GLB 前，未推動），203KB |
| prison-cart | planets-a.js 管仲木囚車 cart（囚犯 chibi 另放，不換） | market | 1.61 | 2.00 | 高 | ✓ fit 1.5，169KB |
| sheepskin-rack | planets-a.js 百里奚羊皮架 bzr（陶罐、竹簍、「市」旗留程式建模） | market | 1.25 | 1.20 | 高 | ✓ match x＋fit 0，178KB |
| rest-pavilion | planets-a.js 路邊歇腳茅亭 pav（坐著的 chibi 高度依長凳 0.41，GLB 到位後要核對） | road | 2.14 | 2.92 | 高 | ✓ 預設，263KB |
| study-hall | planets-b.js 05 靜思書齋 hs（bake 後） | study | 2.61 | 3.44 | 寬 | ✓ fit 'w'，206KB |
| beacon-tower | planets-b.js 06 烽火臺 bt（火與煙另掛，不換） | city | 1.93 | 1.32 | 高 | ✓ fit 2.3（等高 1.93，火盆 1.82 不懸空），142KB |
| city-gate | planets-b.js 06 城門 gt（bake 後；火把、守門兵另掛） | city | 2.45 | 2.97 | 高 | ✓ 預設（火把處牆面 z≈0.45–0.49，火把 0.52 已在牆前），262KB |
| council-hall | planets-b.js 06 議事堂 hall（bake 後） | city | 2.16 | 3.32 | 高 | ✓ 預設，194KB |

### Phase B（2026-11-04）：9 件 GLB 上線

- 建置：`TEX=512 tools/models/build.sh <name>`（build.sh 的貼圖尺寸改吃 `TEX`，預設 1024）；raw 在 `art/models/raw/`（不進 git）。
- 縮放改用 `lpGlbFit`（同 daminghu／mulan／kongcheng／lushiming／ailianshuo）：預設等高，寬／深各不超過 fallback 外框的 `fit` 倍（預設 1.25）；`match:'x'|'z'` 改以該軸長度對齊；`yaw` 先轉再量；`y0` 指定底面高度。
- `front`：魚鹽攤的「魚鹽」竹牌接了 front；射線實測 GLB 在竹牌處表面 z≈0.30，竹牌（0.44）本來就在前面，所以沒有推動。城門火把與守門兵實測也在牆前，沒接 front。
- 調整：羊皮架程式版是片薄架（深 0.10）→ 照架長對齊、不設深度上限；烽火臺 GLB 矮胖 → `fit: 2.3` 才能等高，頂上火盆（另掛 y=1.82）不懸空；囚車 `fit: 1.5`。
- tree：Dzine 出平面卡片，保留程式建模（沒有 raw 檔）。
- 部署提醒：build 不會刪舊檔，同步到 3dislands 時要用 `rsync --delete`。

