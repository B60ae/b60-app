import { View, StyleSheet, ViewStyle } from 'react-native'
import { Colors, Radius, Shadows } from '../../utils/theme'

interface CardProps {
  children: React.ReactNode
  style?: ViewStyle
  elevated?: boolean
}

export function Card({ children, style, elevated = false }: CardProps) {
  return (
    <View style={[styles.card, elevated && styles.elevated, style]}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  elevated: {
    ...Shadows.card,
    borderWidth: 0,
  },
})
