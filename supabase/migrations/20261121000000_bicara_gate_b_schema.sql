-- Bicara Gate B — Initial Supabase Migration
-- Compatible with Supabase GitHub Integration (single-transaction safe) and `supabase db push`.
-- Tables are keyed by owner_wallet (Base58 Solana public key) with validation checks and RLS enabled.

create extension if not exists pgcrypto;

-- 1. Verified Contacts Address Book
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  owner_wallet text not null check (char_length(owner_wallet) between 32 and 44),
  name text not null check (char_length(trim(name)) between 1 and 50),
  normalized_name text not null check (char_length(trim(normalized_name)) between 1 and 50),
  recipient_address text not null check (char_length(recipient_address) between 32 and 44),
  verified boolean not null default true,
  created_at timestamptz not null default now(),
  constraint contacts_owner_normalized_unique unique (owner_wallet, normalized_name)
);

create index if not exists idx_contacts_owner_wallet
  on public.contacts (owner_wallet, created_at desc);

-- 2. Confirmed Solana Devnet Transaction History
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  owner_wallet text not null check (char_length(owner_wallet) between 32 and 44),
  recipient_name text not null check (char_length(trim(recipient_name)) between 1 and 50),
  recipient_address text not null check (char_length(recipient_address) between 32 and 44),
  asset text not null check (asset in ('SOL', 'USDC')),
  amount numeric not null check (amount > 0),
  fee_sol numeric not null default 0.000005 check (fee_sol >= 0),
  ata_created boolean not null default false,
  signature text not null check (char_length(trim(signature)) between 32 and 128),
  cluster text not null default 'solana:devnet' check (cluster in ('solana:devnet')),
  status text not null default 'confirmed' check (status in ('confirmed', 'failed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_transactions_owner_wallet
  on public.transactions (owner_wallet, created_at desc);

-- Enable Row Level Security (RLS)
alter table public.contacts enable row level security;
alter table public.transactions enable row level security;

-- Gate B Devnet MVP Policies (wallet-keyed via app filters; upgrade to SIWS JWT auth before Mainnet)
drop policy if exists "bicara_contacts_select" on public.contacts;
create policy "bicara_contacts_select"
  on public.contacts for select
  to anon, authenticated
  using (char_length(owner_wallet) between 32 and 44);

drop policy if exists "bicara_contacts_insert" on public.contacts;
create policy "bicara_contacts_insert"
  on public.contacts for insert
  to anon, authenticated
  with check (
    char_length(owner_wallet) between 32 and 44
    and char_length(recipient_address) between 32 and 44
    and char_length(trim(name)) between 1 and 50
  );

drop policy if exists "bicara_contacts_update" on public.contacts;
create policy "bicara_contacts_update"
  on public.contacts for update
  to anon, authenticated
  using (char_length(owner_wallet) between 32 and 44)
  with check (char_length(recipient_address) between 32 and 44);

drop policy if exists "bicara_contacts_delete" on public.contacts;
create policy "bicara_contacts_delete"
  on public.contacts for delete
  to anon, authenticated
  using (char_length(owner_wallet) between 32 and 44);

drop policy if exists "bicara_transactions_select" on public.transactions;
create policy "bicara_transactions_select"
  on public.transactions for select
  to anon, authenticated
  using (char_length(owner_wallet) between 32 and 44);

drop policy if exists "bicara_transactions_insert" on public.transactions;
create policy "bicara_transactions_insert"
  on public.transactions for insert
  to anon, authenticated
  with check (
    cluster = 'solana:devnet'
    and asset in ('SOL', 'USDC')
    and amount > 0
    and char_length(owner_wallet) between 32 and 44
    and char_length(recipient_address) between 32 and 44
  );

-- Explicit role privileges required alongside RLS policies
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.contacts to anon, authenticated;
grant select, insert on table public.transactions to anon, authenticated;

notify pgrst, 'reload schema';
