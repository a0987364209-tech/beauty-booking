import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Supabase 配置
// 請在專案根目錄創建 .env 文件並設置以下環境變數：
// EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
// EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// 檢查環境變數是否已設置
const isConfigured = 
  supabaseUrl && 
  supabaseUrl !== 'YOUR_SUPABASE_URL' && 
  supabaseUrl.startsWith('http') &&
  supabaseAnonKey && 
  supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY';

let supabaseClient: ReturnType<typeof createClient<Database>>;

if (!isConfigured) {
  const errorMessage = `
╔══════════════════════════════════════════════════════════════╗
║  ⚠️  Supabase 配置未完成                                      ║
╠══════════════════════════════════════════════════════════════╣
║  請按照以下步驟配置 Supabase：                                ║
║                                                              ║
║  1. 在專案根目錄創建 .env 文件                                ║
║  2. 添加以下內容：                                            ║
║                                                              ║
║     EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co║
║     EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here         ║
║                                                              ║
║  3. 從 Supabase Dashboard 取得這些值：                       ║
║     https://app.supabase.com/project/[your-project]/settings/api║
║                                                              ║
║  4. 重啟開發伺服器（停止後重新執行 npx expo start）           ║
╚══════════════════════════════════════════════════════════════╝
  `;
  
  console.error(errorMessage);
  
  // 在開發環境中，提供一個假的客戶端以避免應用崩潰
  // 但所有操作都會失敗並顯示錯誤訊息
  const dummyUrl = 'https://placeholder.supabase.co';
  const dummyKey = 'placeholder-key';
  
  supabaseClient = createClient<Database>(dummyUrl, dummyKey);
  
  // 包裝所有常用方法以顯示錯誤訊息
  const originalFrom = supabaseClient.from.bind(supabaseClient);
  supabaseClient.from = function(table: string) {
    console.error(`❌ Supabase 未配置：無法訪問 ${table} 表`);
    console.error('請先配置 .env 文件中的 Supabase 設定');
    return originalFrom(table);
  };
} else {
  supabaseClient = createClient<Database>(supabaseUrl!, supabaseAnonKey!);
}

export const supabase = supabaseClient;

// 上傳簽名圖片到 Supabase Storage
export async function uploadSignature(customerPhone: string, signatureDataUrl: string): Promise<string | null> {
  if (!isConfigured) {
    console.error('❌ Supabase 未配置：無法上傳簽名');
    return null;
  }

  try {
    // 將 base64 轉換為 blob
    const base64Data = signatureDataUrl.split(',')[1];
    const blob = await fetch(`data:image/png;base64,${base64Data}`).then(res => res.blob());
    
    // 生成文件名
    const fileName = `signatures/${customerPhone}/${Date.now()}.png`;
    
    // 上傳到 Supabase Storage
    const { data, error } = await supabase.storage
      .from('signatures')
      .upload(fileName, blob, {
        contentType: 'image/png',
        upsert: false,
      });

    if (error) {
      console.error('Error uploading signature:', error);
      return null;
    }

    // 獲取公開 URL
    const { data: urlData } = supabase.storage
      .from('signatures')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadSignature:', error);
    return null;
  }
}

