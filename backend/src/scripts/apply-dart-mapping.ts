/**
 * Manual mapping: Supabase menu item name → DartPOS ID
 * Run: npx ts-node src/scripts/apply-dart-mapping.ts
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Supabase name → DartPOS ID
const MAPPING: Record<string, string> = {
  'Classic Beef':    '1',
  'Fancy':           '2',
  'Classic Chicken': '5',
  'Hot Chicken':     '7',
  // 'Tickle' has no DartPOS equivalent — excluded
  // 'Vegas' has no DartPOS equivalent — excluded
  'Classic Tenders': '6',
  'Chicken & Fries': '9',
  'Just Fries':      '18',
  'Seasoned Fries':  '18',
  'Lemonade':        '11',
  'B60 Chocolate':   '20023',
  'White Sauce':     '20022',
  'Special Sauce':   '16',
}

async function main() {
  const { data: items, error } = await supabase
    .from('menu_items')
    .select('id, name')

  if (error) throw error

  for (const item of items ?? []) {
    const dartId = MAPPING[item.name]
    if (!dartId) {
      console.log(`⚠️  No mapping for "${item.name}" — skipping`)
      continue
    }

    const { error: updateError } = await supabase
      .from('menu_items')
      .update({ dart_food_id: dartId, dart_variant_id: dartId })
      .eq('id', item.id)

    if (updateError) {
      console.error(`✗ Failed to update "${item.name}": ${updateError.message}`)
    } else {
      console.log(`✓ "${item.name}" → DartPOS ID ${dartId}`)
    }
  }

  console.log('\nDone. Verify Tickle/Classic Tenders/Seasoned Fries mappings with your team.')
}

main().catch(console.error)
