# 孟子・憂患之旅

《孟子・告子下》〈生於憂患，死於安樂〉六站 3D 古文閱讀旅程。古文及白話切換、每站五題、本機最佳成績、結業證書與教學指南。孟子人物模型使用 Dzine 生成；原文來源與內容契約見 `docs/CONTRACT.md`。

## 本機執行

安裝 Node.js 相依套件後，執行 `npm install`、`npm run build`、`npm run dev`；預設在 `http://127.0.0.1:8899/` 開啟。`PORT` 環境變數可指定其他埠。執行 `npm test` 檢查資料。

本機已產出 36 段預錄朗讀；缺檔或播放失敗時改用瀏覽器語音合成，聲音與可用性依裝置不同。學習進度和姓名只存在本機瀏覽器，不跨裝置同步。角色模型無骨架，登船與下船以位置移動呈現。本機自動檢查及畫面檢視已有紀錄；人工聽讀、真機與部署尚未完成。

## 驗證

`npm test` 檢查資料與模型。建置及啟動本機服務後，`node scripts/check-river.mjs` 檢查實際 3D 渡河；`node scripts/check-scene-views.mjs --shots` 檢查手機、桌機特寫與角色邊界，截圖寫入 `review/scenes/`。這兩項以有視窗的 Chromium 執行，需圖形環境。

本機產出的個人聲音 MP3 與暫存資料不納入公開儲存庫；未提供預錄檔時使用裝置語音。`tools/gen-voice.mjs` 需本機已設定的 VoxCPM 工具，不會下載或設定聲音身分。

`node scripts/check-voice-files.mjs` 核對 36 段預錄檔與目前文字、讀音版本、解碼及音量；`node scripts/check-voice-browser.mjs` 檢查瀏覽器載入。兩者需本機已有預錄檔及 ffmpeg／ffprobe。抽聽頁為 `/audio-review.html`；檔案檢查不能代替人工聽讀。

`node scripts/check-cert-image.mjs` 在真實 3D 場景產生六張證書圖片，檢查兩版 A4 證書、成績與姓名保留及重開可領；樣張寫入 `review/certificates/`。截圖只更新圖片紀錄，不變更學生進度。
