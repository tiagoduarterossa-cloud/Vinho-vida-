-- Vinho é Vida: esquema da base de dados.
-- Correr uma vez no Supabase, em SQL Editor > New query.

-- Cada linha é um vinho de um utilizador. As características ficam em "dados" (JSON),
-- para que se possam acrescentar campos novos sem migrações.
create table if not exists public.vinhos (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  dados jsonb not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists vinhos_user_id_idx on public.vinhos (user_id);

-- Cada pessoa só vê e altera os seus próprios vinhos.
alter table public.vinhos enable row level security;

drop policy if exists "vinhos_ler" on public.vinhos;
drop policy if exists "vinhos_inserir" on public.vinhos;
drop policy if exists "vinhos_alterar" on public.vinhos;
drop policy if exists "vinhos_apagar" on public.vinhos;

create policy "vinhos_ler" on public.vinhos
  for select to authenticated using (auth.uid() = user_id);
create policy "vinhos_inserir" on public.vinhos
  for insert to authenticated with check (auth.uid() = user_id);
create policy "vinhos_alterar" on public.vinhos
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "vinhos_apagar" on public.vinhos
  for delete to authenticated using (auth.uid() = user_id);

-- Fotos dos rótulos: bucket privado, cada utilizador numa pasta com o seu id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('rotulos', 'rotulos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "rotulos_ler" on storage.objects;
drop policy if exists "rotulos_inserir" on storage.objects;
drop policy if exists "rotulos_alterar" on storage.objects;
drop policy if exists "rotulos_apagar" on storage.objects;

create policy "rotulos_ler" on storage.objects
  for select to authenticated
  using (bucket_id = 'rotulos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "rotulos_inserir" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'rotulos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "rotulos_alterar" on storage.objects
  for update to authenticated
  using (bucket_id = 'rotulos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "rotulos_apagar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'rotulos' and (storage.foldername(name))[1] = auth.uid()::text);
