import React from 'react'

// Camada complementar ao fail-safe por fonte (CEO 13/09): o fail-safe por
// try/catch protege contra FONTE DE DADOS que falha; o ErrorBoundary protege
// contra EXCEÇÃO NA MONTAGEM do próprio componente — o caso da home em branco
// (ReferenceError desmontou a árvore e deixou a tela preta, sem explicação).
// Tela preta sem explicação não é mais um estado possível do sistema: qualquer
// exceção na renderização exibe mensagem com a identificação do erro.
type Props = { children: React.ReactNode }
type State = { erro: Error | null }

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { erro: null }

  static getDerivedStateFromError(erro: Error): State {
    return { erro }
  }

  componentDidCatch(erro: Error, info: React.ErrorInfo) {
    // Registro no console para diagnóstico — a UI nunca fica muda.
    console.error('[ErrorBoundary] Falha na renderização:', erro, info.componentStack)
  }

  render() {
    if (this.state.erro) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#F7F5F1] p-6">
          <div className="max-w-lg w-full bg-white border border-red-200 rounded-2xl p-6 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center text-red-700 mb-3 font-bold">
              !
            </div>
            <h1 className="font-playfair text-xl font-bold text-[#0A0A0A]">
              O sistema encontrou uma falha nesta tela
            </h1>
            <p className="text-sm text-[#6B7280] mt-2">
              A tela não pôde ser exibida por um erro interno. As demais telas continuam acessíveis
              — volte e tente novamente. Se persistir, informe a mensagem abaixo ao responsável pelo
              sistema.
            </p>
            <div className="mt-3 rounded-lg bg-[#F7F5F1] border border-[#E5E7EB] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Identificação do erro
              </p>
              <p className="text-xs font-mono text-red-700 mt-1 break-words">
                {this.state.erro.message || String(this.state.erro)}
              </p>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => this.setState({ erro: null })}
                className="text-sm font-semibold text-[#0A0A0A] bg-[#C9A227] rounded-lg px-4 py-2 hover:bg-[#E8C766]"
              >
                Tentar novamente
              </button>
              <button
                onClick={() => {
                  window.location.href = '/home'
                }}
                className="text-sm font-semibold text-[#6B7280] border border-[#E5E7EB] rounded-lg px-4 py-2 hover:bg-[#F7F5F1]"
              >
                Ir para a tela inicial
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
