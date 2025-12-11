// Web 版本：直接 import 並渲染預約頁面（給客人用）
import BookingScreen from './booking';
import { useEffect } from 'react';

export default function Index() {
  useEffect(() => {
    console.log('✅ Index 頁面已載入，正在渲染 BookingScreen');
  }, []);
  
  return <BookingScreen />;
}

