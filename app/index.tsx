// Web 版本：直接 import 並渲染預約頁面（給客人用）
import BookingScreen from './booking';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { lineLiff } from '@/lib/line-liff';

export default function Index() {
  useEffect(() => {
    console.log('✅ Index 頁面已載入，正在渲染 BookingScreen');
    
    // 初始化 LINE LIFF（僅在 Web 環境）
    if (Platform.OS === 'web') {
      lineLiff.init().then((success) => {
        if (success) {
          console.log('✅ LINE LIFF 初始化成功');
          // 檢查是否在 LINE 環境中
          if (lineLiff.isInLine()) {
            console.log('📱 在 LINE 環境中運行');
          }
        } else {
          console.log('ℹ️ LINE LIFF 未初始化（可能不在 LINE 環境中）');
        }
      });
    }
  }, []);
  
  return <BookingScreen />;
}

