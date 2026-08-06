-- FacturaCFA — Schéma complet Supabase
-- Projet : xbzafnhvwbyduigyypgo
-- Couvre : profils utilisateurs, entreprise, clients, devis/factures, corbeille, numérotation

-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── Fonction updated_at ─────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── Profiles (lié à auth.users) ─────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  role text not null default 'Administrateur',
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Utilisateurs FacturaCFA (1:1 avec auth.users)';

-- ─── Profil entreprise ───────────────────────────────────────────────────────
create table if not exists public.business_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  company_name text not null default '',
  tagline text default '',
  nif text default '',
  rccm text default '',
  address text default '',
  city text default '',
  country text default '',
  phone text default '',
  email text default '',
  website text default '',
  logo_url text default '',
  stamp_url text default '',
  signature_url text default '',
  bank_details jsonb not null default '{
    "bankName": "",
    "ibanRib": "",
    "accountName": "",
    "mobileMoney": ""
  }'::jsonb,
  default_tax_rate numeric(5,2) not null default 18,
  default_payment_terms_days integer not null default 15,
  legal_footer text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.business_profiles is 'Identité légale et paramètres PDF de l''entreprise';

drop trigger if exists business_profiles_set_updated_at on public.business_profiles;
create trigger business_profiles_set_updated_at
  before update on public.business_profiles
  for each row execute function public.set_updated_at();

-- ─── Clients ─────────────────────────────────────────────────────────────────
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  client_type text not null default 'entreprise'
    check (client_type in ('entreprise', 'personne_physique')),
  company_name text default '',
  email text default '',
  phone text default '',
  address text default '',
  city text default '',
  country text default '',
  nif_rccm text default '',
  notes text default '',
  created_at date not null default current_date
);

create index if not exists clients_user_id_idx on public.clients(user_id);
create index if not exists clients_name_idx on public.clients(user_id, name);

comment on table public.clients is 'Carnet clients (entreprises et personnes physiques)';

-- ─── Documents (devis & factures) ────────────────────────────────────────────
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  number text not null,
  type text not null check (type in ('devis', 'facture')),
  status text not null default 'en_attente',
  date date not null,
  due_date date not null,
  client_id uuid references public.clients(id) on delete set null,
  -- Snapshot client au moment de l''émission (dénormalisé pour PDF historique)
  client_info jsonb not null default '{}'::jsonb,
  -- Lignes : description, length, width, clientPrice, quantity, unitPrice, taxRate, discount
  items jsonb not null default '[]'::jsonb,
  currency text not null default 'FCFA'
    check (currency in ('FCFA', 'XOF', 'XAF')),
  tax_rate numeric(5,2) not null default 18,
  notes text default '',
  source_devis_number text,
  source_devis_id uuid references public.documents(id) on delete set null,
  converted_facture_number text,
  converted_facture_id uuid references public.documents(id) on delete set null,
  terms_and_conditions text default '',
  amount_in_words text default '',
  -- Options d''aperçu PDF : showContactName, showStamp, stampPosition, etc.
  preview_options jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documents_user_id_idx on public.documents(user_id);
create index if not exists documents_type_idx on public.documents(user_id, type);
create index if not exists documents_status_idx on public.documents(user_id, status);
create index if not exists documents_date_idx on public.documents(user_id, date desc);
create index if not exists documents_client_id_idx on public.documents(client_id);
create unique index if not exists documents_user_number_idx on public.documents(user_id, number);

comment on table public.documents is 'Devis et factures avec lignes et options PDF en JSONB';

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

-- ─── Corbeille ───────────────────────────────────────────────────────────────
create table if not exists public.trash_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_type text not null check (item_type in ('document', 'client')),
  document_data jsonb,
  client_data jsonb,
  deleted_at timestamptz not null default now(),
  constraint trash_items_payload_check check (
    (item_type = 'document' and document_data is not null)
    or (item_type = 'client' and client_data is not null)
  )
);

create index if not exists trash_items_user_id_idx on public.trash_items(user_id);
create index if not exists trash_items_deleted_at_idx on public.trash_items(user_id, deleted_at desc);

comment on table public.trash_items is 'Suppression douce — restauration possible';

-- ─── Compteurs de numérotation (FAC-2026-001, DEV-2026-001) ─────────────────
create table if not exists public.document_counters (
  user_id uuid not null references public.profiles(id) on delete cascade,
  counter_key text not null,
  last_sequence integer not null default 0 check (last_sequence >= 0),
  primary key (user_id, counter_key)
);

comment on table public.document_counters is 'Séquences persistantes de numérotation documentaire';

-- ─── Trigger : créer profil à l''inscription ─────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email, ''), '@', 1), 'Utilisateur'),
    coalesce(new.raw_user_meta_data->>'role', 'Administrateur')
  );

  insert into public.business_profiles (user_id, company_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'company_name', ''),
    coalesce(new.email, '')
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Row Level Security ────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.business_profiles enable row level security;
alter table public.clients enable row level security;
alter table public.documents enable row level security;
alter table public.trash_items enable row level security;
alter table public.document_counters enable row level security;

-- Profiles
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Business profiles
drop policy if exists "business_profiles_select_own" on public.business_profiles;
drop policy if exists "business_profiles_insert_own" on public.business_profiles;
drop policy if exists "business_profiles_update_own" on public.business_profiles;
create policy "business_profiles_select_own" on public.business_profiles for select using (auth.uid() = user_id);
create policy "business_profiles_insert_own" on public.business_profiles for insert with check (auth.uid() = user_id);
create policy "business_profiles_update_own" on public.business_profiles for update using (auth.uid() = user_id);

-- Clients
drop policy if exists "clients_select_own" on public.clients;
drop policy if exists "clients_insert_own" on public.clients;
drop policy if exists "clients_update_own" on public.clients;
drop policy if exists "clients_delete_own" on public.clients;
create policy "clients_select_own" on public.clients for select using (auth.uid() = user_id);
create policy "clients_insert_own" on public.clients for insert with check (auth.uid() = user_id);
create policy "clients_update_own" on public.clients for update using (auth.uid() = user_id);
create policy "clients_delete_own" on public.clients for delete using (auth.uid() = user_id);

-- Documents
drop policy if exists "documents_select_own" on public.documents;
drop policy if exists "documents_insert_own" on public.documents;
drop policy if exists "documents_update_own" on public.documents;
drop policy if exists "documents_delete_own" on public.documents;
create policy "documents_select_own" on public.documents for select using (auth.uid() = user_id);
create policy "documents_insert_own" on public.documents for insert with check (auth.uid() = user_id);
create policy "documents_update_own" on public.documents for update using (auth.uid() = user_id);
create policy "documents_delete_own" on public.documents for delete using (auth.uid() = user_id);

-- Trash
drop policy if exists "trash_select_own" on public.trash_items;
drop policy if exists "trash_insert_own" on public.trash_items;
drop policy if exists "trash_delete_own" on public.trash_items;
create policy "trash_select_own" on public.trash_items for select using (auth.uid() = user_id);
create policy "trash_insert_own" on public.trash_items for insert with check (auth.uid() = user_id);
create policy "trash_delete_own" on public.trash_items for delete using (auth.uid() = user_id);

-- Counters
drop policy if exists "counters_select_own" on public.document_counters;
drop policy if exists "counters_insert_own" on public.document_counters;
drop policy if exists "counters_update_own" on public.document_counters;
create policy "counters_select_own" on public.document_counters for select using (auth.uid() = user_id);
create policy "counters_insert_own" on public.document_counters for insert with check (auth.uid() = user_id);
create policy "counters_update_own" on public.document_counters for update using (auth.uid() = user_id);
