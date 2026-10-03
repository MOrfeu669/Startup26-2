# Resumo da Sessão — Projeto Agendamento Odontológico (SDD)

**Metodologia:** Spec-Driven Development (SDD) + Harness Engineering
**Escopo desta sessão:** Arquitetura e especificação (apenas `.md`, sem código de implementação)
**Status atual:** 20 specs (19 definidas + 013 Débitos a especificar), fases realinhadas, prontas para a etapa de testes

> **Atualização 2026-10-02 — análise de consistência.** As specs passaram por uma análise de contradições, lacunas e escopo (`context/ANALISE_SPECS.md`). As decisões do Bernardo foram aplicadas nas specs como `[stated]`, e este resumo foi atualizado. Mudanças principais:
> - nova **Feature 013 — Débitos** (V1); as antigas 013–019 passaram a ser 014–020;
> - **estoque sem reserva**: a baixa dos materiais ocorre na conclusão do atendimento, primeiro do lote que vence antes (FEFO);
> - ciclo do agendamento: `agendado` → `em_espera` (opcional) → `iniciado` → `concluido`, mais `cancelado`; **salvar a Evolução conclui** o atendimento;
> - paciente exige nome + pelo menos um canal de comunicação;
> - Supabase Auth (001) e Supabase Realtime (007) decididos.
>
> As seções 4 a 6 abaixo são **registro histórico** da sessão de especificação; quando divergirem das specs, vale a spec.

---

## 1. Contexto Geral do Projeto

- Sistema de agenda odontológica completo, para **consultório real** (não é estudo/portfólio).
- Desenvolvedor nunca usou SDD/Harness antes — sessão começou explicando a metodologia.
- Regra de estrutura: cada feature = 1 spec `.md` (Contexto → Requisitos → Cenários → Exemplos de Código → Dependências → Regras de Negócio) + depois testes `.test.ts` + código `.ts` + exemplo `.ts`.
- Contrato da sessão: Claude questiona antes de assumir, anota como `[stated]`, marca pendências como `⚠️ PENDENTE`, nunca inventa regra de negócio.

### Características centrais do negócio
- Número **ilimitado de dentistas** por clínica.
- Cadeiras compartilhadas: **dois dentistas nunca atendem na mesma cadeira no mesmo horário**.
- Cadeiras podem ser configuradas pelo Admin (adicionadas depois).
- **Três papéis** em hierarquia piramidal: **Admin** (dono, acesso total) > **Dentista** > **Recepcionista**.
- **Paciente não é usuário do sistema** — sem login, sem acesso a nada. Contato só por fora (WhatsApp/SMS/Email).

---

## 2. Roadmap Final — 20 Features (ordem e fases atuais)

| # | Feature | Fase |
|---|---|---|
| 001 | Autenticação & Roles | MVP |
| 002 | Criar/Configurar Clínica | MVP |
| 003 | Cadastro de Dentistas | MVP |
| 004 | Cadastro de Pacientes | MVP |
| 005 | Criar Procedimento | MVP |
| 006 | Criar Agendamento | MVP |
| 007 | Visualizar Agenda | V1 |
| 008 | Cancelar Agendamento | V1 |
| 009 | Reagendamento Automático | V1 |
| 010 | Prontuário Básico | V1 |
| 011 | Odontograma | V1 |
| 012 | Plano de Tratamento | V1 |
| 013 | Débitos *(a especificar)* | V1 |
| 014 | Documentos | V1.5 |
| 015 | Raio X & Imagens | V1.5 |
| 016 | Controle de Prótese | V1.5 |
| 017 | Controle de Estoque | V1.5 |
| 018 | Notificações Internas | V1.5 |
| 019 | Dashboard & Alertas | V1.5 |
| 020 | Comunicação Externa ao Paciente | V1.5 |

> A numeração e as fases passaram por **duas reordenações** solicitadas pelo usuário ao longo da sessão (a mais recente reorganizou tanto a sequência quanto o MVP/V1/V1.5, mantendo a proporção original 6/6/7). Todas as referências cruzadas internas entre specs (`Feature XXX`) foram atualizadas via script para refletir a numeração final.

> Em 2026-10-02, a Feature 013 (Débitos) foi inserida após a 012 e as antigas 013–019 foram renumeradas para 014–020 (proporção atual 6/7/7). As referências cruzadas foram atualizadas.

> A Feature 012 (Plano de Tratamento) foi criada **no meio da sessão**, a partir de um gap identificado na spec do Dashboard: os dados financeiros precisavam de uma origem estruturada.

---

## 3. Decisões de Negócio por Feature

### 001 — Autenticação & Roles
- Hierarquia piramidal **pura** de permissões (Admin > Dentista > Recepcionista): "exclusivo do Dentista" significa "Dentista ou Admin".
- Autenticação via **Supabase Auth** (senha, sessão e email de recuperação). Provedor SMTP de produção **não definido**.
- Cada clínica cadastra seus próprios dentistas — sem login compartilhado entre clínicas.
- Sem expiração de sessão no MVP. Sem "Super Admin" acima do Admin da clínica.
- Dados clínicos pertencem à clínica, não ao usuário — remover um usuário não apaga nada, só o acesso.
- **Pendente:** um usuário pode acumular mais de um papel? Provedor SMTP de produção?

### 002 — Criar/Configurar Clínica
- Horário de funcionamento **único e fixo** (mesmo horário todos os dias em que atende — não varia por dia da semana).
- Dias de atendimento (incluindo fins de semana/feriados) são configuráveis por clínica.
- Cadeira pode ser desativada → agendamentos futuros nela exibem alerta visual (cor/`!`), sem cancelamento automático.
- Mudar o horário de funcionamento não cancela agendamentos fora do novo horário — eles exibem aviso "fora de horário".
- Um Admin gerencia exatamente uma clínica. Cadeiras não têm restrição de procedimento.
- Cadeira inativa e dia fora de `dias_atendimento` **bloqueiam novos agendamentos** (exceto emergência retroativa).
- **Pendente:** feriados automáticos vs. configuração manual.

### 003 — Cadastro de Dentistas
- Campos: nome, CRO, telefone, CPF.
- Especialidade é **apenas informativa** — não restringe quais procedimentos o dentista pode realizar (decisão revertida no meio da sessão, ver seção 5).
- Dentista segue o horário geral da clínica, com exceções via **bloqueios de agenda** (antes "compromissos extra", Feature 006).
- Admin pode remover dentista → agendamentos futuros dele ficam com alerta (não são apagados). Dentista inativo não recebe novos agendamentos.

### 004 — Cadastro de Pacientes
- **Obrigatórios: nome completo + pelo menos um canal de comunicação** (SMS/Email/WhatsApp + contato), indicado pelo paciente e registrado pela clínica. Vários canais permitidos, exatamente um preferido. Todo o resto é opcional.
- CPF único por clínica quando informado (bloqueia duplicado, aponta o registro existente).
- Sexo: masculino / feminino / outro.
- Idade é **calculada** pela data de nascimento. Responsável legal (nome completo + CPF obrigatórios, telefone opcional) só quando há data de nascimento e o paciente é menor de idade.
- Paciente é **exclusivo da clínica**; a lista de pacientes pode ser exportada/importada (detalhes pendentes).
- "Todos editam" vale só para a Visão Geral do prontuário.

### 005 — Criar Procedimento
- Nome reflete a função do procedimento (sem campo de categoria separado).
- Tempo e valor são **médias/estimativas**, nunca fixos.
- Pode ser criado **sem materiais vinculados** — materiais podem ser adicionados depois (resolve dependência cronológica com a Feature 017/Estoque).
- **Sem reserva de material**: os materiais vinculados são baixados na conclusão do atendimento.
- Qualquer dentista pode ser agendado para qualquer procedimento (sem restrição de especialidade).
- Só o Admin pode excluir um procedimento; edição é livre.

### 006 — Criar Agendamento
- Requer paciente, dentista, cadeira, hora de início e fim. **Procedimento é opcional** (avulso ou itens do Plano de Tratamento).
- Validações: cadeira livre e ativa, dentista ativo e disponível (sem bloqueio de agenda), dia de atendimento, paciente sem conflito de horário, **controle de concorrência** (duas requisições simultâneas nunca reservam o mesmo slot).
- Suporta **registro retroativo de emergência**, que ignora essas validações.
- Sem antecedência mínima para agendar.
- **Bloqueios de agenda** (Dentista ou Admin), com recorrência (formato pendente).
- Status: `agendado` → `em_espera` (opcional) → `iniciado` → `concluido`, mais `cancelado`. Marcam `iniciado`: o dentista responsável ou o Admin. **Salvar a Evolução (010) conclui** o atendimento, o que alimenta Histórico (010), Retorno (009), baixa de Estoque (017), faturamento e Ocupação no Dashboard (019).
- Sem reserva de material.

### 007 — Visualizar Agenda
- Alterna entre visualização de dia e semana, em tempo real (**Supabase Realtime**).
- Exibe também os bloqueios de agenda.
- Dentista e Recepcionista veem a **agenda completa da clínica** (não só a própria).
- Reflete alertas visuais de cadeira/dentista desativados e agendamentos fora do novo horário.

### 008 — Cancelar Agendamento
- Motivo obrigatório. Sem prazo mínimo para cancelar. Aparece no Histórico. Sem alerta de recorrência.
- Só é possível cancelar **antes de `concluido`**.
- Cancelamento **não afeta o estoque** (não há reserva; a baixa só ocorre na conclusão).
- Registro já confirmado no odontograma exige confirmação explícita extra; com ela, o registro vira `revertido` automaticamente.
- Notificação à Recepcionista (018) via interface temporária no V1.

### 009 — Reagendamento Automático
- Cenário 1: cancelar → pergunta "reagendar? sim/não".
- Cenário 2: Admin ou Dentista marcam "retorno" com data futura; notificação à Recepcionista dentro de um prazo **configurável pela clínica** (não fixo em 7 dias), com mecanismo de recuperação (catch-up) caso a rotina falhe em rodar no dia exato.
- Notificação de retorno fica pendente até a próxima consulta ser efetivamente marcada — sem escalonamento separado.
- Retorno programado é **imutável** (não pode ser removido).
- A notificação de retorno é **crítica** (018, via interface temporária no V1); o contato com o paciente é manual.
- O reagendamento pré-preenche paciente, dentista e procedimento.

### 010 — Prontuário Básico
- Reúne Visão Geral, Anamnese, Histórico de Consultas (inclui canceladas, com data) e Evolução.
- Anamnese: exclusiva do Dentista (ou Admin), editável livremente, mas toda alteração vai para trilha de auditoria.
- **Salvar a Evolução conclui o atendimento** (não há ação separada); Evolução vazia não pode ser salva. A conclusão dispara a baixa de materiais (017, interface temporária no V1) e marca os itens do plano como concluídos (012).
- Trilha de auditoria acessível **apenas pelo Admin**; inclui edições do odontograma.

### 011 — Odontograma
- Mapa bucal por quadrantes (sup./inf. dir./esq.), **numeração FDI**, visão espelhada (perspectiva do dentista).
- Histórico completo por dente. Registros editáveis diretamente pelo Dentista.
- Registro tem status `confirmado` / `revertido` (nunca é apagado) — com a confirmação extra do cancelamento (008), vira `revertido` automaticamente.
- Vincula procedimento a dente específico. **Não mexe em estoque** (substitui a regra anterior "deduz estoque ao confirmar").
- Edições geram registro de auditoria (010).
- Próteses (016) aparecem no odontograma.

### 012 — Plano de Tratamento *(nova, criada nesta sessão)*
- Plano → itens (procedimento + **dente(s), obrigatório ≥1** + valor) → cada procedimento tem N materiais (005).
- Valor do item parte do valor médio do procedimento, mas é ajustável. Valor total = soma dos itens.
- O item pode ser ligado a um agendamento; ao concluir o atendimento, o item vira `concluido`.
- **Faturamento por item concluído**, na data da conclusão, atribuído ao dentista que executou — principal origem financeira do Dashboard (019).
- Débitos e pagamentos ficam na Feature 013.
- **Pendente:** quem cria/edita; edição após itens concluídos; status `concluido` do plano automático?

### 013 — Débitos *(nova, 2026-10-02)*
- Fase V1, depende da 012. Spec **a especificar**: o que gera um débito, pagamento, parcelamento, papéis, Dashboard e alerta de atraso estão todos pendentes.

### 014 — Documentos
- Modelos padrão (Receituário, Atestado, Termo de Consentimento) + modelos personalizados.
- Saída sempre em **PDF com assinatura digital** do Dentista (provedor de assinatura **não definido**).
- **Só o Dentista gera, e o mesmo Dentista assina**; a Recepcionista não gera. Se o Admin gera/assina está pendente.
- Variáveis dinâmicas: dados reutilizáveis de paciente/dentista (nome, CPF, data de nascimento, etc.).
- Modelos personalizados são criados por Dentista e Admin; podem ser **compartilhados/importados** por outros.
- Documento gerado é imutável — correção gera novo documento, mantendo o anterior no histórico.

### 015 — Raio X & Imagens
- Sem restrição de formato ou tamanho de arquivo; upload **direto do navegador para o storage** (sem passar pelo Vercel). Provedor de storage pendente.
- Upload e gestão: Dentista ou Admin.
- Cada imagem tem descrição detalhada (paciente, dente, tipo de caso) e pode ser vinculada a um dente (011).
- Exclusão tem **prazo de segurança de 3 meses** antes da remoção definitiva.

### 016 — Controle de Prótese
- Fluxo de 4 etapas: Registro do Pedido → Acompanhamento → Conferência → Instalação.
- Baseado nos procedimentos "Avaliação/Consulta" e "Cirurgia Implante".
- Alerta de atraso (notificação `atraso_protese`, 018): limite **configurável pela clínica entre 15 e 30 dias**, contado a partir do prazo de retorno.
- Prótese registra o `dente`.
- Comissão é **negociada entre laboratório e clínica** (não é fórmula automática).
- Pedido pode ser descontinuado em qualquer etapa. Laboratório é **texto livre**; cadastro de laboratórios é pendência futura.

### 017 — Controle de Estoque
- Material com **sistema de lotes** (cada reabastecimento cria um lote com validade própria).
- **Sem reserva** (substitui o modelo anterior total/reservado/disponível).
- Baixa por uso ocorre na **conclusão do atendimento** (salvar a Evolução, 010), para procedimento avulso e itens do plano, consumindo primeiro o lote que vence antes (**FEFO**).
- Vencimento remove o lote automaticamente.
- Toda movimentação (`entrada`/`baixa`/`vencimento`) vai para um **histórico de logs**.
- Alerta de estoque abaixo do mínimo é visível a **todos os papéis**; pode ser ocultado no Dashboard, mas sempre aparece no sino (018).
- **Pendente:** estoque insuficiente na conclusão do atendimento.

### 018 — Notificações Internas
- Marcar chegada do paciente ("em espera") é **manual e opcional** — consulta pode ocorrer sem essa marcação.
- Dois níveis de urgência: normal e **crítica** (estoque abaixo do mínimo, cadeira indisponível, fora de horário, retorno a reagendar) — críticas ficam visíveis até resolução.
- Tipos adicionados: `dentista_removido`, `falha_envio_mensagem`, `atraso_protese` (urgência pendente).
- Aparecem em sino no topo da tela + no Dashboard; o sino **sempre** mostra as críticas.

### 019 — Dashboard & Alertas
- Todos acessam; **Admin pode ocultar campos por papel**; cada usuário pode ocultar widgets da própria visão.
- Faturamento = itens do Plano de Tratamento concluídos (valor do item) + procedimentos avulsos concluídos (valor médio), na data da conclusão, atribuído a quem executou (substitui "não de valor solto por procedimento").
- Ocupação calculada por agendamentos **`concluido`** (cancelados não contam) sobre a capacidade = dentistas ativos × horas × dias de atendimento − bloqueios. Se emergências contam está pendente.
- Faturamento total + discriminado por dentista/procedimento. Período configurável. Export em PDF/Excel.
- Layout em scrollview, dinâmico e responsivo.

### 020 — Comunicação Externa ao Paciente
- Dois eventos: confirmação de agendamento + **dois lembretes (24h e 5h antes)**.
- Canal (SMS/Email/WhatsApp) é **indicado pelo paciente e registrado pela clínica** (004); envio só pelo canal preferido.
- Agendamento cujo início já passou (ex: emergência retroativa) não gera mensagem nem lembrete.
- Cancelamento e aviso de retorno **não** geram mensagem automática — permanecem manuais.
- Modelos de mensagem personalizáveis, únicos por clínica.
- Falha de envio: **até 2 tentativas automáticas de reenvio**; se ambas falharem, alerta interno vai para a **Recepcionista**.
- **Pendente:** provedor de envio (Twilio ou outro) ainda não definido.

---

## 4. Gaps Estruturais Identificados e Resolvidos

No meio da sessão, foi feita uma análise de risco completa nas 17 specs existentes na época, apontando falhas e brechas de regra de negócio. As 12 correções abaixo foram aplicadas (marcadas como `[correção]` nas specs, para diferenciar de `[stated]`):

> **Superados em 2026-10-02:** os itens 4, 5 e 6 (reserva, vencido com reserva e estorno) deixaram de valer, porque o estoque não tem mais reserva. O item 7 foi estendido pelo novo ciclo de status (`agendado` → … → `concluido`).

1. **Concorrência no agendamento** — controle de transação para evitar dupla reserva simultânea (006).
2. **Conflito de paciente** — paciente não pode estar em dois agendamentos no mesmo horário (006).
3. **CPF duplicado** — único por clínica, com bloqueio e indicação do registro existente (004).
4. **Reserva vs. baixa de estoque** — reserva bloqueia disponível de verdade; reconciliação com a baixa confirmada (005/017).
5. **Material vencido com reserva futura** — não remove silenciosamente, gera alerta (017).
6. **Estorno após cancelamento** — reserva não confirmada é estornada; registro já confirmado exige confirmação manual extra (008/017/011).
7. **Status "concluído"** — adicionado ao ciclo de vida do agendamento, usado por Evolução, Retorno, Histórico e Dashboard (006/009/010/019).
8. **Trilha de auditoria** — para alterações em prontuário e documentos, acessível só pelo Admin (010/014).
9. **Especialidade do dentista** — validação foi adicionada e depois **revertida**: hoje é só informativa (003/005/006).
10. **Catch-up de notificação de retorno** — janela de verificação em vez de disparo pontual, tolerante a falhas (009).
11. **Comunicação externa** — resolvida criando a **Feature 020** dedicada (antes era um gap sem feature própria).
12. **Responsável legal para menores** — nome completo + CPF obrigatórios no cadastro do paciente (004).

---

## 5. Decisão Revertida Durante a Sessão

A validação de "dentista precisa ter especialidade compatível com o procedimento" foi:
- **Adicionada** na rodada de correções de gaps (item 9 acima).
- **Revertida** posteriormente, quando o usuário esclareceu explicitamente: *"o procedimento não se associa à especialidade do dentista"*.
- Hoje, especialidade é um campo **apenas informativo** no cadastro do dentista (003), sem nenhuma restrição de agendamento (005/006).

---

## 6. Incidente Técnico Durante a Sessão

Em um ponto da sessão, o ambiente de arquivos do Claude reiniciou no meio de uma leva grande de edições (features 001 a 014), fazendo com que as alterações ainda não copiadas para a pasta de saída fossem perdidas. Foi necessário reconstruir a partir do último snapshot salvo e reaplicar as correções — o que foi feito reescrevendo cada spec por completo (em vez de patches incrementais), garantindo consistência no resultado final.

---

## 7. Estrutura de Código (Exemplos-Chave Já Especificados)

As specs já incluem interfaces TypeScript ilustrativas (não implementação real, apenas contrato de dados). As mais relevantes:

```typescript
// Feature 006 — Agendamento
interface Agendamento {
  id: string;
  clinica_id: string;
  paciente_id: string;
  dentista_id: string;
  cadeira_id: string;
  procedimento_id?: string; // opcional: procedimento avulso
  itens_plano_ids?: string[]; // opcional: itens do Plano de Tratamento (012)
  data_hora_inicio: string;
  data_hora_fim: string;
  status: 'agendado' | 'em_espera' | 'iniciado' | 'concluido' | 'cancelado';
  iniciado_por?: string;
  concluido_em?: string; // preenchido ao salvar a Evolução (010)
  emergencia: boolean;
  criado_por: string;
}

// Feature 017 — Estoque (sistema de lotes)
interface Material {
  id: string;
  clinica_id: string;
  nome: string;
  quantidade_minima: number;
  lotes: LoteMaterial[];
}
interface LoteMaterial {
  id: string;
  material_id: string;
  quantidade: number; // sem reserva
  validade?: string;
  criado_em: string;
}
interface MovimentacaoEstoque {
  id: string;
  material_id: string;
  lote_id: string;
  tipo: 'entrada' | 'baixa' | 'vencimento';
  quantidade: number;
  usuario_id?: string;
  agendamento_id?: string;
  registrado_em: string;
}

// Feature 011 — Odontograma
interface RegistroOdontograma {
  id: string;
  paciente_id: string;
  dente: number; // numeração FDI
  quadrante: 'superior_direito' | 'superior_esquerdo' | 'inferior_esquerdo' | 'inferior_direito';
  procedimento_id: string;
  agendamento_id: string;
  protese_id?: string;
  status: 'confirmado' | 'revertido';
  registrado_por: string;
  registrado_em: string;
}

// Feature 012 — Plano de Tratamento
interface PlanoTratamento {
  id: string;
  paciente_id: string;
  clinica_id: string;
  criado_por: string;
  status: 'proposto' | 'em_andamento' | 'concluido';
  itens: ItemPlano[];
  valor_total: number;
}
interface ItemPlano {
  id: string;
  procedimento_id: string;
  dentes: number[]; // FDI, pelo menos 1
  valor: number;
  agendamento_id?: string;
  status: 'pendente' | 'concluido';
  executado_por?: string;
  concluido_em?: string;
}

// Feature 020 — Comunicação Externa
interface MensagemExterna {
  id: string;
  paciente_id: string;
  agendamento_id: string;
  tipo: 'confirmacao_agendamento' | 'lembrete_24h' | 'lembrete_5h';
  canal: 'sms' | 'email' | 'whatsapp';
  status_envio: 'enviado' | 'falhou' | 'pendente';
  tentativas: number; // até 2 reenvios automáticos
  programado_para: string;
}
```

Cada uma das specs contém sua própria seção completa de "Exemplos de Código" — não reproduzidos aqui na íntegra por brevidade.

---

## 8. Pendências Ainda Abertas (menores, não bloqueantes)

Lista consolidada em 2026-10-02. O detalhe de cada uma está na seção `⚠️ PENDENTE` da spec.

**Provedores e infraestrutura**
- Provedor SMTP de produção (001), provedor de SMS/WhatsApp (020), provedor de assinatura digital (014), provedor de storage (014/015).

**MVP (001–006)**
- 001: um usuário pode acumular mais de um papel?
- 002: feriados automáticos (calendário nacional) ou 100% manuais.
- 003: o dentista tem foto de perfil?
- 004: o CPF do responsável legal pode se repetir? Detalhes da exportação/importação da lista de pacientes.
- 005: excluir procedimento já usado (arquivar?); a regra antiga "materiais vinculados na criação" foi superada pela decisão de não ter reserva — confirmar.
- 006: antecedência **máxima** para agendar; quem pode registrar emergência retroativa; formato e nome da recorrência de bloqueios; se procedimento avulso e itens do plano podem ser combinados no mesmo agendamento. A spec tem 15 cenários; considerar dividir.

**V1 (007–013)**
- 007: há visualização por mês? Agendamentos cancelados aparecem na agenda?
- 010: edição da Evolução depois de salva; estoque insuficiente na conclusão.
- 011: registro automático no odontograma a partir de item do plano; procedimento pré-existente sem agendamento.
- 012: quem cria/edita o plano; edição após itens concluídos; status `concluido` automático.
- 013: spec inteira a especificar.

**V1.5 (014–020)**
- 014: o Admin gera/assina documentos? Armazenamento do PDF.
- 016: vínculo com procedimentos; mais de um dente; comissão no Dashboard.
- 017: estoque insuficiente na conclusão; ajuste da quantidade efetivamente usada.
- 018: urgência de `dentista_removido`, `falha_envio_mensagem` e `atraso_protese`; destinatários quando há várias (ou nenhuma) Recepcionista.
- 019: comissões de prótese no financeiro; emergências na ocupação/faturamento; pagamentos (013) no Dashboard.
- 020: provedor de envio.

---

## 9. Próxima Etapa da Metodologia SDD

```
SPEC (.md)  ✅ 19/20 (013 Débitos a especificar)
   ↓
TESTES (.test.ts)  ⏳ PRÓXIMO PASSO
   ↓
EXEMPLOS (.ts)
   ↓
CÓDIGO (.ts)
```

Opções discutidas para o próximo passo, ainda não escolhidas pelo usuário:
1. Criar os testes `.test.ts` por feature (começando pelo MVP).
2. Criar os exemplos `.ts` de uso prático.
3. Definir a estrutura de Banco de Dados com base nas interfaces já especificadas.

---

## 10. Arquivos Gerados

Todas as 20 specs estão salvas em `specs/FEATURES/`, nomeadas `FEATURE_NNN_Nome.md`, seguindo a numeração da tabela da seção 2. O índice está em `specs/README.md`, e a análise de consistência em `context/ANALISE_SPECS.md`.
