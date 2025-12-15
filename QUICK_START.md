# 🚀 快速開始指南

## 5 分鐘快速部署到 Vercel

### 步驟 1：準備 LINE Channel（5 分鐘）
1. 前往 [LINE Developers Console](https://developers.line.biz/console/)
2. 建立 Provider 和 Channel
3. 建立 LIFF App，記下 **LIFF App ID**
4. 取得 **Channel Access Token**

### 步驟 2：在 Vercel 建立專案（2 分鐘）
1. 前往 [Vercel Dashboard](https://vercel.com/dashboard)
2. 點擊 "Add New Project"
3. 選擇您的 Git Repository
4. **重要設定**：
   - Root Directory: `Beauty-booking`
   - Build Command: `npm run build`
   - Output Directory: `dist`

### 步驟 3：設定環境變數（2 分鐘）
在 Vercel 專案設定中新增：

```
EXPO_PUBLIC_SUPABASE_URL=你的_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=你的_supabase_key
EXPO_PUBLIC_LIFF_APP_ID=你的_liff_app_id
LINE_ACCESS_TOKEN=你的_access_token
```

### 步驟 4：部署（1 分鐘）
1. 點擊 "Deploy"
2. 等待構建完成
3. 複製部署網址

### 步驟 5：更新 LIFF Endpoint（1 分鐘）
1. 回到 LINE Developers Console
2. 更新 LIFF App 的 Endpoint URL 為您的 Vercel 網址
3. 儲存

---

## ✅ 完成！

現在您可以：
- 透過 `https://liff.line.me/YOUR_LIFF_APP_ID` 在 LINE 中開啟預約頁面
- 客戶完成預約後會自動收到 LINE 推播通知

---

## 📚 詳細文件

- **完整部署指南**：查看 `VERCEL_DEPLOYMENT.md`
- **環境變數設定**：查看 `ENV_SETUP.md`
- **問題排除**：查看部署指南中的「常見問題」章節

---

## 🆘 需要幫助？

如果遇到問題：
1. 檢查 Vercel 構建日誌
2. 確認環境變數是否正確設定
3. 確認 Root Directory 是否設定為 `Beauty-booking`
4. 查看 `VERCEL_DEPLOYMENT.md` 中的常見問題






