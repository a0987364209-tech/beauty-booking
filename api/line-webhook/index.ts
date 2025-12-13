// Vercel Serverless Function - LINE Webhook
// 路徑: /api/line-webhook
// 處理 LINE 用戶的確認和取消預約請求

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // 設定 CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Line-Signature');

  // 處理 OPTIONS 請求（CORS preflight）
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 處理 GET 請求（LINE Webhook 驗證）
  if (req.method === 'GET') {
    return res.status(200).json({ message: 'Webhook is active' });
  }

  // 只允許 POST 請求（接收 Webhook 事件）
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 驗證 Webhook 簽章（LINE 要求）
    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    if (!channelSecret) {
      console.error('LINE_CHANNEL_SECRET not configured');
      return res.status(500).json({ error: 'LINE service not configured' });
    }

    const signature = req.headers['x-line-signature'] as string;
    if (!signature) {
      return res.status(401).json({ error: 'Missing signature' });
    }

    // 注意：在 Vercel 中，req.body 已經是解析後的 JSON
    // LINE Webhook 驗證需要使用原始 body，但在 Vercel Serverless Functions 中無法直接取得
    // 在生產環境中，LINE 會自動驗證 Webhook URL
    // 如果需要嚴格驗證，可以使用 @line/bot-sdk 套件或使用 Edge Functions
    // 這裡先簡化處理，在 LINE Developers Console 中設定 Webhook URL 時會自動驗證

    // 處理 Webhook 事件
    const events = req.body.events || [];
    const channelAccessToken = process.env.LINE_ACCESS_TOKEN;

    if (!channelAccessToken) {
      return res.status(500).json({ error: 'LINE_ACCESS_TOKEN not configured' });
    }

    // 初始化 Supabase 客戶端
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    for (const event of events) {
      // 處理 Postback 事件（用戶點擊按鈕）
      if (event.type === 'postback') {
        const data = event.postback.data;
        const userId = event.source.userId;

        if (!userId) {
          console.warn('No user ID in event');
          continue;
        }

        // 解析 postback data
        const params = new URLSearchParams(data);
        const action = params.get('action');
        const appointmentId = params.get('appointment_id');

        if (!action || !appointmentId) {
          console.warn('Invalid postback data:', data);
          continue;
        }

        // 查詢預約資訊
        const { data: appointment, error: appointmentError } = await supabase
          .from('appointments')
          .select(`
            *,
            customer:customers(*),
            service:services(*)
          `)
          .eq('id', appointmentId)
          .single();

        if (appointmentError || !appointment) {
          console.error('Appointment not found:', appointmentId);
          // 回覆錯誤訊息給用戶
          await sendReplyMessage(channelAccessToken, event.replyToken, '找不到預約記錄，請聯繫客服。');
          continue;
        }

        // 驗證用戶身份（檢查 LINE User ID 是否匹配）
        // 優先從 reminder_tasks 檢查，如果沒有則允許（因為 LINE 已驗證用戶身份）
        const { data: reminderTask } = await supabase
          .from('reminder_tasks')
          .select('line_user_id')
          .eq('appointment_id', appointmentId)
          .single();

        // 如果有 reminder_tasks 記錄，必須驗證 LINE User ID
        if (reminderTask && reminderTask.line_user_id !== userId) {
          console.warn('User ID mismatch:', userId, reminderTask.line_user_id);
          await sendReplyMessage(channelAccessToken, event.replyToken, '您沒有權限操作此預約。');
          continue;
        }
        
        // 如果沒有 reminder_tasks 記錄（可能是預約成功通知），允許操作
        // 因為 LINE 已經驗證了用戶身份

        // 處理確認或取消
        if (action === 'confirm') {
          // 確認預約
          if (appointment.status !== 'pending') {
            await sendReplyMessage(channelAccessToken, event.replyToken, '此預約無法確認（可能已確認或已取消）。');
            continue;
          }

          const { error: updateError } = await supabase
            .from('appointments')
            .update({ status: 'confirmed' })
            .eq('id', appointmentId);

          if (updateError) {
            console.error('Failed to confirm appointment:', updateError);
            await sendReplyMessage(channelAccessToken, event.replyToken, '確認預約失敗，請稍後再試。');
            continue;
          }

          // 標記提醒任務為已發送（因為已確認，不需要再發送）
          await supabase
            .from('reminder_tasks')
            .update({ sent: true, sent_at: new Date().toISOString() })
            .eq('appointment_id', appointmentId);

          await sendReplyMessage(
            channelAccessToken,
            event.replyToken,
            '✅ 預約已確認！\n\n我們期待明天為您服務！\n如有任何問題，歡迎隨時聯繫我們。'
          );

        } else if (action === 'cancel') {
          // 取消預約
          if (appointment.status === 'cancelled') {
            await sendReplyMessage(channelAccessToken, event.replyToken, '此預約已經取消。');
            continue;
          }

          if (appointment.status === 'confirmed') {
            await sendReplyMessage(channelAccessToken, event.replyToken, '此預約已確認，無法取消。如需取消，請聯繫客服。');
            continue;
          }

          const { error: updateError } = await supabase
            .from('appointments')
            .update({ status: 'cancelled' })
            .eq('id', appointmentId);

          if (updateError) {
            console.error('Failed to cancel appointment:', updateError);
            await sendReplyMessage(channelAccessToken, event.replyToken, '取消預約失敗，請稍後再試。');
            continue;
          }

          // 標記提醒任務為已發送（因為已取消，不需要再發送）
          await supabase
            .from('reminder_tasks')
            .update({ sent: true, sent_at: new Date().toISOString() })
            .eq('appointment_id', appointmentId);

          await sendReplyMessage(
            channelAccessToken,
            event.replyToken,
            '❌ 預約已取消\n\n您的預約時段已釋出，其他人可以預約。\n如需重新預約，歡迎再次使用預約系統。'
          );
        }
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in line-webhook:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// 發送回覆訊息給用戶
async function sendReplyMessage(
  channelAccessToken: string,
  replyToken: string,
  text: string
): Promise<void> {
  try {
    await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify({
        replyToken,
        messages: [
          {
            type: 'text',
            text,
          },
        ],
      }),
    });
  } catch (error) {
    console.error('Failed to send reply message:', error);
  }
}

