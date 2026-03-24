import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import { Plus } from 'lucide-react-native'
import { Colors, Radius, Spacing, Typography, Shadows } from '../../utils/theme'
import type { MenuItem } from '../../types'

interface MenuItemCardProps {
  item: MenuItem
  onPress: (item: MenuItem) => void
  onQuickAdd: (item: MenuItem) => void
}

export function MenuItemCard({ item, onPress, onQuickAdd }: MenuItemCardProps) {
  return (
    <Pressable style={styles.card} onPress={() => onPress(item)}>
      <Image
        source={{ uri: item.image_url }}
        style={styles.image}
        contentFit="cover"
        transition={200}
        placeholder={{ color: Colors.surface }}
      />
      {item.is_featured && (
        <View style={styles.featuredBadge}>
          <Text style={styles.featuredText}>🔥 HOT</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
        <View style={styles.footer}>
          <Text style={styles.price}>AED {item.price.toFixed(0)}</Text>
          <Pressable style={styles.addBtn} onPress={() => onQuickAdd(item)}>
            <Plus size={18} color={Colors.white} strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  image: { width: '100%', height: 160 },
  featuredBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  featuredText: { color: Colors.white, fontSize: 11, fontWeight: '700' },
  info: { padding: Spacing.md },
  name: { ...Typography.h4, marginBottom: 4 },
  desc: { ...Typography.bodySmall, marginBottom: Spacing.sm },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { ...Typography.price },
  addBtn: {
    backgroundColor: Colors.primary,
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
