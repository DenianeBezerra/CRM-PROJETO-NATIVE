import React, { useEffect, useState } from 'react'
import { ArrowLeft, Building2, FileText, History, ShieldAlert, Save } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

// T3.11 — SPEC-3-011: UI da Ficha Operacional do Cliente (Leva A).
// Seleção de empresa → formulário em blocos (identificação, canais, sistema,
// bancos, contas a pagar, faturamento, conciliação, fechamento, pessoas) →
// procedimento gerado por serviço + histórico de versões.
// Regra de ouro: campos de cofre guardam apenas o IDENTIFICADOR do item —
// o backend rejeita qualquer valor com padrão de credencial.
// Visual: padrão harmonizado (ícone preto + glifo dourado, título bold,
// CTA dourado, fundo bege #F7F5F1).

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

// Campo de texto padrão
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

const Select = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) => (
  <label className="block">
    <span className="text-xs font-semibold text-[#374151]">{label}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1 w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#C9A227]"
    >
      <option value="">—</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </label>
)

export default function FichaOperacional() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [params] = useSearchParams()
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [empresaId, setEmpresaId] = useState('')
  const [ficha, setFicha] = useState<Ficha | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [aba, setAba] = useState<'ficha' | 'procedimento' | 'versoes'>('ficha')
  const [procedimentos, setProcedimentos] = useState<Record<string, string>>({})
  const [versoes, setVersoes] = useState<Versao[]>([])
  const [servicoSel, setServicoSel] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        const r = await pb.collection('empresas').getList<Empresa>(1, 100, { sort: 'nome' })
        setEmpresas(r.items)
        const pre = params.get('empresa')
        if (pre) setEmpresaId(pre)
      } catch {
        toast({ title: 'Falha ao carregar empresas', variant: 'destructive' })
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadFicha = async (id: string) => {
    setLoading(true)
    setFicha(null)
    setProcedimentos({})
    setVersoes([])
    setAba('ficha')
    try {
      const r = await pb.send<Ficha>(`/backend/v1/ficha-operacional/${id}`, {})
      setFicha(r)
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
        servicos_contratados: ficha.servicos_contratados || undefined,
        fora_do_escopo: ficha.fora_do_escopo,
        volume_referencia_pagamentos: ficha.volume_referencia_pagamentos,
        volume_referencia_notas: ficha.volume_referencia_notas,
        sistema: ficha.sistema || undefined,
        sistema_outro: ficha.sistema_outro,
        identificacao_empresa_sistema: ficha.identificacao_empresa_sistema,
        modulos_utilizados: ficha.modulos_utilizados || undefined,
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
        origem_informacao: ficha.origem_informacao || undefined,
        dia_envio_relatorio: ficha.dia_envio_relatorio,
        aprova_relatorio: ficha.aprova_relatorio,
        dia_emissao: ficha.dia_emissao,
        rotas_emissao: ficha.rotas_emissao || undefined,
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
        documentos_exigidos: ficha.documentos_exigidos || undefined,
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

  const loadProcedimentos = async () => {
    if (!empresaId) return
    try {
      const r = await pb.send<{ servicos: Record<string, string> }>(
        `/backend/v1/ficha-operacional/${empresaId}/procedimento`,
        {},
      )
      setProcedimentos(r.servicos)
      const keys = Object.keys(r.servicos)
      if (keys.length && !servicoSel) setServicoSel(keys[0])
    } catch {
      toast({ title: 'Falha ao gerar procedimento', variant: 'destructive' })
    }
  }

  const loadVersoes = async () => {
    if (!empresaId) return
    try {
      const r = await pb.send<{ itens: Versao[] }>(
        `/backend/v1/ficha-operacional/${empresaId}/versoes`,
        {},
      )
      setVersoes(r.itens)
    } catch {
      toast({ title: 'Falha ao carregar versões', variant: 'destructive' })
    }
  }

  const trocarAba = (a: 'ficha' | 'procedimento' | 'versoes') => {
    setAba(a)
    if (a === 'procedimento') void loadProcedimentos()
    if (a === 'versoes') void loadVersoes()
  }

  const set = (campo: keyof Ficha, valor: unknown) =>
    setFicha((f) => (f ? ({ ...f, [campo]: valor } as Ficha) : f))

  const servicosContratados = (ficha?.servicos_contratados || '').split(',').filter(Boolean)

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
          Rotina padronizada por cliente
        </p>
        <h1 className="font-playfair text-4xl font-bold">Ficha Operacional</h1>
        <p className="text-[#6B7280] mt-2 mb-6">
          O cadastro que gera o procedimento operacional de cada cliente. Credenciais nunca aqui —
          só o identificador do item no cofre de senhas.
        </p>

        {/* Seleção de empresa */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 mb-6 flex flex-col sm:flex-row gap-3 sm:items-end">
          <label className="flex-1">
            <span className="text-xs font-semibold text-[#374151]">Empresa</span>
            <select
              value={empresaId}
              onChange={(e) => setEmpresaId(e.target.value)}
              className="mt-1 w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#C9A227]"
            >
              <option value="">Selecione a empresa…</option>
              {empresas.map((em) => (
                <option key={em.id} value={em.id}>
                  {em.nome}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() => empresaId && void loadFicha(empresaId)}
            disabled={!empresaId || loading}
            className="rounded-full bg-[#C9A227] px-5 py-2 text-sm font-bold text-[#0A0A0A] hover:bg-[#E8C766] disabled:opacity-50"
          >
            Abrir ficha
          </button>
          <button
            onClick={() => void criarFicha()}
            disabled={!empresaId || saving || loading}
            className="rounded-full border border-[#C9A227] px-5 py-2 text-sm font-bold text-[#A8862B] hover:bg-[#C9A227]/10 disabled:opacity-50"
          >
            Criar ficha
          </button>
        </div>

        {loading && (
          <div className="flex items-center gap-3 text-sm text-[#6B7280]">
            <div className="w-5 h-5 border-2 border-[#C9A227] border-t-transparent rounded-full animate-spin" />
            Carregando ficha...
          </div>
        )}

        {ficha && !loading && (
          <>
            {/* Abas */}
            <div className="flex gap-2 mb-6">
              {(
                [
                  ['ficha', 'Ficha', <Building2 key="1" className="w-4 h-4" />],
                  ['procedimento', 'Procedimento gerado', <FileText key="2" className="w-4 h-4" />],
                  ['versoes', 'Histórico de versões', <History key="3" className="w-4 h-4" />],
                ] as const
              ).map(([k, label, icon]) => (
                <button
                  key={k}
                  onClick={() => trocarAba(k)}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold border ${
                    aba === k
                      ? 'bg-[#0A0A0A] text-[#E8C766] border-[#0A0A0A]'
                      : 'bg-white text-[#374151] border-[#E5E7EB] hover:border-[#C9A227]'
                  }`}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>

            {aba === 'ficha' && (
              <div className="space-y-6">
                {/* Bloco 1 — identificação */}
                <section className="p-5 rounded-xl bg-white border border-[#E5E7EB]">
                  <div className="w-10 h-10 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-[#E8C766] mb-3">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <h2 className="font-playfair font-bold text-base mb-3">
                    1 · Identificação e responsáveis
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select
                      label="Status operacional"
                      value={ficha.status_operacional}
                      onChange={(v) => set('status_operacional', v)}
                      options={[
                        { value: 'em_implantacao', label: 'Em implantação' },
                        { value: 'ativo', label: 'Ativo' },
                        { value: 'suspenso', label: 'Suspenso' },
                        { value: 'encerrado', label: 'Encerrado' },
                      ]}
                    />
                    <Campo
                      label="Início da operação"
                      value={(ficha.data_inicio_operacao || '').slice(0, 10)}
                      onChange={(v) => set('data_inicio_operacao', v ? v + ' 00:00:00.000Z' : '')}
                    />
                    <Campo
                      label="Responsável principal (ID do usuário)"
                      value={ficha.responsavel_principal}
                      onChange={(v) => set('responsavel_principal', v)}
                      hint={
                        ficha.responsavel_principal_nome
                          ? `Atual: ${ficha.responsavel_principal_nome}`
                          : undefined
                      }
                    />
                    <Campo
                      label="Responsável reserva (ID do usuário)"
                      value={ficha.responsavel_reserva}
                      onChange={(v) => set('responsavel_reserva', v)}
                      hint={
                        ficha.responsavel_reserva_nome
                          ? `Atual: ${ficha.responsavel_reserva_nome}`
                          : undefined
                      }
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
                    />
                    <Campo
                      label="Volume de referência — pagamentos/mês"
                      value={String(ficha.volume_referencia_pagamentos ?? '')}
                      onChange={(v) => set('volume_referencia_pagamentos', v ? Number(v) : null)}
                    />
                    <Campo
                      label="Volume de referência — notas/mês"
                      value={String(ficha.volume_referencia_notas ?? '')}
                      onChange={(v) => set('volume_referencia_notas', v ? Number(v) : null)}
                    />
                  </div>
                </section>

                {/* Bloco 3 — sistema */}
                <section className="p-5 rounded-xl bg-white border border-[#E5E7EB]">
                  <h2 className="font-playfair font-bold text-base mb-3">3 · Sistema de gestão</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select
                      label="Sistema"
                      value={ficha.sistema}
                      onChange={(v) => set('sistema', v)}
                      options={[
                        { value: 'omie', label: 'Omie' },
                        { value: 'nibo', label: 'Nibo' },
                        { value: 'outro', label: 'Outro' },
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
                      label="Cofre — identificador do item"
                      value={ficha.item_cofre_sistema}
                      onChange={(v) => set('item_cofre_sistema', v)}
                      placeholder="COFRE-OMIE-001"
                      hint="Nunca a senha — apenas o identificador no cofre."
                    />
                  </div>
                </section>

                {/* Bloco 5 — contas a pagar */}
                {servicosContratados.includes('contas_a_pagar') && (
                  <section className="p-5 rounded-xl bg-white border border-[#E5E7EB]">
                    <h2 className="font-playfair font-bold text-base mb-3">5 · Contas a pagar</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Select
                        label="Periodicidade da projeção"
                        value={ficha.periodicidade_projecao}
                        onChange={(v) => set('periodicidade_projecao', v)}
                        options={[
                          { value: 'semanal', label: 'Semanal' },
                          { value: 'quinzenal', label: 'Quinzenal' },
                          { value: 'decendial', label: 'Decendial' },
                          { value: 'mensal', label: 'Mensal' },
                        ]}
                      />
                      <Campo
                        label="Dias de referência"
                        value={ficha.dias_referencia}
                        onChange={(v) => set('dias_referencia', v)}
                      />
                      <Campo
                        label="Janela coberta"
                        value={ficha.janela_coberta}
                        onChange={(v) => set('janela_coberta', v)}
                      />
                      <Area
                        label="Regra — contas fixas"
                        value={ficha.regra_conta_fixa}
                        onChange={(v) => set('regra_conta_fixa', v)}
                      />
                      <Area
                        label="Regra — contas variáveis (autorização prévia)"
                        value={ficha.regra_conta_variavel}
                        onChange={(v) => set('regra_conta_variavel', v)}
                      />
                      <Campo
                        label="Autoriza a projeção"
                        value={ficha.autoriza_projecao}
                        onChange={(v) => set('autoriza_projecao', v)}
                      />
                      <Select
                        label="Canal de autorização"
                        value={ficha.canal_autorizacao}
                        onChange={(v) => set('canal_autorizacao', v)}
                        options={[
                          { value: 'email', label: 'E-mail' },
                          { value: 'whatsapp', label: 'WhatsApp' },
                          { value: 'sistema', label: 'Sistema' },
                        ]}
                      />
                      <Campo
                        label="Prazo de resposta (horas)"
                        value={String(ficha.prazo_resposta_horas ?? '')}
                        onChange={(v) => set('prazo_resposta_horas', v ? Number(v) : null)}
                      />
                      <label className="flex items-center gap-2 mt-1">
                        <input
                          type="checkbox"
                          checked={ficha.antecipacao_pagamento}
                          onChange={(e) => set('antecipacao_pagamento', e.target.checked)}
                        />
                        <span className="text-xs font-semibold text-[#374151]">
                          Antecipação de pagamento
                        </span>
                      </label>
                      <Campo
                        label="Destino dos comprovantes"
                        value={ficha.destino_comprovantes}
                        onChange={(v) => set('destino_comprovantes', v)}
                      />
                      <Campo
                        label="Estrutura adicional"
                        value={ficha.estrutura_adicional}
                        onChange={(v) => set('estrutura_adicional', v)}
                      />
                      <Campo
                        label="Controle externo do cliente"
                        value={ficha.controle_externo_cliente}
                        onChange={(v) => set('controle_externo_cliente', v)}
                      />
                    </div>
                  </section>
                )}

                {/* Bloco 6 — faturamento */}
                {servicosContratados.includes('faturamento') && (
                  <section className="p-5 rounded-xl bg-white border border-[#E5E7EB]">
                    <h2 className="font-playfair font-bold text-base mb-3">6 · Faturamento</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Campo
                        label="Origem da informação"
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
                        label="Rotas de emissão"
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
                      <label className="flex items-center gap-2 mt-1">
                        <input
                          type="checkbox"
                          checked={ficha.cancelar_previsao}
                          onChange={(e) => set('cancelar_previsao', e.target.checked)}
                        />
                        <span className="text-xs font-semibold text-[#374151]">
                          Cancelar previsão após emissão
                        </span>
                      </label>
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
                    </div>
                  </section>
                )}

                {/* Bloco 7 — conciliação */}
                {servicosContratados.includes('conciliacao') && (
                  <section className="p-5 rounded-xl bg-white border border-[#E5E7EB]">
                    <h2 className="font-playfair font-bold text-base mb-3">7 · Conciliação</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Select
                        label="Frequência"
                        value={ficha.frequencia_conciliacao}
                        onChange={(v) => set('frequencia_conciliacao', v)}
                        options={[
                          { value: 'diaria', label: 'Diária' },
                          { value: 'semanal', label: 'Semanal' },
                          { value: 'outra', label: 'Outra' },
                        ]}
                      />
                      <Campo
                        label="Responsável (ID do usuário)"
                        value={ficha.responsavel_conciliacao || ''}
                        onChange={(v) => set('responsavel_conciliacao', v)}
                      />
                      <Select
                        label="Origem do extrato"
                        value={ficha.origem_extrato}
                        onChange={(v) => set('origem_extrato', v)}
                        options={[
                          { value: 'manual', label: 'Manual' },
                          { value: 'arquivo', label: 'Arquivo' },
                          { value: 'integracao', label: 'Integração' },
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
                    </div>
                  </section>
                )}

                {/* Bloco 8 — fechamento */}
                {servicosContratados.includes('fechamento') && (
                  <section className="p-5 rounded-xl bg-white border border-[#E5E7EB]">
                    <h2 className="font-playfair font-bold text-base mb-3">
                      8 · Fechamento mensal
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      <Select
                        label="Formato de entrega"
                        value={ficha.formato_entrega}
                        onChange={(v) => set('formato_entrega', v)}
                        options={[
                          { value: 'por_categoria', label: 'Por categoria' },
                          { value: 'por_data', label: 'Por data' },
                          { value: 'outro', label: 'Outro' },
                        ]}
                      />
                      <Select
                        label="Canal de entrega"
                        value={ficha.canal_entrega}
                        onChange={(v) => set('canal_entrega', v)}
                        options={[
                          { value: 'email', label: 'E-mail' },
                          { value: 'pasta_compartilhada', label: 'Pasta compartilhada' },
                          { value: 'sistema', label: 'Sistema' },
                        ]}
                      />
                      <Campo
                        label="Prazo de entrega"
                        value={ficha.prazo_entrega}
                        onChange={(v) => set('prazo_entrega', v)}
                      />
                      <Campo
                        label="Documentos exigidos"
                        value={ficha.documentos_exigidos || ''}
                        onChange={(v) => set('documentos_exigidos', v)}
                        placeholder="notas_emitidas,notas_recebidas,comprovantes,faturas_cartao,guias,recibos"
                      />
                      <Area
                        label="Particularidades"
                        value={ficha.particularidades_fechamento}
                        onChange={(v) => set('particularidades_fechamento', v)}
                      />
                    </div>
                  </section>
                )}

                {/* Bloco 2 — canais */}
                <section className="p-5 rounded-xl bg-white border border-[#E5E7EB]">
                  <h2 className="font-playfair font-bold text-base mb-3">2 · Canais de entrada</h2>
                  {ficha.canais.length === 0 ? (
                    <p className="text-xs text-[#6B7280]">
                      Nenhum canal cadastrado (via API ou próxima leva de UI).
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {ficha.canais.map((c) => (
                        <div key={c.id} className="bg-[#F7F5F1] border rounded-lg p-3 text-sm">
                          <p className="font-semibold">
                            {c.tipo_canal}: {c.identificacao}
                          </p>
                          <p className="text-xs text-[#6B7280]">
                            Verificação {c.frequencia_verificacao} · finalidade:{' '}
                            {c.finalidade || '—'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Bloco 4 — bancos */}
                <section className="p-5 rounded-xl bg-white border border-[#E5E7EB]">
                  <h2 className="font-playfair font-bold text-base mb-3">
                    4 · Contas bancárias operadas
                  </h2>
                  {ficha.bancos.length === 0 ? (
                    <p className="text-xs text-[#6B7280]">Nenhuma conta cadastrada.</p>
                  ) : (
                    <div className="space-y-2">
                      {ficha.bancos.map((b) => (
                        <div key={b.id} className="bg-[#F7F5F1] border rounded-lg p-3 text-sm">
                          <p className="font-semibold">
                            {b.apelido_conta} ({b.banco})
                          </p>
                          <p className="text-xs text-[#6B7280]">
                            Finalidade: {b.finalidade} · aprova no banco:{' '}
                            {b.quem_aprova_no_banco || '—'} · cofre: {b.item_cofre || '—'} ·
                            revisão: {dataBR(b.data_ultima_revisao_acesso) || '—'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Bloco 9 — pessoas */}
                <section className="p-5 rounded-xl bg-white border border-[#E5E7EB]">
                  <h2 className="font-playfair font-bold text-base mb-3">9 · Pessoas do cliente</h2>
                  {ficha.pessoas.length === 0 ? (
                    <p className="text-xs text-[#6B7280]">Nenhuma pessoa cadastrada.</p>
                  ) : (
                    <div className="space-y-2">
                      {ficha.pessoas.map((p) => (
                        <div key={p.id} className="bg-[#F7F5F1] border rounded-lg p-3 text-sm">
                          <p className="font-semibold">
                            {p.contato_nome || p.contato}{' '}
                            {!p.ativo && (
                              <span className="text-[10px] text-red-700 font-semibold">
                                inativo
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-[#6B7280]">
                            Papel: {p.papel_operacional || '—'} · canal: {p.canal_preferencial}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <div className="flex justify-end pb-8">
                  <button
                    onClick={() => void salvar()}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-full bg-[#C9A227] px-6 py-2.5 text-sm font-bold text-[#0A0A0A] hover:bg-[#E8C766] disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Salvando...' : 'Salvar ficha (versiona procedimento)'}
                  </button>
                </div>
              </div>
            )}

            {aba === 'procedimento' && (
              <div className="space-y-4">
                {Object.keys(procedimentos).length === 0 ? (
                  <p className="text-sm text-[#6B7280]">Nenhum serviço contratado.</p>
                ) : (
                  <>
                    <div className="flex gap-2 flex-wrap">
                      {Object.keys(procedimentos).map((s) => (
                        <button
                          key={s}
                          onClick={() => setServicoSel(s)}
                          className={`rounded-full px-4 py-1.5 text-xs font-semibold border ${
                            servicoSel === s
                              ? 'bg-[#0A0A0A] text-[#E8C766] border-[#0A0A0A]'
                              : 'bg-white border-[#E5E7EB] hover:border-[#C9A227]'
                          }`}
                        >
                          {servicosLabel[s] || s}
                        </button>
                      ))}
                    </div>
                    {servicoSel && procedimentos[servicoSel] && (
                      <pre className="whitespace-pre-wrap bg-white border border-[#E5E7EB] rounded-xl p-5 text-xs leading-relaxed font-mono">
                        {procedimentos[servicoSel]}
                      </pre>
                    )}
                  </>
                )}
              </div>
            )}

            {aba === 'versoes' && (
              <div className="space-y-2">
                {versoes.length === 0 ? (
                  <p className="text-sm text-[#6B7280]">
                    Nenhuma versão ainda — salve a ficha para gerar a primeira.
                  </p>
                ) : (
                  versoes.map((v) => (
                    <div key={v.id} className="bg-white border border-[#E5E7EB] rounded-lg p-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <p className="text-sm font-semibold">
                          {servicosLabel[v.servico] || v.servico} — v{v.versao}
                        </p>
                        <span className="text-[10px] text-[#6B7280]">
                          {dataBR(v.gerado_em)} · {v.gerado_por}
                        </span>
                      </div>
                      <p className="text-xs text-[#6B7280] mt-1">
                        Campos alterados: {v.campos_alterados || '—'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}

        {!ficha && !loading && empresaId && (
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 text-center">
            <ShieldAlert className="w-8 h-8 text-[#A8862B] mx-auto mb-2" />
            <p className="text-sm font-semibold">Esta empresa ainda não tem ficha operacional.</p>
            <p className="text-xs text-[#6B7280] mt-1">
              Clique em "Criar ficha" para começar o cadastro em blocos.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
