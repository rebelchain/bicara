# PROGRAM_SPEC.md — Anchor ContactRegistry Program

## Philosophy

Keep this program as small as possible.
Two instructions. That's it.
Every hour spent on Rust is an hour not spent on voice UX.

Build this ONLY after the full voice → USDC transfer flow works.

---

## What It Does

On-chain address book. Maps a name to a wallet address.
Owned by the user — only you can register your own contacts.

```
register_contact("Ahmad", 7xKp...mN3)
  → stores on-chain: { name: "Ahmad", wallet: 7xKp...mN3 }
  → PDA owned by your wallet

resolve_contact("Ahmad")  [read-only]
  → returns: 7xKp...mN3
```

---

## Program ID

```
After deploy to devnet:
  → copy Program ID
  → paste into CLAUDE.md (EXPO_PUBLIC_CONTACT_REGISTRY_PROGRAM_ID)
  → paste into mobile/constants/config.ts
```

---

## Account Structure

```rust
#[account]
pub struct ContactRecord {
    pub owner:      Pubkey,   // 32 bytes — who registered this
    pub name:       String,   // 4 + 50 bytes — contact name (max 50 chars)
    pub wallet:     Pubkey,   // 32 bytes — the wallet address
    pub created_at: i64,      // 8 bytes — unix timestamp
    pub bump:       u8,       // 1 byte — PDA bump
}
// Total: ~132 bytes
// Space: 8 (discriminator) + 32 + 54 + 32 + 8 + 1 = 135
```

---

## PDA Seeds

```rust
// Seeds: ["contact", owner_pubkey, name_as_bytes]
// This means: each user can have ONE contact per name
// "Ahmad" for wallet A is different from "Ahmad" for wallet B

let seeds = &[
    b"contact",
    ctx.accounts.owner.key().as_ref(),
    name.as_bytes(),
];
```

---

## Full Program (`programs/contact-registry/src/lib.rs`)

```rust
use anchor_lang::prelude::*;

declare_id!("FILL_AFTER_DEPLOY");

#[program]
pub mod contact_registry {
    use super::*;

    pub fn register_contact(
        ctx: Context<RegisterContact>,
        name: String,
        wallet: Pubkey,
    ) -> Result<()> {
        // Validate name length
        require!(name.len() > 0, ContactError::EmptyName);
        require!(name.len() <= 50, ContactError::NameTooLong);

        let record = &mut ctx.accounts.contact_record;
        record.owner      = ctx.accounts.owner.key();
        record.name       = name;
        record.wallet     = wallet;
        record.created_at = Clock::get()?.unix_timestamp;
        record.bump       = ctx.bumps.contact_record;

        Ok(())
    }

    // No-op instruction — resolve is done client-side by deriving PDA
    // Keeping this for completeness / potential future use
    pub fn update_contact(
        ctx: Context<UpdateContact>,
        new_wallet: Pubkey,
    ) -> Result<()> {
        ctx.accounts.contact_record.wallet = new_wallet;
        Ok(())
    }
}

// ─── Accounts ────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(name: String)]
pub struct RegisterContact<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + 32 + (4 + 50) + 32 + 8 + 1,
        seeds = [b"contact", owner.key().as_ref(), name.as_bytes()],
        bump
    )]
    pub contact_record: Account<'info, ContactRecord>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct UpdateContact<'info> {
    #[account(
        mut,
        seeds = [b"contact", owner.key().as_ref(), name.as_bytes()],
        bump = contact_record.bump,
        has_one = owner,
    )]
    pub contact_record: Account<'info, ContactRecord>,

    pub owner: Signer<'info>,
}

// ─── State ───────────────────────────────────────────────────

#[account]
pub struct ContactRecord {
    pub owner:      Pubkey,
    pub name:       String,
    pub wallet:     Pubkey,
    pub created_at: i64,
    pub bump:       u8,
}

// ─── Errors ──────────────────────────────────────────────────

#[error_code]
pub enum ContactError {
    #[msg("Contact name cannot be empty")]
    EmptyName,
    #[msg("Contact name must be 50 characters or less")]
    NameTooLong,
}
```

---

## Client-Side: Resolve Without RPC Call

```typescript
// The smart thing: resolve doesn't need an RPC call
// Just derive the PDA client-side and fetch the account

import { PublicKey } from '@solana/web3.js'

const PROGRAM_ID = new PublicKey(process.env.EXPO_PUBLIC_CONTACT_REGISTRY_PROGRAM_ID!)

export async function resolveContactOnChain(
  ownerWallet: PublicKey,
  name: string,
  connection: Connection
): Promise<PublicKey | null> {
  // Derive PDA (same seeds as Rust)
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('contact'),
      ownerWallet.toBuffer(),
      Buffer.from(name),
    ],
    PROGRAM_ID
  )

  try {
    // Fetch and decode account
    const accountInfo = await connection.getAccountInfo(pda)
    if (!accountInfo) return null

    // Decode using Anchor IDL
    const record = program.coder.accounts.decode('ContactRecord', accountInfo.data)
    return record.wallet as PublicKey
  } catch {
    return null
  }
}
```

---

## Anchor.toml

```toml
[features]
seeds = false
skip-lint = false

[programs.devnet]
contact-registry = "FILL_AFTER_DEPLOY"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "devnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

---

## Deploy Steps

```bash
# 1. Install Anchor CLI
# ⚠️ Check anchor-lang.com for current install command

# 2. Setup Solana wallet for deployment
solana-keygen new --outfile ~/.config/solana/id.json
solana config set --url devnet
solana airdrop 2  # get devnet SOL for deployment

# 3. Build
cd program
anchor build

# 4. Get Program ID from build output
# Copy from: target/deploy/contact_registry-keypair.json
# Or: anchor keys list

# 5. Update declare_id! in lib.rs with actual Program ID

# 6. Deploy
anchor deploy --provider.cluster devnet

# 7. Update CLAUDE.md + config.ts with Program ID
```

---

## Test (`tests/contact-registry.ts`)

```typescript
import * as anchor from "@coral-xyz/anchor"
import { Program } from "@coral-xyz/anchor"

describe("contact-registry", () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  it("registers a contact", async () => {
    const name = "Ahmad"
    const wallet = anchor.web3.Keypair.generate().publicKey

    // Derive PDA
    const [pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("contact"),
        provider.wallet.publicKey.toBuffer(),
        Buffer.from(name),
      ],
      program.programId
    )

    await program.methods
      .registerContact(name, wallet)
      .accounts({ contactRecord: pda, owner: provider.wallet.publicKey })
      .rpc()

    // Verify
    const record = await program.account.contactRecord.fetch(pda)
    assert.equal(record.name, name)
    assert.equal(record.wallet.toString(), wallet.toString())
  })

  it("rejects empty name", async () => {
    // Should throw ContactError::EmptyName
    try {
      await program.methods.registerContact("", someWallet).rpc()
      assert.fail("Should have thrown")
    } catch (err) {
      assert.include(err.message, "EmptyName")
    }
  })
})
```

---

## Priority Reminder

```
❌ Do NOT start this until:
  ✓ Voice → STT → Intent → working
  ✓ USDC transfer → working
  ✓ Full demo flow working end-to-end

✅ This program is the "on-chain credibility" layer.
   It makes the demo more impressive for judges.
   But a working voice payment WITHOUT this
   is better than a broken app WITH this.
```
