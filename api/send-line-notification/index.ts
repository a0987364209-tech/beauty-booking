// Vercel Serverless Function - 發送 LINE 推播通知
// 路徑: /api/send-line-notification

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface NotificationRequest {
  userId: string; // LINE User ID
  appointmentId: string; // 預約 ID
  appointmentDate: string;
  appointmentTime: string;
  serviceName: string;
  customerName?: string;
  customerPhone?: string;
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
      appointmentId,
      appointmentDate,
      appointmentTime,
      serviceName,
      customerName,
      customerPhone,
    } = req.body as NotificationRequest;

    // 驗證必要參數
    if (!userId || !appointmentId || !appointmentDate || !appointmentTime || !serviceName) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        required: ['userId', 'appointmentId', 'appointmentDate', 'appointmentTime', 'serviceName']
      });
    }

    // 從環境變數取得 LINE Access Token
    const channelAccessToken = process.env.LINE_ACCESS_TOKEN;
    if (!channelAccessToken) {
      console.error('LINE_ACCESS_TOKEN not configured');
      return res.status(500).json({ error: 'LINE service not configured' });
    }

    // 店家通知接收者（可設單一或多個）
    // LINE_SHOP_USER_ID=Uxxx
    // LINE_SHOP_USER_IDS=Uxxx,Uyyy
    const shopUserIds = [
      process.env.LINE_SHOP_USER_ID,
      ...(process.env.LINE_SHOP_USER_IDS || '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    ].filter((id, idx, arr): id is string => Boolean(id) && arr.indexOf(id as string) === idx);

    // 格式化日期（轉換為中文格式）
    const dateObj = new Date(appointmentDate);
    const formattedDate = `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;

    // 客人通知訊息（含取消按鈕）
    const customerMessage = {
      type: 'template',
      altText: '預約成功通知',
      template: {
        type: 'buttons',
        text: `🎉 預約成功通知

${customerName || '親愛的客戶'}，您好！

您的預約已成功建立：

📅 日期：${formattedDate}
⏰ 時間：${appointmentTime}
💆 服務：${serviceName}

我們期待為您服務！`,
        actions: [
          {
            type: 'postback',
            label: '取消預約',
            data: `action=cancel&appointment_id=${appointmentId}`,
          },
        ],
      },
    };

    const pushToLine = async (to: string, messages: any[]) => {
      return fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${channelAccessToken}`,
        },
        body: JSON.stringify({
          to,
          messages,
        }),
      });
    };

    // 1) 發送給客人（此步驟失敗視為整體失敗）
    const customerResponse = await pushToLine(userId, [customerMessage]);
    if (!customerResponse.ok) {
      const errorText = await customerResponse.text();
      console.error('LINE customer push error:', errorText);
      return res.status(customerResponse.status).json({
        error: 'Failed to send customer LINE notification',
        details: errorText,
      });
    }

    // 2) 發送給店家（此步驟失敗不影響客人通知結果）
    const shopMessageText = `🔔 新預約通知

客人：${customerName || '未提供'}
手機：${customerPhone || '未提供'}
日期：${formattedDate}
時間：${appointmentTime}
服務：${serviceName}
預約ID：${appointmentId}`;

    const shopPushResults: Array<{ to: string; success: boolean; error?: string }> = [];
    for (const shopUserId of shopUserIds) {
      const shopResponse = await pushToLine(shopUserId, [
        {
          type: 'text',
          text: shopMessageText,
        },
      ]);

      if (!shopResponse.ok) {
        const errorText = await shopResponse.text();
        console.error(`LINE shop push error (${shopUserId}):`, errorText);
        shopPushResults.push({ to: shopUserId, success: false, error: errorText });
      } else {
        shopPushResults.push({ to: shopUserId, success: true });
      }
    }

    const result = await customerResponse.json();
    console.log('LINE customer notification sent successfully:', result);

    return res.status(200).json({
      success: true,
      message: 'Customer notification sent; shop notification attempted',
      shopResults: shopPushResults,
      shopTargets: shopUserIds.length,
    });
  } catch (error) {
    console.error('Error sending LINE notification:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}



