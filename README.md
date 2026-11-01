# 孟子・憂患之旅

《孟子・告子下》〈生於憂患，死於安樂〉六站 3D 古文閱讀旅程。古文及白話切換、每站五題、本機最佳成績、結業證書與教學指南。孟子人物模型使用 Dzine 生成；原文來源與內容契約見 `docs/CONTRACT.md`。

## 本機執行

安裝 Node.js 相依套件後，執行 `npm install`、`npm run build`、`npm run dev`；預設在 `http://127.0.0.1:8899/` 開啟。`PORT` 環境變數可指定其他埠。執行 `npm test` 檢查資料。

音訊優先使用本作預錄朗讀，尚未產出的段落改用瀏覽器語音合成；聲音與可用性依裝置不同。學習進度和姓名只存在本機瀏覽器，不跨裝置同步。3D 模型無骨架與動畫。部署、真機與完整體驗驗收尚待完成。

## 驗證

`npm test` 檢查資料與模型。建置及啟動本機服務後，`node scripts/check-river.mjs` 檢查實際 3D 渡河；`node scripts/check-scene-views.mjs --shots` 檢查手機、桌機特寫與角色邊界，截圖寫入 `review/scenes/`。這兩項以有視窗的 Chromium 執行，需圖形環境。

產製中的個人聲音 MP3 與暫存資料不納入公開儲存庫；未提供預錄檔時使用裝置語音。`tools/gen-voice.mjs` 需本機已設定的 VoxCPM 工具，不會下載或設定聲音身分。
