-- Tech Empire | Consulta pública protegida do acompanhamento
-- Execute no Supabase SQL Editor antes de publicar a nova acompanhar.html.
-- Exige protocolo + telefone completo e retorna apenas campos públicos.

CREATE OR REPLACE FUNCTION public.consultar_acompanhamento(p_protocolo text, p_telefone text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_chamado public.chamados%ROWTYPE;
  v_telefone text;
  v_historico jsonb;
  v_ficha jsonb;
  v_laudo jsonb;
  v_projeto jsonb;
BEGIN
  v_telefone := regexp_replace(coalesce(p_telefone, ''), '[^0-9]', '', 'g');
  IF length(v_telefone) < 10 OR length(v_telefone) > 13 OR coalesce(trim(p_protocolo), '') = '' THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_chamado
  FROM public.chamados c
  WHERE upper(c.protocolo) = upper(trim(p_protocolo))
    AND (
      regexp_replace(coalesce(c.cliente_telefone, ''), '[^0-9]', '', 'g') = v_telefone
      OR regexp_replace(coalesce(c.whatsapp, ''), '[^0-9]', '', 'g') = v_telefone
    )
  LIMIT 1;

  IF NOT FOUND THEN RETURN NULL; END IF;

  v_ficha := coalesce(v_chamado.ficha_tecnica, '{}'::jsonb);
  v_laudo := coalesce(v_chamado.laudo_tecnico, '{}'::jsonb);
  v_projeto := coalesce(v_chamado.detalhes_projeto, '{}'::jsonb);

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'status_anterior', h.status_anterior,
    'status_novo', h.status_novo,
    'observacao', h.observacao,
    'criado_em', h.criado_em,
    'responsavel', 'Equipe Tech Empire'
  ) ORDER BY h.criado_em DESC), '[]'::jsonb)
  INTO v_historico
  FROM public.historico_status h
  WHERE h.chamado_id = v_chamado.id
    AND coalesce(h.observacao, '') NOT ILIKE '[interno]%';

  RETURN jsonb_build_object(
    'id', v_chamado.id,
    'protocolo', v_chamado.protocolo,
    'cliente_nome', v_chamado.cliente_nome,
    'cliente_telefone', coalesce(v_chamado.whatsapp, v_chamado.cliente_telefone),
    'categoria', v_chamado.categoria,
    'titulo', v_chamado.titulo,
    'descricao', v_chamado.descricao,
    'status', v_chamado.status,
    'criado_em', v_chamado.criado_em,
    'atualizado_em', v_chamado.atualizado_em,
    'prazo_previsto', v_chamado.prazo_previsto,
    'orcamento_valor', v_chamado.orcamento_valor,
    'parecer_tecnico', v_chamado.parecer_tecnico,
    'equipamento', jsonb_build_object(
      'tipo', coalesce(v_ficha->>'tipo_dispositivo', v_ficha->>'tipo', v_ficha->>'equipamento'),
      'marca', v_ficha->>'marca',
      'modelo', v_ficha->>'modelo',
      'foto_url', coalesce(v_ficha->>'foto_url', v_ficha->>'imagem_url', v_ficha->>'foto')
    ),
    'laudo', jsonb_build_object(
      'diagnostico', v_laudo->>'diagnostico',
      'solucao', v_laudo->>'solucao',
      'parecer', v_laudo->>'parecer'
    ),
    'projeto', jsonb_build_object(
      'escopo', v_projeto->>'escopo',
      'link', v_projeto->>'link'
    ),
    'historico', v_historico
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consultar_acompanhamento(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consultar_acompanhamento(text, text) TO anon, authenticated;
