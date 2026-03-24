import { View, Text, StyleSheet } from 'react-native'
import { Radius } from '../../utils/theme'
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '../../utils/constants'
import type { OrderStatus } from '../../types'

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const color = ORDER_STATUS_COLORS[status] ?? '#666'
  const label = ORDER_STATUS_LABELS[status] ?? status

  return (
    <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  text: { fontSize: 13, fontWeight: '600' },
})
