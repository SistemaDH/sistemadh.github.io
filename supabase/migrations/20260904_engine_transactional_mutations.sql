create or replace function public.apply_engine_mutations(
  p_personagens jsonb default '[]'::jsonb,
  p_config jsonb default '[]'::jsonb,
  p_logs jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb;
  r jsonb;
  affected integer;
begin
  for v in select value from jsonb_array_elements(coalesce(p_personagens, '[]'::jsonb))
  loop
    r := v->'row';
    if v->>'op' = 'insert' then
      insert into public.personagens(
        "id","donoId","donoNome","nome","classe","subclasse","ancestralidade","comunidade",
        "nivel","versao","schema","criadoEm","atualizadoEm","excluido","dados"
      ) values (
        r->>'id', r->>'donoId', coalesce(r->>'donoNome',''), coalesce(r->>'nome','Sem nome'),
        coalesce(r->>'classe',''), coalesce(r->>'subclasse',''), coalesce(r->>'ancestralidade',''),
        coalesce(r->>'comunidade',''), coalesce((r->>'nivel')::integer,1), coalesce((r->>'versao')::integer,1),
        coalesce((r->>'schema')::integer,1), nullif(r->>'criadoEm','')::timestamptz,
        nullif(r->>'atualizadoEm','')::timestamptz, coalesce((r->>'excluido')::boolean,false),
        coalesce(r->'dados','{}'::jsonb)
      );
    elsif v->>'op' = 'update' then
      update public.personagens set
        "donoId" = coalesce(r->>'donoId', "donoId"),
        "donoNome" = coalesce(r->>'donoNome', "donoNome"),
        "nome" = coalesce(r->>'nome', "nome"),
        "classe" = coalesce(r->>'classe', "classe"),
        "subclasse" = coalesce(r->>'subclasse', "subclasse"),
        "ancestralidade" = coalesce(r->>'ancestralidade', "ancestralidade"),
        "comunidade" = coalesce(r->>'comunidade', "comunidade"),
        "nivel" = coalesce((r->>'nivel')::integer, "nivel"),
        "versao" = coalesce((r->>'versao')::integer, "versao"),
        "schema" = coalesce((r->>'schema')::integer, "schema"),
        "atualizadoEm" = coalesce(nullif(r->>'atualizadoEm','')::timestamptz, "atualizadoEm"),
        "excluido" = coalesce((r->>'excluido')::boolean, "excluido"),
        "dados" = coalesce(r->'dados', "dados")
      where row_id = (v->>'row_id')::bigint
        and "versao" = (v->>'expected_version')::integer;
      get diagnostics affected = row_count;
      if affected <> 1 then
        raise exception using errcode = 'P0001', message = 'ENGINE_CONFLICT_PERSONAGEM:' || coalesce(r->>'id','');
      end if;
    elsif v->>'op' = 'delete' then
      delete from public.personagens
      where row_id = (v->>'row_id')::bigint
        and "versao" = (v->>'expected_version')::integer;
      get diagnostics affected = row_count;
      if affected <> 1 then
        raise exception using errcode = 'P0001', message = 'ENGINE_CONFLICT_PERSONAGEM_DELETE';
      end if;
    end if;
  end loop;

  for v in select value from jsonb_array_elements(coalesce(p_config, '[]'::jsonb))
  loop
    r := v->'row';
    if v->>'op' = 'insert' then
      insert into public.config("chave","valor","atualizadoEm")
      values (r->>'chave', r->>'valor', nullif(r->>'atualizadoEm','')::timestamptz);
    elsif v->>'op' = 'update' then
      update public.config set
        "valor" = r->>'valor',
        "atualizadoEm" = nullif(r->>'atualizadoEm','')::timestamptz
      where row_id = (v->>'row_id')::bigint
        and "atualizadoEm" is not distinct from nullif(v->>'expected_at','')::timestamptz;
      get diagnostics affected = row_count;
      if affected <> 1 then
        raise exception using errcode = 'P0001', message = 'ENGINE_CONFLICT_CONFIG:' || coalesce(r->>'chave','');
      end if;
    elsif v->>'op' = 'delete' then
      delete from public.config
      where row_id = (v->>'row_id')::bigint
        and "atualizadoEm" is not distinct from nullif(v->>'expected_at','')::timestamptz;
      get diagnostics affected = row_count;
      if affected <> 1 then
        raise exception using errcode = 'P0001', message = 'ENGINE_CONFLICT_CONFIG_DELETE';
      end if;
    end if;
  end loop;

  for v in select value from jsonb_array_elements(coalesce(p_logs, '[]'::jsonb))
  loop
    insert into public.log("quandoEm","jogadorId","jogadorNome","acao","detalhe") values (
      nullif(v->>'quandoEm','')::timestamptz,
      coalesce(v->>'jogadorId',''),
      coalesce(v->>'jogadorNome',''),
      coalesce(v->>'acao',''),
      left(coalesce(v->>'detalhe',''),500)
    );
  end loop;

  delete from public.log
  where row_id in (
    select row_id from public.log order by "quandoEm" desc nulls last offset 5000
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.apply_engine_mutations(jsonb,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.apply_engine_mutations(jsonb,jsonb,jsonb) to service_role;
