# 環境變數設定指南

## 📝 環境變數清單

### Supabase 設定（必需）
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### LINE 設定（推播功能需要）
```env
# LIFF App ID（前端使用，會暴露給瀏覽器）
EXPO_PUBLIC_LIFF_APP_ID=your_liff_app_id

# LINE Channel 設定（僅伺服器端使用）
LINE_CHANNEL_ID=your_channel_id
LINE_CHANNEL_SECRET=your_channel_secret
LINE_ACCESS_TOKEN=your_channel_access_token
```

---

## 🔧 設定方式

### 本地開發（.env 檔案）
1. 在 `Beauty-booking` 目錄下建立 `.env` 檔案
2. 複製 `.env.example` 的內容
3. 填入您的實際值

### Vercel 部署
1. 前往 Vercel Dashboard → 您的專案 → Settings → Environment Variables
2. 新增所有環境變數
3. 注意：`EXPO_PUBLIC_` 前綴的變數會暴露給前端

---

## 🔑 如何取得 LINE 設定值

### 1. LINE Channel ID 和 Channel Secret
1. 前往 [LINE Developers Console](https://developers.line.biz/console/)
2. 選擇您的 Provider 和 Channel
3. 在 "Basic settings" 頁面找到：
   - **Channel ID**
   - **Channel secret**

### 2. LIFF App ID
1. 在 LINE Developers Console 中，進入您的 Channel
2. 點擊 "LIFF" 標籤
3. 建立或選擇您的 LIFF App
4. 複製 **LIFF App ID**

### 3. Channel Access Token
1. 在 Channel 設定中，找到 "Messaging API" 標籤
2. 在 "Channel access token" 區塊
3. 點擊 "Issue" 按鈕
4. 複製產生的 **Access token**

---

## ⚠️ 重要注意事項

1. **EXPO_PUBLIC_ 前綴**：
   - 這些變數會暴露給前端（瀏覽器）
   - 只放安全的公開資訊（如 LIFF App ID）
   - 不要放敏感資訊（如 Access Token）

2. **伺服器端變數**：
   - `LINE_ACCESS_TOKEN` 等敏感資訊不要加 `EXPO_PUBLIC_` 前綴
   - 這些變數只在 Vercel Serverless Functions 中使用

3. **安全性**：
   - 不要將 `.env` 檔案提交到 Git
   - 確保 `.gitignore` 包含 `.env`

---

## 🧪 測試環境變數

在程式碼中測試環境變數是否正確載入：

```typescript
// 在瀏覽器控制台執行
console.log('LIFF App ID:', process.env.EXPO_PUBLIC_LIFF_APP_ID);
```

或在 React 元件中：
```typescript
useEffect(() => {
  console.log('Environment:', {
    liffId: process.env.EXPO_PUBLIC_LIFF_APP_ID,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  });
}, []);
```



