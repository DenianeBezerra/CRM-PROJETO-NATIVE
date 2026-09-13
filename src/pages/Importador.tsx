import React, { useEffect, useState } from 'react'
import { ArrowLeft, Upload, Undo2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { msgErro } from '@/lib/erro'

// T3.22 v4 — SPEC-3-022: planilha A (empresas) + planilha B (contatos adicionais).
// Dedup SEM pré-seleção (decisão CEO: escolha explícita em decisão que grava dado).

type Linha = {
  razao_social: string
  cnpj: string
  contato_nome: string
  contato_email: string
  telefone?: string
  setor?: string
  sistema: string
  sistema_outro?: string
  data_inicio: string
  vigencia?: string
  natureza_registro?: string
  cargo_contato?: string
  analista_titular?: string
  servicos: { servico: string; valor_mensal: number }[]
}
type LinhaB = {
  cnpj: string
  nome: string
  email?: string
  telefone?: string
  cargo?: string
  papel_operacional: string
}
type AvisoB = { linha: number; nome: string; outra_empresa: string; aviso: string }
type Preview = {
  total_enviado: number
  total_b: number
  validas: number
  validas_b: number
  invalidas: number
  erros: { planilha: string; linha: number; erros: string[] }[]
  avisos_b: AvisoB[]
  duplicadas_empresa: number
  duplicadas_contato: number
  duplicadas_b: number
  atualizacoes_empresa: number
  atualizacoes_contato: number
  amostra: Linha[]
}
type Lote = {
  id: string
  tipo: string
  arquivo_nome: string
  status: string
  contagens: Record<string, number>
  criados: Record<string, string[]>
  criado_em: string
}

const CSV_HEADER_A =
  'razao_social;cnpj;contato_nome;contato_email;telefone;setor;sistema;sistema_outro;data_inicio;vigencia;servicos;valores;natureza_registro;cargo_contato;analista_titular'
const CSV_HEADER_B = 'cnpj;nome;email;telefone;cargo;papel_operacional'
const NATUREZAS = ['cliente', 'empresa do grupo', 'projeto']

const dataBR = (s: string | null) =>
  !s
    ? '—'
    : new Date(s.replace(' ', 'T')).toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      })

export default function Importador() {
  const navigate = useNavigate()
  const [texto, setTexto] = useState('')
  const [textoB, setTextoB] = useState('')
  const [arquivoNome, setArquivoNome] = useState('')
  const [dedupEmpresas, setDedupEmpresas] = useState('')
  const [dedupContatos, setDedupContatos] = useState('')
  const [decisoes, setDecisoes] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState<Preview | null>(null)
  const [resultado, setResultado] = useState<{
    lote_id: string
    criados: Record<string, string[]>
  } | null>(null)
  const [lotes, setLotes] = useState<Lote[]>([])
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const parseCsvA = (raw: string): Linha[] => {
    const linhas = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.toLowerCase().startsWith('razao_social;'))
    return linhas.map((l) => {
      const p = l.split(';').map((x) => x.trim())
      const servicosNomes = (p[10] || '')
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean)
      const valores = (p[11] || '')
        .split('|')
        .map((s) => Number(s.replace(/\./g, '').replace(',', '.')))
      const servicos = servicosNomes
        .map((nome, i) => ({ servico: nome, valor_mensal: valores[i] }))
        .filter((s) => s.servico && Number.isFinite(s.valor_mensal) && s.valor_mensal > 0)
      return {
        razao_social: p[0] || '',
        cnpj: p[1] || '',
        contato_nome: p[2] || '',
        contato_email: p[3] || '',
        telefone: p[4] || '',
        setor: p[5] || '',
        sistema: (p[6] || '').toLowerCase(),
        sistema_outro: p[7] || '',
        data_inicio: p[8] || '',
        vigencia: p[9] || '',
        servicos,
        natureza_registro: p[12] || '',
        cargo_contato: p[13] || '',
        analista_titular: p[14] || '',
      }
    })
  }
  const parseCsvB = (raw: string): LinhaB[] => {
    const linhas = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.toLowerCase().startsWith('cnpj;'))
    return linhas.map((l) => {
      const p = l.split(';').map((x) => x.trim())
      return {
        cnpj: p[0] || '',
        nome: p[1] || '',
        email: p[2] || '',
        telefone: p[3] || '',
        cargo: p[4] || '',
        papel_operacional: p[5] || '',
      }
    })
  }

  const carregarLotes = async () => {
    try {
      const r = await pb.send<{ total: number; itens: Lote[] }>('/backend/v1/importador/lotes', {})
      setLotes(r.itens || [])
    } catch {}
  }
  useEffect(() => {
    void carregarLotes()
  }, [])

  const dedupOk = dedupEmpresas !== '' && dedupContatos !== ''

  const preVisualizar = async () => {
    setErro('')
    setPreview(null)
    setResultado(null)
    setDecisoes({})
    const linhas = parseCsvA(texto)
    if (linhas.length === 0) return setErro('Nenhuma linha válida encontrada no texto colado.')
    setOcupado(true)
    try {
      const r = await pb.send<Preview>('/backend/v1/importador/preview', {
        method: 'POST',
        body: {
          linhas,
          linhas_b: parseCsvB(textoB),
          dedup: { empresas: dedupEmpresas, contatos: dedupContatos },
        },
      })
      setPreview(r)
    } catch (e) {
      setErro(msgErro(e, 'Falha na pré-visualização.'))
    } finally {
      setOcupado(false)
    }
  }

  const gravar = async () => {
    setErro('')
    setOcupado(true)
    try {
      const linhas = parseCsvA(texto)
      const r = await pb.send<{ lote_id: string; criados: Record<string, string[]> }>(
        '/backend/v1/importador/tipo1',
        {
          method: 'POST',
          body: {
            linhas,
            linhas_b: parseCsvB(textoB),
            confirm: true,
            arquivo_nome: arquivoNome || 'colado',
            dedup: { empresas: dedupEmpresas, contatos: dedupContatos },
            decisoes_vinculo: decisoes,
          },
        },
      )
      setResultado(r)
      setPreview(null)
      setTexto('')
      setTextoB('')
      void carregarLotes()
    } catch (e) {
      setErro(msgErro(e, 'Falha ao gravar o lote.'))
    } finally {
      setOcupado(false)
    }
  }

  const desfazer = async (id: string) => {
    setErro('')
    setOcupado(true)
    try {
      await pb.send(`/backend/v1/importador/${id}/desfazer`, { method: 'POST' })
      void carregarLotes()
    } catch (e) {
      setErro(msgErro(e, 'Falha ao desfazer o lote.'))
    } finally {
      setOcupado(false)
    }
  }

  const baixarTemplate = () => {
    const blob = new Blob([CSV_HEADER_A + '\n' + CSV_HEADER_B + '\n'], {
      type: 'text/csv;charset=utf-8',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'template_importador_tipo1.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="min-h-screen bg-[#F7F5F1]">
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        <button
          onClick={() => navigate('/home')}
          className="text-sm text-[#6B7280] hover:text-[#0A0A0A] mb-4 inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <h1 className="font-playfair text-2xl font-bold text-[#0A0A0A]">
          Importador — clientes ativos
        </h1>
        <p className="text-sm text-[#6B7280] mt-1">
          Tipo 1 (SPEC-3-022): empresa, contatos e contratos. Entrada marcada como
          <strong> migração</strong> — fora dos indicadores de conversão, ciclo e origem; entra
          apenas no MRR.
        </p>

        {erro && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {erro}
          </div>
        )}

        <div className="mt-6 p-4 sm:p-5 rounded-xl bg-white border border-[#E5E7EB]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-playfair font-bold text-base text-[#0A0A0A]">
              1. Planilha A — empresas (CSV ;)
            </h2>
            <button
              onClick={baixarTemplate}
              className="text-xs font-semibold text-[#A8862B] hover:underline"
            >
              Baixar template
            </button>
          </div>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={8}
            placeholder={CSV_HEADER_A}
            className="w-full p-3 rounded-lg border border-[#E5E7EB] text-xs font-mono focus:outline-none focus:border-[#C9A227]"
          />
          <h2 className="font-playfair font-bold text-base text-[#0A0A0A] mt-4 mb-2">
            1b. Planilha B — contatos adicionais (opcional)
          </h2>
          <textarea
            value={textoB}
            onChange={(e) => setTextoB(e.target.value)}
            rows={4}
            placeholder={CSV_HEADER_B}
            className="w-full p-3 rounded-lg border border-[#E5E7EB] text-xs font-mono focus:outline-none focus:border-[#C9A227]"
          />
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              value={arquivoNome}
              onChange={(e) => setArquivoNome(e.target.value)}
              placeholder="Nome do arquivo (opcional)"
              className="p-2 rounded-lg border border-[#E5E7EB] text-sm"
            />
            <select
              value={dedupEmpresas}
              onChange={(e) => setDedupEmpresas(e.target.value)}
              className="p-2 rounded-lg border border-[#E5E7EB] text-sm"
            >
              <option value="">Duplicata de empresa: escolha…</option>
              <option value="ignorar">Duplicata de empresa: ignorar</option>
              <option value="atualizar">Duplicata de empresa: atualizar</option>
            </select>
            <select
              value={dedupContatos}
              onChange={(e) => setDedupContatos(e.target.value)}
              className="p-2 rounded-lg border border-[#E5E7EB] text-sm"
            >
              <option value="">Duplicata de contato: escolha…</option>
              <option value="ignorar">Duplicata de contato: ignorar</option>
              <option value="atualizar">Duplicata de contato: atualizar</option>
            </select>
          </div>
          <button
            onClick={preVisualizar}
            disabled={ocupado || !dedupOk}
            title={!dedupOk ? 'Escolha o tratamento de duplicatas (obrigatório).' : ''}
            className="mt-4 px-4 py-2 rounded-lg bg-[#C9A227] text-white text-sm font-semibold hover:bg-[#A8862B] disabled:opacity-50"
          >
            {ocupado ? 'Processando...' : 'Pré-visualizar (obrigatório)'}
          </button>
        </div>

        {preview && (
          <div className="mt-4 p-4 sm:p-5 rounded-xl bg-white border border-[#E5E7EB]">
            <h2 className="font-playfair font-bold text-base text-[#0A0A0A] mb-3">
              2. Pré-visualização
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-[#F7F5F1]">
                <div className="text-2xl font-bold text-[#0A0A0A]">{preview.validas}</div>
                <div className="text-xs text-[#6B7280]">empresas válidas</div>
              </div>
              <div className="p-3 rounded-lg bg-[#F7F5F1]">
                <div className="text-2xl font-bold text-[#0A0A0A]">{preview.validas_b}</div>
                <div className="text-xs text-[#6B7280]">contatos adicionais</div>
              </div>
              <div className="p-3 rounded-lg bg-[#F7F5F1]">
                <div className="text-2xl font-bold text-red-600">{preview.invalidas}</div>
                <div className="text-xs text-[#6B7280]">inválidas</div>
              </div>
              <div className="p-3 rounded-lg bg-[#F7F5F1]">
                <div className="text-2xl font-bold text-[#0A0A0A]">
                  {preview.duplicadas_empresa +
                    preview.duplicadas_contato +
                    (preview.duplicadas_b || 0)}
                </div>
                <div className="text-xs text-[#6B7280]">duplicatas</div>
              </div>
            </div>
            {preview.erros.length > 0 && (
              <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 max-h-40 overflow-y-auto">
                {preview.erros.map((er) => (
                  <div key={er.planilha + er.linha}>
                    Planilha {er.planilha}, linha {er.linha}: {er.erros.join('; ')}
                  </div>
                ))}
              </div>
            )}
            {(preview.avisos_b || []).length > 0 && (
              <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                {(preview.avisos_b as AvisoB[]).map((av) => (
                  <div key={av.linha} className="flex items-center justify-between gap-2 py-1">
                    <span>
                      Linha B{av.linha} ({av.nome}): {av.aviso}
                    </span>
                    <select
                      value={decisoes['B' + av.linha] || ''}
                      onChange={(e) =>
                        setDecisoes((d) => ({ ...d, ['B' + av.linha]: e.target.value }))
                      }
                      className="p-1 rounded border border-[#E5E7EB] text-xs"
                    >
                      <option value="">Decidir…</option>
                      <option value="vincular">Vincular a esta empresa</option>
                      <option value="ignorar">Ignorar (mantém vínculo atual)</option>
                    </select>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 text-xs text-[#6B7280]">
              Ações: {preview.atualizacoes_empresa} empresa(s) atualizada(s),{' '}
              {preview.atualizacoes_contato} contato(s) atualizado(s).
            </div>
            <button
              onClick={gravar}
              disabled={
                ocupado ||
                preview.validas === 0 ||
                preview.invalidas > 0 ||
                (preview.avisos_b || []).some((av) => !decisoes['B' + av.linha])
              }
              className="mt-4 px-4 py-2 rounded-lg bg-[#0A0A0A] text-[#E8C766] text-sm font-semibold hover:opacity-90 disabled:opacity-40"
            >
              Confirmar e gravar lote
            </button>
          </div>
        )}

        {resultado && (
          <div className="mt-4 p-4 sm:p-5 rounded-xl bg-green-50 border border-green-200">
            <h2 className="font-playfair font-bold text-base text-[#0A0A0A] mb-2">
              Lote gravado — {resultado.lote_id}
            </h2>
            <div className="text-sm text-[#374151]">
              {resultado.criados.empresas?.length || 0} empresa(s),{' '}
              {resultado.criados.clientes?.length || 0} contato(s),{' '}
              {resultado.criados.negocios?.length || 0} negócio(s),{' '}
              {resultado.criados.fichas?.length || 0} ficha(s) operacional(is) (em implantação, só
              bloco 9).
            </div>
          </div>
        )}

        <div className="mt-6 p-4 sm:p-5 rounded-xl bg-white border border-[#E5E7EB]">
          <h2 className="font-playfair font-bold text-base text-[#0A0A0A] mb-3">Lotes recentes</h2>
          {lotes.length === 0 && <p className="text-sm text-[#6B7280]">Nenhum lote ainda.</p>}
          <div className="space-y-2">
            {lotes.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between p-3 rounded-lg bg-[#F7F5F1] text-sm"
              >
                <div>
                  <div className="font-semibold text-[#0A0A0A]">
                    {l.arquivo_nome} — {l.status === 'aplicado' ? 'aplicado' : 'desfeito'}
                  </div>
                  <div className="text-xs text-[#6B7280]">
                    {dataBR(l.criado_em)} · {l.contagens?.validas ?? 0} empresa(s) ·{' '}
                    {l.contagens?.validas_b ?? 0} contato(s) adicional(is)
                  </div>
                </div>
                {l.status === 'aplicado' && (
                  <button
                    onClick={() => desfazer(l.id)}
                    disabled={ocupado}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline disabled:opacity-40"
                  >
                    <Undo2 className="w-3 h-3" /> Desfazer
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
