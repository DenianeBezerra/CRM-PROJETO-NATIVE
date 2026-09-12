import React, { useEffect, useState } from 'react'
import { ArrowLeft, Save, FileText, History, Plus, Building2, ClipboardList } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

// T3.11 — Ficha Operacional do Cliente (Leva A): formulário em blocos por
// empresa + procedimento gerado + histórico de versões.
// Backend: /backend/v1/ficha-operacional (GET/POST/PATCH), /completa,
// /procedimento, /versoes. Multi-selects chegam como array e são normalizados
// para string separada por vírgula no formulário (e de volta ao salvar).

type Empresa = { id: string; nome: string }

type Ficha = {
  id: string
  empresa: string
  status_operacional: string
  data_inicio_operacao: string
  responsavel_principal: string
  responsavel_principal_nome: string
  responsavel_reserva: string
  responsavel_reserva_nome: string
  servicos_contratados: string
  fora_do_escopo: string
  volume_referencia_pagamentos: number | null
  volume_referencia_notas: number | null
  sistema: string
  sistema_outro?: string
  identificacao_empresa_sistema: string
  modulos_utilizados?: string
  item_cofre_sistema: string
  periodicidade_projecao: string
  dias_referencia: string
  janela_coberta: string
  regra_conta_fixa: string
  regra_conta_variavel: string
  autoriza_projecao: string
  canal_autorizacao: string
  prazo_resposta_horas: number | null
  antecipacao_pagamento: boolean
  destino_comprovantes: string
  estrutura_adicional: string
  controle_externo_cliente: string
  origem_informacao?: string
  dia_envio_relatorio: string
  aprova_relatorio: string
  dia_emissao: string
  rotas_emissao: string
  regra_rota: string
  destinatarios_nota: string
  cancelar_previsao: boolean
  destino_notas: string
  prazo_validacao_final: string
  regra_cobranca: string
  frequencia_conciliacao: string
  responsavel_conciliacao?: string
  origem_extrato: string
  destino_comprovantes_conc: string
  controle_externo_conc: string
  contabilidade_nome: string
  contabilidade_contato: string
  formato_entrega: string
  canal_entrega: string
  prazo_entrega: string
  documentos_exigidos?: string
  particularidades_fechamento: string
  canais: {
    id: string
    tipo_canal: string
    identificacao: string
    frequencia_verificacao: string
    finalidade: string
    observacao: string
  }[]
  bancos: {
    id: string
    banco: string
    apelido_conta: string
    finalidade: string
    perfil_acesso: string
    quem_aprova_no_banco: string
    item_cofre: string
    data_ultima_revisao_acesso: string
  }[]
  pessoas: {
    id: string
    contato: string
    contato_nome: string
    papel_operacional: string
    canal_preferencial: string
    ativo: boolean
  }[]
}

type Versao = {
  id: string
  servico: string
  versao: number
  gerado_em: string
  gerado_por: string
  campos_alterados: string
}

const servicosLabel: Record<string, string> = {
  contas_a_pagar: 'Contas a pagar',
  faturamento: 'Faturamento',
  conciliacao: 'Conciliação',
  fechamento: 'Fechamento',
  tesouraria: 'Tesouraria',
  controladoria: 'Controladoria',
}

const dataBR = (s: string) => {
  if (!s || s.startsWith('0001-01-01')) return ''
  return new Date(s.replace(' ', 'T')).toLocaleDateString('pt-BR')
}

const Campo = ({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: string
}) => (
  <label className="block">
    <span className="text-xs font-semibold text-[#374151]">{label}</span>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="mt-1 w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#C9A227]"
    />
    {hint && <span className="text-[10px] text-[#6B7280]">{hint}</span>}
  </label>
)

const Area = ({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) => (
  <label className="block">
    <span className="text-xs font-semibold text-[#374151]">{label}</span>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={2}
      className="mt-1 w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#C9A227]"
    />
  </label>
)

const Selecao = ({
  label,
  value,
  onChange,
  opcoes,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  opcoes: { v: string; l: string }[]
}) => (
  <label className="block">
    <span className="text-xs font-semibold text-[#374151]">{label}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1 w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#C9A227]"
    >
      <option value="">—</option>
      {opcoes.map((o) => (
        <option key={o.v} value={o.v}>
          {o.l}
        </option>
      ))}
    </select>
  </label>
)

const Bloco = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
  <section className="bg-white border border-[#E5E7EB] rounded-xl p-5">
    <h2 className="font-playfair font-bold text-base mb-4">{titulo}</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
  </section>
)

export default function FichaOperacional() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [params] = useSearchParams()
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [empresaId, setEmpresaId] = useState(params.get('empresa') || '')
  const [ficha, setFicha] = useState<Ficha | null>(null)
  const [procedimentos, setProcedimentos] = useState<Record<string, string>>({})
  const [versoes, setVersoes] = useState<Versao[]>([])
  const [aba, setAba] = useState<'ficha' | 'procedimento' | 'versoes'>('ficha')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const r = await pb.collection('empresas').getList<Empresa>(1, 100, { sort: 'nome' })
        setEmpresas(r.items)
        const pre = params.get('empresa')
        if (pre) setEmpresaId(pre)
      } catch {
        toast({ title: 'Falha ao carregar empresas', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Multi-selects do PocketBase chegam como array; o formulário trabalha com
  // string separada por vírgula. Normalizar nos dois sentidos.
  const CAMPOS_MULTI = [
    'servicos_contratados',
    'modulos_utilizados',
    'origem_informacao',
    'rotas_emissao',
    'documentos_exigidos',
  ] as const

  const normalizarFicha = (f: Ficha): Ficha => {
    const out: Record<string, unknown> = { ...f }
    for (const campo of CAMPOS_MULTI) {
      const v = out[campo]
      if (Array.isArray(v)) out[campo] = (v as string[]).join(',')
      else if (v == null) out[campo] = ''
    }
    return out as unknown as Ficha
  }

  const loadFicha = async (id: string) => {
    setLoading(true)
    setFicha(null)
    setProcedimentos({})
    setVersoes([])
    setAba('ficha')
    try {
      const r = await pb.send<Ficha>(`/backend/v1/ficha-operacional/${id}/completa`, {})
      setFicha(normalizarFicha(r))
    } catch (e: unknown) {
      const msg = String((e as { response?: { message?: string } })?.response?.message || '')
      if (msg.includes('não encontrada')) {
        toast({ title: 'Esta empresa ainda não tem ficha operacional' })
      } else {
        toast({ title: 'Falha ao carregar ficha', variant: 'destructive' })
      }
    } finally {
      setLoading(false)
    }
  }

  const criarFicha = async () => {
    if (!empresaId) return
    setSaving(true)
    try {
      const r = await pb.send<{ id: string }>('/backend/v1/ficha-operacional', {
        method: 'POST',
        body: { empresa: empresaId, status_operacional: 'em_implantacao' },
      })
      toast({ title: 'Ficha criada — preencha os blocos' })
      await loadFicha(empresaId)
      void r
    } catch (e: unknown) {
      const msg = String((e as { response?: { message?: string } })?.response?.message || '')
      toast({ title: msg || 'Falha ao criar ficha', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const salvar = async () => {
    if (!ficha) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        status_operacional: ficha.status_operacional,
        data_inicio_operacao: ficha.data_inicio_operacao || undefined,
        responsavel_principal: ficha.responsavel_principal || undefined,
        responsavel_reserva: ficha.responsavel_reserva || undefined,
        servicos_contratados: String(ficha.servicos_contratados || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        fora_do_escopo: ficha.fora_do_escopo,
        volume_referencia_pagamentos: ficha.volume_referencia_pagamentos,
        volume_referencia_notas: ficha.volume_referencia_notas,
        sistema: ficha.sistema || undefined,
        sistema_outro: ficha.sistema_outro,
        identificacao_empresa_sistema: ficha.identificacao_empresa_sistema,
        modulos_utilizados: String(ficha.modulos_utilizados || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        item_cofre_sistema: ficha.item_cofre_sistema,
        periodicidade_projecao: ficha.periodicidade_projecao || undefined,
        dias_referencia: ficha.dias_referencia,
        janela_coberta: ficha.janela_coberta,
        regra_conta_fixa: ficha.regra_conta_fixa,
        regra_conta_variavel: ficha.regra_conta_variavel,
        autoriza_projecao: ficha.autoriza_projecao,
        canal_autorizacao: ficha.canal_autorizacao || undefined,
        prazo_resposta_horas: ficha.prazo_resposta_horas,
        antecipacao_pagamento: ficha.antecipacao_pagamento,
        destino_comprovantes: ficha.destino_comprovantes,
        estrutura_adicional: ficha.estrutura_adicional,
        controle_externo_cliente: ficha.controle_externo_cliente,
        origem_informacao: String(ficha.origem_informacao || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        dia_envio_relatorio: ficha.dia_envio_relatorio,
        aprova_relatorio: ficha.aprova_relatorio,
        dia_emissao: ficha.dia_emissao,
        rotas_emissao: String(ficha.rotas_emissao || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        regra_rota: ficha.regra_rota,
        destinatarios_nota: ficha.destinatarios_nota,
        cancelar_previsao: ficha.cancelar_previsao,
        destino_notas: ficha.destino_notas,
        prazo_validacao_final: ficha.prazo_validacao_final,
        regra_cobranca: ficha.regra_cobranca,
        frequencia_conciliacao: ficha.frequencia_conciliacao || undefined,
        responsavel_conciliacao: ficha.responsavel_conciliacao || undefined,
        origem_extrato: ficha.origem_extrato || undefined,
        destino_comprovantes_conc: ficha.destino_comprovantes_conc,
        controle_externo_conc: ficha.controle_externo_conc,
        contabilidade_nome: ficha.contabilidade_nome,
        contabilidade_contato: ficha.contabilidade_contato,
        formato_entrega: ficha.formato_entrega || undefined,
        canal_entrega: ficha.canal_entrega || undefined,
        prazo_entrega: ficha.prazo_entrega,
        documentos_exigidos: String(ficha.documentos_exigidos || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        particularidades_fechamento: ficha.particularidades_fechamento,
      }
      await pb.send(`/backend/v1/ficha-operacional/${ficha.id}`, { method: 'PATCH', body })
      toast({ title: 'Ficha salva — procedimento versionado automaticamente' })
      await loadFicha(empresaId)
    } catch (e: unknown) {
      const msg = String((e as { response?: { message?: string } })?.response?.message || '')
      toast({ title: msg || 'Falha ao salvar', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const loadProcedimentos = async (idEmpresa: string) => {
    try {
      const r = await pb.send<{ servicos: Record<string, string> }>(
        `/backend/v1/ficha-operacional/${idEmpresa}/procedimento`,
        {},
      )
      setProcedimentos(r.servicos || {})
    } catch {
      toast({ title: 'Falha ao gerar procedimento', variant: 'destructive' })
    }
  }

  const loadVersoes = async (idEmpresa: string) => {
    try {
      const r = await pb.send<{ itens: Versao[] }>(
        `/backend/v1/ficha-operacional/${idEmpresa}/versoes`,
        {},
      )
      setVersoes(r.itens || [])
    } catch {
      toast({ title: 'Falha ao carregar versões', variant: 'destructive' })
    }
  }

  const trocarAba = (a: 'ficha' | 'procedimento' | 'versoes') => {
    setAba(a)
    if (a === 'procedimento' && empresaId && Object.keys(procedimentos).length === 0)
      void loadProcedimentos(empresaId)
    if (a === 'versoes' && empresaId && versoes.length === 0) void loadVersoes(empresaId)
  }

  const set = (campo: keyof Ficha, valor: unknown) =>
    setFicha((f) => (f ? ({ ...f, [campo]: valor } as Ficha) : f))

  const servicosContratados = (ficha?.servicos_contratados || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  return (
    <div className="min-h-screen bg-[#F7F5F1] text-[#0A0A0A]">
      <header className="sticky top-0 z-30 w-full bg-[#0A0A0A] border-b border-[#C9A227]/25 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <button
          onClick={() => navigate('/home')}
          className="flex items-center gap-2 text-sm text-[#E8C766]"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <span className="text-xs rounded-full bg-[#141414] border border-[#C9A227]/40 px-3 py-1 text-[#E8C766] font-semibold">
          Ficha Operacional
        </span>
      </header>
      <main className="max-w-6xl mx-auto p-4 sm:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[#A8862B] font-semibold">
          Operação · Rotina padronizada
        </p>
        <h1 className="font-playfair text-4xl font-bold">Ficha Operacional</h1>
        <p className="text-[#6B7280] mt-2 mb-6">
          Os parâmetros de execução de cada cliente. O procedimento do time é gerado daqui — altere
          o cadastro, não o documento.
        </p>

        {/* Seleção de empresa */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 mb-6 flex flex-col sm:flex-row sm:items-end gap-4">
          <label className="block flex-1">
            <span className="text-xs font-semibold text-[#374151]">Empresa</span>
            <select
              value={empresaId}
              onChange={(e) => {
                setEmpresaId(e.target.value)
                if (e.target.value) void loadFicha(e.target.value)
                else setFicha(null)
              }}
              className="mt-1 w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#C9A227]"
            >
              <option value="">Selecione a empresa…</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
          </label>
          {empresaId && !ficha && !loading && (
            <button
              onClick={() => void criarFicha()}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C9A227] text-[#0A0A0A] font-semibold text-sm hover:bg-[#E8C766] disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> Criar ficha
            </button>
          )}
        </div>

        {loading && (
          <div className="flex items-center gap-3 text-sm text-[#6B7280]">
            <div className="w-5 h-5 border-2 border-[#C9A227] border-t-transparent rounded-full animate-spin" />
            Carregando...
          </div>
        )}

        {empresaId && ficha && !loading && (
          <>
            {/* Abas */}
            <div className="flex gap-2 mb-6">
              {(
                [
                  { k: 'ficha', l: 'Ficha', icon: ClipboardList },
                  { k: 'procedimento', l: 'Procedimento gerado', icon: FileText },
                  { k: 'versoes', l: 'Histórico de versões', icon: History },
                ] as const
              ).map(({ k, l, icon: Icon }) => (
                <button
                  key={k}
                  onClick={() => trocarAba(k)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                    aba === k
                      ? 'bg-[#0A0A0A] text-[#E8C766] border-[#C9A227]'
                      : 'bg-white text-[#374151] border-[#E5E7EB] hover:border-[#C9A227]/60'
                  }`}
                >
                  <Icon className="w-4 h-4" /> {l}
                </button>
              ))}
            </div>

            {aba === 'ficha' && (
              <div className="space-y-6">
                {/* Bloco 1 — identificação e responsáveis */}
                <Bloco titulo="1 · Identificação e responsáveis">
                  <Selecao
                    label="Status operacional"
                    value={ficha.status_operacional}
                    onChange={(v) => set('status_operacional', v)}
                    opcoes={[
                      { v: 'em_implantacao', l: 'Em implantação' },
                      { v: 'ativo', l: 'Ativo' },
                      { v: 'suspenso', l: 'Suspenso' },
                      { v: 'encerrado', l: 'Encerrado' },
                    ]}
                  />
                  <Campo
                    label="Início da operação"
                    value={(ficha.data_inicio_operacao || '').slice(0, 10)}
                    onChange={(v) => set('data_inicio_operacao', v ? `${v} 00:00:00.000Z` : '')}
                  />
                  <Campo
                    label="Serviços contratados (separados por vírgula)"
                    value={ficha.servicos_contratados}
                    onChange={(v) => set('servicos_contratados', v)}
                    placeholder="contas_a_pagar,faturamento,conciliacao,fechamento,tesouraria,controladoria"
                  />
                  <Area
                    label="Fora do escopo"
                    value={ficha.fora_do_escopo}
                    onChange={(v) => set('fora_do_escopo', v)}
                    placeholder="O que a Vibratto NÃO faz para este cliente"
                  />
                  <Campo
                    label="Analista titular (ID do usuário)"
                    value={ficha.responsavel_principal}
                    onChange={(v) => set('responsavel_principal', v)}
                    hint={ficha.responsavel_principal_nome || undefined}
                  />
                  <Campo
                    label="Analista reserva (ID do usuário)"
                    value={ficha.responsavel_reserva}
                    onChange={(v) => set('responsavel_reserva', v)}
                    hint={ficha.responsavel_reserva_nome || undefined}
                  />
                  <Campo
                    label="Volume de referência — pagamentos/mês"
                    value={String(ficha.volume_referencia_pagamentos ?? '')}
                    onChange={(v) =>
                      set('volume_referencia_pagamentos', v === '' ? null : Number(v))
                    }
                  />
                  <Campo
                    label="Volume de referência — notas/mês"
                    value={String(ficha.volume_referencia_notas ?? '')}
                    onChange={(v) => set('volume_referencia_notas', v === '' ? null : Number(v))}
                  />
                </Bloco>

                {/* Bloco 3 — sistema de gestão */}
                <Bloco titulo="3 · Sistema de gestão">
                  <Selecao
                    label="Sistema"
                    value={ficha.sistema}
                    onChange={(v) => set('sistema', v)}
                    opcoes={[
                      { v: 'omie', l: 'Omie' },
                      { v: 'nibo', l: 'Nibo' },
                      { v: 'outro', l: 'Outro' },
                    ]}
                  />
                  {ficha.sistema === 'outro' && (
                    <Campo
                      label="Qual sistema"
                      value={ficha.sistema_outro || ''}
                      onChange={(v) => set('sistema_outro', v)}
                    />
                  )}
                  <Campo
                    label="Empresa no sistema (identificação)"
                    value={ficha.identificacao_empresa_sistema}
                    onChange={(v) => set('identificacao_empresa_sistema', v)}
                  />
                  <Campo
                    label="Módulos utilizados (separados por vírgula)"
                    value={ficha.modulos_utilizados || ''}
                    onChange={(v) => set('modulos_utilizados', v)}
                    placeholder="contas_a_pagar,contas_a_receber,servicos_notas,fiscal"
                  />
                  <Campo
                    label="Cofre — identificador do item de credencial"
                    value={ficha.item_cofre_sistema}
                    onChange={(v) => set('item_cofre_sistema', v)}
                    hint="NUNCA a senha — apenas o identificador no cofre de senhas."
                  />
                </Bloco>

                {/* Bloco 5 — contas a pagar (se contratado) */}
                {servicosContratados.includes('contas_a_pagar') && (
                  <Bloco titulo="5 · Contas a pagar">
                    <Selecao
                      label="Periodicidade da projeção"
                      value={ficha.periodicidade_projecao}
                      onChange={(v) => set('periodicidade_projecao', v)}
                      opcoes={[
                        { v: 'semanal', l: 'Semanal' },
                        { v: 'quinzenal', l: 'Quinzenal' },
                        { v: 'decendial', l: 'Decendial' },
                        { v: 'mensal', l: 'Mensal' },
                      ]}
                    />
                    <Campo
                      label="Dias de referência"
                      value={ficha.dias_referencia}
                      onChange={(v) => set('dias_referencia', v)}
                      placeholder="segunda-feira"
                    />
                    <Campo
                      label="Janela coberta"
                      value={ficha.janela_coberta}
                      onChange={(v) => set('janela_coberta', v)}
                      placeholder="semana corrente + 2 semanas"
                    />
                    <Area
                      label="Contas fixas (sem autorização)"
                      value={ficha.regra_conta_fixa}
                      onChange={(v) => set('regra_conta_fixa', v)}
                    />
                    <Area
                      label="Contas variáveis (exigem autorização prévia)"
                      value={ficha.regra_conta_variavel}
                      onChange={(v) => set('regra_conta_variavel', v)}
                    />
                    <Campo
                      label="Autoriza a projeção"
                      value={ficha.autoriza_projecao}
                      onChange={(v) => set('autoriza_projecao', v)}
                    />
                    <Selecao
                      label="Canal de autorização"
                      value={ficha.canal_autorizacao}
                      onChange={(v) => set('canal_autorizacao', v)}
                      opcoes={[
                        { v: 'email', l: 'E-mail' },
                        { v: 'whatsapp', l: 'WhatsApp' },
                        { v: 'sistema', l: 'Sistema' },
                      ]}
                    />
                    <Campo
                      label="Prazo de resposta (horas)"
                      value={String(ficha.prazo_resposta_horas ?? '')}
                      onChange={(v) => set('prazo_resposta_horas', v === '' ? null : Number(v))}
                    />
                    <Selecao
                      label="Antecipação de pagamento"
                      value={ficha.antecipacao_pagamento ? 'sim' : 'nao'}
                      onChange={(v) => set('antecipacao_pagamento', v === 'sim')}
                      opcoes={[
                        { v: 'nao', l: 'Não' },
                        { v: 'sim', l: 'Sim' },
                      ]}
                    />
                    <Campo
                      label="Destino dos comprovantes"
                      value={ficha.destino_comprovantes}
                      onChange={(v) => set('destino_comprovantes', v)}
                    />
                    <Area
                      label="Estrutura adicional"
                      value={ficha.estrutura_adicional}
                      onChange={(v) => set('estrutura_adicional', v)}
                    />
                    <Campo
                      label="Controle externo do cliente"
                      value={ficha.controle_externo_cliente}
                      onChange={(v) => set('controle_externo_cliente', v)}
                    />
                  </Bloco>
                )}

                {/* Bloco 6 — faturamento (se contratado) */}
                {servicosContratados.includes('faturamento') && (
                  <Bloco titulo="6 · Faturamento">
                    <Campo
                      label="Origem da informação (separadas por vírgula)"
                      value={ficha.origem_informacao || ''}
                      onChange={(v) => set('origem_informacao', v)}
                      placeholder="planilha_estruturada,mensagem_avulsa,email,sistema"
                    />
                    <Campo
                      label="Dia de envio do relatório"
                      value={ficha.dia_envio_relatorio}
                      onChange={(v) => set('dia_envio_relatorio', v)}
                    />
                    <Campo
                      label="Aprova o relatório"
                      value={ficha.aprova_relatorio}
                      onChange={(v) => set('aprova_relatorio', v)}
                    />
                    <Campo
                      label="Dia de emissão"
                      value={ficha.dia_emissao}
                      onChange={(v) => set('dia_emissao', v)}
                    />
                    <Campo
                      label="Rotas de emissão (separadas por vírgula)"
                      value={ficha.rotas_emissao}
                      onChange={(v) => set('rotas_emissao', v)}
                      placeholder="sistema_gestao,portal_prefeitura,invoice,nota_debito"
                    />
                    <Area
                      label="Regra da rota"
                      value={ficha.regra_rota}
                      onChange={(v) => set('regra_rota', v)}
                    />
                    <Campo
                      label="Destinatários da nota"
                      value={ficha.destinatarios_nota}
                      onChange={(v) => set('destinatarios_nota', v)}
                    />
                    <Selecao
                      label="Cancelar previsão após emissão"
                      value={ficha.cancelar_previsao ? 'sim' : 'nao'}
                      onChange={(v) => set('cancelar_previsao', v === 'sim')}
                      opcoes={[
                        { v: 'nao', l: 'Não' },
                        { v: 'sim', l: 'Sim' },
                      ]}
                    />
                    <Campo
                      label="Destino das notas"
                      value={ficha.destino_notas}
                      onChange={(v) => set('destino_notas', v)}
                    />
                    <Campo
                      label="Prazo de validação final"
                      value={ficha.prazo_validacao_final}
                      onChange={(v) => set('prazo_validacao_final', v)}
                    />
                    <Area
                      label="Regra de cobrança"
                      value={ficha.regra_cobranca}
                      onChange={(v) => set('regra_cobranca', v)}
                    />
                  </Bloco>
                )}

                {/* Bloco 7 — conciliação (se contratado) */}
                {servicosContratados.includes('conciliacao') && (
                  <Bloco titulo="7 · Conciliação">
                    <Selecao
                      label="Frequência"
                      value={ficha.frequencia_conciliacao}
                      onChange={(v) => set('frequencia_conciliacao', v)}
                      opcoes={[
                        { v: 'diaria', l: 'Diária' },
                        { v: 'semanal', l: 'Semanal' },
                        { v: 'outra', l: 'Outra' },
                      ]}
                    />
                    <Campo
                      label="Responsável (ID do usuário)"
                      value={ficha.responsavel_conciliacao || ''}
                      onChange={(v) => set('responsavel_conciliacao', v)}
                    />
                    <Selecao
                      label="Origem do extrato"
                      value={ficha.origem_extrato}
                      onChange={(v) => set('origem_extrato', v)}
                      opcoes={[
                        { v: 'manual', l: 'Manual' },
                        { v: 'arquivo', l: 'Arquivo' },
                        { v: 'integracao', l: 'Integração' },
                      ]}
                    />
                    <Campo
                      label="Destino dos comprovantes"
                      value={ficha.destino_comprovantes_conc}
                      onChange={(v) => set('destino_comprovantes_conc', v)}
                    />
                    <Campo
                      label="Controle externo"
                      value={ficha.controle_externo_conc}
                      onChange={(v) => set('controle_externo_conc', v)}
                    />
                  </Bloco>
                )}

                {/* Bloco 8 — fechamento (se contratado) */}
                {servicosContratados.includes('fechamento') && (
                  <Bloco titulo="8 · Fechamento mensal">
                    <Campo
                      label="Contabilidade"
                      value={ficha.contabilidade_nome}
                      onChange={(v) => set('contabilidade_nome', v)}
                    />
                    <Campo
                      label="Contato da contabilidade"
                      value={ficha.contabilidade_contato}
                      onChange={(v) => set('contabilidade_contato', v)}
                    />
                    <Selecao
                      label="Formato de entrega"
                      value={ficha.formato_entrega}
                      onChange={(v) => set('formato_entrega', v)}
                      opcoes={[
                        { v: 'por_categoria', l: 'Por categoria' },
                        { v: 'por_data', l: 'Por data' },
                        { v: 'outro', l: 'Outro' },
                      ]}
                    />
                    <Selecao
                      label="Canal de entrega"
                      value={ficha.canal_entrega}
                      onChange={(v) => set('canal_entrega', v)}
                      opcoes={[
                        { v: 'email', l: 'E-mail' },
                        { v: 'pasta_compartilhada', l: 'Pasta compartilhada' },
                        { v: 'sistema', l: 'Sistema' },
                      ]}
                    />
                    <Campo
                      label="Prazo de entrega"
                      value={ficha.prazo_entrega}
                      onChange={(v) => set('prazo_entrega', v)}
                    />
                    <Campo
                      label="Documentos exigidos (separados por vírgula)"
                      value={ficha.documentos_exigidos || ''}
                      onChange={(v) => set('documentos_exigidos', v)}
                      placeholder="notas_emitidas,notas_recebidas,comprovantes,faturas_cartao,guias,recibos"
                    />
                    <Area
                      label="Particularidades"
                      value={ficha.particularidades_fechamento}
                      onChange={(v) => set('particularidades_fechamento', v)}
                    />
                  </Bloco>
                )}

                {/* Bloco 2 — canais (lista) */}
                <Bloco titulo="2 · Canais de entrada">
                  {ficha.canais.length === 0 ? (
                    <p className="text-xs text-[#6B7280] md:col-span-2">
                      Nenhum canal cadastrado — cadastro de listas (canais, bancos, pessoas) entra
                      na próxima leva da UI.
                    </p>
                  ) : (
                    ficha.canais.map((c) => (
                      <div key={c.id} className="border rounded-lg p-3 text-sm md:col-span-2">
                        <p className="font-semibold">
                          {c.tipo_canal}: {c.identificacao}
                        </p>
                        <p className="text-xs text-[#6B7280]">
                          Verificação {c.frequencia_verificacao} · finalidade: {c.finalidade}
                        </p>
                      </div>
                    ))
                  )}
                </Bloco>

                {/* Bloco 4 — bancos (lista) */}
                <Bloco titulo="4 · Contas bancárias operadas">
                  {ficha.bancos.length === 0 ? (
                    <p className="text-xs text-[#6B7280] md:col-span-2">
                      Nenhuma conta cadastrada — cadastro de listas entra na próxima leva da UI.
                    </p>
                  ) : (
                    ficha.bancos.map((b) => (
                      <div key={b.id} className="border rounded-lg p-3 text-sm md:col-span-2">
                        <p className="font-semibold">
                          {b.apelido_conta} ({b.banco})
                        </p>
                        <p className="text-xs text-[#6B7280]">
                          {b.finalidade} · aprova no banco: {b.quem_aprova_no_banco} · cofre:{' '}
                          {b.item_cofre}
                        </p>
                      </div>
                    ))
                  )}
                </Bloco>

                {/* Bloco 9 — pessoas (lista) */}
                <Bloco titulo="9 · Pessoas do cliente">
                  {ficha.pessoas.length === 0 ? (
                    <p className="text-xs text-[#6B7280] md:col-span-2">
                      Nenhuma pessoa cadastrada — cadastro de listas entra na próxima leva da UI.
                    </p>
                  ) : (
                    ficha.pessoas.map((p) => (
                      <div key={p.id} className="border rounded-lg p-3 text-sm md:col-span-2">
                        <p className="font-semibold">{p.contato_nome}</p>
                        <p className="text-xs text-[#6B7280]">
                          Papel: {p.papel_operacional} · canal: {p.canal_preferencial}
                        </p>
                      </div>
                    ))
                  )}
                </Bloco>

                <div className="flex justify-end">
                  <button
                    onClick={() => void salvar()}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#C9A227] text-[#0A0A0A] font-semibold text-sm hover:bg-[#E8C766] disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar ficha'}
                  </button>
                </div>
              </div>
            )}

            {aba === 'procedimento' && (
              <div className="space-y-6">
                {Object.keys(procedimentos).length === 0 ? (
                  <p className="text-sm text-[#6B7280]">Gerando procedimentos...</p>
                ) : (
                  Object.entries(procedimentos).map(([servico, conteudo]) => (
                    <section
                      key={servico}
                      className="bg-white border border-[#E5E7EB] rounded-xl p-5"
                    >
                      <h2 className="font-playfair font-bold text-base mb-3">
                        {servicosLabel[servico] || servico}
                      </h2>
                      <pre className="text-xs whitespace-pre-wrap font-mono bg-[#F7F5F1] border border-[#E5E7EB] rounded-lg p-4">
                        {conteudo}
                      </pre>
                    </section>
                  ))
                )}
              </div>
            )}

            {aba === 'versoes' && (
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
                {versoes.length === 0 ? (
                  <p className="text-sm text-[#6B7280]">Nenhuma versão ainda.</p>
                ) : (
                  <div className="space-y-2">
                    {versoes.map((v) => (
                      <div
                        key={v.id}
                        className="flex flex-wrap items-center gap-2 border-b border-[#E5E7EB] pb-2 text-sm"
                      >
                        <span className="font-semibold">
                          {servicosLabel[v.servico] || v.servico} v{v.versao}
                        </span>
                        <span className="text-xs text-[#6B7280]">
                          {dataBR(v.gerado_em)} · por {v.gerado_por}
                        </span>
                        <span className="text-[10px] text-[#A8862B]">{v.campos_alterados}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {!empresaId && !loading && (
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-10 text-center">
            <Building2 className="w-10 h-10 mx-auto text-[#C9A227] mb-3" />
            <p className="text-sm text-[#6B7280]">
              Selecione uma empresa para abrir (ou criar) a ficha operacional dela.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
