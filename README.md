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
- 先用 PeerJS(WebRTC 點對點)直連;6 秒內連唔到就自動轉用公共 MQTT 伺服器(HiveMQ / EMQX)中轉,連唔到嘅網絡都可以玩。備用線路嘅訊息經公共伺服器,房號唔好公開。
- 房主嘅程式持有所有手牌(信任房主);開始後唔可以中途加入。

## 規則
預設 3 番起糊,144 隻牌連花,詳見遊戲內「睇規則」。

## 存檔(牌局進度)
- 單人對電腦時,每次輪到你、同每局完結,都會自動存檔。重新整理、關咗網頁、隔幾日再開,設定畫面都會見到「繼續牌局」。
- 預設存喺瀏覽器(localStorage);清除瀏覽資料或者換機就冇。
- 想存喺伺服器(換機都繼續得):
  1. 去 https://supabase.com 開一個免費專案。
  2. SQL Editor 貼上 `supabase.sql` 全部內容,撳 Run。
  3. Project Settings → API,抄低 **Project URL** 同 **anon public key**。
  4. 喺 `index.html` 搵 `var CLOUD={url:'',key:''};`,填入兩個值,commit。
  5. 之後設定畫面會顯示你嘅「存檔碼」,換機輸入就可以繼續。
- 安全:表格唔開放直接讀寫,只可以經函數用 16 位私人存檔碼存取;anon key 本身係公開設計,放喺網頁冇問題。存檔碼等於密碼,唔好公開。
- 多人房間(開房同朋友打)暫時唔存檔。
