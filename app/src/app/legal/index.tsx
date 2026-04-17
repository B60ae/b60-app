import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { ArrowLeft } from 'lucide-react-native'
import { useThemeStore } from '../../stores/themeStore'
import { LightTheme, DarkTheme, Spacing, Radius, Colors } from '../../utils/theme'

type Tab = 'terms' | 'privacy'

const TERMS = `TERMS & CONDITIONS

Last updated: April 2026

1. ACCEPTANCE
By using the B60 Burgers app, you agree to these terms. If you don't agree, don't use the app.

2. ORDERS
All orders placed through the app are subject to availability and confirmation. Prices are in AED and include VAT where applicable. Once an order is confirmed, it cannot be cancelled.

3. PICKUP ONLY
B60 is a pickup-only service. Orders must be collected from the selected branch within a reasonable time. Uncollected orders are not refunded.

4. LOYALTY POINTS
Points are awarded on completed orders (1 AED = 1 point). Points have no cash value and cannot be transferred. B60 reserves the right to modify or cancel the loyalty programme at any time.

5. ACCOUNT
You are responsible for keeping your login details secure. One account per person. B60 reserves the right to suspend accounts that abuse the system.

6. PROHIBITED USE
You may not use the app to place fraudulent orders, manipulate pricing, or exploit loyalty rewards dishonestly.

7. LIMITATION OF LIABILITY
B60 is not liable for indirect damages, loss of data, or service interruptions. Our liability is limited to the value of your order.

8. CHANGES
We may update these terms at any time. Continued use of the app constitutes acceptance of the updated terms.

9. GOVERNING LAW
These terms are governed by the laws of the United Arab Emirates.

CONTACT
For queries: info@b60.ae`

const PRIVACY = `PRIVACY POLICY

Last updated: April 2026

1. WHAT WE COLLECT
- Name and email address (for your account)
- Phone number (optional, for order updates)
- Order history and loyalty points
- App usage data (anonymous)

2. HOW WE USE IT
- To process your orders and send confirmations
- To manage your loyalty rewards
- To improve the app experience
- We do NOT sell your data to third parties

3. DATA STORAGE
Your data is stored securely on Supabase (EU region). We use industry-standard encryption for all sensitive data.

4. AUTHENTICATION
We use email OTP (one-time passwords) for login — no passwords are stored. OTPs expire in 5 minutes.

5. YOUR RIGHTS
You can request deletion of your account and all associated data by emailing info@b60.ae. We will process requests within 30 days.

6. COOKIES & TRACKING
The app does not use browser cookies. We collect anonymous crash and performance data to improve stability.

7. CHILDREN
The app is not directed at children under 13. We do not knowingly collect data from children.

8. CHANGES
We may update this policy. We will notify you of significant changes through the app.

CONTACT
Data queries: info@b60.ae`

export default function LegalScreen() {
  const themeMode = useThemeStore((s) => s.themeMode)
  const T = themeMode === 'light' ? LightTheme : DarkTheme
  const [tab, setTab] = useState<Tab>('terms')

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: T.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: T.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <ArrowLeft size={22} color={T.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: T.text }]}>LEGAL</Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={[styles.tabs, { backgroundColor: T.surface, borderColor: T.border }]}>
        {(['terms', 'privacy'] as Tab[]).map((t) => (
          <Pressable
            key={t}
            style={[styles.tab, tab === t && { backgroundColor: Colors.primary }]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabLabel, { color: tab === t ? '#fff' : T.textMuted }]}>
              {t === 'terms' ? 'TERMS' : 'PRIVACY'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.body, { color: T.text }]}>
          {tab === 'terms' ? TERMS : PRIVACY}
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1,
  },
  backBtn: { width: 34, alignItems: 'flex-start' },
  headerTitle: { fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  tabs: {
    flexDirection: 'row', margin: Spacing.md,
    borderRadius: Radius.md, borderWidth: 1, padding: 4, gap: 4,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: Radius.sm - 2, alignItems: 'center' },
  tabLabel: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  content: { padding: Spacing.lg, paddingBottom: 48 },
  body: { fontSize: 13, lineHeight: 22 },
})
