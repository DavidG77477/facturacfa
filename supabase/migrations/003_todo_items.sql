-- FacturaCFA — Liste de tâches (todo)

create table if not exists public.todo_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  done boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists todo_items_user_id_idx on public.todo_items(user_id);
create index if not exists todo_items_user_done_idx on public.todo_items(user_id, done);

comment on table public.todo_items is 'Liste de tâches personnelles par utilisateur';

drop trigger if exists todo_items_set_updated_at on public.todo_items;
create trigger todo_items_set_updated_at
  before update on public.todo_items
  for each row execute function public.set_updated_at();

alter table public.todo_items enable row level security;

drop policy if exists "todo_items_select_own" on public.todo_items;
drop policy if exists "todo_items_insert_own" on public.todo_items;
drop policy if exists "todo_items_update_own" on public.todo_items;
drop policy if exists "todo_items_delete_own" on public.todo_items;

create policy "todo_items_select_own" on public.todo_items for select using (auth.uid() = user_id);
create policy "todo_items_insert_own" on public.todo_items for insert with check (auth.uid() = user_id);
create policy "todo_items_update_own" on public.todo_items for update using (auth.uid() = user_id);
create policy "todo_items_delete_own" on public.todo_items for delete using (auth.uid() = user_id);
