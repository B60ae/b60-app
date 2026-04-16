/**
 * One-time script: fetch all foods from DartPOS and match against Supabase menu_items by name.
 * Run: npx ts-node src/scripts/sync-dart-foods.ts
 *
 * What it does:
 * 1. Calls GET /api/Tablet/GetAllFoods?TypeOfOrder=1
 * 2. Fetches all menu_items from Supabase
 * 3. Matches by normalized name (lowercase, strip spaces/punctuation)
 * 4. Prints matches + unmatched items
 * 5. If you pass --apply, it writes dart_food_id + dart_variant_id to Supabase
 */

import 'dotenv/config'
import axios from 'axios'
import { createClient } from '@supabase/supabase-js'

const DART_URL = process.env.DART_POS_URL ?? 'http://139.99.115.240:8908'
const APPLY = process.argv.includes('--apply')

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

function normalize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '').trim()
}

async function main() {
  console.log('Fetching foods from DartPOS...')
  const { data: dartFoods } = await axios.get(`${DART_URL}/api/Tablet/GetAllFoods`, {
    params: { TypeOfOrder: 1 },
    timeout: 10000,
  })

  console.log(`DartPOS returned ${dartFoods?.length ?? 0} foods\n`)

  console.log('Fetching menu_items from Supabase...')
  const { data: menuItems, error } = await supabase
    .from('menu_items')
    .select('id, name, dart_food_id')

  if (error) throw new Error(`Supabase error: ${error.message}`)
  console.log(`Supabase has ${menuItems?.length ?? 0} menu items\n`)

  const matched: { supabaseId: string; name: string; dartFoodId: string; dartVariantId: string }[] = []
  const unmatched: { id: string; name: string }[] = []
  const dartUnmatched: string[] = []

  // Build dart lookup by normalized name
  const dartByName = new Map<string, any>()
  for (const food of dartFoods ?? []) {
    const key = normalize(food.FoodName ?? food.Name ?? food.FoodID ?? '')
    dartByName.set(key, food)
  }

  for (const item of menuItems ?? []) {
    const key = normalize(item.name)
    const dart = dartByName.get(key)

    if (dart) {
      matched.push({
        supabaseId: item.id,
        name: item.name,
        dartFoodId: String(dart.FoodID ?? dart.ID ?? dart.Id ?? ''),
        dartVariantId: String(dart.VariantID ?? dart.VarientID ?? dart.FoodID ?? dart.ID ?? ''),
      })
    } else {
      unmatched.push({ id: item.id, name: item.name })
    }
  }

  // Find dart foods with no supabase match
  const matchedDartIds = new Set(matched.map(m => m.dartFoodId))
  for (const food of dartFoods ?? []) {
    const id = String(food.FoodID ?? food.ID ?? food.Id ?? '')
    if (!matchedDartIds.has(id)) {
      dartUnmatched.push(`[${id}] ${food.FoodName ?? food.Name ?? 'Unknown'}`)
    }
  }

  console.log('=== MATCHED ===')
  for (const m of matched) {
    console.log(`✓ "${m.name}" → FoodID: ${m.dartFoodId}, VariantID: ${m.dartVariantId}`)
  }

  console.log('\n=== UNMATCHED in Supabase (no DartPOS match) ===')
  for (const u of unmatched) {
    console.log(`✗ [${u.id}] "${u.name}"`)
  }

  console.log('\n=== UNMATCHED in DartPOS (not in Supabase) ===')
  for (const d of dartUnmatched) {
    console.log(`? ${d}`)
  }

  if (APPLY && matched.length > 0) {
    console.log('\nApplying matches to Supabase...')
    for (const m of matched) {
      const { error: updateError } = await supabase
        .from('menu_items')
        .update({ dart_food_id: m.dartFoodId, dart_variant_id: m.dartVariantId })
        .eq('id', m.supabaseId)
      if (updateError) {
        console.error(`  ✗ Failed to update "${m.name}": ${updateError.message}`)
      } else {
        console.log(`  ✓ Updated "${m.name}"`)
      }
    }
    console.log('Done.')
  } else if (matched.length > 0) {
    console.log('\nRun with --apply to write these matches to Supabase.')
  }

  // Also print raw DartPOS food list for manual inspection
  console.log('\n=== ALL DARTPOS FOODS (raw) ===')
  for (const food of dartFoods ?? []) {
    console.log(JSON.stringify(food))
  }
}

main().catch(console.error)
