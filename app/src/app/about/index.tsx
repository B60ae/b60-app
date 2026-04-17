import React from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { ArrowLeft, MapPin, Instagram, Globe, Clock, Flame, Star, Zap } from 'lucide-react-native'
import { useThemeStore } from '../../stores/themeStore'
import { LightTheme, DarkTheme, Spacing, Radius, Colors, Shadows } from '../../utils/theme'

const STATS = [
  { value: '4', label: 'Branches' },
  { value: '2024', label: 'Founded' },
  { value: '100%', label: 'Halal' },
  { value: '24/7', label: 'Cravings' },
]

const VALUES = [
  {
    icon: Flame,
    title: 'SMASH BURGERS ONLY',
    body: 'We do one thing. We do it at 400°C on a flat top. The smash technique creates a crust you can\'t fake — caramelised, charred, locked-in flavour.',
  },
  {
    icon: Star,
    title: 'QUALITY OVER EVERYTHING',
    body: 'Fresh never frozen beef. Real cheese. Brioche buns baked daily. No shortcuts, no frozen patties, no compromises.',
  },
  {
    icon: Zap,
    title: 'STREET SPEED',
    body: 'Order in seconds, pick up in minutes. We built B60 for the city — fast, affordable, and always on point.',
  },
]

const LOCATIONS = [
  { name: 'OUD METHA', city: 'Dubai', note: 'The OG — since Sept 2024', maps: 'https://maps.google.com/?q=B60+Burgers+Oud+Metha+Dubai' },
  { name: 'AL GHURAIR', city: 'Dubai', note: 'Flayva Food Hall', maps: 'https://maps.google.com/?q=B60+Burgers+Flayva+Al+Ghurair+Centre+Dubai' },
  { name: 'MUWAILEH', city: 'Sharjah', note: 'Coming through', maps: 'https://maps.google.com/?q=B60+Burgers+Muwaileh+Sharjah' },
  { name: 'AL WARQA', city: 'Dubai', note: 'East side', maps: 'https://maps.google.com/?q=B60+Burgers+Al+Warqa+Dubai' },
]

export default function AboutScreen() {
  const themeMode = useThemeStore((s) => s.themeMode)
  const T = themeMode === 'light' ? LightTheme : DarkTheme

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: T.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: T.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <ArrowLeft size={22} color={T.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: T.text }]}>ABOUT</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

        {/* Hero */}
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroDecor} />
          <View style={styles.heroDecor2} />
          <Text style={styles.heroEyebrow}>EST. SEPT 13, 2024 · OUD METHA, DUBAI</Text>
          <Text style={styles.heroTitle}>WE DON'T{'\n'}FLIP.{'\n'}WE SMASH.</Text>
          <Text style={styles.heroSub}>
            B60 started with one flat top, one mission — make the best smash burger in the UAE. No gimmicks. Just fire, beef, and obsession.
          </Text>
        </LinearGradient>

        {/* Stats strip */}
        <View style={[styles.statsRow, { backgroundColor: T.surface, borderColor: T.border }]}>
          {STATS.map((s, i) => (
            <React.Fragment key={s.label}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: Colors.primary }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: T.textMuted }]}>{s.label}</Text>
              </View>
              {i < STATS.length - 1 && <View style={[styles.statDivider, { backgroundColor: T.border }]} />}
            </React.Fragment>
          ))}
        </View>

        {/* Our Story */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: T.textMuted }]}>OUR STORY</Text>
          <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
            <Text style={[styles.storyText, { color: T.text }]}>
              B60 was born on{' '}
              <Text style={{ color: Colors.primary, fontWeight: '900' }}>September 13, 2024</Text>
              {' '}in Oud Metha, Dubai. Two guys, one idea: Dubai deserves a proper smash burger. Not a franchise import. Not a cloud kitchen. A real place, with real craft.
            </Text>
            <Text style={[styles.storyText, { color: T.text, marginTop: 12 }]}>
              The name? B60 is the temperature we work at — celsius. No, we're joking. But we do work at temperatures that make the beef sing. 60 seconds on the press. That's the magic.
            </Text>
            <Text style={[styles.storyText, { color: T.text, marginTop: 12 }]}>
              Less than a year later, we're in 4 locations across Dubai and Sharjah. The mission hasn't changed — just the number of flat tops.
            </Text>
          </View>
        </View>

        {/* What We Stand For */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: T.textMuted }]}>WHAT WE STAND FOR</Text>
          {VALUES.map((v) => {
            const Icon = v.icon
            return (
              <View key={v.title} style={[styles.valueCard, { backgroundColor: T.surface, borderColor: T.border }]}>
                <View style={[styles.valueIcon, { backgroundColor: Colors.primary + '18' }]}>
                  <Icon size={22} color={Colors.primary} />
                </View>
                <View style={styles.valueCopy}>
                  <Text style={[styles.valueTitle, { color: T.text }]}>{v.title}</Text>
                  <Text style={[styles.valueBody, { color: T.textMuted }]}>{v.body}</Text>
                </View>
              </View>
            )
          })}
        </View>

        {/* Locations */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: T.textMuted }]}>FIND US</Text>
          <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border, padding: 0, overflow: 'hidden' }]}>
            {LOCATIONS.map((loc, i) => (
              <Pressable
                key={loc.name}
                style={[styles.locRow, { borderBottomColor: T.border, borderBottomWidth: i < LOCATIONS.length - 1 ? StyleSheet.hairlineWidth : 0 }]}
                onPress={() => Linking.openURL(loc.maps)}
              >
                <View style={[styles.locIcon, { backgroundColor: Colors.primary + '15' }]}>
                  <MapPin size={16} color={Colors.primary} />
                </View>
                <View style={styles.locInfo}>
                  <Text style={[styles.locName, { color: T.text }]}>{loc.name}</Text>
                  <Text style={[styles.locSub, { color: T.textMuted }]}>{loc.city} · {loc.note}</Text>
                </View>
                <Text style={[styles.locLink, { color: Colors.primary }]}>MAP</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Hours */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: T.textMuted }]}>HOURS</Text>
          <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
            <View style={styles.hoursRow}>
              <Clock size={16} color={Colors.primary} />
              <View style={styles.hoursCopy}>
                <Text style={[styles.hoursDay, { color: T.text }]}>Sunday – Thursday</Text>
                <Text style={[styles.hoursTime, { color: T.textMuted }]}>12:00 PM – 11:00 PM</Text>
              </View>
            </View>
            <View style={[styles.hoursDivider, { backgroundColor: T.border }]} />
            <View style={styles.hoursRow}>
              <Clock size={16} color={Colors.primary} />
              <View style={styles.hoursCopy}>
                <Text style={[styles.hoursDay, { color: T.text }]}>Friday – Saturday</Text>
                <Text style={[styles.hoursTime, { color: T.textMuted }]}>12:00 PM – 12:00 AM</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Social */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: T.textMuted }]}>STAY CONNECTED</Text>
          <View style={styles.socialRow}>
            <Pressable
              style={[styles.socialBtn, { backgroundColor: T.surface, borderColor: T.border }]}
              onPress={() => Linking.openURL('https://instagram.com/b60_ae')}
            >
              <Instagram size={20} color={Colors.primary} />
              <Text style={[styles.socialLabel, { color: T.text }]}>@b60_ae</Text>
            </Pressable>
            <Pressable
              style={[styles.socialBtn, { backgroundColor: T.surface, borderColor: T.border }]}
              onPress={() => Linking.openURL('https://b60.ae')}
            >
              <Globe size={20} color={Colors.primary} />
              <Text style={[styles.socialLabel, { color: T.text }]}>b60.ae</Text>
            </Pressable>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: { width: 34, alignItems: 'flex-start' },
  headerTitle: { fontSize: 16, fontWeight: '900', letterSpacing: 1 },

  hero: {
    margin: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    overflow: 'hidden',
    gap: 10,
    ...Shadows.glowStrong,
  },
  heroDecor: {
    position: 'absolute', right: -50, top: -50,
    width: 200, height: 200, borderRadius: 100,
    borderWidth: 30, borderColor: 'rgba(255,255,255,0.07)',
  },
  heroDecor2: {
    position: 'absolute', left: -30, bottom: -60,
    width: 160, height: 160, borderRadius: 80,
    borderWidth: 20, borderColor: 'rgba(255,255,255,0.05)',
  },
  heroEyebrow: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.65)', letterSpacing: 1.5, textTransform: 'uppercase' },
  heroTitle: { fontSize: 44, fontWeight: '900', color: '#fff', lineHeight: 46, textTransform: 'uppercase', letterSpacing: -1 },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 20, marginTop: 4 },

  statsRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    justifyContent: 'space-around',
  },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  statDivider: { width: 1, height: '80%', alignSelf: 'center' },

  section: { marginTop: Spacing.lg, paddingHorizontal: Spacing.md },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.5,
    textTransform: 'uppercase', marginBottom: Spacing.sm,
  },
  card: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  storyText: { fontSize: 15, lineHeight: 23 },

  valueCard: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
    marginBottom: Spacing.sm,
    alignItems: 'flex-start',
  },
  valueIcon: {
    width: 44, height: 44, borderRadius: Radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  valueCopy: { flex: 1 },
  valueTitle: { fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  valueBody: { fontSize: 13, lineHeight: 19 },

  locRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 14,
    gap: Spacing.sm,
  },
  locIcon: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  locInfo: { flex: 1 },
  locName: { fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.3 },
  locSub: { fontSize: 12, marginTop: 1 },
  locLink: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },

  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  hoursCopy: { flex: 1 },
  hoursDay: { fontSize: 14, fontWeight: '700' },
  hoursTime: { fontSize: 13, marginTop: 1 },
  hoursDivider: { height: 1, marginVertical: Spacing.md },

  socialRow: { flexDirection: 'row', gap: Spacing.sm },
  socialBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    borderRadius: Radius.md, borderWidth: 1,
    paddingVertical: 14,
  },
  socialLabel: { fontSize: 14, fontWeight: '700' },
})
