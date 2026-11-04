# 模型清單（孟子第二版）

第一版的寫實 Dzine 模型在 review/v1-models（不算數、不載入）；第二版全部 Q 版，以下是第七輪要補的。

## 第七輪：程式建模全面換 GLB（C 線 Phase A，2026-11-04）

接線方式：`lpGlbSwap(name, 群組, { fit })`（src/core.js）把已擺好的程式建模群組整包收進 `glb-fb-<name>` 當 fallback；`models/index.json` 沒列這個名稱時畫面跟原本一模一樣，列了就載入 GLB 等比縮放（預設以 fallback 高度縮放；`fit:'w'` 改以水平最大邊長縮放，給扁平物件）、腳底貼地後換掉 fallback。bake 遇到 GLB 群組整棵保留（`lpBakeWalk`）。
檢查：`node scripts/glb-check.mjs <網址> <輸出資料夾> [假GLB 名稱,...]`（給假 GLB 會攔 index.json，檢查每個名稱都真的換上）。
概念圖：`python3 tools/models/gen-concept.py [name...]` → `art/models/<name>.png`（art/ 不進 git）。

高度／寬度＝目前程式建模的實測外框（寬為水平最大邊，旋轉過的物件略偏大），GLB 會照「縮放依據」那一項對齊。

| GLB 名稱 | 取代的程式建模（檔案／函式） | 出現站 | 高 | 約寬 | 縮放依據 | 狀態 |
|---|---|---|---|---|---|---|
| thatched-hut | planets-a.js hut()（孫叔敖海濱茅舍） | market | 1.17 | 2.53 | 高 | 待 Dzine |
| tree | planets-a.js tree()（田邊桑樹） | fields | 2.12 | 1.64 | 高 | 待 Dzine |
| fish-stall | planets-a.js 膠鬲魚鹽攤 fs（bake 後；「魚鹽」字牌另掛，不換） | market | 1.54 | 1.90 | 高 | 待 Dzine |
| prison-cart | planets-a.js 管仲木囚車 cart（囚犯 chibi 另放，不換） | market | 1.61 | 2.00 | 高 | 待 Dzine |
| sheepskin-rack | planets-a.js 百里奚羊皮架 bzr（陶罐、竹簍、「市」旗留程式建模） | market | 1.25 | 1.20 | 高 | 待 Dzine |
| rest-pavilion | planets-a.js 路邊歇腳茅亭 pav（坐著的 chibi 高度依長凳 0.41，GLB 到位後要核對） | road | 2.14 | 2.92 | 高 | 待 Dzine |
| study-hall | planets-b.js 05 靜思書齋 hs（bake 後） | study | 2.61 | 3.44 | 寬 | 待 Dzine |
| beacon-tower | planets-b.js 06 烽火臺 bt（火與煙另掛，不換） | city | 1.93 | 1.32 | 高 | 待 Dzine |
| city-gate | planets-b.js 06 城門 gt（bake 後；火把、守門兵另掛） | city | 2.45 | 2.97 | 高 | 待 Dzine |
| council-hall | planets-b.js 06 議事堂 hall（bake 後） | city | 2.16 | 3.32 | 高 | 待 Dzine |
