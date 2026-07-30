import React, { useState, useMemo } from 'react'
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert, TextInput, Linking,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronRight, ClipboardList, Star, Edit2, Check, X,
  LogOut, Info, Globe, Instagram, Shield,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'

import { useAuthStore } from '../../stores/authStore'
import { useCartStore } from '../../stores/cartStore'
import { ordersApi, authApi, locationsApi } from '../../services/api'
import { LightTheme, Spacing, Radius, Shadows, Colors } from '../../utils/theme'
import { getTier, TIER_COLORS } from '../../utils/tiers'

const T = LightTheme
const ORANGE = '#F05A1A'
const BLACK = '#000000'
const CREAM = '#FFF8F3'
const NAVY = '#1B2A4A'

function Row({
  icon, label, onPress, danger = false, right,
}: {
  icon: React.ReactNode
  label: string
  onPress?: () => void
  danger?: boolean
  right?: React.ReactNode
}) {
  return (
    <Pressable
      style={styles.row}
      onPress={onPress}
      android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
    >
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        {icon}
      </View>
      <Text style={[styles.rowLabel, danger && { color: '#EF4444' }]}>{label}</Text>
      {right ?? <ChevronRight size={16} color="#bbb" />}
    </Pressable>
  )
}

function SectionLabel({ label }: { label: string }) {
  return (
    <View style={styles.sectionLabelRow}>
      {label ? <View style={styles.sectionLabelAccent} /> : null}
      <Text style={styles.sectionLabel}>{label}</Text>
    </View>
  )
}

export default function MoreScreen() {
  const { user, logout, setUser } = useAuthStore()
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

  const tier = getTier(user?.loyalty_points ?? 0).name
  const tierStyle = TIER_COLORS[tier]
  const totalSpent = useMemo(() => orders?.reduce((s, o) => s + Number(o.total || 0), 0) ?? 0, [orders])

  const handleSaveName = async () => {
    if (!nameInput.trim()) return
    setSavingName(true)
    try {
      const updated = await authApi.updateProfile({ name: nameInput.trim() })
      const currentToken = useAuthStore.getState().token ?? ''
      if (user && updated) await setUser({ ...user, name: updated.name }, currentToken)
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
      if (user && updated) await setUser({ ...user, phone: updated.phone }, currentToken)
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* ── Page header ── */}
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>MORE</Text>
          </View>

          {/* ── User card (brutalist, cream context) ── */}
          <View style={styles.userCard}>
            {/* Tier color strip at top */}
            <View style={[styles.tierStrip, { backgroundColor: tierStyle.bg }]} />

            <View style={styles.avatarRow}>
              {/* Avatar: square with thick border, tier-color bg */}
              <View style={[styles.avatarBox, { backgroundColor: tierStyle.bg, borderColor: BLACK }]}>
                <Text style={[styles.avatarInitial, { color: tierStyle.text }]}>
                  {user?.name?.charAt(0).toUpperCase() ?? 'B'}
                </Text>
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
                      placeholderTextColor="#aaa"
                    />
                    <Pressable onPress={handleSaveName} hitSlop={8} disabled={savingName}>
                      <Check size={20} color={ORANGE} />
                    </Pressable>
                    <Pressable onPress={() => setEditingName(false)} hitSlop={8}>
                      <X size={20} color="#aaa" />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable style={styles.editRow} onPress={() => { setNameInput(user?.name ?? ''); setEditingName(true) }}>
                    <Text style={styles.userName}>{user?.name ?? 'B60 FAN'}</Text>
                    <Edit2 size={13} color="#aaa" />
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
                      placeholderTextColor="#aaa"
                    />
                    <Pressable onPress={handleSavePhone} hitSlop={8} disabled={savingPhone}>
                      <Check size={18} color={ORANGE} />
                    </Pressable>
                    <Pressable onPress={() => setEditingPhone(false)} hitSlop={8}>
                      <X size={18} color="#aaa" />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable style={styles.editRow} onPress={() => { setPhoneInput(user?.phone ?? ''); setEditingPhone(true) }}>
                    <Text style={styles.userSub}>{user?.phone ?? '+ Add phone number'}</Text>
                    <Edit2 size={11} color="#aaa" />
                  </Pressable>
                )}

                <Text style={styles.userEmail}>{user?.email}</Text>
              </View>
            </View>

            {/* Tier + stats */}
            <View style={styles.cardBottom}>
              <View style={[styles.tierBadge, { backgroundColor: tierStyle.bg, borderColor: BLACK }]}>
                <Star size={10} color={tierStyle.text} fill={tierStyle.text} />
                <Text style={[styles.tierBadgeText, { color: tierStyle.text }]}>{tier.toUpperCase()}</Text>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNum}>{orders?.length ?? 0}</Text>
                  <Text style={styles.statLabel}>ORDERS</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNum}>{(user?.loyalty_points ?? 0).toLocaleString()}</Text>
                  <Text style={styles.statLabel}>POINTS</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNum}>AED {Math.round(totalSpent)}</Text>
                  <Text style={styles.statLabel}>SPENT</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── My Account ── */}
          <SectionLabel label="MY ACCOUNT" />
          <View style={styles.section}>
            <Row
              icon={<ClipboardList size={18} color={ORANGE} />}
              label="Order History"
              onPress={() => router.push('/orders')}
            />
            <Row
              icon={<Star size={18} color={ORANGE} />}
              label="Loyalty & Rewards"
              onPress={() => router.push('/(tabs)/loyalty')}
            />
          </View>

          {/* ── About & Support ── */}
          <SectionLabel label="ABOUT & SUPPORT" />
          <View style={styles.section}>
            <Row
              icon={<Instagram size={18} color={ORANGE} />}
              label="Follow us @b60_ae"
              onPress={() => Linking.openURL('https://instagram.com/b60_ae')}
            />
            <Row
              icon={<Globe size={18} color={ORANGE} />}
              label="Visit b60.ae"
              onPress={() => Linking.openURL('https://b60.ae')}
            />
            <Row
              icon={<Info size={18} color={ORANGE} />}
              label="About B60 Burgers"
              onPress={() => router.push('/about' as any)}
            />
            <Row
              icon={<Shield size={18} color={ORANGE} />}
              label="Terms & Privacy"
              onPress={() => router.push('/legal' as any)}
            />
          </View>

          {/* ── Sign Out ── */}
          <View style={[styles.section, { marginTop: Spacing.md }]}>
            <Row
              icon={<LogOut size={18} color="#EF4444" />}
              label="Log Out"
              onPress={handleLogout}
              danger
              right={<View />}
            />
          </View>

          <Pressable
            onPress={() => selectedLocation?.maps_url && Linking.openURL(selectedLocation.maps_url)}
            disabled={!selectedLocation?.maps_url}
          >
            <Text style={styles.version}>
              B60 BURGERS{selectedLocation ? ` · ${selectedLocation.name.toUpperCase()}` : ' · DUBAI & SHARJAH'}
            </Text>
            <Text style={[styles.version, { marginTop: 2 }]}>v1.0.0</Text>
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CREAM },

  pageHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: BLACK,
    backgroundColor: CREAM,
  },
  pageTitle: { fontSize: 26, fontWeight: '900', color: NAVY, letterSpacing: 1 },

  // User card
  userCard: {
    margin: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 2.5,
    borderColor: BLACK,
    backgroundColor: '#fff',
    overflow: 'hidden',
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadows.hard,
  },
  tierStrip: { position: 'absolute', top: 0, left: 0, right: 0, height: 6 },

  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingTop: 4 },
  avatarBox: {
    width: 72, height: 72, borderRadius: 12,
    borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
    ...Shadows.hardSm,
  },
  avatarInitial: { fontSize: 28, fontWeight: '900' },
  userInfo: { flex: 1, gap: 2 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userName: { fontSize: 20, fontWeight: '900', color: NAVY, textTransform: 'uppercase', letterSpacing: -0.5 },
  userSub: { fontSize: 13, color: '#888' },
  userEmail: { fontSize: 12, color: '#aaa' },
  nameInput: { flex: 1, fontSize: 18, fontWeight: '700', color: NAVY, paddingVertical: 2, borderBottomWidth: 1.5, borderBottomColor: ORANGE },

  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tierBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 6, borderWidth: 2.5,
    ...Shadows.hardSm,
  },
  tierBadgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 13, fontWeight: '900', color: NAVY },
  statLabel: { fontSize: 9, color: '#aaa', fontWeight: '700', letterSpacing: 0.5 },
  statDivider: { width: 1.5, height: 24, backgroundColor: '#eee' },

  // Section label
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.lg, marginTop: Spacing.md, marginBottom: 4 },
  sectionLabelAccent: { width: 3, height: 14, backgroundColor: ORANGE, borderRadius: 2, marginRight: 6 },
  sectionLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 2, color: NAVY },

  // Section
  section: {
    marginHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 2.5,
    borderColor: BLACK,
    backgroundColor: '#fff',
    overflow: 'hidden',
    ...Shadows.hardSm,
  },

  // Row
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 14,
    gap: Spacing.sm,
    borderBottomWidth: 1.5,
    borderBottomColor: '#eee',
  },
  rowIcon: {
    width: 36, height: 36, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(240,90,26,0.08)',
    borderWidth: 1.5, borderColor: '#eee',
  },
  rowIconDanger: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderColor: 'rgba(239,68,68,0.2)',
  },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: NAVY },

  version: { textAlign: 'center', fontSize: 11, marginTop: Spacing.lg, color: '#aaa', letterSpacing: 0.5 },
})
