import React, { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'

type Metrica = {
  chave: string
  nome: string
  formula: string
  fonte: string
  evento_inicial: string
  evento_final: string
  fuso: string
  exclusoes: string
  dono: string
  endpoint: string
  ativa: boolean
}

export default function Dicionario() {
  const navigate = useNavigate()
  const [metricas, setMetricas] = useState<Metrica[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const resp = await pb.send<{ total: number; metricas: Metrica[] }>(
          '/backend/v1/metricas/dicionario',
        )
        setMetricas(resp.metricas || [])
      } catch {
        setError('Não foi possível carregar o dicionário de métricas.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  return (
    <div className="min-h-screen bg-[#F7F5F1] text-[#0A0A0A] p-4 sm:p-8">
      <header className="max-w-5xl mx-auto flex items-center justify-between mb-8">
        <button
          onClick={() => navigate('/home')}
          className="flex items-center gap-2 text-sm text-[#6B7280]"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
      </header>
      <main className="max-w-5xl mx-auto">
        <p className="text-xs uppercase tracking-[0.2em] text-[#A8862B] font-semibold">
          Governança de dados
        </p>
        <h1 className="font-playfair text-4xl font-bold">Dicionário de métricas</h1>
        <p className="text-[#6B7280] mt-2 mb-6">
          A receita de cada número: fórmula, fonte, eventos, fuso, exclusões e dono.
        </p>
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {loading ? (
          <p>Carregando dicionário...</p>
        ) : (
          <div className="space-y-4">
            {metricas.map((m) => (
              <article key={m.chave} className="bg-white border rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold">{m.nome}</h2>
                  <span
                    className={`text-xs rounded-full px-2 py-1 ${
                      m.ativa
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : 'bg-[#F7F5F1] text-[#6B7280] border'
                    }`}
                  >
                    {m.ativa ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-xs font-medium text-[#A8862B] uppercase tracking-wide">
                      Fórmula
                    </dt>
                    <dd className="text-[#0A0A0A]">{m.formula}</dd>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <dt className="text-xs font-medium text-[#A8862B] uppercase tracking-wide">
                        Fonte
                      </dt>
                      <dd>{m.fonte}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-[#A8862B] uppercase tracking-wide">
                        Fuso
                      </dt>
                      <dd>{m.fuso}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-[#A8862B] uppercase tracking-wide">
                        Evento inicial
                      </dt>
                      <dd>{m.evento_inicial}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-[#A8862B] uppercase tracking-wide">
                        Evento final
                      </dt>
                      <dd>{m.evento_final}</dd>
                    </div>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-[#A8862B] uppercase tracking-wide">
                      Exclusões
                    </dt>
                    <dd>{m.exclusoes}</dd>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t">
                    <div>
                      <dt className="text-xs font-medium text-[#6B7280]">Dono</dt>
                      <dd>{m.dono}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-[#6B7280]">Endpoint</dt>
                      <dd className="font-mono text-xs">{m.endpoint || '—'}</dd>
                    </div>
                  </div>
                </dl>
              </article>
            ))}
            {metricas.length === 0 && (
              <p className="text-sm text-[#6B7280]">Nenhuma métrica registrada.</p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
