import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const TZ = 'Asia/Taipei';

function formatDateTimeForICS(date: string, time: string) {
  const safeDate = (date || '').replace(/-/g, '');
  const safeTime = (time || '00:00:00').replace(/:/g, '').slice(0, 6).padEnd(6, '0');
  return `${safeDate}T${safeTime}`;
}

function formatUTCStamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function escapeICS(text: string) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function buildEventLine(key: string, value: string) {
  return `${key}:${value}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).send('Method Not Allowed');
  }

  const token = req.query.token?.toString() || '';
  const expectedToken = process.env.SHOP_CALENDAR_TOKEN;

  if (!expectedToken) {
    console.error('SHOP_CALENDAR_TOKEN not configured');
    return res.status(500).send('Calendar token not configured');
  }

  if (!token || token !== expectedToken) {
    return res.status(401).send('Unauthorized');
  }

  try {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).send('Supabase not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 只輸出店家需要關注的預約：今天起且未取消
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        start_time,
        end_time,
        status,
        notes,
        updated_at,
        customer:customers(name, phone),
        service:services(name)
      `)
      .gte('appointment_date', todayStr)
      .in('status', ['pending', 'confirmed'])
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Failed to query appointments for calendar:', error);
      return res.status(500).send('Failed to query appointments');
    }

    const nowStamp = formatUTCStamp();
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Beauty Booking//Shop Calendar//TW',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${escapeICS('涵光美學 預約行事曆')}`,
      `X-WR-TIMEZONE:${TZ}`,
    ];

    for (const apt of appointments || []) {
      const customer = Array.isArray((apt as any).customer) ? (apt as any).customer[0] : (apt as any).customer;
      const service = Array.isArray((apt as any).service) ? (apt as any).service[0] : (apt as any).service;

      const customerName = customer?.name || '未命名客人';
      const customerPhone = customer?.phone || '';
      const serviceName = service?.name || '未指定服務';
      const notes = apt.notes || '';

      const summary = `${customerName}｜${serviceName}`;
      const description = [
        `客人：${customerName}`,
        customerPhone ? `手機：${customerPhone}` : '',
        `服務：${serviceName}`,
        notes ? `備註：${notes}` : '',
        `狀態：${apt.status === 'confirmed' ? '已確認' : '待確認'}`,
        `預約ID：${apt.id}`,
      ].filter(Boolean).join('\n');

      const startDateTime = formatDateTimeForICS(apt.appointment_date, apt.start_time);
      const endDateTime = formatDateTimeForICS(apt.appointment_date, apt.end_time);
      const uid = `appointment-${apt.id}@beauty-booking`;
      const updatedStamp = apt.updated_at ? formatUTCStamp(new Date(apt.updated_at)) : nowStamp;

      lines.push('BEGIN:VEVENT');
      lines.push(buildEventLine('UID', uid));
      lines.push(buildEventLine('DTSTAMP', updatedStamp));
      lines.push(buildEventLine(`DTSTART;TZID=${TZ}`, startDateTime));
      lines.push(buildEventLine(`DTEND;TZID=${TZ}`, endDateTime));
      lines.push(buildEventLine('SUMMARY', escapeICS(summary)));
      lines.push(buildEventLine('DESCRIPTION', escapeICS(description)));
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');

    const ics = `${lines.join('\r\n')}\r\n`;

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="shop-calendar.ics"');
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).send(ics);
  } catch (e) {
    console.error('Unexpected error in shop-calendar.ics:', e);
    return res.status(500).send('Internal Server Error');
  }
}

