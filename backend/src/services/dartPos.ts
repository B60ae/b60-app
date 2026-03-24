import axios from 'axios'

const dartClient = axios.create({
  baseURL: process.env.DART_POS_URL,
  headers: {
    'Authorization': `Bearer ${process.env.DART_POS_API_KEY}`,
    'Content-Type': 'application/json',
  },
  timeout: 10000,
})

export interface DartOrderPayload {
  external_id: string
  location_id: string
  items: {
    sku: string
    name: string
    quantity: number
    unit_price: number
    modifiers: { name: string; price: number }[]
  }[]
  total: number
  customer_name?: string
  customer_phone?: string
}

export interface DartOrderResponse {
  pos_order_id: string
  status: string
  estimated_ready_minutes: number
}

export async function pushOrderToDart(payload: DartOrderPayload): Promise<DartOrderResponse> {
  try {
    const { data } = await dartClient.post<DartOrderResponse>('/orders', payload)
    return data
  } catch (error: any) {
    console.error('[Dart POS] Failed to push order:', error?.response?.data ?? error.message)
    throw new Error('Failed to push order to Dart POS')
  }
}

export async function getOrderStatusFromDart(posOrderId: string) {
  try {
    const { data } = await dartClient.get(`/orders/${posOrderId}`)
    return data
  } catch (error: any) {
    console.error('[Dart POS] Failed to get status:', error?.message)
    return null
  }
}
