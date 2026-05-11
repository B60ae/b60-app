import { supabase } from '../config/supabase';

export type ValidationRule =
  | { type: 'auth'; userId: string; token_version: number }
  | { type: 'user_exists'; userId: string }
  | { type: 'not_suspended'; userId: string }
  | { type: 'points_balance'; userId: string; required: number }
  | { type: 'voucher'; userId: string; code: string }
  | { type: 'cart_items'; items: { id: string; price: number }[]; locationId: string }
  | { type: 'order_total'; total: number }
  | { type: 'tap_score'; score: number }
  | { type: 'spin_available'; userId: string; spinsUsed: number; ordersToday: number }
  | { type: 'tap_plays'; playsToday: number }
  | { type: 'rate_limit'; userId: string; action: string; count: number; max: number };

export interface ValidationResult {
  valid: boolean;
  code?: string;
  reason?: string;
  // carry-through data so callers don't re-query
  data?: Record<string, unknown>;
}

export async function validate(rules: ValidationRule[]): Promise<ValidationResult> {
  for (const rule of rules) {
    const result = await checkRule(rule);
    if (!result.valid) return result;
  }
  return { valid: true };
}

async function checkRule(rule: ValidationRule): Promise<ValidationResult> {
  switch (rule.type) {
    case 'user_exists': {
      const { data, error } = await supabase
        .from('users')
        .select('id, is_suspended, loyalty_points')
        .eq('id', rule.userId)
        .single();
      if (error || !data) return fail('USER_NOT_FOUND', 'User not found');
      return { valid: true, data: { user: data } };
    }

    case 'not_suspended': {
      const { data } = await supabase
        .from('users')
        .select('is_suspended')
        .eq('id', rule.userId)
        .single();
      if (data?.is_suspended) return fail('SUSPENDED', 'Account is suspended');
      return { valid: true };
    }

    case 'points_balance': {
      const { data } = await supabase
        .from('users')
        .select('loyalty_points')
        .eq('id', rule.userId)
        .single();
      const balance = data?.loyalty_points ?? 0;
      if (balance < rule.required) {
        return fail('INSUFFICIENT_POINTS', `Need ${rule.required} points, have ${balance}`);
      }
      if (rule.required < 100) {
        return fail('BELOW_MIN_REDEEM', 'Minimum redemption is 100 points');
      }
      return { valid: true, data: { balance } };
    }

    case 'voucher': {
      const { data } = await supabase
        .from('game_vouchers')
        .select('id, voucher_type, value, is_used, expires_at')
        .eq('user_id', rule.userId)
        .eq('code', rule.code)
        .single();
      if (!data) return fail('VOUCHER_NOT_FOUND', 'Voucher not found');
      if (data.is_used) return fail('VOUCHER_USED', 'Voucher already used');
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return fail('VOUCHER_EXPIRED', 'Voucher has expired');
      }
      return { valid: true, data: { voucher: data } };
    }

    case 'cart_items': {
      if (!rule.items || rule.items.length === 0) {
        return fail('EMPTY_CART', 'Cart cannot be empty');
      }
      const ids = rule.items.map((i) => i.id);
      const { data: dbItems } = await supabase
        .from('menu_items')
        .select('id, price, is_available, name')
        .in('id', ids);

      if (!dbItems || dbItems.length !== ids.length) {
        return fail('ITEM_NOT_FOUND', 'One or more items not found in menu');
      }

      for (const dbItem of dbItems) {
        if (!dbItem.is_available) {
          return fail('ITEM_UNAVAILABLE', `${dbItem.name} is currently unavailable`);
        }
        const clientItem = rule.items.find((i) => i.id === dbItem.id);
        if (clientItem && Math.abs(clientItem.price - dbItem.price) > 0.01) {
          return fail('PRICE_MISMATCH', `Price mismatch on ${dbItem.name}`);
        }
      }
      return { valid: true, data: { verifiedItems: dbItems } };
    }

    case 'order_total': {
      if (rule.total < 0.5) {
        return fail('BELOW_MIN_ORDER', 'Order total must be at least AED 0.50');
      }
      return { valid: true };
    }

    case 'tap_score': {
      // max 120 taps in 10s is humanly impossible above — cap at 200 per validation
      if (rule.score < 0 || rule.score > 200) {
        return fail('INVALID_TAP_SCORE', 'Score out of valid range');
      }
      // anti-cheat: flag suspiciously perfect scores
      if (rule.score > 150) {
        console.warn(`[ValidationAgent] Suspicious tap score: ${rule.score}`);
      }
      return { valid: true };
    }

    case 'spin_available': {
      const spinsAllowed = 1 + rule.ordersToday;
      if (rule.spinsUsed >= spinsAllowed) {
        return fail('NO_SPINS_LEFT', 'No spins remaining today');
      }
      return { valid: true };
    }

    case 'tap_plays': {
      if (rule.playsToday >= 3) {
        return fail('NO_TAP_PLAYS_LEFT', 'Maximum 3 tap game plays per day');
      }
      return { valid: true };
    }

    case 'rate_limit': {
      if (rule.count >= rule.max) {
        return fail('RATE_LIMITED', `Too many ${rule.action} requests`);
      }
      return { valid: true };
    }

    default:
      return { valid: true };
  }
}

function fail(code: string, reason: string): ValidationResult {
  return { valid: false, code, reason };
}
