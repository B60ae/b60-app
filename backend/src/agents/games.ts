import { supabase } from '../config/supabase';
import { awardPoints } from '../services/loyalty';
import { validate } from './validation';

// 8 segments — matches wheel UI exactly (index = segment position)
const SPIN_PRIZES = [
  { type: 'points',    value: 10,  weight: 30, label: '10 PTS'       },
  { type: 'points',    value: 25,  weight: 25, label: '25 PTS'       },
  { type: 'points',    value: 50,  weight: 20, label: '50 PTS'       },
  { type: 'points',    value: 100, weight: 15, label: '100 PTS'      },
  { type: 'points',    value: 250, weight: 5,  label: '250 PTS'      },
  { type: 'points',    value: 10,  weight: 30, label: '10 PTS'       },
  { type: 'points',    value: 50,  weight: 20, label: '50 PTS'       },
  { type: 'free_item', value: 0,   weight: 2,  label: 'FREE BURGER', voucherType: 'free_item' },
] as const;

type PrizeType = 'points' | 'free_item';

export interface SpinResult {
  success: boolean;
  prizeType?: PrizeType;
  prizeValue?: number;
  prizeLabel?: string;
  segmentIndex?: number;
  voucherCode?: string;
  pointsAwarded?: number;
  spinsRemaining?: number;
  error?: string;
  code?: string;
}

export interface TapResult {
  success: boolean;
  score?: number;
  pointsEarned?: number;
  playsRemaining?: number;
  error?: string;
  code?: string;
}

// ─── SPIN ────────────────────────────────────────────────────────────────────

export async function processSpin(userId: string): Promise<SpinResult> {
  // 1 free spin per day
  const today = new Date().toISOString().split('T')[0];

  const { count: spinsUsed } = await supabase
    .from('game_spins')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', `${today}T00:00:00.000Z`);

  const validation = await validate([
    {
      type: 'spin_available',
      userId,
      spinsUsed: spinsUsed ?? 0,
      ordersToday: 0,
    },
  ]);

  if (!validation.valid) {
    return { success: false, error: validation.reason, code: validation.code };
  }

  const spinsRemaining = Math.max(0, 1 - (spinsUsed ?? 0) - 1);

  // Weighted random prize selection
  const prize = pickWeightedPrize();
  const segmentIndex = SPIN_PRIZES.indexOf(prize as typeof SPIN_PRIZES[number]);

  // Record spin
  const { data: spinRecord, error: spinErr } = await supabase
    .from('game_spins')
    .insert({
      user_id: userId,
      prize_type: prize.type,
      prize_value: prize.value,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (spinErr || !spinRecord) {
    return { success: false, error: 'Failed to record spin', code: 'DB_ERROR' };
  }

  // Credit prize
  let voucherCode: string | undefined;
  let pointsAwarded = 0;

  if (prize.type === 'points') {
    const result = await creditPrize(userId, spinRecord.id, 'spin', prize.type, prize.value, prize.value);
    pointsAwarded = result.pointsAwarded ?? 0;
  } else {
    // free_item
    voucherCode = generateVoucherCode();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { error: voucherErr } = await supabase.from('game_vouchers').insert({
      user_id: userId,
      code: voucherCode,
      voucher_type: 'free_item',
      value: 0,
      is_used: false,
      expires_at: expiresAt,
    });
    if (voucherErr) {
      await queueFailedPrize(userId, spinRecord.id, 'spin', prize.type, prize.value);
    }
  }

  // Update leaderboard
  await updateLeaderboard(userId, 'spin', prize.type === 'points' ? prize.value : 50);

  return {
    success: true,
    prizeType: prize.type as PrizeType,
    prizeValue: prize.value,
    prizeLabel: prize.label,
    segmentIndex,
    voucherCode,
    pointsAwarded,
    spinsRemaining,
  };
}

// ─── TAP GAME ────────────────────────────────────────────────────────────────

export async function processTap(userId: string, score: number): Promise<TapResult> {
  const today = new Date().toISOString().split('T')[0];

  const { count: playsToday } = await supabase
    .from('game_tap_scores')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', `${today}T00:00:00.000Z`);

  const validation = await validate([
    { type: 'tap_score', score },
    { type: 'tap_plays', playsToday: playsToday ?? 0 },
  ]);

  if (!validation.valid) {
    return { success: false, error: validation.reason, code: validation.code };
  }

  const pointsEarned = Math.floor(score / 10);
  const playsRemaining = 3 - (playsToday ?? 0) - 1;

  const { data: tapRecord, error: tapErr } = await supabase
    .from('game_tap_scores')
    .insert({
      user_id: userId,
      score,
      points_earned: pointsEarned,
      played_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (tapErr || !tapRecord) {
    return { success: false, error: 'Failed to record score', code: 'DB_ERROR' };
  }

  if (pointsEarned > 0) {
    await creditPrize(userId, tapRecord.id, 'tap', 'points', pointsEarned, pointsEarned);
  }

  await updateLeaderboard(userId, 'tap', score);

  return {
    success: true,
    score,
    pointsEarned,
    playsRemaining,
  };
}

// ─── PRIZE RETRY CRON (every 15 min) ─────────────────────────────────────────

export async function retryFailedPrizes(): Promise<void> {
  const { data: queue, error } = await supabase
    .from('failed_prizes')
    .select('*')
    .lt('retry_count', 3)
    .order('created_at', { ascending: true })
    .limit(50);

  if (error || !queue || queue.length === 0) return;

  console.log(`[GamesAgent] Retrying ${queue.length} failed prize(s)`);

  for (const entry of queue) {
    try {
      if (entry.prize_type === 'points') {
        await awardPoints(entry.user_id, `game_${entry.game_type}_${entry.source_id}`, entry.prize_value, true);
      } else {
        const voucherCode = generateVoucherCode();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        await supabase.from('game_vouchers').insert({
          user_id: entry.user_id,
          code: voucherCode,
          voucher_type: entry.prize_type,
          value: entry.prize_value,
          is_used: false,
          expires_at: expiresAt,
        });
      }

      await supabase.from('failed_prizes').delete().eq('id', entry.id);
      console.log(`[GamesAgent] Prize retry success for entry ${entry.id}`);
    } catch (err) {
      const newCount = (entry.retry_count ?? 0) + 1;
      await supabase
        .from('failed_prizes')
        .update({ retry_count: newCount, last_attempted_at: new Date().toISOString() })
        .eq('id', entry.id);

      if (newCount >= 3) {
        console.error(`[GamesAgent] Prize entry ${entry.id} exhausted retries — needs manual review`);
      }
    }
  }
}

// ─── LEADERBOARD WEEKLY RESET (Monday 00:00 GST = UTC+4) ────────────────────

export async function resetLeaderboard(): Promise<void> {
  const weekStart = getWeekStart();
  console.log(`[GamesAgent] Resetting leaderboard for week ${weekStart}`);

  // Award prizes to top 3 before reset
  const { data: top3 } = await supabase
    .from('game_leaderboard')
    .select('user_id, total_score, display_name')
    .eq('week_start', getPreviousWeekStart())
    .order('total_score', { ascending: false })
    .limit(3);

  if (top3 && top3.length > 0) {
    const prizes = [500, 250, 100];
    for (let i = 0; i < top3.length; i++) {
      const entry = top3[i];
      const pts = prizes[i];
      try {
        await awardPoints(entry.user_id, `leaderboard_week_${getPreviousWeekStart()}_rank_${i + 1}`, pts, true);
        if (i === 0) {
          // #1 gets a free burger voucher too
          await supabase.from('game_vouchers').insert({
            user_id: entry.user_id,
            code: generateVoucherCode(),
            voucher_type: 'free_item',
            value: 0,
            is_used: false,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          });
        }
        console.log(`[GamesAgent] Leaderboard prize awarded: Rank ${i + 1} → ${entry.display_name} (${pts}pts)`);
      } catch (err) {
        console.error(`[GamesAgent] Failed to award leaderboard prize to ${entry.user_id}:`, err);
        await queueFailedPrize(entry.user_id, `leaderboard_${getPreviousWeekStart()}`, 'leaderboard', 'points', pts);
      }
    }
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function creditPrize(
  userId: string,
  sourceId: string,
  gameType: string,
  prizeType: string,
  amount: number,
  pointsValue: number
): Promise<{ pointsAwarded: number }> {
  try {
    const awarded = await awardPoints(userId, `game_${gameType}_${sourceId}`, pointsValue, true);
    return { pointsAwarded: awarded };
  } catch (err) {
    await queueFailedPrize(userId, String(sourceId), gameType, prizeType, amount);
    return { pointsAwarded: 0 };
  }
}

async function queueFailedPrize(
  userId: string,
  sourceId: string,
  gameType: string,
  prizeType: string,
  prizeValue: number
): Promise<void> {
  await supabase.from('failed_prizes').insert({
    user_id: userId,
    source_id: sourceId,
    game_type: gameType,
    prize_type: prizeType,
    prize_value: prizeValue,
    retry_count: 0,
    created_at: new Date().toISOString(),
  }).then(({ error }) => {
    if (error) console.error('[GamesAgent] Failed to queue prize:', error);
  });
}

async function updateLeaderboard(userId: string, scoreType: 'spin' | 'tap', value: number): Promise<void> {
  const weekStart = getWeekStart();

  const { data: existing } = await supabase
    .from('game_leaderboard')
    .select('tap_score, spin_score, order_streak, display_name')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .single();

  const tapScore = scoreType === 'tap'
    ? (existing?.tap_score ?? 0) + value
    : existing?.tap_score ?? 0;

  const spinScore = scoreType === 'spin'
    ? (existing?.spin_score ?? 0) + value
    : existing?.spin_score ?? 0;

  const streak = existing?.order_streak ?? 0;
  const totalScore = tapScore + spinScore + streak * 10;

  const { data: user } = await supabase
    .from('users')
    .select('name, email')
    .eq('id', userId)
    .single();

  const displayName = user?.name || user?.email?.split('@')[0] || 'Player';

  await supabase.from('game_leaderboard').upsert(
    {
      user_id: userId,
      week_start: weekStart,
      display_name: displayName,
      tap_score: tapScore,
      spin_score: spinScore,
      order_streak: streak,
      total_score: totalScore,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,week_start' }
  );
}

function pickWeightedPrize(): typeof SPIN_PRIZES[number] {
  const totalWeight = SPIN_PRIZES.reduce((sum, p) => sum + p.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const prize of SPIN_PRIZES) {
    rand -= prize.weight;
    if (rand <= 0) return prize;
  }
  return SPIN_PRIZES[0];
}

function generateVoucherCode(): string {
  return `B60-${Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('').toUpperCase()}`;
}

function getWeekStart(): string {
  const now = new Date();
  // Convert to GST (UTC+4)
  const gst = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  const day = gst.getUTCDay();
  const diff = (day === 0 ? -6 : 1 - day);
  const monday = new Date(gst);
  monday.setUTCDate(gst.getUTCDate() + diff);
  return monday.toISOString().split('T')[0];
}

function getPreviousWeekStart(): string {
  const now = new Date();
  const gst = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  const day = gst.getUTCDay();
  const diff = (day === 0 ? -6 : 1 - day);
  const thisMonday = new Date(gst);
  thisMonday.setUTCDate(gst.getUTCDate() + diff);
  const lastMonday = new Date(thisMonday);
  lastMonday.setUTCDate(thisMonday.getUTCDate() - 7);
  return lastMonday.toISOString().split('T')[0];
}
