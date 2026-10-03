# Agente de Desenvolvimento — Agendamento Odontológico

Projeto de agenda para **consultório real** (não é estudo/portfólio), desenvolvido com **SDD (Spec-Driven Development)** + **Harness Engineering**.
O desenvolvedor (Bernardo) é novo em SDD/Harness: explique brevemente o "porquê" ao propor passos da metodologia.

## Fontes de verdade e precedência

Em caso de conflito entre documentos, vale esta ordem:

1. `specs/FEATURES/FEATURE_NNN_*.md` — regras de negócio (20 features).
2. `specs/README.md` — índice, fases, dependências e regra para dependências que apontam para frente.
3. `context/ANALISE_SPECS.md` — decisões `[stated]` de 2026-10-02 (usa a numeração **anterior**: as antigas 013–019 são as atuais 014–020).
4. `context/HARNESS_ENGINEERING.md` — stack, estrutura de diretórios e padrões técnicos.
5. `context/Resumo.md` — visão geral histórica (anterior às decisões de 2026-10-02; pode estar desatualizado).
6. `context/SDD harnes engine _ project.md` — prompt **histórico** da fase de especificação. Usar só como referência de metodologia (13 features, pasta `harness/` e "não criar código" não valem mais).

Se encontrar divergência entre documentos ou specs, **aponte ao Bernardo**; não resolva sozinho.

## Contrato de trabalho com a IA

Herdado da metodologia SDD do projeto:

- ❓ **Questionar antes de assumir.** Se faltar informação, pergunte antes de implementar.
- 📝 **Registrar** o que o usuário disser como fonte de verdade (`[stated]`); ajustes de análise usam `[correção]`.
- ⚠️ **Marcar `⚠️ PENDENTE`** tudo que não foi definido; nunca preencher lacuna com suposição.
- ✅ **Validar antes de prosseguir:** resuma o entendimento ("Deixa eu confirmar se entendi…") em decisões ambíguas ou de impacto.
- ❌ **Nunca:** inventar regra de negócio, assumir configuração técnica não decidida, decidir pelo usuário, alterar specs sem pedido explícito.
- Se uma feature parecer grande demais (spec ideal: 3–6 cenários, 1–2 dias), **proponha dividir** em vez de implementar tudo de uma vez.

## Princípios inegociáveis

1. **A spec manda.** Item `⚠️ PENDENTE` ou não coberto: pare e pergunte (ou registre a pendência).
2. **Não altere specs** sem pedido explícito. Inconsistência: apontar.
3. **Ciclo por feature:** Spec → Migration → Exemplo → Teste → Código → Rota/UI. Não pule etapas.
4. **Uma feature por vez**, na ordem do roadmap: MVP (001–006) → V1 (007–013) → V1.5 (014–020). Respeite as dependências da spec.
5. **Dependências para frente:** no MVP, o Cenário testa só a parte da feature atual e o resto vira `it.todo`; no V1, integrações com o V1.5 usam **interface temporária** (contrato exportado + implementação provisória).
6. **Papéis:** `admin` > `dentista` > `recepcionista`, pirâmide pura (o Admin pode tudo que o Dentista pode; "exclusivo do Dentista" = "Dentista ou Admin"). Paciente **não** é usuário do sistema (sem login).

## Stack (decidido, não trocar)

Next.js 15 (App Router) · TypeScript · Node 20+ · pnpm · Supabase (cliente direto, **sem ORM**) · PostgreSQL · Zod · Vitest · Vercel.

- **Auth:** Supabase Auth (senha, sessão e email de recuperação). A tabela `usuarios` guarda só papel, clínica e `ativo`.
- **Tempo real da agenda (007):** Supabase Realtime.
- **Upload de imagens (015):** direto do navegador para o storage via URL assinada.
- **Ambiente de teste:** Supabase CLI local (`supabase start`: Postgres + Auth no Docker), nunca o Supabase de produção.

## Fluxo de trabalho para cada feature

1. Ler a spec completa (`Requisitos`, `Cenários`, `Regras de Negócio`, `Dependências`, `PENDENTE`) e as specs das dependências.
2. Confirmar que as dependências já estão implementadas; senão avisar.
3. **Migration** em `supabase/migrations/` (UUID como PK, constraints derivadas da spec).
4. **Exemplo executável** em `tests/examples/modules/<modulo>/` (adaptado da seção "Exemplos de Código" da spec).
5. **Teste** `FEATURE_NNN.test.ts`: um `it` por Cenário da spec, mapeado 1:1 e com o mesmo nome. Pendências e dependências futuras viram `it.todo`.
6. **Código** em `src/modules/<modulo>/` (`services/`, `types/`, `components/`) até os testes passarem.
7. **Rotas/UI** em `src/app/`, chamando apenas services.
8. Rodar testes e typecheck; reportar quais Cenários passam.

## Estrutura

```
src/modules/<modulo>/{services,types,components}
src/app/          rotas
src/lib/          Supabase client, erros, utilitários compartilhados
supabase/migrations/
tests/{unit,integration,examples}/modules/<modulo>/
tests/fixtures/   fábricas por entidade (testes e exemplos)
specs/FEATURES/   specs (não editar sem pedido)
```

Mapeamento módulo ↔ feature: seção 2.1 de `context/HARNESS_ENGINEERING.md`.

## Regras de código (detalhes em `.cursor/rules/`)

- Domínio em português (`Agendamento`, `Paciente`); termos técnicos em inglês (`service`, `hook`).
- Zod por módulo; tipos via `z.infer`. Enums/union types para estados fechados.
- Autorização por papel **centralizada** (`exigirPermissao` em `src/modules/autenticacao`); nada de checagem solta em componente/service.
- Módulos só se comunicam via service/função pública exportada.
- Schema só muda via migration versionada, nunca pelo painel do Supabase.
- Multi-tenant: toda query de domínio filtra por `clinica_id` do usuário autenticado.
- As interfaces TypeScript das specs são **contratos ilustrativos**; adapte ao schema real sem alterar o significado.

## Invariantes de negócio (armadilhas conhecidas)

Consolidados das specs e de `context/ANALISE_SPECS.md`. Confirme sempre na spec da feature antes de aplicar.

- **Ciclo do agendamento (006):** nasce `agendado` → `em_espera` (opcional, chegada marcada manualmente, 018) → `iniciado` → `concluido`; `cancelado` é terminal e só antes de `concluido`. "Confirmado" nas specs = `agendado`. `iniciado`: Dentista responsável ou Admin. `concluido`: **automático ao salvar a Evolução** (010); não existe ação "concluir". No MVP nenhum agendamento chega a `concluido`.
- **Validações do agendamento (006):** cadeira livre e **ativa**, dentista **ativo** e sem consulta/bloqueio no horário, paciente sem conflito, horário dentro do funcionamento e **dia** em `dias_atendimento`; **controle de concorrência** no banco. Emergência retroativa ignora todas. Procedimento avulso **ou** itens do plano, ambos opcionais.
- **Bloqueio de agenda (006):** criado pelo Dentista (o próprio) ou Admin; suporta recorrência (formato ⚠️ PENDENTE).
- **Especialidade do dentista é só informativa** — não restringe procedimentos (decisão revertida; não reintroduzir).
- **Não apagar dados clínicos:** remover usuário/dentista/cadeira só desativa; agendamentos futuros ficam com **alerta**, não são cancelados nem apagados.
- **Clínica (002):** horário único e fixo; mudar horário não cancela agendamentos (aviso "fora de horário"). Um Admin = uma clínica.
- **Paciente (004):** obrigatório **nome + pelo menos um canal** (sms/email/whatsapp), com exatamente um preferido; CPF único por clínica quando informado; responsável legal (nome + CPF) só quando a data de nascimento indica menor de 18; idade sempre calculada.
- **Procedimento (005):** tempo e valor são médias; materiais só com a 017; só Admin exclui.
- **Material/estoque (017):** **não existe reserva**. A baixa acontece ao concluir o atendimento (salvar Evolução), consumindo lotes por **FEFO**; vencido é removido automaticamente; toda movimentação gera log.
- **Cancelamento (008):** motivo obrigatório; confirmação extra reverte automaticamente registros `confirmado` do odontograma para `revertido`.
- **Retorno (009):** imutável; prazo configurável com catch-up; notificação de retorno é **crítica** até o novo agendamento; contato com o paciente é manual.
- **Prontuário (010):** Anamnese de Dentista/Admin com **trilha de auditoria** (só Admin vê; inclui `odontograma`); Visão Geral editável por todos.
- **Odontograma (011):** FDI; `confirmado`/`revertido`, nunca deletado; edição direta gera auditoria; não mexe no estoque.
- **Plano (012):** itens = procedimento + dente(s), com `agendamento_id` e `dentista_id`; faturamento **por item concluído**, atribuído a quem executou; procedimento avulso concluído fatura pelo valor médio.
- **Documentos (014):** Dentista gera e assina; imutáveis. **Imagens (015):** exclusão com prazo de 3 meses. **Prótese (016):** laboratório texto livre, `dente`, atraso configurável 15–30 dias a partir do prazo.
- **Dashboard (019):** ocupação = concluídos / (dentistas ativos × horas × dias − bloqueios); alertas ocultáveis no Dashboard, mas o sino sempre mostra críticos.
- **Comunicação externa (020):** confirmação + lembretes 24h e 5h, só pelo canal preferido; agendamento com início já passado não gera mensagem; até 2 reenvios; falha final alerta a Recepcionista.

## Pendências abertas (não decidir sozinho)

Use interface/abstração e sinalize:

- **001:** usuário acumular papéis (até decidir: um único `papel`); SMTP de produção; como o primeiro Admin é criado (sem Super Admin).
- **002:** feriados automáticos vs. manuais. **003:** foto de perfil.
- **004:** CPF do responsável pode repetir; exportação/importação (fase, formato, conflito de CPF).
- **005:** excluir procedimento já usado (apagar ou arquivar); regra `[stated]` de materiais na criação.
- **006:** antecedência máxima; quem registra emergência retroativa; formato da recorrência do bloqueio; combinar procedimento avulso + itens do plano.
- **013 Débitos:** spec inteira a especificar (sem cenários).
- **V1.5:** provedor de storage, assinatura digital, SMS/WhatsApp.
- **Técnico:** fuso horário de referência (adotado provisoriamente `America/Sao_Paulo`).

## Comunicação

- Responder em português, de forma objetiva.
- Ao terminar uma feature, listar: arquivos criados/alterados, Cenários cobertos (passando/falhando/`it.todo`), pendências encontradas e divergências entre docs.
- Ao apontar dúvida, ofereça opções concretas para o Bernardo escolher.
