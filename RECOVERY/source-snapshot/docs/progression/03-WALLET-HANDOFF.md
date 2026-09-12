# Wallet Handoff and Distribution

DESIGN RESPONSE — NO PAYMENT CODE WRITTEN

Returns the three things asked for: the web account\-handoff design, current distribution assumptions, and storefront restrictions. Two issues in the direction need a decision first.

## 1\. The currency question is answered

Command Credit is the earned currency, Tokens are purchased, both spend toward upgrades at equal value. That resolves the ambiguity blocking the cost curve.

The three curves in the previous plan hold unchanged — cost per level is denominated in a unit, and that unit is now "Token **or** Command Credit at 1:1." What changes is the second half of the model: the earn schedule is a **Command Credit** schedule, and the 12\-per\-day throughput cap remains the only limiter that binds a paying player.

The structure is clean, and worth stating plainly because it is the thing that makes the fairness claim true: **money buys the currency, but the throughput cap decides the progress.** A player with unlimited Tokens and a player with sufficient Command Credit advance at exactly the same 12 level\-ups per day.

## 2\. Two issues that need a decision

### 2\.1 Calendar week reverses your own earlier reasoning

This direction says *"10,000 purchased Tokens per **server calendar week**"* and *"current server\-week purchase limit."*

The original direction said: *"I treated 'per week' as a **rolling seven\-day** 10,000\-token credit cap, **which avoids buying 10,000 just before a reset and another 10,000 just after it.**"*

A calendar week reintroduces exactly that. A player buys 10,000 Tokens at 23:50 Sunday RST and another 10,000 at 00:10 Monday RST — 20,000 Tokens, $2,000, inside twenty minutes, both purchases legal.

Rolling is harder to display (there is no clean "resets Monday" line) but it is the one that holds. Calendar is easier to explain and has a seam.

**My recommendation: keep rolling seven days, and display it as "remaining capacity" with the instant the oldest purchase falls out of the window** — which the Profile wallet already calls for showing. The UI copy you specified works for either model; the seam does not.

If you want calendar week for player clarity, that is a legitimate trade and I will build it — but it should be a decision, not an inheritance.

### 2\.2 Add Tokens and Settings both want the slot above Log Out

Settings shipped last night directly above Log Out, and this direction places Add Tokens directly above Log Out. One of them moves.

**Proposal:** Add Tokens, then Settings, then Log Out — Add Tokens takes the specified slot and Settings moves up one. Money and destructive actions should not be adjacent; putting Add Tokens between Settings and Log Out means a mis\-tap on Log Out lands on a purchase entry point instead. Either order has that property, so the deciding argument is that your direction named the slot explicitly and Settings did not.

## 3\. Account handoff design

### Shape

The handoff is a **capability, not a credential**. It carries no identity, no balance, no amount, and no secret — it is an opaque lookup key with a short life and exactly one use.

1. Player taps **Add Tokens**. The client POSTs `/api/wallet/handoff` with its existing session cookie and an empty body.
2. The server generates 32 random bytes and writes a row: `player_id`, `token`, `created_at`, `expires_at` (**120 seconds**), `consumed_at` (null), plus the requesting user\-agent and IP hash for audit only.
3. The server returns `{url: "https://worldwarrogue.com/wallet?h=<token>"}`.
4. The client opens that URL in the **system browser**, never an embedded web view. This matters twice: an in\-app web view is what storefront rules treat as an in\-app purchase surface, and it is also the shape phishing takes, so players should learn that payment always happens in a real browser with a real address bar.
5. The wallet page POSTs the handoff token to `/api/wallet/claim`.
6. The server consumes it with a conditional update — the same compare\-and\-set discipline used everywhere else in the codebase:

```sql
UPDATE wallet_handoffs
   SET consumed_at = ?1
 WHERE token = ?2 AND consumed_at IS NULL AND expires_at > ?1
```

If that affects zero rows, the claim is refused. A replayed, expired or already\-used link cannot mint a session.

7. On success the server issues a **wallet session cookie** for that player and the page renders the wallet.
8. The row is retained, consumed, for audit. It is never reusable.

### Why the wallet session is narrower than the game session

The wallet cookie authorises exactly four things: read the package list, read your own balances and purchase history, start a checkout, and read remaining capacity. It cannot move a squad, launch an attack, post in chat, or change your password.

That is cheap to build and it changes the blast radius. If a wallet session leaks, the attacker can look at your purchase history and buy you Tokens. They cannot touch your game.

### What the 120\-second window is actually protecting against

URLs leak — browser history, screenshots, someone standing behind you, a shared screen. Single\-use plus two minutes bounds the exposure to "somebody who saw your screen within two minutes and got to it before you did."

Worth being clear\-eyed about the residual risk, because it is unusual: the worst an attacker can do with a claimed wallet session is **spend their own money adding Tokens to your account**, and read your purchase history. There is no withdrawal path and no way to move value out. The information disclosure is the real exposure, and it is small.

**Additional hardening, all cheap:**

- Rate\-limit handoff creation to five per ten minutes per account, so the endpoint cannot be used to spray links.
- Never log the token value. Log the row id.
- No referrer leakage: the wallet page strips `?h=` from the URL with `history.replaceState` immediately after claiming, so it is gone from the address bar and from any outbound referrer.
- The handoff table needs no cleanup job — rows expire by comparison, and settle\-on\-read applies here like everywhere else.

### What is deliberately not in the link

Per your constraint, and worth restating as a rule the implementation must not drift from: no password, no balance, no Token amount, no package selection, no permanent authentication secret, no account id. The server resolves all of it from the row after the claim. If a future change adds a parameter to that URL, it is a security review, not a refactor.

## 4\. Distribution assumptions

**Today, World War Rogue is web only.** There is no Apple developer account, no Google Play listing, no native shell, and no build target for either in the repository — it is a Vite SPA served by a Cloudflare Worker. It is PWA\-capable in the sense that any modern SPA is, but nothing has been done to make it installable.

**Therefore the direct web\-wallet flow you specified is fully permitted right now**, because no storefront is involved. Nothing in §3 above needs a compliance caveat for the current distribution.

**The architectural recommendation** is to build it so a future store build is a configuration change rather than a redesign:

A single build\-time `DISTRIBUTION` constant in `shared/` — `'web' | 'ios' | 'android'` — decides what **Add Tokens** does. Everything downstream of the purchase is identical: the same server\-side ledger, the same account, the same balance, the same 12\-per\-day throughput cap, the same idempotency guarantee.

Only the entry point differs. The wallet, the ledger and the balance are shared across every distribution regardless of where the money came in.

That keeps your requirement — *"keep the wallet and Token ledger shared across web and mobile regardless of the permitted purchase entry point"* — structurally true rather than maintained by discipline.

## 5\. Storefront restrictions

**A caution about this section.** My reliable knowledge ends in May 2026, and these particular rules have changed repeatedly through litigation and regulation — the Epic v. Apple injunction, the EU Digital Markets Act, Korean and Dutch payment legislation, and Google's User Choice Billing pilots have each moved them, sometimes within a quarter.

I can tell you the shape of the constraint and what to check. **I cannot tell you the current state of these programs with confidence, and you should not treat this section as authoritative.** Before any store build, this needs reading against the live guidelines you linked and, given the sums involved, a lawyer who does app distribution.

**The durable shape of the constraint**, which has not changed even as the details have:

- In\-game currency spent inside the app is a digital good. Both storefronts have historically required their own billing for it, with commission attached.
- Anti\-steering rules restrict telling players inside the app that they can buy elsewhere — historically including the link, the button, and the wording.
- Both of those have been loosened in specific jurisdictions and under specific programs, unevenly, and the entitlements are applied for rather than assumed.
- A web view inside the app is generally treated as inside the app. The system browser is the boundary that matters.

**What that means practically for a store build:** assume the platform's billing is required, apply for whatever regional program permits otherwise, and treat the external link as something you enable per\-region once approved — not as the default that gets disabled where prohibited. The safe default and the permitted exception should be that way round.

### The cap\-versus\-IAP edge case, which needs a policy decision now

If Tokens can be bought through both web and a storefront, the 10,000 limit must apply across both. That creates a case with no comfortable answer:

A player buys through Apple. Apple takes the money and confirms the transaction. Your server then finds the purchase would breach the weekly cap.

**The player has been charged and the storefront considers it complete.** Refusing the credit means taking money and delivering nothing, which is indefensible regardless of what the cap says.

**My recommendation:** the cap is enforced at the point of *offering*, not at the point of crediting. Packages that would breach it are not shown or not purchasable. If one gets through anyway — a race, a delayed receipt, a restore — **credit it, let the cap be exceeded for that transaction, and block further purchases until the window clears.** Log it as a cap breach for review.

The alternative is a refund flow through the storefront, which is slower, worse for the player, and puts a refund on your account record for something that was your rule and not their mistake.

This is a policy decision, not an engineering one. On web you control checkout and can refuse cleanly before charging, so the case only arises on store builds — but it should be decided before either is built, because it determines whether the cap is a hard invariant or a soft limit with an audit trail.

## 6\. What I need before payment implementation

Ordered by what blocks what.

1. **Rolling seven days or calendar week** (§2.1). Affects the ledger query and the capacity display.
2. **Add Tokens / Settings order** (§2.2). Trivial, but it is your interface.
3. **Cap breach on a completed storefront purchase** (§5). Credit and exceed, or refund.
4. **Payment provider.** Stripe assumed; determines webhook shape and idempotency keys.
5. **Selling entity and tax treatment.** An accountant's question, unanswered.
6. **The Command Credit earn schedule** — sources, rates, unlock points. I owe you this and will return it with the cost\-curve recommendation now that the currency question is settled.

Nothing here changes the staged plan. Payments remain Stage 6, after progression exists and its fairness is proven live. The handoff design above is ready to build when that stage opens; none of it should be built before the thing it funds.
