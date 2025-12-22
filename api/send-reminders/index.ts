// Vercel Serverless Function - 發送預約提醒通知
// 路徑: /api/send-reminders
// 此 API 由 GitHub Actions 定時呼叫（每天中午 12:00）

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // 設定 CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // 處理 OPTIONS 請求（CORS preflight）
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 驗證授權（防止未授權存取）
  const authHeader = req.headers.authorization;
  const expectedToken = process.env.REMINDER_API_SECRET;
  
  if (!expectedToken) {
    console.error('REMINDER_API_SECRET not configured');
    return res.status(500).json({ error: 'API secret not configured' });
  }

  if (authHeader !== `Bearer ${expectedToken}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 初始化 Supabase 客戶端
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 取得今天的日期（台灣時間 UTC+8）
    // GitHub Actions 在 UTC 04:00 執行（台灣時間 12:00），需要確保使用台灣時區計算日期
    const now = new Date();
    // 使用 toLocaleString 取得台灣時間的日期字串，然後轉換為 YYYY-MM-DD 格式
    const taiwanDateStr = now.toLocaleString('en-US', { 
      timeZone: 'Asia/Taipei', 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
    // 轉換格式：MM/DD/YYYY -> YYYY-MM-DD
    const [month, day, year] = taiwanDateStr.split('/');
    const todayStr = `${year}-${month}-${day}`;
    const reminderTime = '12:00:00';

    console.log('查詢提醒任務:', {
      todayStr,
      reminderTime,
      serverTime: now.toISOString(),
      taiwanDateStr
    });

    // 查詢今天需要發送的提醒（預約前一天，且尚未發送）
    const { data: reminders, error: queryError } = await supabase
      .from('reminder_tasks')
      .select('*')
      .eq('reminder_date', todayStr)
      .eq('reminder_time', reminderTime)
      .eq('sent', false);

    if (queryError) {
      console.error('Error querying reminders:', queryError);
      return res.status(500).json({ error: 'Failed to query reminders', details: queryError.message });
    }

    if (!reminders || reminders.length === 0) {
      console.log('沒有找到需要發送的提醒任務');
      return res.status(200).json({ 
        success: true, 
        message: 'No reminders to send',
        count: 0,
        queryDate: todayStr
      });
    }

    console.log(`找到 ${reminders.length} 個需要發送的提醒任務`);

    // 取得 LINE Access Token
    const channelAccessToken = process.env.LINE_ACCESS_TOKEN;
    if (!channelAccessToken) {
      return res.status(500).json({ error: 'LINE_ACCESS_TOKEN not configured' });
    }

    // 發送每個提醒
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const reminder of reminders) {
      try {
        // 檢查預約是否仍然有效（只發送給 pending 狀態的預約）
        const { data: appointment } = await supabase
          .from('appointments')
          .select('status')
          .eq('id', reminder.appointment_id)
          .single();

        // 如果預約已取消或已確認，標記提醒為已發送（跳過）
        if (!appointment || appointment.status !== 'pending') {
          await supabase
            .from('reminder_tasks')
            .update({ sent: true, sent_at: new Date().toISOString() })
            .eq('id', reminder.id);
          continue;
        }

        // 格式化日期（轉換為中文格式）
        const dateObj = new Date(reminder.scheduled_date);
        const formattedDate = `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;

        // 建立提醒訊息（使用 Buttons Template）
        const message = {
          type: 'template',
          altText: '預約提醒',
          template: {
            type: 'buttons',
            text: `🔔 預約提醒

提醒您：明天 ${reminder.scheduled_time} 有預約「${reminder.service_name}」

📅 日期：${formattedDate}
⏰ 時間：${reminder.scheduled_time}
💆 服務：${reminder.service_name}`,
            actions: [
              {
                type: 'postback',
                label: '確認預約',
                data: `action=confirm&appointment_id=${reminder.appointment_id}`,
              },
              {
                type: 'postback',
                label: '取消預約',
                data: `action=cancel&appointment_id=${reminder.appointment_id}`,
              },
            ],
          },
        };

        // 發送推播訊息到 LINE
        const response = await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${channelAccessToken}`,
          },
          body: JSON.stringify({
            to: reminder.line_user_id,
            messages: [message],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to send reminder ${reminder.id}:`, errorText);
          results.failed++;
          results.errors.push(`Reminder ${reminder.id}: ${errorText}`);
          continue;
        }

        // 標記為已發送
        await supabase
          .from('reminder_tasks')
          .update({ 
            sent: true, 
            sent_at: new Date().toISOString() 
          })
          .eq('id', reminder.id);

        results.success++;
      } catch (error: any) {
        console.error(`Error processing reminder ${reminder.id}:`, error);
        results.failed++;
        results.errors.push(`Reminder ${reminder.id}: ${error.message}`);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Processed ${reminders.length} reminders`,
      results: {
        total: reminders.length,
        success: results.success,
        failed: results.failed,
        errors: results.errors
      }
    });
  } catch (error) {
    console.error('Error in send-reminders:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

