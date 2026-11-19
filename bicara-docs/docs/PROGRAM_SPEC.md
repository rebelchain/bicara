# PROGRAM_SPEC.md — Anchor ContactRegistry Program (2026 Verified)

## Philosophy

Keep this program razor-thin: **two instructions** (`register_contact` and `update_contact`) and zero bloat. Build and deploy ONLY after the full Eyes-Free Voice → Voiceprint → `TransferChecked` USDC loop works end-to-end.

---

## Why `ContactRegistry` Matters for Blind Users
Visually impaired users cannot read or visually verify 44-character wallet addresses on every transaction. Storing trusted contacts on-chain in a user-owned PDA (`["contact", owner_pubkey, normalized_name]`) means:
- Even if a blind user switches phones or reinstalls Bicara, their trusted voice address book is recoverable directly from Solana without relying solely on a centralized server.
- Only the wallet owner (`has_one = owner`) can register or update contact mappings — preventing address-poisoning attacks.

---

## 2026 Tooling & Breaking Changes Caught

1. **CLI Installation via AVM**:
   ```bash
   cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
   avm install latest
   avm use latest
   anchor --version
   ```
2. **TypeScript Package Shift**:
   - `@coral-xyz/anchor` maxed out at `0.32.1` (pinned to `@solana/web3.js` v1).
   - Anchor `0.32.2+` / `1.x` uses **`@anchor-lang/core`**.
   - On `@solana/kit` mobile frontends, use **Codama** (`npx create-codama-clients`) against `target/idl/contact_registry.json` OR derive PDAs directly with `getProgramDerivedAddress` + Borsh decoding.
3. **Bugs Fixed From Original Draft**:
   - Fixed `update_contact` parameter signature to pass `_normalized_name: String`.
   - Enforced `normalized_name = name.trim().toLowerCase()` for PDA seeds so voice transcripts `"Ahmad"` and `"ahmad"` always resolve deterministically.

---

## Full Anchor Program (`program/programs/contact-registry/src/lib.rs`)

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
