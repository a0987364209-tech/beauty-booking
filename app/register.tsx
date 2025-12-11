import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

export default function RegisterScreen() {
  const { phone: initialPhone } = useLocalSearchParams<{ phone?: string }>();
  const [step, setStep] = useState<'phone' | 'form' | 'success'>('phone');
  const [isExisting, setIsExisting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedYear, setSelectedYear] = useState(1990);
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [selectedDay, setSelectedDay] = useState(1);
  const [errorMessage, setErrorMessage] = useState('');
  
  const [formData, setFormData] = useState({
    phone: initialPhone || '',
    name: '',
    birthday: '',
    line_id: '',
    occupation: '',
    address: '',
  });

  // 如果有初始手機號碼，自動檢查
  useEffect(() => {
    if (initialPhone && initialPhone !== formData.phone) {
      setFormData(prev => ({ ...prev, phone: initialPhone }));
    }
  }, [initialPhone]);
  
  // 當手機號碼更新且來自 URL 參數時，自動檢查
  useEffect(() => {
    if (initialPhone && formData.phone === initialPhone && step === 'phone') {
      checkPhone();
    }
  }, [formData.phone, initialPhone]);

  // 生成年份選項（1940-2010）
  const years = Array.from({ length: 71 }, (_, i) => 2010 - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };
  const days = Array.from({ length: getDaysInMonth(selectedYear, selectedMonth) }, (_, i) => i + 1);

  // 確認日期選擇
  const confirmDate = () => {
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    setFormData({ ...formData, birthday: dateStr });
    setShowDatePicker(false);
  };

  // 檢查手機號碼
  const checkPhone = async () => {
    if (!formData.phone || formData.phone.length < 10) {
      setErrorMessage('請輸入正確的手機號碼');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setIsExisting(false); // 重置狀態
    
    try {
      console.log('檢查手機號碼:', formData.phone);
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', formData.phone)
        .maybeSingle(); // 使用 maybeSingle 而不是 single，這樣找不到資料時不會報錯

      console.log('查詢結果:', { data, error });

      if (error) {
        console.error('查詢錯誤:', error);
        // 如果是 RLS 或其他錯誤，仍然允許進入表單
        setStep('form');
        return;
      }

      if (data) {
        // 已存在的會員
        console.log('找到現有會員:', (data as any).name);
        setFormData({
          ...formData,
          name: (data as any).name || '',
          birthday: (data as any).birthday || '',
          line_id: (data as any).line_id || '',
          occupation: (data as any).occupation || '',
          address: (data as any).address || '',
        });
        setIsExisting(true);
      } else {
        // 新會員
        console.log('新會員，準備註冊');
        setIsExisting(false);
      }
      
      setStep('form');
    } catch (error: any) {
      console.error('checkPhone 錯誤:', error);
      // 發生錯誤時，假設是新會員
      setIsExisting(false);
      setStep('form');
    } finally {
      setIsLoading(false);
    }
  };

  // 提交表單
  const handleSubmit = async () => {
    setErrorMessage('');
    
    if (!formData.name.trim()) {
      setErrorMessage('請輸入姓名');
      return;
    }
    
    if (!formData.birthday) {
      setErrorMessage('請選擇生日');
      return;
    }
    
    if (!formData.line_id.trim()) {
      setErrorMessage('請輸入 LINE ID');
      return;
    }

    setIsLoading(true);
    console.log('開始提交表單...', formData);
    
    try {
      if (isExisting) {
        // 更新現有會員
        console.log('更新現有會員...');
        const { data, error } = await supabase
          .from('customers')
          // @ts-ignore - Supabase type inference issue
          .update({
            name: formData.name,
            birthday: formData.birthday || null,
            line_id: formData.line_id || null,
            occupation: formData.occupation || null,
            address: formData.address || null,
          })
          .eq('phone', formData.phone)
          .select();

        console.log('Update result:', { data, error });
        
        if (error) {
          console.error('Update error:', error);
          throw new Error(`更新失敗: ${error.message}`);
        }
        setStep('success');
      } else {
        // 建立新會員
        console.log('建立新會員...', {
          phone: formData.phone,
          name: formData.name,
        });
        
        const { data, error } = await supabase
          .from('customers')
          // @ts-ignore - Supabase type inference issue
          .insert({
            phone: formData.phone,
            name: formData.name,
            birthday: formData.birthday || null,
            line_id: formData.line_id || null,
            occupation: formData.occupation || null,
            address: formData.address || null,
          })
          .select();

        console.log('Insert result:', { data, error });

        if (error) {
          console.error('Insert error:', error);
          // 提供更友善的錯誤訊息
          if (error.code === '23505') {
            throw new Error('此手機號碼已註冊，請使用其他號碼或返回重新輸入以更新資料');
          }
          throw new Error(`註冊失敗: ${error.message}`);
        }
        
        if (!data || data.length === 0) {
          throw new Error('註冊可能失敗，請稍後再試或聯繫客服');
        }
        
        console.log('Insert success:', data);
        setStep('success');
      }
    } catch (error: any) {
      console.error('Submit error:', error);
      setErrorMessage(error.message || '提交失敗，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Logo 區域 */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>涵光美學</Text>
          </View>
          <Text style={styles.subtitle}>
            {step === 'phone' ? '會員註冊 / 資料更新' : step === 'success' ? '🎉 完成！' : isExisting ? '歡迎回來！' : '填寫會員資料'}
          </Text>
        </View>

        {/* 錯誤訊息 */}
        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={20} color="#fff" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {step === 'success' ? (
          // 成功畫面
          <View style={styles.card}>
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={80} color={Colors.primary} />
              </View>
              <Text style={styles.successTitle}>
                {isExisting ? '資料更新成功！' : '註冊成功！'}
              </Text>
              <Text style={styles.successSubtitle}>
                歡迎成為涵光美學會員
              </Text>
              <Text style={styles.successPhone}>
                會員電話：{formData.phone}
              </Text>
            </View>
            
            <View style={styles.successButtons}>
              <TouchableOpacity
                style={styles.successButtonPrimary}
                onPress={() => router.push(`/booking?phone=${formData.phone}`)}
              >
                <Ionicons name="calendar" size={20} color="#fff" />
                <Text style={styles.successButtonPrimaryText}>立即預約</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.successButtonSecondary}
                onPress={() => {
                  setStep('phone');
                  setFormData({
                    phone: '',
                    name: '',
                    birthday: '',
                    line_id: '',
                    occupation: '',
                    address: '',
                  });
                  setIsExisting(false);
                }}
              >
                <Text style={styles.successButtonSecondaryText}>完成</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : step === 'phone' ? (
          // 步驟 1：輸入手機
          <View style={styles.card}>
            <Text style={styles.label}>請輸入手機號碼</Text>
            <TextInput
              style={styles.input}
              placeholder="0912345678"
              placeholderTextColor={Colors.textLight}
              keyboardType="phone-pad"
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              maxLength={10}
            />
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={checkPhone}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? '確認中...' : '下一步'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color={Colors.textOnPrimary} />
            </TouchableOpacity>
          </View>
        ) : (
          // 步驟 2：填寫資料
          <View style={styles.card}>
            {isExisting && (
              <View style={styles.welcomeBanner}>
                <Ionicons name="heart" size={24} color={Colors.primary} />
                <Text style={styles.welcomeText}>歡迎回來，{formData.name}！</Text>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.label}>姓名 *</Text>
              <TextInput
                style={styles.input}
                placeholder="請輸入姓名"
                placeholderTextColor={Colors.textLight}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>生日 *</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar" size={20} color={Colors.primary} />
                <Text style={[
                  styles.dateButtonText,
                  !formData.birthday && styles.dateButtonPlaceholder
                ]}>
                  {formData.birthday || '點擊選擇生日'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>LINE 帳號 ID *</Text>
              <TextInput
                style={styles.input}
                placeholder="請輸入 LINE ID"
                placeholderTextColor={Colors.textLight}
                value={formData.line_id}
                onChangeText={(text) => setFormData({ ...formData, line_id: text })}
              />
              <Text style={styles.fieldHint}>
                💡 LINE ID 可在 LINE App → 設定 → 個人檔案 中查看
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>職業</Text>
              <TextInput
                style={styles.input}
                placeholder="選填"
                placeholderTextColor={Colors.textLight}
                value={formData.occupation}
                onChangeText={(text) => setFormData({ ...formData, occupation: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>地址</Text>
              <TextInput
                style={styles.input}
                placeholder="選填"
                placeholderTextColor={Colors.textLight}
                value={formData.address}
                onChangeText={(text) => setFormData({ ...formData, address: text })}
                multiline
              />
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.rowButtonSecondary}
                onPress={() => setStep('phone')}
              >
                <Ionicons name="arrow-back" size={20} color={Colors.primary} />
                <Text style={styles.rowButtonSecondaryText}>返回</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.rowButtonPrimary, isLoading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                <Text style={styles.rowButtonPrimaryText}>
                  {isLoading ? '提交中...' : isExisting ? '更新資料' : '完成註冊'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 底部連結 */}
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => router.push('/booking')}
        >
          <Text style={styles.linkText}>已是會員？直接預約</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 生日日期選擇器 Modal */}
      <Modal visible={showDatePicker} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerContainer}>
            <Text style={styles.datePickerTitle}>選擇生日</Text>
            
            <View style={styles.datePickerRow}>
              {/* 年 */}
              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerLabel}>年</Text>
                <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                  {years.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.datePickerItem,
                        selectedYear === year && styles.datePickerItemSelected,
                      ]}
                      onPress={() => setSelectedYear(year)}
                    >
                      <Text style={[
                        styles.datePickerItemText,
                        selectedYear === year && styles.datePickerItemTextSelected,
                      ]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* 月 */}
              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerLabel}>月</Text>
                <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                  {months.map((month) => (
                    <TouchableOpacity
                      key={month}
                      style={[
                        styles.datePickerItem,
                        selectedMonth === month && styles.datePickerItemSelected,
                      ]}
                      onPress={() => setSelectedMonth(month)}
                    >
                      <Text style={[
                        styles.datePickerItemText,
                        selectedMonth === month && styles.datePickerItemTextSelected,
                      ]}>
                        {month}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* 日 */}
              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerLabel}>日</Text>
                <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                  {days.map((day) => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.datePickerItem,
                        selectedDay === day && styles.datePickerItemSelected,
                      ]}
                      onPress={() => setSelectedDay(day)}
                    >
                      <Text style={[
                        styles.datePickerItemText,
                        selectedDay === day && styles.datePickerItemTextSelected,
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.datePickerButtons}>
              <TouchableOpacity
                style={styles.datePickerCancelButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.datePickerCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.datePickerConfirmButton}
                onPress={confirmDate}
              >
                <Text style={styles.datePickerConfirmText}>確認</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  subtitle: {
    fontSize: 18,
    color: Colors.textSecondary,
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
  welcomeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    gap: 8,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primaryDark,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: Colors.text,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 10,
    marginTop: 8,
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
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  rowButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: Colors.card,
    gap: 6,
  },
  rowButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  rowButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    gap: 6,
  },
  rowButtonPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textOnPrimary,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc3545',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
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
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  successPhone: {
    fontSize: 14,
    color: Colors.textLight,
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  successButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  successButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    gap: 8,
  },
  successButtonPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textOnPrimary,
  },
  successButtonSecondary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  successButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 24,
  },
  linkText: {
    fontSize: 14,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    gap: 10,
  },
  dateButtonText: {
    fontSize: 16,
    color: Colors.text,
  },
  dateButtonPlaceholder: {
    color: Colors.textLight,
  },
  fieldHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContainer: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    width: '85%',
    maxWidth: 360,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  datePickerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  datePickerColumn: {
    flex: 1,
  },
  datePickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  datePickerScroll: {
    height: 200,
    backgroundColor: Colors.background,
    borderRadius: 10,
  },
  datePickerItem: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  datePickerItemSelected: {
    backgroundColor: Colors.primaryLight,
  },
  datePickerItemText: {
    fontSize: 16,
    color: Colors.text,
  },
  datePickerItemTextSelected: {
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  datePickerButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  datePickerCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  datePickerCancelText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  datePickerConfirmButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  datePickerConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textOnPrimary,
  },
});
