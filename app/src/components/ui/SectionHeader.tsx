import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Colors, Typography, Spacing } from '../../utils/theme'

interface SectionHeaderProps {
  title: string
  onSeeAll?: () => void
  seeAllLabel?: string
}

export function SectionHeader({ title, onSeeAll, seeAllLabel = 'See all' }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {onSeeAll && (
        <Pressable onPress={onSeeAll} hitSlop={8}>
          <Text style={styles.seeAll}>{seeAllLabel}</Text>
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
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.h3,
    fontWeight: '800',
    color: Colors.text,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
})
