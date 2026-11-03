-- Tech Empire: consulta protegida de acompanhamento
-- Execute no Supabase SQL Editor. A função não expõe listagem pública de chamados.
create or replace function public.consultar_acompanhamento(
  p_protocolo text,
  p_telefone text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chamado public.chamados%rowtype;
  v_telefone text;
  v_resultado jsonb;
  v_historico jsonb;
  v_manutencao jsonb;
begin
  v_telefone := regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g');

  if length(v_telefone) < 10 or length(v_telefone) > 13
     or nullif(trim(coalesce(p_protocolo, '')), '') is null then
    return null;
  end if;

  select c.*
    into v_chamado
    from public.chamados c
   where upper(trim(c.protocolo)) = upper(trim(p_protocolo))
     and regexp_replace(coalesce(c.cliente_telefone, ''), '\D', '', 'g') = v_telefone
   limit 1;

  if not found then
    return null;
  end if;

  select to_jsonb(dm)
    into v_manutencao
    from public.detalhes_manutencao dm
   where dm.chamado_id = v_chamado.id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'status_novo', hs.status_novo,
      'observacao', hs.observacao,
      'criado_em', hs.criado_em,
      'responsavel', coalesce(u.nome, 'Equipe Tech Empire')
    ) order by hs.criado_em desc
  ), '[]'::jsonb)
    into v_historico
    from public.historico_status hs
    left join public.usuarios u on u.id = hs.responsavel_id
   where hs.chamado_id = v_chamado.id;

  v_resultado := to_jsonb(v_chamado)
    || jsonb_build_object(
      'historico', v_historico,
      'equipamento', jsonb_build_object(
        'tipo', coalesce(v_manutencao->>'tipo_dispositivo', v_manutencao->>'tipo'),
        'marca', v_manutencao->>'marca',
        'modelo', v_manutencao->>'modelo',
        'foto_url', coalesce(v_manutencao->>'foto_url', v_manutencao->>'imagem_url')
      ),
      'laudo', coalesce(v_chamado.laudo_tecnico, '{}'::jsonb)
    );

  return v_resultado;
end;
$$;

revoke all on function public.consultar_acompanhamento(text, text) from public;
grant execute on function public.consultar_acompanhamento(text, text) to anon, authenticated;
