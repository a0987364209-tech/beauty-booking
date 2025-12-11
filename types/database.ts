// 資料庫類型定義
export interface Database {
  public: {
    Tables: {
      beauticians: {
        Row: {
          id: string;
          name: string;
          phone: string | null;
          email: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          phone?: string | null;
          email?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      customers: {
        Row: {
          phone: string;
          name: string;
          birthday: string | null;
          line_id: string | null;
          occupation: string | null;
          address: string | null;
          survey_data: any;
          points: number;
          is_profile_complete: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          phone: string;
          name: string;
          birthday?: string | null;
          line_id?: string | null;
          occupation?: string | null;
          address?: string | null;
          survey_data?: any;
          points?: number;
          is_profile_complete?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          phone?: string;
          name?: string;
          birthday?: string | null;
          line_id?: string | null;
          occupation?: string | null;
          address?: string | null;
          survey_data?: any;
          points?: number;
          is_profile_complete?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      services: {
        Row: {
          id: string;
          name: string;
          specification: string | null;
          price: number;
          cost: number | null;
          category: 'course' | 'product' | 'addon';
          duration_minutes: number | null;
          description: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          specification?: string | null;
          price: number;
          cost?: number | null;
          category: 'course' | 'product' | 'addon';
          duration_minutes?: number | null;
          description?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          specification?: string | null;
          price?: number;
          cost?: number | null;
          category?: 'course' | 'product' | 'addon';
          duration_minutes?: number | null;
          description?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      customer_courses: {
        Row: {
          id: string;
          customer_phone: string;
          service_id: string;
          total_sessions: number;
          remaining_sessions: number;
          last_purchased_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_phone: string;
          service_id: string;
          total_sessions?: number;
          remaining_sessions?: number;
          last_purchased_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_phone?: string;
          service_id?: string;
          total_sessions?: number;
          remaining_sessions?: number;
          last_purchased_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      appointments: {
        Row: {
          id: string;
          customer_phone: string;
          service_id: string;
          beautician_id: string | null;
          appointment_date: string;
          start_time: string;
          end_time: string;
          status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
          notes: string | null;
          notification_sent: boolean;
          reminder_sent: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_phone: string;
          service_id: string;
          beautician_id?: string | null;
          appointment_date: string;
          start_time: string;
          end_time: string;
          status?: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
          notes?: string | null;
          notification_sent?: boolean;
          reminder_sent?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_phone?: string;
          service_id?: string;
          beautician_id?: string | null;
          appointment_date?: string;
          start_time?: string;
          end_time?: string;
          status?: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
          notes?: string | null;
          notification_sent?: boolean;
          reminder_sent?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          customer_phone: string;
          beautician_id: string | null;
          appointment_id: string | null;
          total_amount: number;
          total_cost: number;
          net_profit: number;
          points_earned: number;
          payment_method: string;
          notes: string | null;
          transaction_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_phone: string;
          beautician_id?: string | null;
          appointment_id?: string | null;
          total_amount: number;
          total_cost?: number;
          net_profit?: number;
          points_earned?: number;
          payment_method?: string;
          notes?: string | null;
          transaction_date?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          customer_phone?: string;
          beautician_id?: string | null;
          appointment_id?: string | null;
          total_amount?: number;
          total_cost?: number;
          net_profit?: number;
          points_earned?: number;
          payment_method?: string;
          notes?: string | null;
          transaction_date?: string;
          created_at?: string;
        };
      };
      transaction_items: {
        Row: {
          id: string;
          transaction_id: string;
          service_id: string;
          item_type: 'purchase_product' | 'purchase_course' | 'consume_course' | 'addon';
          quantity: number;
          unit_price: number;
          discount_rate: number;
          subtotal: number;
          cost: number;
          customer_course_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          transaction_id: string;
          service_id: string;
          item_type: 'purchase_product' | 'purchase_course' | 'consume_course' | 'addon';
          quantity?: number;
          unit_price: number;
          discount_rate?: number;
          subtotal: number;
          cost?: number;
          customer_course_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          transaction_id?: string;
          service_id?: string;
          item_type?: 'purchase_product' | 'purchase_course' | 'consume_course' | 'addon';
          quantity?: number;
          unit_price?: number;
          discount_rate?: number;
          subtotal?: number;
          cost?: number;
          customer_course_id?: string | null;
          created_at?: string;
        };
      };
      customer_signatures: {
        Row: {
          id: string;
          customer_phone: string;
          transaction_id: string | null;
          signature_url: string;
          signed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_phone: string;
          transaction_id?: string | null;
          signature_url: string;
          signed_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          customer_phone?: string;
          transaction_id?: string | null;
          signature_url?: string;
          signed_at?: string;
          created_at?: string;
        };
      };
      skin_assessments: {
        Row: {
          id: string;
          customer_phone: string;
          transaction_id: string | null;
          beautician_id: string | null;
          assessment_date: string;
          pores_level: number | null;
          pores_notes: string | null;
          redness_level: number | null;
          redness_notes: string | null;
          spots_level: number | null;
          spots_notes: string | null;
          radiance_level: number | null;
          radiance_notes: string | null;
          hydration_level: number | null;
          hydration_notes: string | null;
          recommendations: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_phone: string;
          transaction_id?: string | null;
          beautician_id?: string | null;
          assessment_date?: string;
          pores_level?: number | null;
          pores_notes?: string | null;
          redness_level?: number | null;
          redness_notes?: string | null;
          spots_level?: number | null;
          spots_notes?: string | null;
          radiance_level?: number | null;
          radiance_notes?: string | null;
          hydration_level?: number | null;
          hydration_notes?: string | null;
          recommendations?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          customer_phone?: string;
          transaction_id?: string | null;
          beautician_id?: string | null;
          assessment_date?: string;
          pores_level?: number | null;
          pores_notes?: string | null;
          redness_level?: number | null;
          redness_notes?: string | null;
          spots_level?: number | null;
          spots_notes?: string | null;
          radiance_level?: number | null;
          radiance_notes?: string | null;
          hydration_level?: number | null;
          hydration_notes?: string | null;
          recommendations?: string | null;
          created_at?: string;
        };
      };
      service_records: {
        Row: {
          id: string;
          customer_phone: string;
          customer_course_id: string | null;
          transaction_id: string | null;
          appointment_id: string | null;
          beautician_id: string | null;
          service_name: string;
          notes: string | null;
          service_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_phone: string;
          customer_course_id?: string | null;
          transaction_id?: string | null;
          appointment_id?: string | null;
          beautician_id?: string | null;
          service_name: string;
          notes?: string | null;
          service_date?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          customer_phone?: string;
          customer_course_id?: string | null;
          transaction_id?: string | null;
          appointment_id?: string | null;
          beautician_id?: string | null;
          service_name?: string;
          notes?: string | null;
          service_date?: string;
          created_at?: string;
        };
      };
      inventory: {
        Row: {
          id: string;
          name: string;
          sku: string | null;
          specification: string | null;
          category: string | null;
          unit: string;
          quantity: number;
          low_stock_threshold: number;
          unit_cost: number | null;
          supplier: string | null;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          sku?: string | null;
          specification?: string | null;
          category?: string | null;
          unit?: string;
          quantity?: number;
          low_stock_threshold?: number;
          unit_cost?: number | null;
          supplier?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          sku?: string | null;
          specification?: string | null;
          category?: string | null;
          unit?: string;
          quantity?: number;
          low_stock_threshold?: number;
          unit_cost?: number | null;
          supplier?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      inventory_logs: {
        Row: {
          id: string;
          inventory_id: string;
          change_type: 'in' | 'out' | 'adjust';
          quantity_change: number;
          quantity_after: number;
          transaction_id: string | null;
          reason: string | null;
          beautician_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          inventory_id: string;
          change_type: 'in' | 'out' | 'adjust';
          quantity_change: number;
          quantity_after: number;
          transaction_id?: string | null;
          reason?: string | null;
          beautician_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          inventory_id?: string;
          change_type?: 'in' | 'out' | 'adjust';
          quantity_change?: number;
          quantity_after?: number;
          transaction_id?: string | null;
          reason?: string | null;
          beautician_id?: string | null;
          created_at?: string;
        };
      };
    };
  };
}

// 輔助類型
export type Beautician = Database['public']['Tables']['beauticians']['Row'];
export type Customer = Database['public']['Tables']['customers']['Row'];
export type Service = Database['public']['Tables']['services']['Row'];
export type CustomerCourse = Database['public']['Tables']['customer_courses']['Row'];
export type Appointment = Database['public']['Tables']['appointments']['Row'];
export type Transaction = Database['public']['Tables']['transactions']['Row'];
export type TransactionItem = Database['public']['Tables']['transaction_items']['Row'];
export type CustomerSignature = Database['public']['Tables']['customer_signatures']['Row'];
export type SkinAssessment = Database['public']['Tables']['skin_assessments']['Row'];
export type ServiceRecord = Database['public']['Tables']['service_records']['Row'];
export type Inventory = Database['public']['Tables']['inventory']['Row'];
export type InventoryLog = Database['public']['Tables']['inventory_logs']['Row'];

// 購物車項目類型
export interface CartItem {
  id: string;
  service: Service;
  itemType: 'purchase_course' | 'purchase_product' | 'consume_course' | 'addon';
  quantity: number;
  discountRate: number;
  subtotal: number;
  customerCourseId?: string;
}

// 折扣選項（最低8折）
export const DISCOUNT_OPTIONS = [
  { label: '無折扣', value: 1.0 },
  { label: '95折', value: 0.95 },
  { label: '9折', value: 0.9 },
  { label: '85折', value: 0.85 },
  { label: '8折', value: 0.8 },
];

// 預約狀態
export const APPOINTMENT_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
} as const;

// 庫存異動類型
export const INVENTORY_CHANGE_TYPE = {
  IN: 'in',
  OUT: 'out',
  ADJUST: 'adjust',
} as const;

