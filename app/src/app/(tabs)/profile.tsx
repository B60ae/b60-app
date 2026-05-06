import React, { useState, useMemo } from 'react'
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert, TextInput, Switch, Linking,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronRight, ClipboardList, Star, Edit2, Check, X,
  Moon, LogOut, Info, Globe, Instagram, Shield,
} from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'

import { useAuthStore } from '../../stores/authStore'
import { useThemeStore } from '../../stores/themeStore'
import { useCartStore } from '../../stores/cartStore'
import { ordersApi, authApi, locationsApi } from '../../services/api'
import { LightTheme, DarkTheme, Spacing, Radius, Shadows, Colors } from '../../utils/theme'

const TIER_COLORS: Record<string, string> = {
  Bronze: '#CD7F32',
  Silver: '#A8A8A8',
  Gold: '#FFD700',
  Platinum: '#E5E4E2',
}

function getTier(points: number) {
  if (points >= 10000) return 'Platinum'
  if (points >= 5000) return 'Gold'
  if (points >= 1000) return 'Silver'
  return 'Bronze'
}

function Row({
  icon, label, onPress, danger = false, theme, right,
}: {
  icon: React.ReactNode
  label: string
  onPress?: () => void
  danger?: boolean
  theme: any
  right?: React.ReactNode
}) {
  return (
    <Pressable
      style={[styles.row, { borderBottomColor: theme.border }]}
      onPress={onPress}
      android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
    >
      <View style={[styles.rowIcon, { backgroundColor: danger ? 'rgba(220,38,38,0.1)' : 'rgba(240,90,26,0.1)' }]}>
        {icon}
      </View>
      <Text style={[styles.rowLabel, { color: danger ? theme.error : theme.text }]}>{label}</Text>
      {right ?? <ChevronRight size={16} color={theme.textMuted} />}
    </Pressable>
  )
}

function SectionLabel({ label, theme }: { label: string; theme: any }) {
  return (
    <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>{label}</Text>
  )
}

export default function MoreScreen() {
  const { user, logout, setUser } = useAuthStore()
  const { themeMode, setThemeMode } = useThemeStore()
  const theme = themeMode === 'light' ? LightTheme : DarkTheme
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const locationId = useCartStore((s) => s.locationId)

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: locationsApi.getAll,
    staleTime: 1000 * 60 * 10,
    enabled: isAuthenticated,
  })
  const selectedLocation = locations?.find((l: any) => l.id === locationId)

  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(user?.name ?? '')
  const [savingName, setSavingName] = useState(false)
  const [editingPhone, setEditingPhone] = useState(false)
  const [phoneInput, setPhoneInput] = useState(user?.phone ?? '')
  const [savingPhone, setSavingPhone] = useState(false)

  const { data: orders } = useQuery({
    queryKey: ['orders', 'history'],
    queryFn: ordersApi.getHistory,
    enabled: isAuthenticated,
  })

  const tier = getTier(user?.loyalty_points ?? 0)
  const tierColor = TIER_COLORS[tier]
  const totalSpent = useMemo(() => orders?.reduce((s, o) => s + Number(o.total || 0), 0) ?? 0, [orders])

  const handleSaveName = async () => {
    if (!nameInput.trim()) return
    setSavingName(true)
    try {
      const updated = await authApi.updateProfile({ name: nameInput.trim() })
      const currentToken = useAuthStore.getState().token ?? ''
      if (user) await setUser({ ...user, name: updated.name }, currentToken)
      setEditingName(false)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch {
      Alert.alert('Error', 'Could not update name.')
    } finally {
      setSavingName(false)
    }
  }

  const handleSavePhone = async () => {
    const cleaned = phoneInput.trim().replace(/\s/g, '')
    if (!cleaned) return
    setSavingPhone(true)
    try {
      const updated = await authApi.updateProfile({ phone: cleaned })
      const currentToken = useAuthStore.getState().token ?? ''
      if (user) await setUser({ ...user, phone: updated.phone }, currentToken)
      setEditingPhone(false)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch {
      Alert.alert('Error', 'Could not update phone.')
    } finally {
      setSavingPhone(false)
    }
  }

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    Alert.alert('Log Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ])
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── Header title ── */}
        <View style={[styles.pageHeader, { borderBottomColor: theme.border }]}>
          <Text style={[styles.pageTitle, { color: theme.text }]}>More</Text>
        </View>

        {/* ── User card ── */}
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.userCard}
        >
          <View style={styles.decorCircle} />

          {/* Avatar + name */}
          <View style={styles.avatarRow}>
            <View style={[styles.avatarRing, { borderColor: tierColor }]}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitial}>{user?.name?.charAt(0).toUpperCase() ?? 'B'}</Text>
              </View>
            </View>

            <View style={styles.userInfo}>
              {editingName ? (
                <View style={styles.editRow}>
                  <TextInput
                    value={nameInput}
                    onChangeText={setNameInput}
                    style={styles.nameInput}
                    autoFocus
                    editable={!savingName}
                    returnKeyType="done"
                    onSubmitEditing={handleSaveName}
                    placeholderTextColor="rgba(255,255,255,0.5)"
                  />
                  <Pressable onPress={handleSaveName} hitSlop={8} disabled={savingName}>
                    <Check size={20} color="#fff" />
                  </Pressable>
                  <Pressable onPress={() => setEditingName(false)} hitSlop={8}>
                    <X size={20} color="rgba(255,255,255,0.6)" />
                  </Pressable>
                </View>
              ) : (
                <Pressable style={styles.editRow} onPress={() => { setNameInput(user?.name ?? ''); setEditingName(true) }}>
                  <Text style={styles.userName}>{user?.name ?? 'B60 Fan'}</Text>
                  <Edit2 size={13} color="rgba(255,255,255,0.65)" />
                </Pressable>
              )}

              {editingPhone ? (
                <View style={[styles.editRow, { marginTop: 4 }]}>
                  <TextInput
                    value={phoneInput}
                    onChangeText={setPhoneInput}
                    style={[styles.nameInput, { fontSize: 13 }]}
                    autoFocus
                    editable={!savingPhone}
                    keyboardType="phone-pad"
                    returnKeyType="done"
                    onSubmitEditing={handleSavePhone}
                    placeholder="+971 50 000 0000"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                  />
                  <Pressable onPress={handleSavePhone} hitSlop={8} disabled={savingPhone}>
                    <Check size={18} color="#fff" />
                  </Pressable>
                  <Pressable onPress={() => setEditingPhone(false)} hitSlop={8}>
                    <X size={18} color="rgba(255,255,255,0.5)" />
                  </Pressable>
                </View>
              ) : (
                <Pressable style={styles.editRow} onPress={() => { setPhoneInput(user?.phone ?? ''); setEditingPhone(true) }}>
                  <Text style={styles.userSub}>{user?.phone ?? '+ Add phone number'}</Text>
                  <Edit2 size={11} color="rgba(255,255,255,0.5)" />
                </Pressable>
              )}

              <Text style={styles.userSub}>{user?.email}</Text>
            </View>
          </View>

          {/* Tier + stats row */}
          <View style={styles.cardBottom}>
            <View style={[styles.tierPill, { backgroundColor: tierColor }]}>
              <Star size={10} color="#000" fill="#000" />
              <Text style={styles.tierPillText}>{tier}</Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{orders?.length ?? 0}</Text>
                <Text style={styles.statLabel}>Orders</Text>
              </View>
              <View style={styles.statDot} />
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{(user?.loyalty_points ?? 0).toLocaleString()}</Text>
                <Text style={styles.statLabel}>Points</Text>
              </View>
              <View style={styles.statDot} />
              <View style={styles.statItem}>
                <Text style={styles.statNum}>AED {Math.round(totalSpent)}</Text>
                <Text style={styles.statLabel}>Spent</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* ── My Account ── */}
        <SectionLabel label="MY ACCOUNT" theme={theme} />
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Row
            icon={<ClipboardList size={18} color={Colors.primary} />}
            label="Order History"
            onPress={() => router.push('/orders')}
            theme={theme}
          />
          <Row
            icon={<Star size={18} color={Colors.primary} />}
            label="Loyalty & Rewards"
            onPress={() => router.push('/(tabs)/loyalty')}
            theme={theme}
          />
        </View>

        {/* ── Preferences ── */}
        <SectionLabel label="PREFERENCES" theme={theme} />
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Row
            icon={<Moon size={18} color={themeMode === 'dark' ? Colors.yellow : Colors.primary} />}
            label="Street Mode (Dark)"
            theme={theme}
            right={
              <Switch
                value={themeMode === 'dark'}
                onValueChange={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  setThemeMode(themeMode === 'light' ? 'dark' : 'light')
                }}
                trackColor={{ false: '#767577', true: Colors.primary }}
                thumbColor="#fff"
              />
            }
          />
        </View>

        {/* ── About & Support ── */}
        <SectionLabel label="ABOUT & SUPPORT" theme={theme} />
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Row
            icon={<Instagram size={18} color={Colors.primary} />}
            label="Follow us @b60_ae"
            onPress={() => Linking.openURL('https://instagram.com/b60_ae')}
            theme={theme}
          />
          <Row
            icon={<Globe size={18} color={Colors.primary} />}
            label="Visit b60.ae"
            onPress={() => Linking.openURL('https://b60.ae')}
            theme={theme}
          />
          <Row
            icon={<Info size={18} color={Colors.primary} />}
            label="About B60 Burgers"
            onPress={() => router.push('/about' as any)}
            theme={theme}
          />
          <Row
            icon={<Shield size={18} color={Colors.primary} />}
            label="Terms & Privacy"
            onPress={() => router.push('/legal' as any)}
            theme={theme}
          />
        </View>

        {/* ── Sign Out ── */}
        <SectionLabel label="" theme={theme} />
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Row
            icon={<LogOut size={18} color={theme.error} />}
            label="Log Out"
            onPress={handleLogout}
            danger
            theme={theme}
            right={<View />}
          />
        </View>

        <Pressable
          onPress={() => selectedLocation?.maps_url && Linking.openURL(selectedLocation.maps_url)}
          disabled={!selectedLocation?.maps_url}
        >
          <Text style={[styles.version, { color: theme.textMuted }]}>
            B60 Burgers{selectedLocation ? ` · ${selectedLocation.name}` : ' · Dubai & Sharjah'}
          </Text>
          <Text style={[styles.version, { color: theme.textMuted, marginTop: 2 }]}>v1.0.0</Text>
        </Pressable>

      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  pageHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  pageTitle: { fontSize: 28, fontWeight: '900' },

  userCard: {
    margin: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    overflow: 'hidden',
    ...Shadows.glowStrong,
  },
  decorCircle: {
    position: 'absolute', right: -40, top: -40,
    width: 160, height: 160, borderRadius: 80,
    borderWidth: 24, borderColor: 'rgba(255,255,255,0.08)',
  },

  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatarRing: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 2.5, padding: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarCircle: {
    width: 62, height: 62, borderRadius: 31,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 26, fontWeight: '900', color: '#fff' },
  userInfo: { flex: 1, gap: 2 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userName: { fontSize: 20, fontWeight: '900', color: '#fff', textTransform: 'uppercase' },
  userSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  nameInput: { flex: 1, fontSize: 18, fontWeight: '700', color: '#fff', paddingVertical: 2 },

  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tierPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: Radius.full,
  },
  tierPillText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', color: '#000' },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 14, fontWeight: '900', color: '#fff' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)' },
  statDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.5,
    marginHorizontal: Spacing.lg, marginTop: Spacing.md, marginBottom: 4,
  },
  section: {
    marginHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 14,
    gap: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '600' },

  version: { textAlign: 'center', fontSize: 11, marginTop: Spacing.lg },
})
