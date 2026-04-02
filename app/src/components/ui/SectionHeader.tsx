import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { LightTheme, DarkTheme, Typography, Spacing } from '../../utils/theme'
import { useThemeStore } from '../../stores/themeStore'

interface SectionHeaderProps {
  title: string
  onSeeAll?: () => void
  seeAllLabel?: string
}

export function SectionHeader({ title, onSeeAll, seeAllLabel = 'See all' }: SectionHeaderProps) {
  const themeMode = useThemeStore((s) => s.themeMode)
  const theme = themeMode === 'light' ? LightTheme : DarkTheme

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {onSeeAll && (
        <Pressable onPress={onSeeAll} hitSlop={8}>
          <Text style={[styles.seeAll, { color: theme.primary }]}>{seeAllLabel}</Text>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.h3,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
})

