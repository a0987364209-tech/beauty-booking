# Vercel 部署指南 - Beauty Booking

## 📋 前置準備

### 1. 建立 LINE Developers 帳號與 Channel
1. 前往 [LINE Developers Console](https://developers.line.biz/console/)
2. 建立新的 Provider（如果還沒有）
3. 建立新的 Channel（選擇 "LINE Login" 和 "Messaging API"）
4. 記下以下資訊：
   - **Channel ID**
   - **Channel Secret**
   - **LIFF App ID**（建立 LIFF App 後取得）

### 2. 設定 LIFF App
1. 在 LINE Developers Console 中，進入您的 Channel
2. 點擊 "LIFF" 標籤
3. 點擊 "Add" 建立新的 LIFF App
4. 設定：
   - **LIFF app name**: 涵光美學預約
   - **Size**: Full
   - **Endpoint URL**: `https://your-vercel-domain.vercel.app`（部署後填入）
   - **Scope**: `profile openid email`
   - **Bot link feature**: 啟用（用於推播）

### 3. 取得 LINE Messaging API Access Token
1. 在 Channel 設定中，找到 "Messaging API"
2. 點擊 "Issue" 取得 **Channel Access Token**
3. 啟用 "Use webhook"（用於接收訊息）

---

## 🚀 Vercel 部署步驟

### 步驟 1：準備 Git Repository
```bash
# 確認所有變更已提交
cd Beauty-booking
git add .
git commit -m "準備部署到 Vercel"
git push
```

### 步驟 2：在 Vercel 建立專案
1. 前往 [Vercel Dashboard](https://vercel.com/dashboard)
2. 點擊 "Add New Project"
3. 選擇您的 Git Repository（Beauty-workspace）
4. 設定專案：
   - **Framework Preset**: Other
   - **Root Directory**: `Beauty-booking`（重要！）
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### 步驟 3：設定環境變數
在 Vercel 專案設定中，新增以下環境變數：

#### Supabase 變數（從 .env 複製）
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### LINE 變數（新增）
```
# 前端使用（會暴露給瀏覽器）
EXPO_PUBLIC_LIFF_APP_ID=your_liff_app_id

# 伺服器端使用（不會暴露）
LINE_CHANNEL_ID=your_channel_id
LINE_CHANNEL_SECRET=your_channel_secret
LINE_ACCESS_TOKEN=your_access_token
```

**重要：**
- `EXPO_PUBLIC_` 前綴的變數會暴露給前端
- 不要將敏感資訊（如 Access Token）加上 `EXPO_PUBLIC_` 前綴
- 詳細說明請參考 `ENV_SETUP.md`

### 步驟 4：部署
1. 點擊 "Deploy"
2. 等待構建完成
3. 部署成功後，複製網址（例如：`https://beauty-booking.vercel.app`）

### 步驟 5：更新 LIFF Endpoint URL
1. 回到 LINE Developers Console
2. 更新 LIFF App 的 Endpoint URL 為您的 Vercel 網址
3. 儲存設定

---

## 🔧 本地測試

### 測試構建
```bash
cd Beauty-booking
npm run build
```

### 測試本地伺服器
```bash
npm run web
```

---

## 📱 LINE LIFF 整合

### 取得 LIFF URL
部署後，您的網頁可以透過以下方式在 LINE 中開啟：

1. **直接使用 LIFF URL**：
   ```
   https://liff.line.me/YOUR_LIFF_APP_ID
   ```
   將 `YOUR_LIFF_APP_ID` 替換為您的實際 LIFF App ID

2. **透過 LINE Bot**：
   - 在 LINE Bot 中加入 "Rich Menu" 或 "Message Template"
   - 設定按鈕連結到 LIFF URL
   - 用戶點擊後會在 LINE 內開啟預約頁面

3. **透過 QR Code**：
   - 在 LINE Developers Console 中，LIFF App 設定頁面可以產生 QR Code
   - 用戶掃描 QR Code 即可在 LINE 中開啟預約頁面

### 測試 LIFF
1. 在 LINE App 中開啟 LIFF URL
2. 確認頁面正常載入
3. 確認可以取得 LINE 用戶資訊（需要用戶授權）

---

## 🔔 推播功能說明

當客戶完成預約後，系統會自動發送 LINE 推播訊息通知客戶。

### 推播內容包含：
- 預約日期和時間
- 預約的服務項目
- 預約確認訊息

### 推播流程：
1. 客戶在 LINE 中開啟預約頁面（透過 LIFF）
2. 系統自動取得客戶的 LINE User ID
3. 客戶完成預約後，系統呼叫 `/api/send-line-notification` API
4. API 使用 LINE Messaging API 發送推播訊息給客戶

### 注意事項：
- 客戶必須在 LINE 環境中開啟頁面才能取得 User ID
- 如果客戶不在 LINE 環境中，推播功能會自動跳過（不影響預約）
- 確保 `LINE_ACCESS_TOKEN` 環境變數已正確設定

---

## ⚠️ 注意事項

1. **Root Directory 設定**：必須設定為 `Beauty-booking`，否則 Vercel 找不到專案
2. **環境變數**：確保所有環境變數都已正確設定
3. **LIFF URL**：部署後記得更新 LINE Developers Console 中的 LIFF Endpoint URL
4. **HTTPS**：Vercel 自動提供 HTTPS，符合 LINE LIFF 要求

---

## 🐛 常見問題

### 構建失敗
- 檢查 Root Directory 是否正確
- 確認 `package.json` 中的 build 腳本正確
- 查看 Vercel 構建日誌

### LINE LIFF 無法開啟
- 確認 LIFF Endpoint URL 已更新為 Vercel 網址
- 確認網址使用 HTTPS
- 檢查 LIFF App ID 是否正確

### 推播功能不工作
- 確認 LINE_ACCESS_TOKEN 環境變數已設定
- 檢查 API 路由是否正確部署
- 查看 Vercel Function 日誌

