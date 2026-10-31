create table if not exists public.auth_rate_limits (
  chave text primary key,
  tentativas integer not null default 0,
  bloqueado_ate timestamptz,
  atualizado_em timestamptz not null default now()
);

alter table public.auth_rate_limits enable row level security;
revoke all on public.auth_rate_limits from anon, authenticated;
grant select, insert, update, delete on public.auth_rate_limits to service_role;
