# Implementation Plan: ColeDance Momentum & Combo Multiplier Points System

Design and implement a signature, non-standard scoring engine for ColeDance built on real-time dancer momentum, consecutive move combos, dynamic multipliers (up to 4x), and a 5-tier rank progression system (Bronze -> Silver -> Gold -> Diamond -> Legend).

---

## 1. Core Mechanics & Mathematical Architecture

### A. Base Points & Precision Tiers
Each dance move evaluated against the coach keyframe will score base points scaled by pose accuracy:
- **PERFECT (85%+ accuracy):** 100 base points
- **SUPER (70%-84% accuracy):** 75 base points
- **GOOD (50%-69% accuracy):** 45 base points
- **OK (25%-49% accuracy):** 20 base points
- **MISS (<25% or standing still):** 0 points

### B. Dynamic Momentum Gauge (0% to 100%)
- **Momentum Fill:**
  - `PERFECT` adds **+25%** momentum.
  - `SUPER` adds **+15%** momentum.
  - `GOOD` adds **+8%** momentum.
  - `OK` maintains current momentum.
  - `MISS` cuts momentum by **-40%** (does not fully wipe streak if momentum was high).
- **Visual Presentation:** A neon electric arc/bar encircling the player's HUD avatar and Kinect mini silhouette, glowing brighter and pulsating as momentum builds.

### C. Combo Multiplier Engine (1x to 4x)
The multiplier dynamically increases as the player maintains streaks and fills the momentum gauge:
- **1x Multiplier:** Default (Streak 0 to 4 moves, Momentum 0% - 29%)
- **2x Multiplier:** Streak $\ge 5$ consecutive clean moves (Momentum $\ge 30\%$)
- **3x Multiplier:** Streak $\ge 10$ consecutive clean moves (Momentum $\ge 65\%$)
- **4x Multiplier (MAX OVERDRIVE):** Streak $\ge 16$ consecutive clean moves (Momentum 100%)
- **Final Move Score Equation:**
  $$\text{Awarded Points} = \text{Base Points} \times \text{Active Multiplier} \times (1 + \text{Velocity Bonus})$$
  *(Velocity bonus rewards energetic physical execution up to +15% without inflating baseline scores).*

---

## 2. ColeDance Rank Hierarchy (Bronze to Legend)

Replace generic star milestones with the **ColeDance Prestige Ranks**, displayed dynamically during routines and on the Results screen:

| Rank | Required Points | Visual Aesthetic | Milestone Unlock |
| :--- | :--- | :--- | :--- |
| **Bronze Dancer** | 0 – 2,499 | Warm bronze crest & subtle ember particles | Routine starting rank |
| **Silver Groove** | 2,500 – 5,499 | Polished chrome silver crest with white flare | Unlocked at steady performance |
| **Gold Megastar** | 5,500 – 8,999 | Radiant golden crest with starburst pulse | Consistent combo player |
| **Diamond Elite** | 9,000 – 11,999 | Prismatic cyan/magenta crystal diamond badge | High streak mastery |
| **Legend** | 12,000+ | Blazing holographic violet/gold crown with cosmic aura | 1x celebration fanfare & confetti |

---

## 3. Audio & Sensory Feedback (Smooth Crescendo Chimes)

- **Sound Design:** 
  - Subdued, musical frequency arpeggios that sit gently underneath the song's audio without drowning out the vocals or beat.
  - Multiplier Level-Up Chimes (C-E-G-B chord arpeggio at 0.04 volume).
  - Single-fire milestone fanfare when ascending to **Diamond** or **Legend** rank (guarded with refs so it never loops).
- **Streak Callouts:** Smooth animated multiplier badges (`x2 COMBO!`, `x3 ON FIRE!`, `x4 OVERDRIVE!`) floating upwards from the player's card.

---

## 4. Technical File Changes & Proposed Workflow

### Step 1: Types & Data Model (`src/types/game.ts`)
- Update `Player` interface:
  - `momentum: number` (0 to 100)
  - `multiplier: number` (1, 2, 3, or 4)
  - `rank: 'Bronze' | 'Silver' | 'Gold' | 'Diamond' | 'Legend'`
  - `maxStreak: number`

### Step 2: Scoring Engine (`src/services/yoloPoseTracker.ts` & `src/services/momentumScoring.ts`)
- Implement a dedicated `MomentumScoringService` to compute move points, update momentum, calculate multiplier upgrades/downgrades, and determine rank tiers.
- Decouple point values from hardcoded ONNX output so all game modes share the identical momentum formula.

### Step 3: HUD & Gameplay Screen (`src/components/GameplayScreen.tsx`)
- Update player cards:
  - Momentum Gauge meter (fluid CSS transition width & glowing border).
  - Active Multiplier Pill badge (`x1`, `x2`, `x3`, `x4 MAX`).
  - Current Rank crest (`BRONZE` -> `SILVER` -> `GOLD` -> `DIAMOND` -> `LEGEND`).
  - Ensure `handleFinish()` sends the full, synchronized `activePlayersRef.current` object with all momentum and rank stats to `onFinishRoutine`.

### Step 4: Results Screen (`src/components/ResultsScreen.tsx`)
- Display the player's final ColeDance Rank badge (Bronze, Silver, Gold, Diamond, or Legend) with distinct color gradients and icons.
- Display Max Streak, Peak Multiplier, and Total Routine Points.

### Step 5: Audio Engine (`src/services/soundEffects.ts`)
- Add subtle, warm crescendo chimes for multiplier level-ups and milestone rank advancements, rate-limited and volume-balanced.

---

## 5. Verification Plan
1. **TypeScript Build:** Run `npx tsc --noEmit` to confirm complete type safety.
2. **Applet Compilation:** Run `compile_applet` and verify 0 errors.
3. **Gameplay Verification:** Confirm that standing still yields 0 points / MISS, continuous moving builds momentum up to 4x, and reaching 12,000 pts unlocks Legend rank cleanly without fanfare looping.
