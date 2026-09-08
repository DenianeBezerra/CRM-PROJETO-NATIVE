# SPEC-1-012-DERIVADA — Exportação segura e aceite integrado

> **Status:** SPEC DERIVADA — a SPEC-1-012 original não foi localizada no repositório.
>
> **Autorização da owner:** Deniane autorizou a criação de SPEC derivada em 08/09/2026, após a análise da T12.1.
>
> Esta especificação é substituível caso a SPEC original seja recuperada. Não deve ser tratada como transcrição da original.

## 1. Objetivo

Disponibilizar o caminho principal de exportação dos dados comerciais já consultáveis no CRM, com confirmação explícita do usuário antes do download e registro rastreável do aceite.

O resultado observável é: um usuário autenticado consegue exportar um conjunto filtrado de contatos ou oportunidades em CSV, após aceitar a finalidade da exportação; o sistema registra quem aceitou, quando, qual entidade/filtros foram utilizados e a quantidade de registros exportados.

## 2. Recorte da T12.1

### Incluído

- Exportação CSV de **contatos** e de **oportunidades**.
- Exportação dos resultados atualmente visíveis na tela de Busca e recuperação (`/busca`), respeitando termo e filtro da entidade.
- Campos comerciais não sensíveis:
  - Contatos: nome, empresa, e-mail, telefone, cidade, origem e status.
  - Oportunidades: título, contato relacionado, valor, estágio, probabilidade e data de fechamento previsto.
- Confirmação explícita antes do download, com finalidade apresentada ao usuário.
- Registro do aceite no backend.
- Feedback de sucesso, erro, estado vazio e cancelamento.
- Acesso protegido para usuários autenticados; admin e operator podem exportar somente os dados que já podem consultar.

### Fora do escopo

- Exportação de auditoria, usuários, tokens, senhas, credenciais ou fixtures de demonstração.
- Exportação de interações e observações livres, por poderem conter dados pessoais ou informação não estruturada não validada para compartilhamento.
- Exportação XLSX, PDF, JSON, agendamento, envio por e-mail ou integração externa.
- Compartilhamento público de arquivo ou criação de URL permanente.
- Aceite jurídico ou assinatura eletrônica. O aceite desta task é um registro operacional de confirmação da exportação.

## 3. Fluxo principal

1. Usuário autenticado acessa `/busca`.
2. Sistema carrega contatos e oportunidades conforme as regras atuais.
3. Usuário aplica termo, entidade e filtro compatível.
4. Usuário aciona `Exportar contatos` ou `Exportar oportunidades`.
5. Sistema mostra confirmação com:
   - entidade selecionada;
   - quantidade de registros;
   - finalidade: uso interno na gestão comercial;
   - aviso para tratar o arquivo como informação confidencial e observar a LGPD;
   - checkbox desmarcado por padrão: `Confirmo que esta exportação será usada apenas para a finalidade informada.`
6. Enquanto o checkbox não estiver marcado, o download e o registro ficam bloqueados.
7. Ao confirmar, o backend registra o aceite e o sistema gera o CSV no navegador somente com os resultados filtrados.
8. O sistema informa sucesso e encerra o modal.

## 4. Dados do aceite

Criar uma coleção append-only `aceites_exportacao` com:

- `usuario`: relação obrigatória com `users`;
- `entidade`: select `clientes` ou `negocios`;
- `filtros`: texto JSON contendo somente termo, entidade e filtro aplicado, sem conteúdo de senha/token;
- `quantidade`: número inteiro não negativo;
- `finalidade`: texto fixo da finalidade exibida;
- `aceito_em`: data obrigatória;
- `versao_termo`: texto fixo, inicialmente `v1`.

Regras:

- usuário autenticado pode criar o próprio aceite;
- usuário autenticado pode consultar apenas os próprios aceites, salvo admin, que pode consultar todos;
- criação direta pelo cliente deve ser controlada para impedir troca de `usuario`, finalidade ou data;
- atualização e exclusão devem ser bloqueadas (append-only);
- nenhum segredo ou dado de autenticação pode entrar no campo `filtros`.

## 5. Critérios de aceite

### CA-01 — acesso e permissão

Usuário não autenticado não acessa a tela nem o fluxo de exportação. Usuário autenticado, seja admin ou operator, consegue iniciar exportação dos dados que a busca já exibe.

### CA-02 — exportação de contatos

Com contatos filtrados, o botão gera CSV UTF-8 com BOM, cabeçalho legível em português e somente os campos definidos nesta SPEC. O arquivo contém exatamente os contatos visíveis após os filtros.

### CA-03 — exportação de oportunidades

Com oportunidades filtradas, o botão gera CSV UTF-8 com BOM, cabeçalho legível em português e somente os campos definidos nesta SPEC. O arquivo contém exatamente as oportunidades visíveis após os filtros, incluindo o nome do contato relacionado quando disponível.

### CA-04 — confirmação obrigatória

Abrir o modal não baixa arquivo nem cria aceite. Com checkbox desmarcado, o botão de confirmação permanece indisponível ou a ação é rejeitada com mensagem clara. Cancelar não cria registro e não baixa arquivo.

### CA-05 — aceite rastreável

Após confirmação válida, existe um registro de aceite com usuário autenticado, entidade, quantidade, filtros permitidos, finalidade, versão `v1` e data/hora. O usuário não consegue editar ou excluir o registro pelo cliente.

### CA-06 — segurança e privacidade

CSV e registro não incluem auditoria, senha, token, fixture, credencial ou observação livre. A API rejeita tentativa de criar aceite para outro usuário e rejeita update/delete direto.

### CA-07 — estados de borda

O sistema trata sem download e sem aceite: busca sem resultados, erro ao carregar dados, erro ao registrar aceite e cancelamento. Após erro no registro, o arquivo não deve ser baixado.

### CA-08 — regressão

Busca, filtros, recuperação de registros e rotas protegidas continuam funcionando. Logout impede novo acesso à tela e ao endpoint de aceite.

## 6. Arquivos/componentes prováveis

- `04-fase-atual/specs/SPEC-1-012-DERIVADA-exportacao-aceite.md`
- migration PocketBase para `aceites_exportacao`;
- `src/pages/SearchPage.tsx`;
- componentes de diálogo/checkbox já existentes;
- `src/lib/pocketbase/schema.json`;
- regras e/ou hook de proteção do aceite;
- evidências da T12.1 e registros de estado/status.

## 7. Verificação automática prevista

- lint/checagem estática;
- build;
- testes de integração/QA do Skip;
- verificação das regras da coleção;
- validação de que campos proibidos não aparecem no payload do CSV;
- teste de que falha no aceite impede download.

## 8. Roteiro de teste humano

1. Entrar como operator e abrir `/busca`.
2. Filtrar contatos e iniciar exportação; verificar modal, quantidade e finalidade.
3. Tentar confirmar sem marcar o checkbox; verificar bloqueio.
4. Cancelar; verificar ausência de download e ausência de aceite.
5. Confirmar; abrir o CSV e conferir cabeçalho, quantidade e campos permitidos.
6. Repetir para oportunidades com filtro de estágio.
7. Testar busca sem resultado e erro/cancelamento, quando reproduzível.
8. Sair e tentar acessar `/busca`; verificar bloqueio.
9. Entrar como admin e conferir que o fluxo continua disponível sem acesso a dados proibidos.

## 9. Dependências e riscos

- A SPEC original pode alterar o formato ou o significado de aceite; se recuperada, deve substituir esta SPEC antes da implementação.
- O registro de aceite é operacional e não substitui validação jurídica de consentimento ou assinatura.
- Valores e observações podem conter informação sensível; por isso observações ficam fora do CSV nesta primeira versão.
- A geração no navegador reduz exposição do arquivo, mas não impede que o usuário o copie após o download; a finalidade e o aviso devem ser claros.
