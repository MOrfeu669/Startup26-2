# Resumo da Sessão — Projeto Agendamento Odontológico (SDD)

**Metodologia:** Spec-Driven Development (SDD) + Harness Engineering
**Escopo desta sessão:** Arquitetura e especificação (apenas `.md`, sem código de implementação)
**Status atual:** 19 specs completas, fases realinhadas, prontas para a etapa de testes

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

## 2. Roadmap Final — 19 Features (ordem e fases atuais)

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
| 013 | Documentos | V1.5 |
| 014 | Raio X & Imagens | V1.5 |
| 015 | Controle de Prótese | V1.5 |
| 016 | Controle de Estoque | V1.5 |
| 017 | Notificações Internas | V1.5 |
| 018 | Dashboard & Alertas | V1.5 |
| 019 | Comunicação Externa ao Paciente | V1.5 |

> A numeração e as fases passaram por **duas reordenações** solicitadas pelo usuário ao longo da sessão (a mais recente reorganizou tanto a sequência quanto o MVP/V1/V1.5, mantendo a proporção original 6/6/7). Todas as referências cruzadas internas entre specs (`Feature XXX`) foram atualizadas via script para refletir a numeração final.

> A Feature 012 (Plano de Tratamento) foi criada **no meio da sessão**, a partir de um gap identificado na spec do Dashboard: os dados financeiros precisavam de uma origem estruturada.

---

## 3. Decisões de Negócio por Feature

### 001 — Autenticação & Roles
- Hierarquia piramidal de permissões (Admin > Dentista > Recepcionista).
- Recuperação de senha via serviço de email (provedor **não definido**).
- Cada clínica cadastra seus próprios dentistas — sem login compartilhado entre clínicas.
- Sem expiração de sessão no MVP. Sem "Super Admin" acima do Admin da clínica.
- Dados clínicos pertencem à clínica, não ao usuário — remover um usuário não apaga nada, só o acesso.
- **Pendente:** um usuário pode acumular mais de um papel? Provedor de email?

### 002 — Criar/Configurar Clínica
- Horário de funcionamento **único e fixo** (mesmo horário todos os dias em que atende — não varia por dia da semana).
- Dias de atendimento (incluindo fins de semana/feriados) são configuráveis por clínica.
- Cadeira pode ser desativada → agendamentos futuros nela exibem alerta visual (cor/`!`), sem cancelamento automático.
- Mudar o horário de funcionamento não cancela agendamentos fora do novo horário — eles exibem aviso "fora de horário".
- Um Admin gerencia exatamente uma clínica. Cadeiras não têm restrição de procedimento.
- **Pendente:** feriados automáticos vs. configuração manual.

### 003 — Cadastro de Dentistas
- Campos: nome, CRO, telefone, CPF.
- Especialidade é **apenas informativa** — não restringe quais procedimentos o dentista pode realizar (decisão revertida no meio da sessão, ver seção 5).
- Dentista segue o horário geral da clínica, com exceções via "compromissos extra" (Feature 006).
- Admin pode remover dentista → agendamentos futuros dele ficam com alerta (não são apagados).

### 004 — Cadastro de Pacientes
- **Único campo obrigatório: nome completo.** Todo o resto é opcional.
- CPF único por clínica quando informado (bloqueia duplicado, aponta o registro existente).
- Sexo: masculino / feminino / outro.
- Responsável legal (nome completo + CPF obrigatórios, telefone opcional) quando paciente é menor de idade.
- Exportação de lista de pacientes fica para versão futura.

### 005 — Criar Procedimento
- Nome reflete a função do procedimento (sem campo de categoria separado).
- Tempo e valor são **médias/estimativas**, nunca fixos.
- Pode ser criado **sem materiais vinculados** — materiais podem ser adicionados depois (resolve dependência cronológica com a Feature 016/Estoque).
- Qualquer dentista pode ser agendado para qualquer procedimento (sem restrição de especialidade).
- Só o Admin pode excluir um procedimento; edição é livre.

### 006 — Criar Agendamento
- Requer paciente, dentista, cadeira, hora de início e fim. **Procedimento é opcional.**
- Validações: cadeira livre, dentista disponível, paciente sem conflito de horário, **controle de concorrência** (duas requisições simultâneas nunca reservam o mesmo slot).
- Suporta **registro retroativo de emergência**, que ignora as validações normais de conflito.
- Sem antecedência mínima para agendar.
- Status de presença: `em espera` → `iniciado` → `concluído`. A transição para `concluído` é feita **pelo dentista responsável** e é o que alimenta Histórico (010), Retorno (009) e Ocupação no Dashboard (018).

### 007 — Visualizar Agenda
- Alterna entre visualização de dia e semana, em tempo real.
- Dentista e Recepcionista veem a **agenda completa da clínica** (não só a própria).
- Reflete alertas visuais de cadeira/dentista desativados e agendamentos fora do novo horário.

### 008 — Cancelar Agendamento
- Motivo obrigatório. Sem prazo mínimo para cancelar. Aparece no Histórico. Sem alerta de recorrência.
- Estorna material reservado **não confirmado** automaticamente.
- Material já baixado / registro já confirmado no odontograma **não** é revertido automaticamente — exige confirmação explícita extra do usuário.

### 009 — Reagendamento Automático
- Cenário 1: cancelar → pergunta "reagendar? sim/não".
- Cenário 2: Admin ou Dentista marcam "retorno" com data futura; notificação à Recepcionista dentro de um prazo **configurável pela clínica** (não fixo em 7 dias), com mecanismo de recuperação (catch-up) caso a rotina falhe em rodar no dia exato.
- Notificação de retorno fica pendente até a próxima consulta ser efetivamente marcada — sem escalonamento separado.
- Retorno programado é **imutável** (não pode ser removido).

### 010 — Prontuário Básico
- Reúne Visão Geral, Anamnese, Histórico de Consultas (inclui canceladas, com data) e Evolução.
- Anamnese: exclusiva do Dentista, editável livremente, mas toda alteração vai para trilha de auditoria.
- **Evolução é obrigatória** para concluir um atendimento.
- Trilha de auditoria acessível **apenas pelo Admin**.

### 011 — Odontograma
- Mapa bucal por quadrantes (sup./inf. dir./esq.), **numeração FDI**, visão espelhada (perspectiva do dentista).
- Histórico completo por dente. Registros editáveis diretamente pelo Dentista.
- Registro tem status `confirmado` / `revertido` (nunca é apagado) — usado quando um cancelamento (008) exige reversão.
- Vincula procedimento a dente específico e deduz estoque ao confirmar.
- Próteses (015) aparecem no odontograma.

### 012 — Plano de Tratamento *(nova, criada nesta sessão)*
- Dentista seleciona procedimentos para um paciente e define o valor de cada um (parte do valor médio do procedimento, mas ajustável).
- Valor total = soma dos procedimentos selecionados.
- **É a origem dos dados financeiros do Dashboard (018).**
- **Pendente:** quem mais pode criar/editar; quando o faturamento é contabilizado (criação, conclusão ou pagamento); fluxo formal de Débitos/Pagamentos ainda não totalmente detalhado.

### 013 — Documentos
- Modelos padrão (Receituário, Atestado, Termo de Consentimento) + modelos personalizados.
- Saída sempre em **PDF com assinatura digital** do Dentista (provedor de assinatura **não definido**).
- Variáveis dinâmicas: dados reutilizáveis de paciente/dentista (nome, CPF, data de nascimento, etc.).
- Modelo personalizado pertence a um Dentista, mas pode ser **compartilhado/importado** por outros.
- Documento gerado é imutável — correção gera novo documento, mantendo o anterior no histórico.

### 014 — Raio X & Imagens
- Sem restrição de formato ou tamanho de arquivo.
- Cada imagem tem descrição detalhada (paciente, dente, tipo de caso) e pode ser vinculada a um dente (011).
- Exclusão tem **prazo de segurança de 3 meses** antes da remoção definitiva.

### 015 — Controle de Prótese
- Fluxo de 4 etapas: Registro do Pedido → Acompanhamento → Conferência → Instalação.
- Baseado nos procedimentos "Avaliação/Consulta" e "Cirurgia Implante".
- Alerta de atraso quando o retorno do laboratório passa de 15–30 dias.
- Comissão é **negociada entre laboratório e clínica** (não é fórmula automática).
- Pedido pode ser descontinuado em qualquer etapa. Laboratório é interno no MVP; cadastro de parceiros vem depois.

### 016 — Controle de Estoque
- Material com **sistema de lotes** (cada reabastecimento cria um lote com validade própria).
- Estoque distingue **total / reservado / disponível**. Reserva no agendamento bloqueia o "disponível" de verdade.
- Baixa por uso exige **confirmação do Dentista** (não é automática).
- Vencimento remove automaticamente, **exceto** quantidade já reservada para agendamento futuro (gera alerta em vez de remover).
- Toda movimentação vai para um **histórico de logs**.
- Alerta de estoque mínimo é visível a **todos os papéis** no Dashboard.

### 017 — Notificações Internas
- Marcar chegada do paciente ("em espera") é **manual e opcional** — consulta pode ocorrer sem essa marcação.
- Dois níveis de urgência: normal e **crítica** (estoque crítico, cadeira indisponível, fora de horário) — críticas ficam visíveis até resolução.
- Aparecem em sino no topo da tela + no Dashboard.

### 018 — Dashboard & Alertas
- Todos acessam; **Admin pode ocultar campos por papel**; cada usuário pode ocultar widgets da própria visão.
- Financeiro vem do Plano de Tratamento (012), não de valor solto por procedimento.
- Ocupação calculada por agendamentos **"concluídos"** (cancelados não contam).
- Faturamento total + discriminado por dentista/procedimento. Período configurável. Export em PDF/Excel.
- Layout em scrollview, dinâmico e responsivo.

### 019 — Comunicação Externa ao Paciente
- Dois eventos: confirmação de agendamento + **dois lembretes (24h e 5h antes)**.
- Canal (SMS/Email/WhatsApp) é **definido pela clínica**, não escolhido pelo paciente no sistema.
- Cancelamento e aviso de retorno **não** geram mensagem automática — permanecem manuais.
- Modelos de mensagem personalizáveis, únicos por clínica.
- Falha de envio: **até 2 tentativas automáticas de reenvio**; se ambas falharem, alerta interno vai para a **Recepcionista**.
- **Pendente:** provedor de envio (Twilio ou outro) ainda não definido.

---

## 4. Gaps Estruturais Identificados e Resolvidos

No meio da sessão, foi feita uma análise de risco completa nas 17 specs existentes na época, apontando falhas e brechas de regra de negócio. As 12 correções abaixo foram aplicadas (marcadas como `[correção]` nas specs, para diferenciar de `[stated]`):

1. **Concorrência no agendamento** — controle de transação para evitar dupla reserva simultânea (006).
2. **Conflito de paciente** — paciente não pode estar em dois agendamentos no mesmo horário (006).
3. **CPF duplicado** — único por clínica, com bloqueio e indicação do registro existente (004).
4. **Reserva vs. baixa de estoque** — reserva bloqueia disponível de verdade; reconciliação com a baixa confirmada (005/016).
5. **Material vencido com reserva futura** — não remove silenciosamente, gera alerta (016).
6. **Estorno após cancelamento** — reserva não confirmada é estornada; registro já confirmado exige confirmação manual extra (008/016/011).
7. **Status "concluído"** — adicionado ao ciclo de vida do agendamento, usado por Evolução, Retorno, Histórico e Dashboard (006/009/010/018).
8. **Trilha de auditoria** — para alterações em prontuário e documentos, acessível só pelo Admin (010/013).
9. **Especialidade do dentista** — validação foi adicionada e depois **revertida**: hoje é só informativa (003/005/006).
10. **Catch-up de notificação de retorno** — janela de verificação em vez de disparo pontual, tolerante a falhas (009).
11. **Comunicação externa** — resolvida criando a **Feature 019** dedicada (antes era um gap sem feature própria).
12. **Responsável legal para menores** — nome completo + CPF obrigatórios no cadastro do paciente (004).

---

## 5. Decisão Revertida Durante a Sessão

A validação de "dentista precisa ter especialidade compatível com o procedimento" foi:
- **Adicionada** na rodada de correções de gaps (item 9 acima).
- **Revertida** posteriormente, quando o usuário esclareceu explicitamente: *"o procedimento não se associa à especialidade do dentista"*.
- Hoje, especialidade é um campo **apenas informativo** no cadastro do dentista (003), sem nenhuma restrição de agendamento (005/006).

---

## 6. Incidente Técnico Durante a Sessão

Em um ponto da sessão, o ambiente de arquivos do Claude reiniciou no meio de uma leva grande de edições (features 001 a 013), fazendo com que as alterações ainda não copiadas para a pasta de saída fossem perdidas. Foi necessário reconstruir a partir do último snapshot salvo e reaplicar as correções — o que foi feito reescrevendo cada spec por completo (em vez de patches incrementais), garantindo consistência no resultado final.

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
  procedimento_id?: string; // opcional
  data_hora_inicio: string;
  data_hora_fim: string;
  status_presenca: 'em_espera' | 'iniciado' | 'concluido';
  concluido_por?: string; // dentista_id
  emergencia: boolean;
  criado_por: string;
}

// Feature 016 — Estoque (sistema de lotes)
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
  quantidade_total: number;
  quantidade_reservada: number;
  validade?: string;
  criado_em: string;
}
interface MovimentacaoEstoque {
  id: string;
  material_id: string;
  lote_id: string;
  tipo: 'entrada' | 'reserva' | 'baixa' | 'estorno' | 'vencimento';
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
  procedimentos: ProcedimentoDoPlano[];
  valor_total: number;
}

// Feature 019 — Comunicação Externa
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

Cada uma das 19 specs contém sua própria seção completa de "Exemplos de Código" — não reproduzidos aqui na íntegra por brevidade.

---

## 8. Pendências Ainda Abertas (menores, não bloqueantes)

- Provedor de email para recuperação de senha (001) e provedor de SMS/WhatsApp (019).
- Plano de Tratamento (012): quem além do Dentista pode criar/editar; quando o faturamento é contabilizado (criação vs. conclusão vs. pagamento).
- Fluxo formal de Débitos e Histórico de Pagamentos — ainda não é uma feature própria totalmente detalhada.
- Antecedência **máxima** para criar agendamento (006) — hoje só se sabe que não há mínima.
- Feriados: configuração automática (calendário nacional) ou 100% manual pela clínica (002).
- Provedor de assinatura digital para documentos (013).

---

## 9. Próxima Etapa da Metodologia SDD

```
SPEC (.md)  ✅ CONCLUÍDO (19/19)
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

Todas as 19 specs estão salvas em `/mnt/user-data/outputs/specs/`, nomeadas `FEATURE_NNN_Nome.md`, seguindo a numeração da tabela da seção 2.
