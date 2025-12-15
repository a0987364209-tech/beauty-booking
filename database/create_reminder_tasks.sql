-- 建立提醒任務表
-- 用於儲存預約前一天的提醒通知

CREATE TABLE IF NOT EXISTS reminder_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  line_user_id TEXT NOT NULL,
  scheduled_date DATE NOT NULL,  -- 預約日期
  scheduled_time TIME NOT NULL,   -- 預約時間
  reminder_date DATE NOT NULL,    -- 提醒日期（預約前一天）
  reminder_time TIME NOT NULL,    -- 提醒時間（12:00）
  service_name TEXT NOT NULL,
  customer_name TEXT,
  message_content TEXT,           -- 訊息內容
  sent BOOLEAN DEFAULT FALSE,     -- 是否已發送
  sent_at TIMESTAMP,              -- 發送時間
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 建立索引以加快查詢
CREATE INDEX IF NOT EXISTS idx_reminder_tasks_sent ON reminder_tasks(sent, reminder_date, reminder_time);
CREATE INDEX IF NOT EXISTS idx_reminder_tasks_appointment ON reminder_tasks(appointment_id);
CREATE INDEX IF NOT EXISTS idx_reminder_tasks_reminder_date ON reminder_tasks(reminder_date);

-- 建立更新時間的觸發器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reminder_tasks_updated_at 
  BEFORE UPDATE ON reminder_tasks 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();




