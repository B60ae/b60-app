import { supabase } from '../config/supabase';
import { awardPoints, redeemPoints, getBalance } from '../services/loyalty';
import { validate } from './validation';

export type LoyaltySource = 'order' | 'game_spin' | 'game_tap' | 'game_streak' | 'promo';

export interface AwardInput {
  userId: string;
  sourceId: string;
  amount: number;
  source: LoyaltySource;
  isDirectAmount?: boolean;
}

export interface RedeemInput {
  userId: string;
  orderId: string;
  pointsToRedeem: number;
}

export interface LoyaltyAgentResult {
  success: boolean;
  pointsAwarded?: number;
  discountAmount?: number;
  newBalance?: number;
  tier?: string;
  tierUpgraded?: boolean;
  error?: string;
  code?: string;
  queued?: boolean;
}

const TIER_THRESHOLDS = { Silver: 1000, Gold: 5000, Platinum: 10000 };

export async function award(input: AwardInput): Promise<LoyaltyAgentResult> {
  try {
    const prevBalance = await getCurrentBalance(input.userId);
    const prevTier = getTier(prevBalance);

    const pointsAwarded = await awardPoints(
      input.userId,
      input.sourceId,
      input.amount,
      input.isDirectAmount
    );

    const newBalance = prevBalance + pointsAwarded;
    const newTier = getTier(newBalance);
    const tierUpgraded = newTier !== prevTier;

    if (tierUpgraded) {
      console.log(`[LoyaltyAgent] User ${input.userId} upgraded: ${prevTier} → ${newTier}`);
    }

    return {
      success: true,
      pointsAwarded,
      newBalance,
      tier: newTier,
      tierUpgraded,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[LoyaltyAgent] Award failed for user ${input.userId}:`, message);

    // Queue failed award so cron can retry
    await queueFailedAward(input, message);

    return {
      success: false,
      error: message,
      code: 'AWARD_FAILED',
      queued: true,
    };
  }
}

export async function redeem(input: RedeemInput): Promise<LoyaltyAgentResult> {
  const validation = await validate([
    {
      type: 'points_balance',
      userId: input.userId,
      required: input.pointsToRedeem,
    },
  ]);

  if (!validation.valid) {
    return { success: false, error: validation.reason, code: validation.code };
  }

  try {
    const discountAmount = await redeemPoints(
      input.userId,
      input.orderId,
      input.pointsToRedeem
    );

    const newBalance = await getCurrentBalance(input.userId);

    return {
      success: true,
      discountAmount,
      newBalance,
      tier: getTier(newBalance),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[LoyaltyAgent] Redeem failed for user ${input.userId}:`, message);
    return { success: false, error: message, code: 'REDEEM_FAILED' };
  }
}

export async function balance(userId: string): Promise<LoyaltyAgentResult> {
  try {
    const data = await getBalance(userId);
    return {
      success: true,
      newBalance: data.total_points,
      tier: data.tier,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message, code: 'BALANCE_FETCH_FAILED' };
  }
}

// Retry all queued failed award attempts — called by cron every 15 min
export async function retryFailedAwards(): Promise<void> {
  const { data: queue, error } = await supabase
    .from('failed_loyalty_awards')
    .select('*')
    .lt('retry_count', 3)
    .order('created_at', { ascending: true })
    .limit(50);

  if (error || !queue || queue.length === 0) return;

  console.log(`[LoyaltyAgent] Retrying ${queue.length} failed award(s)`);

  for (const entry of queue) {
    try {
      await awardPoints(
        entry.user_id,
        entry.source_id,
        entry.amount,
        entry.is_direct_amount
      );

      await supabase
        .from('failed_loyalty_awards')
        .delete()
        .eq('id', entry.id);

      console.log(`[LoyaltyAgent] Retry success for entry ${entry.id}`);
    } catch (err) {
      const newCount = (entry.retry_count ?? 0) + 1;
      await supabase
        .from('failed_loyalty_awards')
        .update({ retry_count: newCount, last_attempted_at: new Date().toISOString() })
        .eq('id', entry.id);

      if (newCount >= 3) {
        console.error(`[LoyaltyAgent] Entry ${entry.id} exhausted retries — needs manual review`);
      }
    }
  }
}

async function queueFailedAward(input: AwardInput, error: string): Promise<void> {
  await supabase.from('failed_loyalty_awards').insert({
    user_id: input.userId,
    source_id: input.sourceId,
    amount: input.amount,
    source: input.source,
    is_direct_amount: input.isDirectAmount ?? false,
    error,
    retry_count: 0,
    created_at: new Date().toISOString(),
  }).then(({ error: dbErr }) => {
    if (dbErr) console.error('[LoyaltyAgent] Failed to queue award:', dbErr);
  });
}

async function getCurrentBalance(userId: string): Promise<number> {
  const { data } = await supabase
    .from('users')
    .select('loyalty_points')
    .eq('id', userId)
    .single();
  return data?.loyalty_points ?? 0;
}

function getTier(points: number): string {
  if (points >= TIER_THRESHOLDS.Platinum) return 'Platinum';
  if (points >= TIER_THRESHOLDS.Gold) return 'Gold';
  if (points >= TIER_THRESHOLDS.Silver) return 'Silver';
  return 'Bronze';
}
