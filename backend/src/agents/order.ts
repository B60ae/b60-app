import { supabase } from '../config/supabase';
import { pushOrderToDart, isLocationExcludedFromDart, DartOrderPayload, DartOrderItem } from '../services/dartPos';
import { validate } from './validation';

const MAX_DART_RETRIES = 3;
const DART_BACKOFF_MS = [1000, 2000, 4000];

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  customizations?: Record<string, unknown>;
}

export interface CreateOrderInput {
  userId: string;
  locationId: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  pointsRedeemed?: number;
  voucherCode?: string;
  customerName?: string;
  customerPhone?: string;
}

export interface OrderAgentResult {
  success: boolean;
  orderId?: string;
  status?: string;
  total?: number;
  pointsEarned?: number;
  estimatedReadyAt?: string;
  dartPosOrderId?: string;
  dartPending?: boolean;
  error?: string;
  code?: string;
}

export async function processOrder(input: CreateOrderInput): Promise<OrderAgentResult> {
  // Step 1 — Validate
  const validation = await validate([
    { type: 'user_exists', userId: input.userId },
    { type: 'not_suspended', userId: input.userId },
    { type: 'cart_items', items: input.items.map(i => ({ id: i.id, price: i.price })), locationId: input.locationId },
    { type: 'order_total', total: input.total },
    ...(input.pointsRedeemed && input.pointsRedeemed > 0
      ? [{ type: 'points_balance' as const, userId: input.userId, required: input.pointsRedeemed }]
      : []),
    ...(input.voucherCode
      ? [{ type: 'voucher' as const, userId: input.userId, code: input.voucherCode }]
      : []),
  ]);

  if (!validation.valid) {
    return { success: false, error: validation.reason, code: validation.code };
  }

  // Step 2 — Write order to DB as pending
  const orderItems = input.items.map((item) => ({
    menu_item_id: item.id,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    customizations: item.customizations ?? {},
  }));

  const { data: order, error: insertError } = await supabase
    .from('orders')
    .insert({
      user_id: input.userId,
      location_id: input.locationId,
      items: orderItems,
      subtotal: input.subtotal,
      discount: input.discount,
      total: input.total,
      points_redeemed: input.pointsRedeemed ?? 0,
      status: 'pending',
    })
    .select()
    .single();

  if (insertError || !order) {
    console.error('[OrderAgent] DB insert failed:', insertError);
    return { success: false, error: 'Failed to create order', code: 'DB_ERROR' };
  }

  // Step 3 — Attempt DartPOS with retry + backoff
  let dartPosOrderId: string | null = null;
  let estimatedReadyMinutes = 15;
  let dartPending = false;

  if (!isLocationExcludedFromDart(input.locationId)) {
    const dartResult = await submitToDartWithRetry(order.id, input);
    if (dartResult.success) {
      dartPosOrderId = dartResult.posOrderId ?? null;
      estimatedReadyMinutes = dartResult.estimatedMinutes ?? 15;
    } else {
      dartPending = true;
      console.warn(`[OrderAgent] DartPOS failed after ${MAX_DART_RETRIES} retries. Order ${order.id} marked pending_pos.`);
      // log to failed queue for ops visibility
      await supabase.from('failed_dart_orders').insert({
        order_id: order.id,
        user_id: input.userId,
        location_id: input.locationId,
        error: dartResult.error,
        retry_count: MAX_DART_RETRIES,
        created_at: new Date().toISOString(),
      }).then(({ error }) => {
        if (error) console.error('[OrderAgent] Failed to log dart failure:', error);
      });
    }
  }

  // Step 4 — Confirm order in DB
  const estimatedReadyAt = new Date(Date.now() + estimatedReadyMinutes * 60 * 1000).toISOString();
  const finalStatus = dartPending ? 'pending_pos' : 'confirmed';

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status: finalStatus,
      estimated_ready_at: estimatedReadyAt,
      dart_pos_order_id: dartPosOrderId,
    })
    .eq('id', order.id);

  if (updateError) {
    console.error('[OrderAgent] Failed to update order status:', updateError);
  }

  return {
    success: true,
    orderId: order.id,
    status: finalStatus,
    total: input.total,
    estimatedReadyAt,
    dartPosOrderId: dartPosOrderId ?? undefined,
    dartPending,
  };
}

async function submitToDartWithRetry(
  orderId: string,
  input: CreateOrderInput
): Promise<{ success: boolean; posOrderId?: string; estimatedMinutes?: number; error?: string }> {
  // Fetch dart_food_id mappings for items
  const itemIds = input.items.map((i) => i.id);
  const { data: dartItems } = await supabase
    .from('menu_items')
    .select('id, dart_food_id, dart_variant_id')
    .in('id', itemIds);

  const mappedItems: DartOrderItem[] = input.items
    .flatMap((item) => {
      const mapping = dartItems?.find((d) => d.id === item.id);
      if (!mapping?.dart_food_id) return [];
      return [{
        sku: String(mapping.dart_food_id),
        variant_id: mapping.dart_variant_id ? String(mapping.dart_variant_id) : undefined,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        modifiers: Object.entries(item.customizations ?? {}).map(([name, price]) => ({
          name,
          price: typeof price === 'number' ? price : 0,
        })),
      }];
    });

  if (mappedItems.length === 0) {
    // all items unmapped (e.g. Tickle, Vegas) — skip silently, treat as success
    return { success: true, estimatedMinutes: 15 };
  }

  const payload: DartOrderPayload = {
    external_id: orderId,
    location_id: input.locationId,
    items: mappedItems,
    total: input.total,
    customer_name: input.customerName,
    customer_phone: input.customerPhone,
  };

  let lastError = '';
  for (let attempt = 0; attempt < MAX_DART_RETRIES; attempt++) {
    try {
      const result = await pushOrderToDart(payload);
      return {
        success: true,
        posOrderId: result.pos_order_id,
        estimatedMinutes: result.estimated_ready_minutes ?? 15,
      };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn(`[OrderAgent] DartPOS attempt ${attempt + 1} failed: ${lastError}`);
      if (attempt < MAX_DART_RETRIES - 1) {
        await sleep(DART_BACKOFF_MS[attempt]);
      }
    }
  }

  return { success: false, error: lastError };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
