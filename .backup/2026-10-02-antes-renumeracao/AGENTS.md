# Agente de Desenvolvimento — Agendamento Odontológico

Projeto de agenda para **consultório real** (não é estudo/portfólio), desenvolvido com **SDD (Spec-Driven Development)** + **Harness Engineering**.
O desenvolvedor (Bernardo) é novo em SDD/Harness: explique brevemente o "porquê" ao propor passos da metodologia.

## Fontes de verdade e precedência

Em caso de conflito entre documentos, vale esta ordem:

1. `specs/FEATURES/FEATURE_NNN_*.md` — regras de negócio (numeração e fases finais: 19 features).
2. `context/HARNESS_ENGINEERING.md` — stack, estrutura de diretórios e padrões técnicos.
3. `context/Resumo.md` — visão geral, decisões por feature, gaps resolvidos e pendências.
4. `context/SDD harnes engine _ project.md` — prompt **histórico** da fase de especificação. Usar só como referência de metodologia. Está **desatualizado** em: 13 features (hoje são 19), pasta `harness/` (hoje é `tests/`), e "não criar código" (valia apenas para aquela fase).

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
4. **Uma feature por vez**, na ordem do roadmap: MVP (001–006) → V1 (007–012) → V1.5 (013–019). Respeite as dependências da spec.
5. **Papéis:** `admin` > `dentista` > `recepcionista`. Paciente **não** é usuário do sistema (sem login).

## Stack (decidido, não trocar)

Next.js 15 (App Router) · TypeScript · Node 20 LTS · pnpm · Supabase (cliente direto, **sem ORM**) · PostgreSQL · Zod · Vitest · Postgres local via Docker para testes · Vercel.

## Fluxo de trabalho para cada feature

1. Ler a spec completa (`Requisitos`, `Cenários`, `Regras de Negócio`, `Dependências`, `PENDENTE`) e as specs das dependências.
2. Confirmar que as dependências já estão implementadas; senão avisar.
3. **Migration** em `supabase/migrations/` (uma por tabela, UUID como PK, constraints derivadas da spec).
4. **Exemplo executável** em `tests/examples/modules/<modulo>/` (adaptado da seção "Exemplos de Código" da spec).
5. **Teste** `FEATURE_NNN.test.ts`: um `it` por Cenário da spec, mapeado 1:1 e com o mesmo nome. Pendências viram `it.todo`.
6. **Código** em `src/modules/<modulo>/` (`services/`, `types/`, `components/`) até os testes passarem.
7. **Rotas/UI** em `src/app/`, chamando apenas services.
8. Rodar testes e lint; reportar quais Cenários passam.

## Estrutura

```
src/modules/<modulo>/{services,types,components}
src/app/          rotas
src/lib/          Supabase client, utilitários compartilhados
supabase/migrations/
tests/{unit,integration,examples}/modules/<modulo>/
specs/FEATURES/   specs (não editar sem pedido)
```

Mapeamento módulo ↔ feature: seção 2.1 de `context/HARNESS_ENGINEERING.md`.

## Regras de código (detalhes em `.cursor/rules/`)

- Domínio em português (`Agendamento`, `Paciente`); termos técnicos em inglês (`service`, `hook`).
- Zod por módulo; tipos via `z.infer`. Enums/union types para estados fechados.
- Autorização por papel **centralizada**; nada de checagem solta em componente/service.
- Módulos só se comunicam via service/função pública exportada.
- Schema só muda via migration versionada, nunca pelo painel do Supabase.
- Multi-tenant: toda query de domínio filtra por `clinica_id`.
- As interfaces TypeScript das specs são **contratos ilustrativos**; adapte ao schema real sem alterar o significado.

## Invariantes de negócio (armadilhas conhecidas)

Consolidados de `context/Resumo.md`. Confirme sempre na spec da feature antes de aplicar.

- **Agendamento (006):** cadeira livre + dentista disponível + paciente sem conflito, com **controle de concorrência** (transação/lock; duas requisições nunca reservam o mesmo slot). Emergência retroativa ignora conflitos. Procedimento é opcional. Status: `em_espera` → `iniciado` → `concluido`; só o **dentista responsável** conclui, e isso alimenta Histórico (010), Retorno (009) e Ocupação (018).
- **Especialidade do dentista é só informativa** — não restringe procedimentos (decisão revertida; não reintroduzir a validação).
- **Não apagar dados clínicos:** remover usuário/dentista/cadeira remove só acesso ou desativa; agendamentos futuros ficam com **alerta**, não são cancelados nem apagados.
- **Clínica (002):** horário de funcionamento único e fixo; mudar horário não cancela agendamentos (aviso "fora de horário"). Um Admin = uma clínica.
- **Paciente (004):** só o nome completo é obrigatório; CPF único por clínica (bloqueia e aponta o existente); menor exige responsável legal (nome + CPF).
- **Cancelamento (008):** motivo obrigatório; estorna reserva **não confirmada**; baixa já feita ou registro confirmado no odontograma exige **confirmação extra explícita**.
- **Prontuário (010):** Anamnese só do Dentista, com **trilha de auditoria** (visível só ao Admin); Evolução obrigatória para concluir atendimento.
- **Odontograma (011):** FDI, registro `confirmado`/`revertido` — **nunca deletado**.
- **Estoque (016):** lotes com validade; total/reservado/disponível; baixa exige **confirmação do Dentista**; vencido não remove quantidade reservada (gera alerta); toda movimentação gera log.
- **Retorno (009):** imutável depois de programado; prazo de notificação configurável pela clínica, com mecanismo de **catch-up** (não disparo pontual).
- **Documentos (013):** gerados são imutáveis (correção = novo documento).
- **Imagens (014):** exclusão com prazo de segurança de 3 meses.
- **Comunicação externa (019):** só confirmação + lembretes 24h e 5h; até 2 reenvios automáticos; falha final alerta a Recepcionista. Cancelamento e retorno **não** geram mensagem automática.
- **Dashboard (018):** financeiro vem do Plano de Tratamento (012); ocupação conta só agendamentos `concluido`.

## Fora de escopo até decisão (pendências abertas)

Não escolha sozinho; use interface/abstração e sinalize:

- Provedores de email (recuperação de senha, 001), SMS/WhatsApp (019) e assinatura digital (013).
- Storage de arquivos (013/014) e uso de Supabase Auth/Storage/Realtime além do Postgres.
- Um usuário acumular mais de um papel (001); feriados automáticos vs. manuais (002); antecedência máxima de agendamento (006).
- Plano de Tratamento (012): quem além do Dentista edita e quando o faturamento é contabilizado; fluxo de Débitos/Pagamentos.

## Comunicação

- Responder em português, de forma objetiva.
- Ao terminar uma feature, listar: arquivos criados/alterados, Cenários cobertos (passando/falhando), pendências encontradas e divergências entre docs.
- Ao apontar dúvida, ofereça opções concretas para o Bernardo escolher.
