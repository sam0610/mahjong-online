# 港式麻雀

單檔 HTML 港式麻雀(2–4 人),可對電腦,亦可開房同朋友喺同一個網頁對戰。

## 部署到 GitHub Pages
1. 喺 GitHub 開一個新 repo(Public),例如 `mahjong`。
2. 將 `index.html`、`.nojekyll`、`README.md` 上載到 repo 根目錄。
3. Settings → Pages → Source 揀 `Deploy from a branch`,Branch 揀 `main` / `(root)`,Save。
4. 等一兩分鐘,網址係 `https://<你嘅用戶名>.github.io/mahjong/`。

## 多人對戰
- 一人撳「開房同朋友打」,會得到房號同連結,傳俾朋友。
- 朋友開同一個網頁,輸入房號(或直接開連結)加入。夠唔夠人都可以開始,空位由電腦補。
- 房主嘅瀏覽器負責行牌局,要保持網頁開住。有人斷線會由電腦代打。
- 用 PeerJS(WebRTC 點對點),預設用公共 signaling server;個別網絡(公司/嚴格 NAT)可能連唔到。
- 房主嘅程式持有所有手牌(信任房主);開始後唔可以中途加入。

## 規則
預設 3 番起糊,144 隻牌連花,詳見遊戲內「睇規則」。
