import React, { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'

type Info = {
  solucao: string
  status: string
  negocio_nome: string
  contato_nome: string
  consentimento_versao: string
}

const TITULOS: Record<string, string> = {
  bpo_financeiro: 'Mapeamento — BPO Financeiro',
  cfo_as_a_service: 'Mapeamento — CFO as a Service',
  consultoria: 'Mapeamento — Consultoria',
}

export default function FormularioPublico() {
  const token = window.location.pathname.split('/').pop() || ''
  const [info, setInfo] = useState<Info | null>(null)
  const [erro, setErro] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Record<string, string | boolean>>({})
  const up = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    void (async () => {
      try {
        const resp = await pb.send<Info>(`/backend/v1/formularios/publico/${token}`)
        setInfo(resp)
      } catch (err: unknown) {
        const response =
          err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { message?: string } } }).response
            : undefined
        setErro(response?.data?.message || 'Formulário não encontrado ou já respondido.')
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const enviar = async () => {
    setErro('')
    if (form.consentimento_lgpd !== true)
      return setErro('O consentimento LGPD é obrigatório para enviar.')
    setSaving(true)
    try {
      await pb.send(`/backend/v1/formularios/publico/${token}`, {
        method: 'POST',
        body: {
          respostas: form,
          consentimento_lgpd: true,
          consentimento_versao: info?.consentimento_versao,
        },
      })
      setEnviado(true)
    } catch (err: unknown) {
      const response =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response
          : undefined
      setErro(response?.data?.message || 'Não foi possível enviar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const T = (p: { k: string; label: string; req?: boolean; area?: boolean; ph?: string }) => (
    <label className="block text-sm font-medium">
      {p.label}
      {p.req ? ' *' : ''}
      {p.area ? (
        <textarea
          value={String(form[p.k] || '')}
          onChange={(e) => up(p.k, e.target.value)}
          rows={3}
          maxLength={5000}
          placeholder={p.ph}
          className="mt-1 w-full border rounded-lg px-3 py-2"
        />
      ) : (
        <input
          value={String(form[p.k] || '')}
          onChange={(e) => up(p.k, e.target.value)}
          maxLength={500}
          placeholder={p.ph}
          className="mt-1 w-full border rounded-lg px-3 py-2"
        />
      )}
    </label>
  )
  const S = (p: { k: string; label: string; req?: boolean; opts: [string, string][] }) => (
    <label className="block text-sm font-medium">
      {p.label}
      {p.req ? ' *' : ''}
      <select
        value={String(form[p.k] || '')}
        onChange={(e) => up(p.k, e.target.value)}
        className="mt-1 w-full border rounded-lg px-3 py-2"
      >
        <option value="">Selecione</option>
        {p.opts.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  )
  const B = (p: { k: string; label: string }) => (
    <label className="flex items-center gap-2 text-sm font-medium">
      <input
        type="checkbox"
        checked={form[p.k] === true}
        onChange={(e) => up(p.k, e.target.checked)}
        className="w-4 h-4"
      />
      {p.label}
    </label>
  )

  return (
    <div className="min-h-screen bg-[#F7F5F1] text-[#0A0A0A] p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-[#0A0A0A] flex items-center justify-center">
            <span className="text-[#C9A227] font-bold text-lg">V</span>
          </div>
          <div>
            <p className="font-playfair text-xl font-bold">Vibratto BPO Financeiro</p>
            <p className="text-xs text-[#6B7280]">Formulário de mapeamento</p>
          </div>
        </div>
        {erro && (
          <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded">
            {erro}
          </p>
        )}
        {enviado ? (
          <div className="bg-white rounded-2xl p-8 text-center border">
            <p className="font-playfair text-2xl font-bold mb-2">Recebemos suas respostas!</p>
            <p className="text-sm text-[#6B7280]">
              Obrigado! Nosso time vai usar essas informações para preparar a melhor proposta para
              você. Em breve entraremos em contato.
            </p>
          </div>
        ) : info ? (
          <div className="bg-white rounded-2xl p-6 border">
            <h1 className="font-playfair text-2xl font-bold mb-1">
              {TITULOS[info.solucao] || 'Formulário'}
            </h1>
            <p className="text-sm text-[#6B7280] mb-5">
              {info.contato_nome ? `${info.contato_nome} · ` : ''}
              {info.negocio_nome}
            </p>
            <div className="space-y-4">
              {info.solucao === 'bpo_financeiro' && (
                <>
                  {T({ k: 'empresa_nome', label: 'Nome da empresa', req: true })}
                  {T({ k: 'responsavel_nome', label: 'Seu nome (responsável)', req: true })}
                  {T({ k: 'cnpj', label: 'CNPJ', ph: '00.000.000/0000-00' })}
                  {S({
                    k: 'regime_tributario',
                    label: 'Regime tributário',
                    req: true,
                    opts: [
                      ['simples', 'Simples Nacional'],
                      ['presumido', 'Lucro Presumido'],
                      ['real', 'Lucro Real'],
                      ['nao_sei', 'Não sei informar'],
                    ],
                  })}
                  {T({
                    k: 'pagamentos_mes',
                    label: 'Quantidade mensal de pagamentos',
                    req: true,
                    ph: 'Ex.: 40',
                  })}
                  {T({
                    k: 'recebimentos_mes',
                    label: 'Quantidade mensal de recebimentos/vendas',
                    req: true,
                    ph: 'Ex.: 60',
                  })}
                  {T({
                    k: 'funcionarios',
                    label: 'Quantidade de funcionários',
                    req: true,
                    ph: 'Ex.: 12',
                  })}
                  {T({ k: 'socios', label: 'Quantidade de sócios', ph: 'Ex.: 2' })}
                  {T({ k: 'modelo_societario', label: 'Modelo societário', ph: 'Ex.: LTDA' })}
                  {T({ k: 'fornecedores', label: 'Principais fornecedores', area: true })}
                  {T({
                    k: 'bancos',
                    label: 'Bancos utilizados',
                    req: true,
                    ph: 'Ex.: Itaú, Nubank',
                  })}
                  {B({ k: 'cambio', label: 'Realiza operações de câmbio' })}
                  {T({
                    k: 'tipos_receita',
                    label: 'Tipos de receita',
                    ph: 'Ex.: serviços, produtos',
                  })}
                  {T({
                    k: 'desafios_financeiro',
                    label: 'Desafios atuais do Financeiro',
                    req: true,
                    area: true,
                  })}
                  {T({ k: 'desafios_negocio', label: 'Desafios do negócio', area: true })}
                  {T({
                    k: 'endividamento',
                    label: 'Endividamento ativo',
                    ph: 'Ex.: empréstimos, cheque especial, nenhum',
                  })}
                  {T({
                    k: 'objetivo_12m',
                    label: 'Objetivo financeiro para os próximos 12 meses',
                    area: true,
                  })}
                  {T({
                    k: 'origem_contato',
                    label: 'Como conheceu a Vibratto?',
                    ph: 'Ex.: indicação, Instagram',
                  })}
                </>
              )}
              {info.solucao === 'cfo_as_a_service' && (
                <>
                  {T({ k: 'empresa_nome', label: 'Nome da empresa', req: true })}
                  {T({ k: 'responsavel_nome', label: 'Seu nome (responsável)', req: true })}
                  {T({
                    k: 'decisoes_hoje',
                    label: 'Como são tomadas hoje as decisões financeiras?',
                    req: true,
                    area: true,
                  })}
                  {B({ k: 'orcamento', label: 'Existe orçamento anual ou mensal' })}
                  {B({ k: 'fluxo_projetado', label: 'Existe fluxo de caixa projetado' })}
                  {B({ k: 'dre', label: 'Existe DRE gerencial' })}
                  {T({
                    k: 'indicadores',
                    label: 'Quais indicadores financeiros são acompanhados?',
                    area: true,
                  })}
                  {T({
                    k: 'frequencia_analise',
                    label: 'Com que frequência a empresa analisa resultados?',
                    ph: 'Ex.: mensal',
                  })}
                  {T({
                    k: 'decisoes_travadas',
                    label:
                      'Quais decisões estratégicas estão travadas por falta de informação financeira?',
                    req: true,
                    area: true,
                  })}
                  {T({
                    k: 'objetivos',
                    label: 'Principais objetivos para os próximos 6, 12 e 24 meses',
                    req: true,
                    area: true,
                  })}
                  {T({
                    k: 'participacao_cfo',
                    label: 'Qual nível de participação estratégica se espera do CFO?',
                    area: true,
                  })}
                </>
              )}
              {info.solucao === 'consultoria' && (
                <>
                  {T({ k: 'empresa_nome', label: 'Nome da empresa', req: true })}
                  {T({ k: 'responsavel_nome', label: 'Seu nome (responsável)', req: true })}
                  {T({
                    k: 'problema',
                    label: 'Qual problema precisa ser resolvido?',
                    req: true,
                    area: true,
                  })}
                  {T({
                    k: 'impacto',
                    label: 'Qual o impacto atual desse problema?',
                    req: true,
                    area: true,
                  })}
                  {T({ k: 'ja_tentado', label: 'O que já foi tentado?', area: true })}
                  {T({
                    k: 'resultado_esperado',
                    label: 'Qual resultado esperado?',
                    req: true,
                    area: true,
                  })}
                  {T({ k: 'prazo', label: 'Existe prazo para solução?', ph: 'Ex.: até dezembro' })}
                  {T({ k: 'envolvidos', label: 'Quem estará envolvido?', area: true })}
                  {T({
                    k: 'criterio_sucesso',
                    label: 'Como será definido que o projeto foi bem-sucedido?',
                    req: true,
                    area: true,
                  })}
                  {T({
                    k: 'restricoes',
                    label: 'Quais informações ou restrições devem ser consideradas?',
                    area: true,
                  })}
                </>
              )}
              <label className="flex items-start gap-2 text-sm bg-[#F7F5F1] border rounded-lg p-3">
                <input
                  type="checkbox"
                  checked={form.consentimento_lgpd === true}
                  onChange={(e) => up('consentimento_lgpd', e.target.checked)}
                  className="w-4 h-4 mt-0.5"
                />
                <span>
                  Autorizo a Vibratto a usar estas informações para preparar minha proposta,
                  conforme a LGPD ({info.consentimento_versao}). <b>Obrigatório.</b>
                </span>
              </label>
              <button
                type="button"
                onClick={() => void enviar()}
                disabled={saving}
                className="w-full bg-[#C9A227] rounded-lg px-4 py-3 font-semibold disabled:opacity-50"
              >
                {saving ? 'Enviando...' : 'Enviar respostas'}
              </button>
            </div>
          </div>
        ) : !erro ? (
          <p className="text-sm text-[#6B7280]">Carregando formulário...</p>
        ) : null}
      </div>
    </div>
  )
}
