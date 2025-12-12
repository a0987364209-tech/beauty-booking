# Vercel 部署設定指南

## 🎯 問題：找不到 Beauty-workspace 選項

### 原因
- `Beauty-workspace` 是 monorepo（包含多個專案）
- Vercel 顯示的是已經推送到 GitHub 的獨立 repository
- 您看到的是 `beauty-booking` 和 `Beauty-app` 這兩個獨立的 repository

---

## ✅ 解決方案：直接選擇 beauty-booking

### 方法 1：選擇 beauty-booking（推薦）

1. **在 Vercel 中選擇 `beauty-booking` repository**
   - 點擊 `beauty-booking` 旁邊的 "Import" 按鈕

2. **設定專案配置**：
   - **Framework Preset**: Other
   - **Root Directory**: 留空（因為 beauty-booking 本身就是根目錄）
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

3. **設定環境變數**（參考 `ENV_SETUP.md`）

4. **部署**

---

## 🔄 方法 2：使用 Beauty-workspace（如果需要 monorepo）

如果您想使用 `Beauty-workspace` 作為 repository：

### 步驟 1：將 Beauty-workspace 推送到 GitHub

```bash
# 在 Beauty-workspace 目錄下
cd C:\Users\user\Desktop\Beauty-workspace

# 檢查是否有 remote
git remote -v

# 如果沒有 remote，新增 GitHub repository
git remote add origin https://github.com/your-username/Beauty-workspace.git

# 推送所有變更
git add .
git commit -m "準備部署到 Vercel"
git push -u origin master
```

### 步驟 2：在 Vercel 中選擇 Beauty-workspace

1. 在 Vercel 中，如果沒有看到 `Beauty-workspace`，可以：
   - 點擊 "Import Git Repository"
   - 輸入 GitHub repository URL：`https://github.com/your-username/Beauty-workspace`

2. **設定專案配置**：
   - **Framework Preset**: Other
   - **Root Directory**: `Beauty-booking` ⚠️ **重要！**
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

---

## 📝 推薦做法

**建議使用方法 1**，因為：
- ✅ `beauty-booking` 已經是獨立的 repository
- ✅ 設定更簡單，不需要設定 Root Directory
- ✅ 部署更快，構建範圍更小
- ✅ 更容易管理環境變數和設定

---

## ⚠️ 注意事項

### 如果選擇 beauty-booking：
- Root Directory 留空
- 所有檔案都在根目錄

### 如果選擇 Beauty-workspace：
- **必須設定 Root Directory 為 `Beauty-booking`**
- 否則 Vercel 會找不到 `package.json`

---

## 🚀 快速開始

1. 在 Vercel 中點擊 `beauty-booking` 的 "Import"
2. 設定 Build Command: `npm run build`
3. 設定 Output Directory: `dist`
4. 新增環境變數（參考 `ENV_SETUP.md`）
5. 點擊 "Deploy"

完成！

