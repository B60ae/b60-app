import axios from 'axios'

// Locations excluded from DartPOS (comma-separated location IDs in env)
const EXCLUDED_LOCATIONS = new Set(
  (process.env.DART_POS_EXCLUDED_LOCATIONS ?? '').split(',').filter(Boolean)
)

export function isLocationExcludedFromDart(locationId: string): boolean {
  return EXCLUDED_LOCATIONS.has(locationId)
}

// ─── DartPOS Constants ────────────────────────────────────────────────────────
const DART_WAITER_ID = parseInt(process.env.DART_WAITER_ID ?? '3')
const DART_TABLE_ID  = parseInt(process.env.DART_TABLE_ID  ?? '1')
const DART_REGION_ID = parseInt(process.env.DART_REGION_ID ?? '1')
const DART_TAX_ID    = parseInt(process.env.DART_TAX_ID    ?? '1')
const DART_TAX_RATE  = parseFloat(process.env.DART_TAX_RATE ?? '0.05')
const DART_ORDER_TYPE = parseInt(process.env.DART_ORDER_TYPE ?? '1') // 1 = takeaway

const dartClient = axios.create({
  baseURL: process.env.DART_POS_URL, // e.g. http://139.99.115.240:8908
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DartOrderItem {
  sku: string        // FoodID
  variant_id?: string // VariantID (defaults to sku if not set)
  name: string
  quantity: number
  unit_price: number
  modifiers: { name: string; price: number }[]
}

export interface DartOrderPayload {
  external_id: string   // our order UUID used as TakeAwayReference
  location_id: string
  items: DartOrderItem[]
  total: number
  customer_name?: string
  customer_phone?: string
}

export interface DartOrderResponse {
  pos_order_id: string
  status: string
  estimated_ready_minutes: number
}

interface DartApiResponse {
  Status: string
  OrderNo: number
  TicketNo: number
  Message: string
}

// ─── Push Order ───────────────────────────────────────────────────────────────

export async function pushOrderToDart(payload: DartOrderPayload): Promise<DartOrderResponse> {
  // Convert our order format to DartPOS InsertOrder format
  const dartBody = {
    OrderNo: 0,
    OrderType: DART_ORDER_TYPE,
    WaiterID: DART_WAITER_ID,
    OrderNote: payload.customer_name ? `App order - ${payload.customer_name}` : 'App order',
    TableID: DART_TABLE_ID,
    GuestNo: 0,
    GuestCount: 1,
    TakeAwayReference: payload.external_id.slice(-6).toUpperCase(), // last 6 chars of our UUID
    RegionID: DART_REGION_ID,
    CustomerID: 0,
    OrderedProducts: payload.items.map((item, idx) => ({
      RowID: idx,
      FoodID: item.sku,
      VariantID: item.variant_id ?? item.sku,
      Price: item.unit_price.toFixed(2),
      Quantity: String(item.quantity),
      FoodNote: item.modifiers.length > 0
        ? item.modifiers.map(m => m.name).join(', ')
        : null,
      IsVoid: 0,
      TaxID: DART_TAX_ID,
      TaxRate: String(DART_TAX_RATE),
      PromotionRefNo: 0,
      PromotionValue: 0,
    })),
  }

  const { data } = await dartClient.post<DartApiResponse[]>('/api/Tablet/InsertOrder', dartBody)

  const result = Array.isArray(data) ? data[0] : data

  if (!result || result.Status !== 'Success') {
    throw new Error(`DartPOS error: ${result?.Message ?? 'Unknown error'}`)
  }

  console.log(`[Dart POS] Order pushed: ${result.Message}`)

  return {
    pos_order_id: String(result.OrderNo),
    status: 'confirmed',
    estimated_ready_minutes: 15, // DartPOS doesn't return this — use default
  }
}

// ─── Get Order Status ─────────────────────────────────────────────────────────
// DartPOS doesn't have a status polling endpoint in the docs yet
// Return null so our backend falls back to internal status tracking

export async function getOrderStatusFromDart(posOrderId: string): Promise<{ status: string } | null> {
  // Not yet available in DartPOS API — status is pushed via KOT
  return null
}
