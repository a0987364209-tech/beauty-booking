// Vercel Serverless Function - 發送 LINE 推播通知
// 路徑: /api/send-line-notification

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface NotificationRequest {
  userId: string; // LINE User ID
  appointmentDate: string;
  appointmentTime: string;
  serviceName: string;
  customerName?: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // 設定 CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 處理 OPTIONS 請求（CORS preflight）
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 只允許 POST 請求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      userId,
      appointmentDate,
      appointmentTime,
      serviceName,
      customerName,
    } = req.body as NotificationRequest;

    // 驗證必要參數
    if (!userId || !appointmentDate || !appointmentTime || !serviceName) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        required: ['userId', 'appointmentDate', 'appointmentTime', 'serviceName']
      });
    }

    // 從環境變數取得 LINE Access Token
    const channelAccessToken = process.env.LINE_ACCESS_TOKEN;
    if (!channelAccessToken) {
      console.error('LINE_ACCESS_TOKEN not configured');
      return res.status(500).json({ error: 'LINE service not configured' });
    }

    // 格式化日期（轉換為中文格式）
    const dateObj = new Date(appointmentDate);
    const formattedDate = `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;

    // 建立推播訊息
    const message = {
      type: 'text',
      text: `🎉 預約成功通知

${customerName || '親愛的客戶'}，您好！

您的預約已成功建立：

📅 日期：${formattedDate}
⏰ 時間：${appointmentTime}
💆 服務：${serviceName}

我們期待為您服務！
如有任何問題，歡迎隨時聯繫我們。`,
    };

    // 發送推播訊息到 LINE
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [message],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LINE API Error:', errorText);
      return res.status(response.status).json({
        error: 'Failed to send LINE notification',
        details: errorText,
      });
    }

    const result = await response.json();
    console.log('LINE notification sent successfully:', result);

    return res.status(200).json({
      success: true,
      message: 'Notification sent successfully',
    });
  } catch (error) {
    console.error('Error sending LINE notification:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

