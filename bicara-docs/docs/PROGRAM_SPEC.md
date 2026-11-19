# PROGRAM_SPEC.md — Anchor `ContactRegistry` Verified Address Book (Gate C)

## Philosophy & Gating Rule (Decision D9)

`ContactRegistry` is reframed as Bicara's on-chain **verified address book** — directly solving Problem (a): blind and low-vision users cannot visually verify a 44-character Base58 wallet address on every transfer.

- **Build Gate**: Build and deploy `ContactRegistry` **ONLY in Gate C (25 Nov)** — strictly AFTER Gate B passes end-to-end (`voice → intent → confirm → TransferChecked on Devnet → spoken receipt`).
- **Scope Discipline**: Keep the program razor-thin (**two instructions**: `register_contact` and `update_contact`) and zero bloat.

---

## Why an On-Chain Verified Address Book Matters

1. **Verifiable Recovery Across Devices**: If a blind user switches Android phones or reinstalls Bicara, their trusted name → wallet address mappings are recoverable directly from Solana PDAs (`["contact", owner_pubkey, normalized_name]`) rather than trusting a centralized database alone.
2. **Biometric-Gated Contact Integrity (Layer 3 + Layer 5)**: Both `register_contact` and `update_contact` require `owner: Signer<'info>` signed via MWA hardware-backed biometric (`has_one = owner`). **Voice alone can never add or change a contact address**, blocking address-poisoning attacks by spoofed speech or STT mistakes.

---

## Open Design Flag: Non-ASCII `normalized_name` Case Folding (`OPEN DECISION`)

> **FLAGGED — DO NOT SILENTLY PATCH WITHOUT A HUMAN DECISION**

In a global app supporting worldwide users and names, the current draft checks:
- On-chain Rust: `normalized_name == normalized_name.trim().to_lowercase()` (Rust `str::to_lowercase()`, full Unicode case mapping)
- Client TypeScript: `name.trim().toLowerCase()` (ECMAScript `String.prototype.toLowerCase()`)

**The Risk**: For non-ASCII Unicode characters (such as accented combining forms vs. precomposed characters, Turkish `İ`/`I`, or certain Unicode case mappings), Rust `to_lowercase()` and JavaScript `toLowerCase()` can produce **different UTF-8 byte sequences**. Because `normalized_name.as_bytes()` is used directly inside the PDA seed, any client/program divergence would derive a **different PDA address** or cause `ContactError::NameNotNormalized` failures on-chain.

**Proposed Options (Decision Left Open for Human)**:
- **Option A — Restrict `normalized_name` Seeds to ASCII Lowercase**: Allow full UTF-8 in `display_name` (spoken and displayed to the user), while restricting `normalized_name` strictly to ASCII lowercase (`a-z`, `0-9`, single spaces/hyphens, transliterated or stripped deterministically on client) and validating `is_ascii()` on-chain in Rust. Simplest, zero-divergence PDA derivation.
- **Option B — Identical Client-Side Canonical Normalization**: Define a single deterministic normalization spec (e.g., Unicode NFC + explicit shared mapping) and remove redundant Rust `to_lowercase()` re-derivation in favor of byte-level validation or hashed seed (`sha256(canonical_name)`). Supports arbitrary global scripts at the cost of extra client-side hashing/spec discipline.

**Status**: `OPEN DECISION` — resolve before Gate C implementation on 25 Nov 2026.

---

## 2026 Tooling & SDK Integration

1. **Anchor CLI via AVM**:
   ```bash
   cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
   avm install latest
   avm use latest
   anchor --version
   ```
2. **Track A (`@solana/kit@^8.6.0`) Client Pattern**:
   - Use **Codama** (`npx create-codama-clients`) from `target/idl/contact_registry.json`, OR derive PDAs directly with `@solana/kit`'s `getProgramDerivedAddress` + Borsh decoding.
   - Do NOT mix `@coral-xyz/anchor` (`@solana/web3.js` v1) types into Track A `@solana/kit` files.
3. **Dual-Write Pattern (Supabase + PDA)**:
   - Writes (add/update contact): Prompt MWA hardware biometric → submit `register_contact` / `update_contact` on `solana:devnet` → mirror into Supabase `contacts` cache and immediately refresh `scribe_v2` dynamic `keyterms`.
   - Reads (voice send resolution): Fast lookup in Supabase cache with on-chain `ContactRegistry` PDA verification/fallback.

---

## Reference Anchor Program (`program/programs/contact-registry/src/lib.rs`)

> Note: Keep line 56 (`to_lowercase()`) flagged until the Open Decision above (Option A vs. Option B) is resolved before Gate C.

```rust
use anchor_lang::prelude::*;

declare_id!("FILL_AFTER_DEPLOY");

#[program]
pub mod contact_registry {
    use super::*;

    pub fn register_contact(
        ctx: Context<RegisterContact>,
        normalized_name: String,
        display_name: String,
        wallet: Pubkey,
    ) -> Result<()> {
        require!(!normalized_name.is_empty(), ContactError::EmptyName);
        require!(normalized_name.len() <= 50, ContactError::NameTooLong);
        require!(display_name.len() <= 50, ContactError::NameTooLong);
        // OPEN FLAG: Rust to_lowercase() vs JS toLowerCase() can differ for non-ASCII names.
        // Decide between Option A (ASCII-only seed) or Option B (canonical/hashed seed) before Gate C.
        require!(
            normalized_name == normalized_name.trim().to_lowercase(),
            ContactError::NameNotNormalized
        );

        let record = &mut ctx.accounts.contact_record;
        record.owner = ctx.accounts.owner.key();
        record.name = display_name.trim().to_string();
        record.normalized_name = normalized_name;
        record.wallet = wallet;
        record.created_at = Clock::get()?.unix_timestamp;
        record.bump = ctx.bumps.contact_record;

        Ok(())
    }

    pub fn update_contact(
        ctx: Context<UpdateContact>,
        _normalized_name: String,
        new_wallet: Pubkey,
    ) -> Result<()> {
        ctx.accounts.contact_record.wallet = new_wallet;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(normalized_name: String)]
pub struct RegisterContact<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + 32 + (4 + 50) + (4 + 50) + 32 + 8 + 1,
        seeds = [b"contact", owner.key().as_ref(), normalized_name.as_bytes()],
        bump
    )]
    pub contact_record: Account<'info, ContactRecord>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(normalized_name: String)]
pub struct UpdateContact<'info> {
    #[account(
        mut,
        seeds = [b"contact", owner.key().as_ref(), normalized_name.as_bytes()],
        bump = contact_record.bump,
        has_one = owner,
    )]
    pub contact_record: Account<'info, ContactRecord>,

    pub owner: Signer<'info>,
}

#[account]
pub struct ContactRecord {
    pub owner: Pubkey,
    pub name: String,
    pub normalized_name: String,
    pub wallet: Pubkey,
    pub created_at: i64,
    pub bump: u8,
}

#[error_code]
pub enum ContactError {
    #[msg("Contact name cannot be empty")]
    EmptyName,
    #[msg("Contact name must be 50 bytes or less")]
    NameTooLong,
    #[msg("Normalized name must be trimmed lowercase")]
    NameNotNormalized,
}
```
