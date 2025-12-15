import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { lineLiff } from '@/lib/line-liff';
import { Appointment, Customer, Service } from '@/types/database';
import { Ionicons } from '@expo/vector-icons';
import { addDays, addMinutes, addMonths, format, getDaysInMonth, isAfter, isBefore, isSameDay, setHours, setMinutes, startOfMonth, endOfMonth } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const BUSINESS_START = 9; // 營業開始時間
const BUSINESS_END = 18; // 營業結束時間（18:00）
const BUFFER_MINUTES = 30; // 緩衝時間

export default function BookingScreen() {
  const { phone: initialPhone } = useLocalSearchParams<{ phone?: string }>();
  
  const [step, setStep] = useState<'phone' | 'service' | 'datetime' | 'confirm' | 'success'>('phone');
  const [phone, setPhone] = useState(initialPhone || '');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [courses, setCourses] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [existingAppointments, setExistingAppointments] = useState<Appointment[]>([]);
  const [customerAppointments, setCustomerAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lineUserId, setLineUserId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // 生成當前月份的所有日期
  const getDatesForMonth = (month: Date) => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const daysInMonth = getDaysInMonth(month);
    const today = new Date();
    const dates: Date[] = [];
    
    // 只包含今天及之後的日期
    for (let i = 0; i < daysInMonth; i++) {
      const date = addDays(start, i);
      if (isSameDay(date, today) || isAfter(date, today)) {
        dates.push(date);
      }
    }
    
    return dates;
  };

  const dates = getDatesForMonth(currentMonth);
  
  // 生成未來幾個月的月份列表（最多6個月）
  const availableMonths = Array.from({ length: 6 }, (_, i) => {
    const month = addMonths(new Date(), i);
    return {
      date: month,
      label: format(month, 'yyyy年M月', { locale: zhTW }),
    };
  });

  // 初始化 LINE LIFF（僅在 Web 環境，可選功能）
  // 即使初始化失敗，預約功能仍可正常使用
  useEffect(() => {
    if (Platform.OS === 'web') {
      lineLiff.init().then((success) => {
        if (success && lineLiff.isInLine()) {
          // 只在 LINE 環境中嘗試取得 User ID
          lineLiff.getUserId().then((userId) => {
            if (userId) {
              setLineUserId(userId);
              console.log('✅ LINE 通知功能已啟用');
            }
            // 如果沒有 User ID，不顯示警告（這是正常情況）
          }).catch(() => {
            // 取得 User ID 失敗，不影響應用運行
          });
        }
        // 如果不在 LINE 環境中，不顯示任何訊息（這是正常情況）
      }).catch(() => {
        // LIFF 初始化失敗，不影響應用運行
      });
    }
  }, []);

  // 載入課程
  useEffect(() => {
    const loadCourses = async () => {
      const { data } = await supabase
        .from('services')
        .select('*')
        .eq('category', 'course')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }); // 按 sort_order 排序
      
      if (data) {
        setCourses(data as any);
      }
    };
    loadCourses();
  }, []);

  // 如果有初始手機號碼，自動驗證
  useEffect(() => {
    if (initialPhone) {
      verifyPhone();
    }
  }, [initialPhone]);

  // 驗證手機號碼
  const verifyPhone = async () => {
    setErrorMessage('');
    
    if (!phone || phone.length < 10) {
      setErrorMessage('請輸入正確的手機號碼');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', phone)
        .maybeSingle();

      if (error) {
        console.error('驗證錯誤:', error);
        setErrorMessage('驗證失敗，請稍後再試');
        return;
      }

      if (!data) {
        setErrorMessage('此手機號碼尚未註冊，請先完成註冊');
        // 導向註冊頁面
        setTimeout(() => {
          router.push(`/register?phone=${phone}`);
        }, 2000);
        return;
      }

      setCustomer(data);
      
      // 載入該客戶的已有預約（只顯示未過期的）
      const today = format(new Date(), 'yyyy-MM-dd');
      const now = format(new Date(), 'HH:mm');
      const { data: allAppointments } = await supabase
        .from('appointments')
        .select('*, service:services(*)')
        .eq('customer_phone', phone)
        .in('status', ['pending', 'confirmed'])
        .gte('appointment_date', today)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true });
      
      // 過濾掉今天已過期的預約
      const appointmentsData = (allAppointments as any)?.filter((apt: any) => {
        if (apt.appointment_date === today) {
          return apt.start_time >= now;
        }
        return true;
      }) || [];
      
      setCustomerAppointments(appointmentsData || []);
      setStep('service');
    } catch (error) {
      console.error('驗證錯誤:', error);
      setErrorMessage('驗證失敗，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  // 載入已有預約（包含服務資訊以獲取工時）
  const loadAppointments = useCallback(async (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const { data } = await supabase
      .from('appointments')
      .select('*, service:services(*)')
      .eq('appointment_date', dateStr)
      .in('status', ['pending', 'confirmed', 'cancelled']);

    setExistingAppointments(data || []);
  }, []);

  // 計算可用時段
  useEffect(() => {
    if (!selectedService || !selectedDate) return;

    loadAppointments(selectedDate);
  }, [selectedDate, selectedService, loadAppointments]);

  // 生成可用時段
  useEffect(() => {
    if (!selectedService || !selectedDate) return;

    const serviceDuration = selectedService.duration_minutes || 60;
    const totalDuration = serviceDuration + BUFFER_MINUTES; // 工時 + 緩衝時間
    const slots: string[] = [];
    
    let currentTime = setMinutes(setHours(selectedDate, BUSINESS_START), 0);
    const endTime = setMinutes(setHours(selectedDate, BUSINESS_END), 0);
    const now = new Date();

    // 生成從9:00到18:00的時段，每30分鐘一個
    while (isBefore(currentTime, endTime)) {
      const timeStr = format(currentTime, 'HH:mm');
      const slotEnd = addMinutes(currentTime, totalDuration);

      // 檢查是否超過營業時間
      if (isAfter(slotEnd, endTime)) {
        break;
      }

      // 檢查是否為過去時間
      if (isSameDay(selectedDate, now) && isBefore(currentTime, now)) {
        currentTime = addMinutes(currentTime, 30);
        continue;
      }

      // 檢查是否與現有預約衝突
      // 需要考慮每個預約的工時+緩衝時間
      // 已取消的預約不佔用時段，可以重新預約
      const hasConflict = (existingAppointments as any).some((apt: any) => {
        // 已取消的預約不佔用時段
        if (apt.status === 'cancelled') {
          return false;
        }
        
        const aptService = apt.service as any;
        const aptServiceDuration = aptService?.duration_minutes || 60;
        const aptTotalDuration = aptServiceDuration + BUFFER_MINUTES;
        
        const aptStart = new Date(`${apt.appointment_date}T${apt.start_time}`);
        const aptEnd = addMinutes(aptStart, aptTotalDuration);
        
        // 檢查時間重疊：新預約的開始或結束時間在現有預約的時間範圍內，或反之
        return (
          (isAfter(currentTime, aptStart) && isBefore(currentTime, aptEnd)) ||
          (isAfter(slotEnd, aptStart) && isBefore(slotEnd, aptEnd)) ||
          (isBefore(currentTime, aptStart) && isAfter(slotEnd, aptEnd)) ||
          format(currentTime, 'HH:mm') === apt.start_time
        );
      });

      if (!hasConflict) {
        slots.push(timeStr);
      }

      currentTime = addMinutes(currentTime, 30);
      
      // 防止無限迴圈
      if (slots.length > 100) break;
    }

    setAvailableSlots(slots);
  }, [selectedDate, selectedService, existingAppointments]);

  // 提交預約
  const handleSubmit = async () => {
    if (!customer || !selectedService || !selectedTime) return;

    setIsLoading(true);
    setErrorMessage('');
    
    try {
      const serviceDuration = selectedService.duration_minutes || 60;
      const totalDuration = serviceDuration + BUFFER_MINUTES;
      const startTime = selectedTime;
      const [hours, minutes] = startTime.split(':').map(Number);
      const appointmentDateTime = setMinutes(setHours(selectedDate, hours), minutes);
      const endDateTime = addMinutes(appointmentDateTime, totalDuration);
      const endTime = format(endDateTime, 'HH:mm');

      const { data: appointmentData, error } = await supabase
        .from('appointments')
        .insert({
          customer_phone: (customer as any).phone,
          service_id: selectedService.id,
          appointment_date: format(selectedDate, 'yyyy-MM-dd'),
          start_time: startTime,
          end_time: endTime,
          status: 'pending',
        } as any)
        .select()
        .single();

      if (error) {
        console.error('預約錯誤:', error);
        throw error;
      }

      const appointmentId = appointmentData?.id;

      // 發送 LINE 推播通知（可選功能，不影響預約流程）
      if (Platform.OS === 'web' && lineUserId) {
        try {
          // 1. 發送立即通知
          await lineLiff.sendNotification(
            lineUserId,
            appointmentId,
            format(selectedDate, 'yyyy-MM-dd'),
            startTime,
            selectedService.name,
            customer?.name || undefined
          );

          // 2. 建立提醒任務（預約前一天中午 12:00 發送）
          if (appointmentId) {
            const reminderDate = addDays(selectedDate, -1); // 預約前一天
            const reminderDateStr = format(reminderDate, 'yyyy-MM-dd');
            const scheduledDateStr = format(selectedDate, 'yyyy-MM-dd');

            // 檢查提醒日期是否為過去（如果預約是今天或明天，提醒日期可能是今天或過去）
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const reminderDateObj = new Date(reminderDate);
            reminderDateObj.setHours(0, 0, 0, 0);

            // 只有當提醒日期是未來時才建立提醒任務
            if (reminderDateObj >= today) {
              const { error: reminderError } = await supabase
                .from('reminder_tasks')
                .insert({
                  appointment_id: appointmentId,
                  line_user_id: lineUserId,
                  scheduled_date: scheduledDateStr,
                  scheduled_time: startTime,
                  reminder_date: reminderDateStr,
                  reminder_time: '12:00:00',
                  service_name: selectedService.name,
                  customer_name: customer?.name || null,
                  message_content: `提醒：您明天 ${startTime} 有預約「${selectedService.name}」，請準時到達！`,
                  sent: false,
                } as any);

              if (reminderError) {
                console.warn('建立提醒任務失敗（預約仍成功）:', reminderError);
              }
            }
          }
        } catch (notificationError) {
          // 通知失敗不影響預約流程，只記錄錯誤
          console.warn('推播通知錯誤（預約仍成功）:', notificationError);
        }
      }

      // 預約成功，顯示成功畫面
      setStep('success');
    } catch (error) {
      console.error('預約失敗:', error);
      setErrorMessage('預約失敗，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'success':
        return (
          <View style={styles.card}>
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={80} color={Colors.success} />
              </View>
              <Text style={styles.successTitle}>預約成功！</Text>
              <Text style={styles.successSubtitle}>
                {customer?.name} 您好，我們會盡快確認您的預約
              </Text>
              
              <View style={styles.successDetails}>
                <View style={styles.successRow}>
                  <Ionicons name="calendar" size={20} color={Colors.primary} />
                  <Text style={styles.successText}>
                    {format(selectedDate, 'yyyy年M月d日 EEEE', { locale: zhTW })}
                  </Text>
                </View>
                <View style={styles.successRow}>
                  <Ionicons name="time" size={20} color={Colors.primary} />
                  <Text style={styles.successText}>{selectedTime}</Text>
                </View>
                <View style={styles.successRow}>
                  <Ionicons name="sparkles" size={20} color={Colors.primary} />
                  <Text style={styles.successText}>{selectedService?.name}</Text>
                </View>
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                setStep('phone');
                setPhone('');
                setCustomer(null);
                setSelectedService(null);
                setSelectedTime(null);
                setErrorMessage('');
              }}
            >
              <Text style={styles.buttonText}>繼續預約</Text>
            </TouchableOpacity>
          </View>
        );
        
      case 'phone':
        return (
          <View style={styles.card}>
            <Text style={styles.stepTitle}>請輸入手機號碼</Text>
            
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color="#fff" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}
            
            <TextInput
              style={styles.input}
              placeholder="0912345678"
              placeholderTextColor={Colors.textLight}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                setErrorMessage('');
              }}
              maxLength={10}
            />
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={verifyPhone}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? '驗證中...' : '下一步'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.push('/register')}
            >
              <Text style={styles.linkText}>還不是會員？立即註冊</Text>
            </TouchableOpacity>
          </View>
        );

      case 'service':
        return (
          <View style={styles.card}>
            <Text style={styles.stepTitle}>選擇課程</Text>
            <Text style={styles.customerInfo}>
              {customer?.name}，請選擇想預約的課程
            </Text>
            
            {/* 顯示已有預約 */}
            {customerAppointments.length > 0 && (
              <View style={styles.existingAppointments}>
                <Text style={styles.existingAppointmentsTitle}>您目前的預約：</Text>
                {(customerAppointments as any[]).map((apt: any, index: number) => {
                  const getStatusLabel = () => {
                    if (apt.status === 'confirmed') return '確認';
                    if (apt.status === 'cancelled') return '已取消';
                    return '待確認';
                  };
                  
                  const getStatusStyle = () => {
                    if (apt.status === 'confirmed') return { color: Colors.success };
                    if (apt.status === 'cancelled') return { color: Colors.textLight };
                    return { color: Colors.text };
                  };
                  
                  return (
                    <View key={index} style={styles.existingAppointmentItem}>
                      <Ionicons name="calendar" size={16} color={Colors.primary} />
                      <Text style={styles.existingAppointmentText}>
                        {format(new Date(apt.appointment_date), 'yyyy年M月d日', { locale: zhTW })} {apt.start_time}
                        {apt.service && ` - ${(apt.service as any).name}`}
                      </Text>
                      <Text style={[styles.statusLabel, getStatusStyle()]}>
                        {getStatusLabel()}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
            
            <View style={styles.serviceList}>
              {courses.map((course, index) => (
                <TouchableOpacity
                  key={`course-${index}`}
                  style={[
                    styles.serviceItem,
                    selectedService?.id === course.id && styles.serviceItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedService(course);
                  }}
                >
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>{course.name}</Text>
                  </View>
                  <View style={styles.priceContainer}>
                    <Text style={styles.servicePrice}>
                      NT${course.price.toLocaleString()}
                    </Text>
                  </View>
                  {selectedService?.id === course.id && (
                    <Ionicons 
                      name="checkmark-circle" 
                      size={24} 
                      color={Colors.primary}
                      style={styles.checkIcon}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* 下一步：前往選日期與時間 */}
            <TouchableOpacity
              style={[
                styles.button,
                (!selectedService || isLoading) && styles.buttonDisabled,
                { marginTop: 12 },
              ]}
              onPress={() => setStep('datetime')}
              disabled={!selectedService || isLoading}
            >
              <Text style={styles.buttonText}>
                {selectedService ? '下一步：選日期與時間' : '請先選擇課程'}
              </Text>
            </TouchableOpacity>
          </View>
        );

      case 'datetime':
        return (
          <View style={styles.card}>
            <Text style={styles.stepTitle}>選擇日期與時間</Text>
            
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color="#fff" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}
            
            {/* 日期選擇 - 使用 flexWrap 避免嵌套 ScrollView */}
            <Text style={styles.sectionLabel}>選擇日期</Text>
            <View style={styles.dateGrid}>
              {dates.map((date, index) => {
                const isSelected = isSameDay(date, selectedDate);
                const isToday = isSameDay(date, new Date());
                
                return (
                  <TouchableOpacity
                    key={`date-${index}`}
                    style={[
                      styles.dateItem,
                      isSelected && styles.dateItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedDate(date);
                      setSelectedTime(null);
                    }}
                  >
                    <Text style={[styles.dateWeekday, isSelected && styles.dateTextSelected]}>
                      {isToday ? '今天' : format(date, 'EEE', { locale: zhTW })}
                    </Text>
                    <Text style={[styles.dateDay, isSelected && styles.dateTextSelected]}>
                      {format(date, 'd')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 時段選擇 */}
            <Text style={styles.sectionLabel}>選擇時段</Text>
            {availableSlots.length > 0 ? (
              <View style={styles.timeGrid}>
                {availableSlots.map((time, index) => (
                  <TouchableOpacity
                    key={`time-${index}`}
                    style={[
                      styles.timeItem,
                      selectedTime === time && styles.timeItemSelected,
                    ]}
                    onPress={() => setSelectedTime(time)}
                  >
                    <Text style={[
                      styles.timeText,
                      selectedTime === time && styles.timeTextSelected,
                    ]}>
                      {time}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.noSlots}>
                <Ionicons name="calendar-outline" size={32} color={Colors.textLight} />
                <Text style={styles.noSlotsText}>此日期暫無可預約時段</Text>
              </View>
            )}

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setStep('service')}
              >
                <Text style={styles.backButtonText}>返回</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.flex1, !selectedTime && styles.buttonDisabled]}
                onPress={() => setStep('confirm')}
                disabled={!selectedTime}
              >
                <Text style={styles.buttonText}>確認預約</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'confirm':
        return (
          <View style={styles.card}>
            <Text style={styles.stepTitle}>確認預約資訊</Text>
            
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color="#fff" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}
            
            <View style={styles.confirmSection}>
              <View style={styles.confirmRow}>
                <Ionicons name="person" size={20} color={Colors.textSecondary} />
                <Text style={styles.confirmLabel}>預約人</Text>
                <Text style={styles.confirmValue}>{customer?.name}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Ionicons name="call" size={20} color={Colors.textSecondary} />
                <Text style={styles.confirmLabel}>手機</Text>
                <Text style={styles.confirmValue}>{customer?.phone}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Ionicons name="sparkles" size={20} color={Colors.textSecondary} />
                <Text style={styles.confirmLabel}>課程</Text>
                <Text style={styles.confirmValue}>{selectedService?.name}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Ionicons name="calendar" size={20} color={Colors.textSecondary} />
                <Text style={styles.confirmLabel}>日期</Text>
                <Text style={styles.confirmValue}>
                  {format(selectedDate, 'yyyy年M月d日 EEEE', { locale: zhTW })}
                </Text>
              </View>
              <View style={styles.confirmRow}>
                <Ionicons name="time" size={20} color={Colors.textSecondary} />
                <Text style={styles.confirmLabel}>時間</Text>
                <Text style={styles.confirmValue}>{selectedTime}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Ionicons name="cash" size={20} color={Colors.textSecondary} />
                <Text style={styles.confirmLabel}>費用</Text>
                <Text style={styles.confirmValue}>
                  NT${selectedService?.price.toLocaleString()}
                </Text>
              </View>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setStep('service')}
              >
                <Text style={styles.backButtonText}>返回</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.flex1, styles.confirmButton, isLoading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                <Ionicons name="checkmark-circle" size={20} color={Colors.textOnPrimary} />
                <Text style={styles.buttonText}>
                  {isLoading ? '預約中...' : '確認預約'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
    }
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>涵光美學</Text>
        </View>
        <Text style={styles.title}>線上預約</Text>
      </View>

      {/* 步驟指示 */}
      <View style={styles.steps}>
        {['驗證', '選課程', '選時間', '確認'].map((label, index) => {
          const stepIndex = ['phone', 'service', 'datetime', 'confirm'].indexOf(step);
          const isActive = index <= stepIndex;
          
          return (
            <View key={label} style={styles.stepItem}>
              <View style={[styles.stepDot, isActive && styles.stepDotActive]}>
                {index < stepIndex ? (
                  <Ionicons name="checkmark" size={12} color={Colors.textOnPrimary} />
                ) : (
                  <Text style={[styles.stepNumber, isActive && styles.stepNumberActive]}>
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>

      {renderStep()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  steps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepDotActive: {
    backgroundColor: Colors.primary,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textLight,
  },
  stepNumberActive: {
    color: Colors.textOnPrimary,
  },
  stepLabel: {
    fontSize: 11,
    color: Colors.textLight,
  },
  stepLabelActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 24,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  customerInfo: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 10,
    gap: 8,
  },
  buttonDisabled: {
    backgroundColor: Colors.textLight,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textOnPrimary,
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  linkText: {
    fontSize: 14,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  serviceList: {
    marginBottom: 16,
    gap: 8,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: Colors.background,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 60,
  },
  serviceItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  serviceInfo: {
    flex: 1,
    marginRight: 12,
    minWidth: 0, // 允許文字換行
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flexWrap: 'wrap',
  },
  serviceDuration: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  priceContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 80, // 確保價格區域有足夠空間
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'right',
  },
  originalPrice: {
    fontSize: 11,
    fontWeight: '400',
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
    marginBottom: 2,
    textAlign: 'right',
  },
  experiencePrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#dc3545', // 紅色
    textAlign: 'right',
    lineHeight: 22,
  },
  checkIcon: {
    marginLeft: 8,
  },
  checkButton: {
    marginLeft: 8,
    padding: 4,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 16,
    gap: 16,
  },
  monthButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.background,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    minWidth: 100,
    textAlign: 'center',
  },
  confirmSectionInline: {
    marginTop: 20,
    padding: 16,
    backgroundColor: Colors.background,
    borderRadius: 12,
    gap: 12,
  },
  confirmTitleInline: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmRowInline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  confirmLabelInline: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  confirmValueInline: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc3545',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  successDetails: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    gap: 12,
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  successText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
  },
  dateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  dateItem: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: Colors.background,
    minWidth: 55,
  },
  dateItemSelected: {
    backgroundColor: Colors.primary,
  },
  dateWeekday: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  dateDay: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  dateTextSelected: {
    color: Colors.textOnPrimary,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  timeItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timeItemSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  timeTextSelected: {
    color: Colors.textOnPrimary,
  },
  noSlots: {
    alignItems: 'center',
    padding: 32,
  },
  noSlotsText: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  flex1: {
    flex: 1,
  },
  confirmSection: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  confirmLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 12,
    width: 60,
  },
  confirmValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'right',
  },
  confirmButton: {
    backgroundColor: Colors.success,
  },
  existingAppointments: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  existingAppointmentsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primaryDark,
    marginBottom: 8,
  },
  existingAppointmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  existingAppointmentText: {
    fontSize: 13,
    color: Colors.text,
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
});
