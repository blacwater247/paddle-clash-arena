# Paddle Clash Arena — Pro Rewards System

A fast, generous, fully-local progression layer added to the existing game. Everything persists to `localStorage`, no backend required.

## The 4 Reward Pillars

### 1. Coins (currency)
Earned every match, spendable in a Shop.
- Win: **+50 coins** (Arcade), **+100** (Challenge), **+250** (Boss), **+75** (2P winner)
- Per point scored: **+5 coins**
- Power-up pickup: **+2 coins**
- Perfect game (opponent 0): **+200 bonus**
- Comeback win (was down 3+): **+150 bonus**

### 2. XP & Ranks
Same actions grant XP. Level up shows a flashy gold flash + coin bonus.
- Ranks: **Rookie → Amateur → Pro → Champion → Legend → Arena God** (6 tiers, 5 levels each = 30 levels)
- XP curve: `100 * level^1.4` (fast early, slower later)
- Rank-up reward: **+500 coins** and unlocks a cosmetic
- Rank badge displayed on start screen + during play HUD

### 3. Daily Streak
Opens a "Daily Reward" modal on first launch each day.
- Day 1: 50 coins · Day 2: 100 · Day 3: 200 · Day 4: 350 · Day 5: 500 · Day 6: 750 · **Day 7: 1500 + exclusive skin**
- Streak resets if a day is skipped; current streak shown on start screen
- Plus a **Daily Challenge** ("Win 3 Arcade matches", "Score 5 power-hits") for +300 coins

### 4. Cosmetic Shop
Spend coins. Replaces the current unlock-by-wins flow with buy-with-coins (existing skins stay, plus new ones).
- **Paddle skins**: Classic (free), Lightning (500), Neon (1000), Crimson (1500), Inferno (3000), Galaxy (5000), Prismatic (10000)
- **Ball trails**: Default, Fire, Electric, Rainbow, Comet, Void (300–4000)
- **Table themes**: existing 4 + Sunset, Cyber Grid, Volcano (1000–3500)
- **Victory effects**: Confetti, Lightning Storm, Fireworks (800–2500)
- Rank-locked items (e.g. Prismatic requires Legend rank)

## UI Additions

- **Start screen**: coin balance (top-right with gold coin icon), rank badge + XP bar, "Daily Reward" button if available, "Shop" button
- **Post-match screen**: animated coin counter rolling up, XP bar filling, "+50 coins", "+25 XP" floating numbers, rank-up celebration if triggered
- **Shop screen**: grid of items by category tab, locked items grayscale with price/rank requirement, purchase confirmation
- **Daily modal**: 7-day calendar grid showing claimed/today/upcoming

## Technical Notes

- Single `useRewards()` hook managing all state, persisted to `localStorage` key `pca_rewards_v1`
- Schema: `{ coins, xp, level, rank, streak: { count, lastClaimDate }, dailyChallenge: { id, progress, claimed }, ownedItems: string[], equipped: { paddle, ball, table, victory } }`
- Match-end handler in `PaddleClashArena.tsx` calls `rewards.grantMatchRewards({ won, score, opponentScore, mode, powerHits })`
- New components: `RewardsHUD`, `PostMatchRewards`, `DailyRewardModal`, `ShopScreen`, `RankBadge`
- Existing skins system migrated: previously win-gated items become coin-gated; grandfather current unlocks
- Keep black/gold/electric-blue aesthetic, Orbitron font, animated counters with `requestAnimationFrame`

## Out of scope
- Online leaderboards, accounts, cloud sync (user chose local)
- Real-money purchases
- Battle pass / seasons (can add later)

Ready to build when you approve.