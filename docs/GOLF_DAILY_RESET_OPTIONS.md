# Golf daily reset – implementation options

The daily puzzle should roll at “midnight” so everyone gets a new seed. The seed is currently derived from “today’s date” via `getTodayDateString()` in `golf/game.js`. How that date is defined (timezone, source of truth) determines when the day flips.

Below are several code-level ways to implement it. Pick one and implement; avoid mixing (e.g. don’t use both local date and Central in different places).

---

## 1. **Local midnight (current)**

- **What:** `getTodayDateString()` uses `new Date()` and `getFullYear()` / `getMonth()` / `getDate()` (no timezone).
- **Effect:** Day rolls at midnight in the user’s **local** timezone. Same as the main app’s `getTodaySeed()`.
- **Pros:** Matches “resets at midnight” for each user; no timezone logic.
- **Cons:** Users in different timezones get different puzzles on the same calendar day; not one global “daily” puzzle.

---

## 2. **Single canonical timezone (e.g. America/Chicago or UTC)**

- **What:** Compute “today” in one fixed timezone (e.g. Central or UTC) with `Intl.DateTimeFormat` and `formatToParts`, or `toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })`, then build `YYYY-MM-DD`.
- **Effect:** One puzzle per calendar day in that timezone. Day rolls at midnight **in that zone** (e.g. midnight Central or midnight UTC).
- **Pros:** Same puzzle for everyone globally on that calendar day; clear, single definition of “today.”
- **Cons:** “Midnight” in the UI may not match the user’s local midnight; you should show “Resets at midnight Central” (or UTC) so it’s clear.

---

## 3. **UTC date only (no DST)**

- **What:** `const d = new Date(); const y = d.getUTCFullYear(); const m = d.getUTCMonth() + 1; const day = d.getUTCDate();` and format as `YYYY-MM-DD`.
- **Effect:** Day rolls at midnight **UTC**.
- **Pros:** No `Intl` or timezone string; same everywhere; easy to reason about.
- **Cons:** Midnight UTC can be an odd time for US users; UI should say “Resets at midnight UTC.”

---

## 4. **Epoch days (integer seed)**

- **What:** `const epochDays = Math.floor(Date.now() / 86400000);` (or same in a chosen timezone: e.g. `Math.floor((now - offsetMs) / 86400000)`). Use `epochDays` (or a string like `"day" + epochDays`) as the seed instead of a date string.
- **Effect:** Same as “one day per period” in that timezone (or UTC if you use `Date.now()`).
- **Pros:** Integer seed; no date string parsing; easy to extend (e.g. different epoch for “season”).
- **Cons:** Less human-readable; you may still need a timezone offset if you don’t want UTC.

---

## 5. **Authoritative date from server / edge**

- **What:** Don’t trust the client clock. Request “today’s puzzle date” (or “today’s seed”) from your own API or edge function (e.g. Vercel serverless). Server computes the date in a chosen timezone and returns `YYYY-MM-DD` or the seed.
- **Effect:** Day rolls exactly when your server logic says it does (e.g. midnight Central on the server).
- **Pros:** No client clock or timezone bugs; one source of truth; can change rules without redeploying the client.
- **Cons:** Requires a small backend/edge call and handling offline/errors (e.g. fallback to client date or “try again”).

---

## 6. **External “current day” API**

- **What:** Call a public API that returns the current date in a timezone (e.g. worldtimeapi.org, or a minimal endpoint you host). Use that date string for the seed.
- **Pros:** Offloads timezone logic; client stays simple.
- **Cons:** Dependency and latency; need a fallback if the request fails.

---

## 7. **Align with main app and document**

- **What:** Use the **exact same** “today” logic as the main app (`game.js` `getTodaySeed()`): local date, no timezone. Copy or share a small helper (e.g. `getTodayDateString()`) so golf and main app never diverge.
- **Effect:** Golf and main app always reset at the same moment (local midnight).
- **Pros:** Consistent behavior across the product; no “golf reset at a different time” confusion.
- **Cons:** Same as option 1 (different timezones = different puzzles on the same wall-clock day).

---

## Recommendation

- If you want **one global daily puzzle** and don’t mind “midnight Central” or “midnight UTC”: use **2** or **3** (or **4** in UTC).
- If you want **golf and main app to always reset together** and “midnight” means the user’s midnight: keep **1** (current) and optionally formalize with **7**.
- If you want **full control and no client timezone bugs**: add a tiny server/edge endpoint and use **5**.

After choosing, implement in one place (e.g. `getTodayDateString()` in `golf/game.js`) and use that for the daily seed only; avoid mixing with cached seeds or other date logic.
