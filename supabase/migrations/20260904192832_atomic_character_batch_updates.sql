create or replace function public.apply_character_batch(p_updates jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  r public.personagens%rowtype;
  result jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(p_updates) <> 'array' then
    raise exception 'p_updates deve ser array';
  end if;

  for item in select value from jsonb_array_elements(p_updates)
  loop
    update public.personagens
       set nome = coalesce(item->>'nome', nome),
           classe = coalesce(item->>'classe', classe),
           subclasse = coalesce(item->>'subclasse', subclasse),
           ancestralidade = coalesce(item->>'ancestralidade', ancestralidade),
           comunidade = coalesce(item->>'comunidade', comunidade),
           nivel = coalesce((item->>'nivel')::integer, nivel),
           versao = versao + 1,
           schema = coalesce((item->>'schema')::integer, schema),
           "atualizadoEm" = coalesce((item->>'atualizadoEm')::timestamptz, now()),
           dados = coalesce(item->'dados', dados)
     where id = item->>'id'
       and excluido = false
       and versao = (item->>'versaoEsperada')::integer
     returning * into r;

    if not found then
      raise exception 'CONFLITO:%', coalesce(item->>'id','');
    end if;

    result := result || jsonb_build_array(to_jsonb(r));
  end loop;

  return result;
end;
$$;
revoke all on function public.apply_character_batch(jsonb) from public, anon, authenticated;
grant execute on function public.apply_character_batch(jsonb) to service_role;
