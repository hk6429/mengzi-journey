# 孟子・憂患之旅（mengzi-journey）

化身戰國的孟子，乘一葉扁舟沿著大河走訪六座河中崖島：田畝與版築、魚鹽與困境、大任與磨練、動心忍性、知過能改、居安思危。從舜、傅說等六個人的起點，一路讀懂《孟子・告子下》〈生於憂患，死於安樂〉。古文｜白話切換、大乃克隆聲朗讀、點字詞看註解、每站五題測驗（答對三題過站）、六站完成領文言「結業狀」或白話「結業證書」；附文字版、學習單與教師指引。

- 上線：https://3dislands.pages.dev/mengzi-journey/ 、https://mengzi-journey.netlify.app/
- 技術：Three.js 0.160（單檔 HTML，本機 vendor）、程式建模的 Q 版人物與崖島；水墨全景由 codex 生圖（`tools/gen-pano.py`），朗讀由 VoxCPM2 克隆聲產生（`tools/gen-voice.mjs`，mp3 不進 git）。
- 開發：`npm install`、`npm run build`、`npm run dev -- --port 8884`、`npm test`。
- 第一版（扁平圓柱島）在 git tag `v1-codex`；第二版改用陋室銘引擎，分工見 `docs/CONTRACT.md`。
- 製作：陳乃誠（大乃老師）。原文：《孟子・告子下》（公共領域，採國家教育研究院示例「是人」版本）；白話故事、註解與題目皆為重新改寫。
