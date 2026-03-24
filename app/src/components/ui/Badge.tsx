import { View, Text, StyleSheet } from 'react-native'
import { Colors, Radius } from '../../utils/theme'

interface BadgeProps {
  label: string
  color?: string
  textColor?: string
  size?: 'sm' | 'md'
}

export function Badge({ label, color = Colors.primary, textColor = Colors.white, size = 'md' }: BadgeProps) {
  return (
    <View style={[styles.badge, styles[size], { backgroundColor: color + '22', borderColor: color }]}>
      <Text style={[styles.text, styles[`text_${size}`], { color }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: Radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  sm: { paddingHorizontal: 8, paddingVertical: 2 },
  md: { paddingHorizontal: 12, paddingVertical: 4 },
  text: { fontWeight: '600' },
  text_sm: { fontSize: 11 },
  text_md: { fontSize: 13 },
})
