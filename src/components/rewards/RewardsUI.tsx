import { useState } from "react";
import {
  SHOP_ITEMS, DAILY_REWARDS, type ItemCategory, type ShopItem,
  type UseRewards,
} from "@/lib/rewards";

// ====== Coin & Rank chips ======
export function CoinChip({ coins, glow = true }: { coins: number; glow?: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 rounded-full border border-[oklch(0.82_0.17_85/0.5)] bg-card/70 px-3 py-1 backdrop-blur ${glow ? "shadow-[0_0_18px_oklch(0.82_0.17_85/0.35)]" : ""}`}>
      <span className="text-[oklch(0.82_0.17_85)]">●</span>
      <span className="text-sm font-black tabular-nums tracking-wider text-foreground">{coins.toLocaleString()}</span>
    </div>
  );
}

export function RankBar({ r }: { r: UseRewards }) {
  const inLvl = r.xp - r.xpFloor;
  const need = r.xpCeil - r.xpFloor;
  const pct = Math.min(100, (inLvl / Math.max(1, need)) * 100);
  return (
    <div className="flex w-full max-w-xs flex-col gap-1">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em]">
        <span style={{ color: r.rank.color, textShadow: `0 0 12px ${r.rank.color}88` }} className="font-black">
          {r.rank.name}
        </span>
        <span className="text-muted-foreground">LVL {r.level}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full transition-all" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${r.rank.color}, #FFD700)` }} />
      </div>
      <span className="text-right text-[9px] tabular-nums text-muted-foreground">{inLvl}/{need} XP</span>
    </div>
  );
}

// ====== Daily Reward Modal ======
export function DailyRewardModal({ r, onClose }: { r: UseRewards; onClose: () => void }) {
  const [claimed, setClaimed] = useState<number | null>(null);
  const handleClaim = () => {
    const amt = r.claimDaily();
    if (amt > 0) setClaimed(amt);
    else onClose();
  };
  const day = r.streakDay;
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-[oklch(0.82_0.17_85/0.4)] bg-card/90 p-6 shadow-[0_0_60px_oklch(0.82_0.17_85/0.35)]">
        <p className="text-center text-[10px] tracking-[0.5em] text-muted-foreground">DAILY REWARD</p>
        <h2 className="mt-1 text-center text-3xl font-black uppercase tracking-widest text-foreground text-glow-gold">
          {claimed === null ? "Sign In Bonus" : `+${claimed}`}
        </h2>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          {claimed === null ? `Day ${day} of 7${r.canClaimDaily ? "" : " — claimed"}` : "Coins added!"}
        </p>

        <div className="mt-6 grid grid-cols-7 gap-2">
          {DAILY_REWARDS.map((amt, i) => {
            const dayIdx = i + 1;
            const isToday = dayIdx === day && r.canClaimDaily && claimed === null;
            const isPast = dayIdx < day || (!r.canClaimDaily && dayIdx === day) || (claimed !== null && dayIdx <= day);
            return (
              <div
                key={i}
                className={`flex flex-col items-center rounded-lg border p-2 text-center ${
                  isToday
                    ? "border-[oklch(0.82_0.17_85)] bg-[oklch(0.82_0.17_85/0.15)] animate-pulse"
                    : isPast
                      ? "border-[oklch(0.7_0.22_245/0.5)] bg-card/50 opacity-70"
                      : "border-border bg-card/30 opacity-50"
                }`}
              >
                <span className="text-[9px] tracking-widest text-muted-foreground">D{dayIdx}</span>
                <span className={`mt-0.5 text-[10px] font-black tabular-nums ${isToday ? "text-[oklch(0.82_0.17_85)]" : "text-foreground"}`}>
                  {amt}
                </span>
                {dayIdx === 7 && <span className="mt-0.5 text-[8px] tracking-wider text-[oklch(0.7_0.22_245)]">+SKIN</span>}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex gap-3">
          {claimed === null && r.canClaimDaily ? (
            <button onClick={handleClaim} className="btn-arcade flex-1">CLAIM</button>
          ) : (
            <button onClick={onClose} className="btn-arcade flex-1">CONTINUE</button>
          )}
        </div>

        {r.data.daily && r.data.daily.challenges.length > 0 && (
          <div className="mt-5 rounded-lg border border-[oklch(0.7_0.22_245/0.4)] bg-[oklch(0.7_0.22_245/0.08)] p-3">
            <p className="mb-2 text-[10px] tracking-[0.3em] text-[oklch(0.7_0.22_245)]">DAILY CHALLENGES</p>
            <div className="flex flex-col gap-2">
              {r.data.daily.challenges.map(ch => {
                const done = ch.progress >= ch.target;
                return (
                  <div key={ch.id} className="rounded-md bg-background/40 p-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-foreground">{ch.label}</p>
                      <span className="text-[11px] font-black text-[oklch(0.82_0.17_85)]">+{ch.reward}</span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full ${ch.claimed ? "bg-emerald-400" : "bg-gradient-to-r from-[oklch(0.7_0.22_245)] to-[oklch(0.82_0.17_85)]"} transition-all`}
                        style={{ width: `${(ch.progress / ch.target) * 100}%` }}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-[10px] tabular-nums text-muted-foreground">{Math.min(ch.progress, ch.target)}/{ch.target}</span>
                      {ch.claimed ? (
                        <span className="text-[10px] tracking-widest text-emerald-400">CLAIMED ✓</span>
                      ) : done ? (
                        <button
                          onClick={() => r.claimChallenge(ch.id)}
                          className="rounded bg-[oklch(0.82_0.17_85)] px-2 py-0.5 text-[10px] font-black tracking-widest text-background hover:brightness-110"
                        >
                          CLAIM →
                        </button>
                      ) : (
                        <span className="text-[10px] tracking-widest text-muted-foreground">IN PROGRESS</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ====== Shop Screen ======
function ItemPreviewSwatch({ item }: { item: ShopItem }) {
  const p = item.preview;
  if (item.category === "paddle") {
    return <div className="h-10 w-full rounded" style={{ background: `linear-gradient(135deg, ${p.a}, ${p.b})`, boxShadow: `0 0 18px ${p.glow}66` }} />;
  }
  if (item.category === "table") {
    return <div className="h-10 w-full rounded" style={{ background: `linear-gradient(180deg, ${p.top}, ${p.mid}, ${p.top})`, borderTop: `2px solid ${p.line}`, borderBottom: `2px solid ${p.line}` }} />;
  }
  if (item.category === "ball") {
    return (
      <div className="flex h-10 w-full items-center justify-center rounded bg-[oklch(0.1_0.05_260)]">
        <div className="h-5 w-5 rounded-full" style={{ background: "radial-gradient(circle at 30% 30%, #fff, " + p.glow + ")", boxShadow: `0 0 18px ${p.glow}` }} />
      </div>
    );
  }
  // victory
  return (
    <div className="flex h-10 w-full items-center justify-center rounded bg-[oklch(0.1_0.05_260)]">
      <span className="text-lg" style={{ color: p.glow, textShadow: `0 0 12px ${p.glow}` }}>★</span>
    </div>
  );
}

export function ShopScreen({ r, onBack }: { r: UseRewards; onBack: () => void }) {
  const [tab, setTab] = useState<ItemCategory>("paddle");
  const items = SHOP_ITEMS.filter(i => i.category === tab);
  return (
    <div className="flex w-full max-w-3xl flex-col items-center">
      <div className="mb-2 flex items-center gap-4">
        <h2 className="text-2xl font-black uppercase tracking-[0.2em] text-foreground text-glow-gold sm:text-4xl">Shop</h2>
        <CoinChip coins={r.coins} />
      </div>
      <p className="mb-5 text-[10px] tracking-[0.3em] text-muted-foreground">SPEND COINS · EQUIP UNLOCKED ITEMS</p>

      <div className="mb-4 flex flex-wrap justify-center gap-2">
        {(["paddle", "ball", "table", "victory"] as ItemCategory[]).map(c => (
          <button
            key={c}
            onClick={() => setTab(c)}
            className={`rounded-full px-4 py-1.5 text-[10px] font-black tracking-[0.25em] uppercase transition ${
              tab === c
                ? "bg-[oklch(0.82_0.17_85)] text-background"
                : "border border-border bg-card/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            {c === "victory" ? "Victory FX" : c + "s"}
          </button>
        ))}
      </div>

      <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map(item => {
          const owned = r.isOwned(item.id);
          const equipped = r.data.equipped[item.category] === item.id;
          const check = owned ? { ok: true } : r.canPurchase(item.id);
          return (
            <div
              key={item.id}
              className={`rounded-lg border-2 p-3 transition ${
                equipped
                  ? "border-[oklch(0.82_0.17_85)] bg-card shadow-[0_0_24px_oklch(0.82_0.17_85/0.3)]"
                  : owned
                    ? "border-[oklch(0.7_0.22_245/0.6)] bg-card/60"
                    : "border-border bg-card/30"
              }`}
            >
              <ItemPreviewSwatch item={item} />
              <p className="mt-2 text-xs font-bold text-foreground">{item.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {owned ? (equipped ? "Equipped" : "Owned") : `${item.price.toLocaleString()} coins${item.rankRequired ? ` · L${item.rankRequired}+` : ""}`}
              </p>
              <div className="mt-2">
                {owned ? (
                  <button
                    disabled={equipped}
                    onClick={() => r.equip(item.id)}
                    className={`w-full rounded px-2 py-1 text-[10px] font-black tracking-widest transition ${
                      equipped
                        ? "bg-[oklch(0.82_0.17_85/0.2)] text-[oklch(0.82_0.17_85)]"
                        : "bg-[oklch(0.7_0.22_245)] text-background hover:bg-[oklch(0.75_0.22_245)]"
                    }`}
                  >
                    {equipped ? "EQUIPPED" : "EQUIP"}
                  </button>
                ) : (
                  <button
                    disabled={!check.ok}
                    onClick={() => r.purchase(item.id)}
                    className={`w-full rounded px-2 py-1 text-[10px] font-black tracking-widest transition ${
                      check.ok
                        ? "bg-[oklch(0.82_0.17_85)] text-background hover:bg-[oklch(0.85_0.17_85)]"
                        : "cursor-not-allowed bg-muted text-muted-foreground"
                    }`}
                  >
                    {check.ok ? "BUY" : (check.reason ?? "LOCKED").toUpperCase()}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={onBack} className="mt-8 text-[11px] tracking-[0.4em] text-muted-foreground hover:text-foreground">
        ← BACK
      </button>
    </div>
  );
}

// ====== Post-match payout ======
export function PostMatchPayout({ result }: { result: { coins: number; xp: number; leveledUp: boolean; prevLevel: number; newLevel: number; breakdown: { label: string; coins: number; xp: number }[] } }) {
  return (
    <div className="mb-6 w-full max-w-sm rounded-xl border border-[oklch(0.82_0.17_85/0.4)] bg-card/70 p-4 backdrop-blur">
      <div className="flex items-baseline justify-between border-b border-border pb-2">
        <span className="text-[10px] tracking-[0.4em] text-muted-foreground">REWARDS</span>
        <span className="text-xl font-black text-[oklch(0.82_0.17_85)] text-glow-gold">+{result.coins.toLocaleString()}</span>
      </div>
      <ul className="mt-2 flex flex-col gap-1">
        {result.breakdown.map((b, i) => (
          <li key={i} className="flex items-center justify-between text-xs">
            <span className="text-foreground">{b.label}</span>
            <span className="flex gap-2 tabular-nums">
              {b.coins > 0 && <span className="text-[oklch(0.82_0.17_85)]">+{b.coins}c</span>}
              {b.xp > 0 && <span className="text-[oklch(0.7_0.22_245)]">+{b.xp}xp</span>}
            </span>
          </li>
        ))}
      </ul>
      {result.leveledUp && (
        <div className="mt-3 rounded-md bg-[oklch(0.82_0.17_85/0.15)] px-3 py-2 text-center text-xs font-black tracking-widest text-[oklch(0.82_0.17_85)] text-glow-gold">
          ★ RANK UP · LVL {result.prevLevel} → {result.newLevel}
        </div>
      )}
    </div>
  );
}
