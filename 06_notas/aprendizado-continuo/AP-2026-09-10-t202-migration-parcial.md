# AP-2026-09-10 — Migration parcialmente aplicada pela plataforma

- **Task:** T2.02 (CA-2-037)
- **Padrão:** uma migration pode ser marcada como "applied" pela plataforma sem que todas as suas operações persistam (a 0022 criou a coleção `empresas` mas a conversão text→relation de `clientes.empresa` não persistiu; mesmo sintoma do prefixo 0019 queimado na T2.01).
- **Regra:** após `apply_changes` que envolva conversão de tipo de campo, PROVAR o resultado por API (ler um registro e conferir o tipo/valor do campo) antes de registrar GREEN. Se a operação não persistiu, criar migration nova idempotente (verificar o estado atual do campo antes de operar) em vez de reexecutar a anterior.
- **Evidência:** v0.0.93 (campo ainda texto) → 0023 idempotente → v0.0.94 (relation + backfill confirmados por API).
