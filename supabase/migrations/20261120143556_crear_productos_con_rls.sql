
-- Recorta los mismos espacios exteriores que String.prototype.trim().
create function public.productos_recortar_espacios(valor text)
returns text
language sql
immutable
strict
security invoker
set search_path = ''
as $$
  select pg_catalog.btrim(
    valor,
    U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'
  );
$$;

revoke all
  on function public.productos_recortar_espacios(text)
  from public, anon, authenticated;

grant execute
  on function public.productos_recortar_espacios(text)
  to authenticated;

create table public.productos (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  nombre text not null,
  sku text not null,
  cantidad integer not null,
  minimo integer not null,
  created_at timestamptz not null default now(),

  constraint productos_pkey primary key (id),

  constraint productos_user_id_fkey
    foreign key (user_id)
    references auth.users (id)
    on update no action
    on delete no action,

  constraint productos_nombre_no_vacio
    check (public.productos_recortar_espacios(nombre) <> ''),

  constraint productos_sku_no_vacio
    check (public.productos_recortar_espacios(sku) <> ''),

  constraint productos_cantidad_no_negativa
    check (cantidad >= 0),

  constraint productos_minimo_no_negativo
    check (minimo >= 0)
);

-- Conserva mayúsculas y espacios interiores del SKU.
create function public.productos_normalizar_sku()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.sku := public.productos_recortar_espacios(new.sku);
  return new;
end;
$$;

-- El cliente no necesita ejecutar directamente la función del trigger.
revoke all
  on function public.productos_normalizar_sku()
  from public, anon, authenticated;

create trigger productos_normalizar_sku
before insert or update of sku
on public.productos
for each row
execute function public.productos_normalizar_sku();

-- También proporciona un índice sobre user_id para la FK y RLS.
create unique index productos_user_id_sku_normalizado_uidx
on public.productos (
  user_id,
  lower(public.productos_recortar_espacios(sku))
);

alter table public.productos enable row level security;

-- Elimina los permisos que pudieran proceder de privilegios por defecto.
revoke all privileges
  on table public.productos
  from public, anon, authenticated;

grant usage on schema public to authenticated;

grant select, delete
  on table public.productos
  to authenticated;

-- id, user_id y created_at quedan reservados a sus valores de la base.
grant insert (nombre, sku, cantidad, minimo)
  on table public.productos
  to authenticated;

grant update (nombre, sku, cantidad, minimo)
  on table public.productos
  to authenticated;

create policy productos_select_propios
on public.productos
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy productos_insert_propios
on public.productos
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy productos_update_propios
on public.productos
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy productos_delete_propios
on public.productos
for delete
to authenticated
using ((select auth.uid()) = user_id);
