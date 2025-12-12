// LINE LIFF SDK 整合
import liff from '@line/liff';

export interface LiffProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

class LineLiffService {
  private liffId: string;
  private initialized: boolean = false;

  constructor() {
    // 從環境變數取得 LIFF App ID
    // Expo 使用 EXPO_PUBLIC_ 前綴，Vercel 使用 NEXT_PUBLIC_ 前綴
    if (typeof window !== 'undefined') {
      // 在瀏覽器環境中，嘗試從多個來源取得
      const envLiffId = 
        (window as any).__ENV__?.EXPO_PUBLIC_LIFF_APP_ID ||
        (window as any).__ENV__?.NEXT_PUBLIC_LIFF_APP_ID ||
        process.env.EXPO_PUBLIC_LIFF_APP_ID ||
        process.env.NEXT_PUBLIC_LIFF_APP_ID ||
        '';
      
      this.liffId = envLiffId;
      
      // 如果沒有設定 LIFF ID，嘗試從 URL 參數取得
      if (!this.liffId) {
        const urlParams = new URLSearchParams(window.location.search);
        const liffIdFromUrl = urlParams.get('liffId');
        if (liffIdFromUrl) {
          this.liffId = liffIdFromUrl;
        }
      }
    } else {
      // 伺服器端環境
      this.liffId = process.env.EXPO_PUBLIC_LIFF_APP_ID || 
                   process.env.NEXT_PUBLIC_LIFF_APP_ID || '';
    }
  }

  /**
   * 初始化 LIFF
   */
  async init(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    if (!this.liffId) {
      console.warn('LIFF App ID not configured - LINE features will be disabled');
      return false;
    }

    try {
      await liff.init({ liffId: this.liffId });
      this.initialized = true;
      console.log('✅ LIFF initialized successfully');
      return true;
    } catch (error) {
      // LIFF 初始化失敗不應該阻止應用正常運行
      // 這通常發生在非 LINE 環境中（一般瀏覽器）
      console.warn('⚠️ LIFF initialization failed (this is normal in non-LINE browsers):', error);
      return false;
    }
  }

  /**
   * 檢查是否在 LINE 環境中
   */
  isInLine(): boolean {
    if (typeof window === 'undefined') return false;
    return liff.isInClient();
  }

  /**
   * 取得 LINE 用戶資料
   */
  async getProfile(): Promise<LiffProfile | null> {
    if (!this.initialized) {
      const initSuccess = await this.init();
      if (!initSuccess) return null;
    }

    try {
      // 檢查是否在 LINE 環境中
      if (!this.isInLine()) {
        // 不在 LINE 環境中，返回 null（不阻止正常使用）
        return null;
      }

      if (!liff.isLoggedIn()) {
        // 如果未登入，不強制登入，靜默返回 null
        // 這樣可以確保預約功能不依賴 LINE 登入
        return null;
      }

      const profile = await liff.getProfile();
      return {
        userId: profile.userId,
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl,
        statusMessage: profile.statusMessage,
      };
    } catch (error) {
      console.error('Error getting LINE profile:', error);
      // 發生錯誤時返回 null，不阻止正常使用
      return null;
    }
  }

  /**
   * 取得 LINE User ID
   */
  async getUserId(): Promise<string | null> {
    const profile = await this.getProfile();
    return profile?.userId || null;
  }

  /**
   * 關閉 LIFF 視窗（在 LINE 內使用）
   */
  closeWindow(): void {
    if (this.isInLine()) {
      liff.closeWindow();
    }
  }

  /**
   * 開啟外部瀏覽器
   */
  openWindow(url: string, external: boolean = true): void {
    if (this.isInLine()) {
      liff.openWindow({ url, external });
    } else {
      window.open(url, '_blank');
    }
  }

  /**
   * 發送推播通知
   */
  async sendNotification(
    userId: string,
    appointmentDate: string,
    appointmentTime: string,
    serviceName: string,
    customerName?: string
  ): Promise<boolean> {
    try {
      const response = await fetch('/api/send-line-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          appointmentDate,
          appointmentTime,
          serviceName,
          customerName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to send notification:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  }
}

// 建立單例
export const lineLiff = new LineLiffService();

// 在 Web 環境自動初始化（不阻塞應用載入）
if (typeof window !== 'undefined') {
  lineLiff.init().catch((error) => {
    // 靜默處理錯誤，不阻止應用正常運行
    console.warn('LINE LIFF auto-init failed (this is normal in non-LINE browsers):', error);
  });
}

