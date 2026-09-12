import React, { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'

// T3.07 — Porta 1: formulário público de ENTRADA (90–120s, mobile-first).
// Blocos: A identificação (CNPJ com máscara + enriquecimento informativo via
// BrasilAPI — falha NÃO bloqueia), B qualificação, C roteamento por sintoma.
// Captura: UTM da URL + origem declarada; honeypot; tempo mínimo 20s.
// LGPD: consentimento obrigatório + opt-in de marketing opcional.

const FATURAMENTO: [string, string][] = [
  ['ate_100k', 'Até R$ 100 mil/ano'],
  ['100k_500k', 'R$ 100 mil a R$ 500 mil/ano'],
  ['500k_2m', 'R$ 500 mil a R$ 2 milhões/ano'],
  ['2m_10m', 'R$ 2 a 10 milhões/ano'],
  ['acima_10m', 'Acima de R$ 10 milhões/ano'],
  ['nao_sei_informar', 'Não sei informar'],
]
const REGIMES: [string, string][] = [
  ['simples', 'Simples Nacional'],
  ['presumido', 'Lucro Presumido'],
  ['real', 'Lucro Real'],
  ['nao_sei_informar', 'Não sei informar'],
]
const DORES: [string, string][] = [
  ['caixa_sem_previsibilidade', 'Não sei quanto terei de caixa nos próximos meses'],
  ['rotina_financeira_atrasada', 'A rotina financeira (pagar/receber) vive atrasada'],
  ['informacao_confavel_falta', 'Não tenho informação confiável para decidir'],
  ['custo_alto_sem_controle', 'Custos altos sem controle claro'],
  ['crescimento_sem_estrutura', 'Estou crescendo e a estrutura não acompanha'],
  ['outro', 'Outro'],
]
const URGENCIAS: [string, string][] = [
  ['imediata', 'É agora — preciso resolver neste mês'],
  ['este_trimestre', 'Neste trimestre'],
  ['este_ano', 'Ainda neste ano'],
  ['so_informando', 'Só estou me informando'],
]

const mascaraCNPJ = (v: string) =>
  v
    .replace(/\D/g, '')
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)$/, '$1-$2')

export default function EntradaPublica() {
  const [form, setForm] = useState<Record<string, string | boolean>>({})
  const [razao, setRazao] = useState('')
  const [razaoStatus, setRazaoStatus] = useState<'idle' | 'ok' | 'falha'>('idle')
  const [erro, setErro] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [saving, setSaving] = useState(false)
  const inicio = Date.now()
  const up = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))

  // UTM da URL capturado no load.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const utm: Record<string, string> = {}
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
      const v = p.get(k)
      if (v) utm[k] = v
    }
    if (Object.keys(utm).length) setForm((f) => ({ ...f, ...utm }))
  }, [])

  // Enriquecimento BrasilAPI: informativo, NUNCA bloqueia o envio.
  useEffect(() => {
    const digits = String(form.cnpj || '').replace(/\D/g, '')
    if (digits.length !== 14) {
      setRazao('')
      setRazaoStatus('idle')
      return
    }
    let vivo = true
    setRazaoStatus('idle')
    const t = setTimeout(() => {
      void (async () => {
        try {
          const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`)
          if (!r.ok) throw new Error('não encontrado')
          const d = (await r.json()) as { razao_social?: string }
          if (vivo && d.razao_social) {
            setRazao(d.razao_social)
            setRazaoStatus('ok')
          }
        } catch {
          if (vivo) setRazaoStatus('falha')
        }
      })()
    }, 500)
    return () => {
      vivo = false
      clearTimeout(t)
    }
  }, [form.cnpj])

  const enviar = async () => {
    setErro('')
    if (form.consentimento_lgpd !== true)
      return setErro('O consentimento LGPD é obrigatório para enviar.')
    if (!form.nome || !form.email || !form.whatsapp || !form.dor_principal)
      return setErro('Preencha os campos obrigatórios (*).')
    setSaving(true)
    try {
      await pb.send('/backend/v1/entrada/publico', {
        method: 'POST',
        body: {
          ...form,
          empresa_razao: razao || form.empresa_razao || '',
          tempo_segundos: Math.floor((Date.now() - inicio) / 1000),
          consentimento_versao: 'LGPD-V1-2026-09',
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

  const T = (p: {
    k: string
    label: string
    req?: boolean
    area?: boolean
    ph?: string
    type?: string
  }) => (
    <label className="block text-sm font-medium">
      {p.label}
      {p.req ? ' *' : ''}
      {p.area ? (
        <textarea
          value={String(form[p.k] || '')}
          onChange={(e) => up(p.k, e.target.value)}
          rows={3}
          maxLength={p.k === 'relato' ? 5000 : 2000}
          placeholder={p.ph}
          className="mt-1 w-full border rounded-lg px-3 py-2"
        />
      ) : (
        <input
          type={p.type || 'text'}
          value={String(form[p.k] || '')}
          onChange={(e) => up(p.k, e.target.value)}
          maxLength={500}
          placeholder={p.ph}
          className="mt-1 w-full border rounded-lg px-3 py-2"
        />
      )}
    </label>
  )
  const S = (p: {
    k: string
    label: string
    req?: boolean
    opts: [string, string][]
    ph?: string
  }) => (
    <label className="block text-sm font-medium">
      {p.label}
      {p.req ? ' *' : ''}
      <select
        value={String(form[p.k] || '')}
        onChange={(e) => up(p.k, e.target.value)}
        className="mt-1 w-full border rounded-lg px-3 py-2"
      >
        <option value="">{p.ph || 'Selecione'}</option>
        {p.opts.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
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
            <p className="text-xs text-[#6B7280]">Conte sobre o seu financeiro — leva 2 minutos</p>
          </div>
        </div>
        {erro && (
          <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded">
            {erro}
          </p>
        )}
        {enviado ? (
          <div className="bg-white rounded-2xl p-8 text-center border">
            <p className="font-playfair text-2xl font-bold mb-2">Recebemos o seu contato!</p>
            <p className="text-sm text-[#6B7280]">
              Obrigado. Se for o nosso momento, o time da Vibratto entra em contato para entender o
              seu financeiro e preparar a melhor proposta para você.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-6 border space-y-4">
            <h1 className="font-playfair text-2xl font-bold">Sua empresa em 2 minutos</h1>

            {/* A — Identificação */}
            <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
              Quem é você
            </p>
            {T({ k: 'nome', label: 'Seu nome', req: true })}
            {T({ k: 'email', label: 'E-mail', req: true, type: 'email' })}
            {T({ k: 'whatsapp', label: 'WhatsApp com DDD', req: true, ph: '(11) 97764-9923' })}
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.eh_decisor === true}
                onChange={(e) => up('eh_decisor', e.target.checked)}
                className="w-4 h-4"
              />
              Eu participo das decisões financeiras da empresa
            </label>
            {T({
              k: 'cnpj',
              label: 'CNPJ da empresa (opcional)',
              ph: '00.000.000/0000-00',
            })}
            {razaoStatus === 'ok' && razao && (
              <p className="text-xs text-green-800 bg-green-50 border border-green-200 p-2 rounded">
                Encontramos: {razao} — confirme se é a empresa certa.
              </p>
            )}
            {razaoStatus === 'falha' && (
              <p className="text-xs text-[#6B7280]">
                Não conseguimos consultar o CNPJ automaticamente — sem problema, siga sem isso.
              </p>
            )}

            {/* B — Qualificação */}
            <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide pt-2">
              Sobre o financeiro
            </p>
            {S({ k: 'faturamento_faixa', label: 'Faturamento anual', opts: FATURAMENTO })}
            {T({
              k: 'qtd_cnpjs',
              label: 'Quantos CNPJs o grupo tem?',
              ph: 'Ex.: 1',
              type: 'number',
            })}
            {T({
              k: 'colaboradores',
              label: 'Quantos colaboradores?',
              ph: 'Ex.: 12',
              type: 'number',
            })}
            {S({ k: 'regime_tributario', label: 'Regime tributário', opts: REGIMES })}
            {T({
              k: 'erp_atual',
              label: 'Sistema que usa hoje (ERP)',
              ph: 'Ex.: Omie, Conta Azul, planilha',
            })}
            {T({
              k: 'quem_cuida_financeiro',
              label: 'Quem cuida do financeiro hoje?',
              ph: 'Ex.: eu mesmo, uma pessoa do time, contador',
            })}

            {/* C — Roteamento por sintoma */}
            <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide pt-2">
              O que mais pesa hoje
            </p>
            {S({ k: 'dor_principal', label: 'Qual é a maior dor hoje?', req: true, opts: DORES })}
            {T({
              k: 'dores_secundarias',
              label: 'Outras dores (opcional)',
              area: true,
            })}
            <label className="block text-sm font-medium">
              Conte com suas palavras o que está acontecendo (opcional)
              <textarea
                value={String(form.relato || '')}
                onChange={(e) => up('relato', e.target.value)}
                rows={3}
                maxLength={5000}
                placeholder="Ex.: Meu caixa fecha no vermelho todo fim de trimestre e eu descubro tarde..."
                className="mt-1 w-full border rounded-lg px-3 py-2"
              />
              <span
                className={`text-xs mt-1 block ${
                  String(form.relato || '').length > 0 &&
                  String(form.relato || '').trim().length < 30
                    ? 'text-amber-700'
                    : 'text-[#6B7280]'
                }`}
              >
                {String(form.relato || '').length === 0
                  ? 'Opcional — se preencher, escreva pelo menos 30 caracteres.'
                  : String(form.relato || '').trim().length < 30
                    ? `${30 - String(form.relato || '').trim().length} caracteres restantes (mínimo 30)`
                    : '✓ ' + String(form.relato || '').trim().length + ' caracteres'}
              </span>
            </label>
            {S({ k: 'urgencia', label: 'Quando precisa resolver?', opts: URGENCIAS })}
            {T({
              k: 'sonho_12m',
              label: 'Se em 12 meses o financeiro estivesse resolvido, o que muda para você?',
              area: true,
            })}
            {T({
              k: 'origem_declarada',
              label: 'Como chegou até a Vibratto?',
              ph: 'Ex.: indicação do X, Instagram, Google',
            })}

            {/* Honeypot — invisível para humanos */}
            <input
              type="text"
              name="website"
              value={String(form.website || '')}
              onChange={(e) => up('website', e.target.value)}
              style={{ display: 'none' }}
              tabIndex={-1}
              autoComplete="off"
            />

            <label className="flex items-start gap-2 text-sm bg-[#F7F5F1] border rounded-lg p-3">
              <input
                type="checkbox"
                checked={form.consentimento_lgpd === true}
                onChange={(e) => up('consentimento_lgpd', e.target.checked)}
                className="w-4 h-4 mt-0.5"
              />
              <span>
                Autorizo a Vibratto a usar estas informações para entrar em contato e preparar uma
                proposta, conforme a LGPD (LGPD-V1-2026-09). <b>Obrigatório.</b>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.optin_marketing === true}
                onChange={(e) => up('optin_marketing', e.target.checked)}
                className="w-4 h-4 mt-0.5"
              />
              <span>Quero receber conteúdos de clareza financeira da Vibratto (opcional).</span>
            </label>

            <button
              type="button"
              onClick={() => void enviar()}
              disabled={saving}
              className="w-full bg-[#C9A227] rounded-lg px-4 py-3 font-semibold disabled:opacity-50"
            >
              {saving ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
