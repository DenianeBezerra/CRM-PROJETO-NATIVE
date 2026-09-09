import React, { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Download, ExternalLink, RotateCcw, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

type Contact = {
  id: string
  nome: string
  empresa?: string
  email?: string
  telefone?: string
  cidade?: string
  origem?: string
  status?: string
}
type Opportunity = {
  id: string
  titulo: string
  cliente: string
  cliente_nome?: string
  estagio?: string
  valor?: number
  probabilidade?: number
  data_fechamento_previsto?: string
  motivo_perda?: string
  motivo_perda_detalhe?: string
}
type Stage = { chave: string; nome: string; ativa: boolean; ordem: number }
type ExportEntity = 'clientes' | 'negocios'
const EXPORT_PURPOSE = 'Uso interno na gestão comercial.'
const fallbackStages: Stage[] = [
  { chave: 'novo', nome: 'Novo', ativa: true, ordem: 10 },
  { chave: 'contato_feito', nome: 'Contato feito', ativa: true, ordem: 20 },
  { chave: 'proposta', nome: 'Proposta', ativa: true, ordem: 30 },
  { chave: 'fechado_ganho', nome: 'Fechado ganho', ativa: true, ordem: 40 },
  { chave: 'fechado_perdido', nome: 'Fechado perdido', ativa: true, ordem: 50 },
]

function csvCell(value: unknown) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}
function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const csv = '\ufeff' + [headers, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export default function SearchPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const [q, setQ] = useState('')
  const [entity, setEntity] = useState('todos')
  const [status, setStatus] = useState('todos')
  const [stage, setStage] = useState('todos')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [stages, setStages] = useState<Stage[]>(fallbackStages)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exportEntity, setExportEntity] = useState<ExportEntity | null>(null)
  const [accepted, setAccepted] = useState(false)
  const [exporting, setExporting] = useState(false)
  useEffect(() => {
    const load = async () => {
      try {
        const [cs, os] = await Promise.all([
          pb.collection('clientes').getFullList<Contact>({ sort: 'nome' }),
          pb
            .collection('negocios')
            .getFullList<Opportunity>({ sort: '-created', expand: 'cliente' }),
        ])
        setContacts(cs)
        setOpportunities(
          os.map((item) => ({
            ...item,
            cliente_nome: (item as Opportunity & { expand?: { cliente?: Contact } }).expand?.cliente
              ?.nome,
          })),
        )
        try {
          const ss = await pb.collection('etapas_negocio').getFullList<Stage>({ sort: 'ordem' })
          if (ss.length) setStages(ss)
        } catch {
          /* fallback */
        }
      } catch {
        setError('Não foi possível carregar os resultados.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])
  const filteredContacts = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return contacts.filter(
      (x) =>
        (status === 'todos' || x.status === status) &&
        (!needle ||
          [x.nome, x.empresa, x.email, x.telefone].some((v) => v?.toLowerCase().includes(needle))),
    )
  }, [contacts, q, status])
  const filteredOpportunities = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return opportunities.filter(
      (x) =>
        (stage === 'todos' || x.estagio === stage) &&
        (!needle || `${x.titulo} ${x.cliente_nome || ''}`.toLowerCase().includes(needle)),
    )
  }, [opportunities, q, stage])
  const reset = () => {
    setQ('')
    setEntity('todos')
    setStatus('todos')
    setStage('todos')
  }
  const visibleCount =
    exportEntity === 'clientes' ? filteredContacts.length : filteredOpportunities.length
  const openExport = (target: ExportEntity) => {
    setExportEntity(target)
    setAccepted(false)
  }
  const confirmExport = async () => {
    if (!exportEntity || !accepted || !user) return
    setExporting(true)
    const filters = {
      q: q.trim(),
      entity,
      status: exportEntity === 'clientes' ? status : 'todos',
      stage: exportEntity === 'negocios' ? stage : 'todos',
    }
    try {
      await pb.collection('aceites_exportacao').create({
        usuario: user.id,
        entidade: exportEntity,
        filtros: JSON.stringify(filters),
        quantidade: visibleCount,
        finalidade: EXPORT_PURPOSE,
        aceito_em: new Date().toISOString(),
        versao_termo: 'v1',
      })
      if (exportEntity === 'clientes')
        downloadCsv(
          `contatos-${new Date().toISOString().slice(0, 10)}.csv`,
          ['Nome', 'Empresa', 'E-mail', 'Telefone', 'Cidade', 'Origem', 'Status'],
          filteredContacts.map((x) => [
            x.nome,
            x.empresa,
            x.email,
            x.telefone,
            x.cidade,
            x.origem,
            x.status,
          ]),
        )
      else
        downloadCsv(
          `oportunidades-${new Date().toISOString().slice(0, 10)}.csv`,
          [
            'Título',
            'Contato',
            'Valor',
            'Estágio',
            'Probabilidade',
            'Fechamento previsto',
            'Motivo da perda',
            'Detalhe da perda',
          ],
          filteredOpportunities.map((x) => [
            x.titulo,
            x.cliente_nome,
            x.valor,
            x.estagio,
            x.probabilidade,
            x.data_fechamento_previsto,
            x.motivo_perda,
            x.motivo_perda_detalhe,
          ]),
        )
      setExportEntity(null)
      toast({
        title: 'Exportação concluída',
        description: `${visibleCount} registro(s) exportado(s).`,
      })
    } catch {
      toast({
        title: 'Exportação não realizada',
        description: 'Não foi possível registrar o aceite. Nenhum arquivo foi baixado.',
        variant: 'destructive',
      })
    } finally {
      setExporting(false)
    }
  }
  const empty =
    !loading &&
    (entity === 'clientes'
      ? filteredContacts.length === 0
      : entity === 'negocios'
        ? filteredOpportunities.length === 0
        : filteredContacts.length === 0 && filteredOpportunities.length === 0)
  return (
    <div className="min-h-screen bg-[#F7F5F1] text-[#0A0A0A] p-4 sm:p-8">
      <header className="max-w-6xl mx-auto flex items-center justify-between mb-8">
        <button
          onClick={() => navigate('/home')}
          className="flex items-center gap-2 text-sm text-[#6B7280]"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <button
          onClick={reset}
          className="flex items-center gap-2 text-sm border rounded-lg px-3 py-2 bg-white"
        >
          <RotateCcw className="w-4 h-4" /> Limpar
        </button>
      </header>
      <main className="max-w-6xl mx-auto">
        <p className="text-xs uppercase tracking-[0.2em] text-[#A8862B] font-semibold">
          Central Comercial
        </p>
        <h1 className="font-playfair text-4xl font-bold">Busca e recuperação</h1>
        <p className="text-[#6B7280] mt-2 mb-6">
          Encontre contatos e oportunidades sem alterar os dados.
        </p>
        <div className="grid gap-3 md:grid-cols-4 mb-6">
          <label className="md:col-span-2 flex items-center gap-3 bg-white border rounded-xl px-4 py-3">
            <Search className="w-4 h-4 text-[#6B7280]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome, empresa, e-mail, telefone ou título"
              className="bg-transparent outline-none w-full"
            />
          </label>
          <label className="text-sm font-medium">
            Entidade
            <select
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2 bg-white"
            >
              <option value="todos">Todas</option>
              <option value="clientes">Contatos</option>
              <option value="negocios">Oportunidades</option>
            </select>
          </label>
          <label className="text-sm font-medium">
            Status / estágio
            <select
              value={entity === 'negocios' ? stage : status}
              onChange={(e) =>
                entity === 'negocios' ? setStage(e.target.value) : setStatus(e.target.value)
              }
              className="mt-1 w-full border rounded-lg px-3 py-2 bg-white"
            >
              {entity === 'negocios' ? (
                <>
                  <option value="todos">Todos os estágios</option>
                  {stages.map((s) => (
                    <option key={s.chave} value={s.chave}>
                      {s.nome}
                    </option>
                  ))}
                </>
              ) : (
                <>
                  <option value="todos">Todos os status</option>
                  <option value="ativo">Ativo</option>
                  <option value="prospect">Prospect</option>
                  <option value="inativo">Inativo / arquivado</option>
                </>
              )}
            </select>
          </label>
        </div>
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {loading ? (
          <p>Carregando resultados...</p>
        ) : empty ? (
          <div className="bg-white border rounded-xl p-8 text-center text-[#6B7280]">
            Nenhum resultado encontrado. Tente limpar os filtros ou usar outro termo.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {(entity === 'todos' || entity === 'clientes') && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-playfair text-2xl font-bold">
                    Contatos ({filteredContacts.length})
                  </h2>
                  <button
                    disabled={!filteredContacts.length}
                    onClick={() => openExport('clientes')}
                    className="text-xs border rounded px-2 py-1 disabled:opacity-50"
                  >
                    <Download className="w-3 h-3 inline mr-1" /> Exportar
                  </button>
                </div>
                <div className="space-y-3">
                  {filteredContacts.map((item) => (
                    <article key={item.id} className="bg-white border rounded-xl p-4">
                      <div className="flex justify-between">
                        <div>
                          <h3 className="font-semibold">{item.nome}</h3>
                          <p className="text-sm text-[#6B7280]">
                            {item.empresa || 'Empresa não informada'}
                          </p>
                          <p className="text-xs mt-2">
                            {item.email || 'Sem e-mail'} · {item.telefone || 'Sem telefone'}
                          </p>
                        </div>
                        <button
                          onClick={() => navigate('/contatos')}
                          className="text-xs border rounded px-2 py-1 h-fit"
                        >
                          <ExternalLink className="w-3 h-3 inline mr-1" />
                          Abrir
                        </button>
                      </div>
                      <span className="inline-block text-xs mt-3 bg-[#F7F5F1] rounded px-2 py-1">
                        {item.status}
                      </span>
                    </article>
                  ))}
                </div>
              </section>
            )}
            {(entity === 'todos' || entity === 'negocios') && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-playfair text-2xl font-bold">
                    Oportunidades ({filteredOpportunities.length})
                  </h2>
                  <button
                    disabled={!filteredOpportunities.length}
                    onClick={() => openExport('negocios')}
                    className="text-xs border rounded px-2 py-1 disabled:opacity-50"
                  >
                    <Download className="w-3 h-3 inline mr-1" /> Exportar
                  </button>
                </div>
                <div className="space-y-3">
                  {filteredOpportunities.map((item) => (
                    <article key={item.id} className="bg-white border rounded-xl p-4">
                      <div className="flex justify-between">
                        <div>
                          <h3 className="font-semibold">{item.titulo}</h3>
                          <p className="text-sm text-[#6B7280]">
                            {item.cliente_nome || 'Contato não carregado'}
                          </p>
                          <p className="text-xs mt-2">
                            {item.valor == null
                              ? 'Valor não informado'
                              : `R$ ${item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}{' '}
                            · {item.probabilidade ?? 0}%
                          </p>
                        </div>
                        <button
                          onClick={() => navigate('/oportunidades')}
                          className="text-xs border rounded px-2 py-1 h-fit"
                        >
                          <ExternalLink className="w-3 h-3 inline mr-1" />
                          Abrir
                        </button>
                      </div>
                      <span className="inline-block text-xs mt-3 bg-[#F7F5F1] rounded px-2 py-1">
                        {stages.find((s) => s.chave === item.estagio)?.nome || item.estagio}
                      </span>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
      <Dialog
        open={exportEntity !== null}
        onOpenChange={(open) => !open && !exporting && setExportEntity(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exportação</DialogTitle>
            <DialogDescription>
              Você está exportando {visibleCount} registro(s) de{' '}
              {exportEntity === 'clientes' ? 'contatos' : 'oportunidades'} para uso interno na
              gestão comercial.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-[#F7F5F1] p-3 text-sm">
            Trate o arquivo como informação confidencial e observe a LGPD.
          </div>
          <label className="flex gap-3 items-start text-sm">
            <Checkbox checked={accepted} onCheckedChange={(value) => setAccepted(value === true)} />
            <span>Confirmo que esta exportação será usada apenas para a finalidade informada.</span>
          </label>
          <DialogFooter>
            <button
              disabled={exporting}
              onClick={() => setExportEntity(null)}
              className="border rounded-lg px-4 py-2"
            >
              Cancelar
            </button>
            <button
              disabled={!accepted || exporting || visibleCount === 0}
              onClick={() => void confirmExport()}
              className="bg-[#C9A227] rounded-lg px-4 py-2 font-semibold disabled:opacity-50"
            >
              {exporting ? 'Registrando...' : 'Aceitar e exportar'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
