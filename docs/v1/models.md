# Dzine 模型

| 檔案 | 用途 | 現況 |
|---|---|---|
| mengzi-normal.glb | 孟子主角 | 已載入、截圖；無骨架 |
| warring-hall.glb | 書齋及議事建築 | 已載入、截圖 |
| rammed-earth.glb | 第一站版築 | Normal、GLB；已載入與截圖 |
| bamboo-slips.glb | 第四、五站書案竹簡 | Normal、GLB；已載入、檢查尺寸與截圖 |

模型由使用者指定的 Dzine 畫布產生及匯出，屬本作美術詮釋，並非考古復原。竹簡參考圖、去背及 Normal 模型共使用 27 點；版築參考圖與 Normal 模型另使用 27 點，兩個模型皆已完成並整合。新模型載入失敗時保留程式幾何後備。

`node scripts/check-slips.mjs` 驗證第一站版築與第四、五站有實際竹簡模型且尺寸適合書案；截圖在 `review/scenes/slips-station-4.png` 與 `slips-station-5.png`。
