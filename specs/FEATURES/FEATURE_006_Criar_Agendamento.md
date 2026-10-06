# Feature 006: Criar Agendamento

**Status:** 🟡 Em Definição
**Fase:** MVP
**Complexidade:** 🔴 Alta
**Dependências:** Feature 001, Feature 002, Feature 003, Feature 004 — Feature 005 e Feature 012 opcionais

---

## Contexto

É o coração do sistema: qualquer usuário autenticado (Admin, Dentista ou Recepcionista) pode marcar uma consulta para um paciente, em um horário e cadeira disponíveis, com um dentista específico. A regra mais crítica é que **dois dentistas não podem atender na mesma cadeira no mesmo horário**.

---

## Requisitos

- [ ] Admin, Dentista e Recepcionista podem criar agendamento
- [ ] Agendamento requer: paciente, dentista, cadeira, data/hora de início e hora de término
- [ ] Agendamento pode ter, opcionalmente, **um procedimento avulso** (Feature 005) **ou** **itens de um Plano de Tratamento** do paciente (Feature 012), nunca os dois; também pode não ter nenhum
- [ ] Sistema valida se a cadeira está livre naquele horário
- [ ] Sistema valida se a cadeira está **ativa** (Feature 002)
- [ ] Sistema valida se o dentista está **ativo** (Feature 003) e disponível (sem outra consulta nem bloqueio de agenda no mesmo horário)
- [ ] Sistema valida se o paciente já não possui outro agendamento no mesmo horário (em qualquer dentista/cadeira)
- [ ] Sistema valida se o horário está dentro do funcionamento da clínica e se o **dia** está entre os `dias_atendimento` (Feature 002)
- [ ] Sistema garante que duas solicitações simultâneas não reservem a mesma cadeira/horário (controle de concorrência/transação na criação)
- [ ] Sistema permite registrar um atendimento de emergência/extraordinário já ocorrido, sem passar por nenhuma das validações acima, para fins de registro histórico na agenda — **qualquer papel** (Admin, Dentista, Recepcionista)
- [ ] Duração da consulta é definida pelo intervalo início/fim informado; quando há procedimento vinculado, o tempo médio dele pode ser usado como sugestão, ajustável manualmente
- [ ] Ciclo de vida do agendamento: nasce `agendado` → `em_espera` (opcional, marcação de chegada, Feature 018) → `iniciado` → `concluido`; `cancelado` é estado terminal (Feature 008), possível apenas antes de `concluido`
- [ ] A transição para `iniciado` é feita pelo **Dentista responsável** ou pelo **Admin**
- [ ] A transição para `concluido` acontece **automaticamente ao salvar a Evolução** do atendimento (Feature 010) — não existe ação separada de "concluir"
- [ ] Agendamento **não reserva material**; a baixa de materiais ocorre na conclusão (Feature 010/017)
- [ ] Não há antecedência mínima nem **máxima** exigida para criar um agendamento
- [ ] Dentista ou Admin podem criar **bloqueios de agenda** do dentista. No MVP o bloqueio é **só pontual**; recorrência fica fora (Cenário 13 = `it.todo`)
- [ ] Procedimento avulso e itens do plano **não combinam** no mesmo agendamento: um, outro, ou nenhum

---

## Cenários

### Cenário 1: Agendar com sucesso
```
Dado o paciente "João", o dentista "Dr. Carlos" e a cadeira "Cadeira 1" livres em "2026-10-15 14:00"
Quando qualquer usuário autenticado cria o agendamento
Então o sistema salva o agendamento com status "agendado"
E retorna confirmação com ID único
```

### Cenário 2: Cadeira já ocupada no horário
```
Dado a cadeira "Cadeira 1" já ocupada em "2026-10-15 14:00" por outro dentista
Quando um usuário tenta agendar outro dentista na mesma cadeira e horário
Então o sistema bloqueia e retorna erro "Cadeira indisponível nesse horário"
```

### Cenário 3: Dentista com bloqueio de agenda
```
Dado o dentista "Dr. Carlos" com um bloqueio de agenda das 14:00 às 15:00
Quando um usuário tenta agendar uma consulta com ele nesse intervalo
Então o sistema bloqueia e retorna erro "Dentista indisponível nesse horário"
```

### Cenário 4: Duração ajustada manualmente
```
Dado um agendamento vinculado ao procedimento "Limpeza" (tempo médio padrão 30min)
Quando o usuário que está agendando ajusta a duração para 45min
Então o sistema salva a duração customizada, sem alterar o tempo médio padrão do procedimento
```

### Cenário 5: Fora do horário de funcionamento da clínica
```
Dado a clínica configurada com funcionamento até às 18:00
Quando um usuário tenta agendar uma consulta às 19:00
Então o sistema bloqueia e retorna erro "Fora do horário de funcionamento"
```

### Cenário 6: Duas solicitações simultâneas para a mesma cadeira/horário
```
Dado a cadeira "Cadeira 1" livre em "2026-10-15 14:00"
Quando dois usuários tentam criar, ao mesmo tempo, um agendamento nesse mesmo horário/cadeira
Então apenas uma das solicitações é confirmada
E a outra recebe o erro "Cadeira indisponível nesse horário"
```

### Cenário 7: Paciente já agendado no mesmo horário
```
Dado o paciente "João" já com um agendamento com status "agendado" em "2026-10-15 14:00" com o "Dr. Carlos"
Quando um usuário tenta agendar o mesmo paciente "João" nesse mesmo horário com outro dentista
Então o sistema bloqueia e retorna erro "Paciente já possui agendamento nesse horário"
```

### Cenário 8: Agendar sem procedimento vinculado
```
Dado o paciente "João", o dentista "Dr. Carlos" e a cadeira "Cadeira 1" livres em "2026-10-15 14:00"
Quando um usuário cria o agendamento informando apenas paciente, dentista, cadeira, hora de início e hora de término (sem procedimento)
Então o sistema salva o agendamento normalmente, sem exigir procedimento
```

### Cenário 8b: Registrar atendimento de emergência já ocorrido
```
Dado um paciente atendido em caráter de emergência, fora do fluxo normal de agendamento
Quando um usuário (Admin, Dentista ou Recepcionista) registra esse atendimento retroativamente na agenda
Então o sistema salva o registro sem aplicar as validações normais (conflito, cadeira/dentista inativos, horário e dia de funcionamento)
E o atendimento passa a constar no histórico da agenda, para fins de registro
```

### Cenário 9: Concluir agendamento
```
Dado um agendamento com status "iniciado"
Quando o Dentista responsável salva a Evolução do atendimento (Feature 010)
Então o sistema atualiza o status para "concluido" automaticamente
E esse agendamento passa a integrar o Histórico de Consultas (Feature 010) como realizado
```
> Depende da Feature 010 (V1). No MVP vira `it.todo`; nenhum agendamento chega a `concluido` no MVP.

### Cenário 10: Cadeira desativada não aceita novos agendamentos
```
Dado a "Cadeira 2" desativada pelo Admin (Feature 002)
Quando um usuário tenta criar um agendamento nessa cadeira
Então o sistema bloqueia e retorna erro "Cadeira indisponível"
```

### Cenário 11: Dentista inativo não aceita novos agendamentos
```
Dado o dentista "Dr. Carlos" removido pelo Admin (Feature 003)
Quando um usuário tenta criar um agendamento com ele
Então o sistema bloqueia e retorna erro "Dentista indisponível"
```

### Cenário 12: Dia sem atendimento
```
Dado a clínica configurada para atender de segunda a sexta (Feature 002)
Quando um usuário tenta agendar uma consulta em um domingo
Então o sistema bloqueia e retorna erro "Clínica não atende nesse dia"
```

### Cenário 13: Bloqueio de agenda recorrente
```
Dado o dentista "Dr. Carlos" com um bloqueio de agenda recorrente
Quando um usuário tenta agendar uma consulta com ele em uma das ocorrências desse bloqueio
Então o sistema bloqueia e retorna erro "Dentista indisponível nesse horário"
```
> Recorrência está fora do MVP (só bloqueio pontual). O formato continua PENDENTE; este cenário vira `it.todo`.

### Cenário 14: Iniciar atendimento
```
Dado um agendamento com status "agendado" ou "em_espera"
Quando o Dentista responsável (ou o Admin) inicia o atendimento
Então o sistema atualiza o status para "iniciado"
E uma Recepcionista que tente fazer o mesmo recebe o erro "Ação não permitida para seu papel"
```

---

## Exemplos de Código

```typescript
interface Agendamento {
  id: string;
  clinica_id: string;
  paciente_id: string;
  dentista_id: string;
  cadeira_id: string;
  procedimento_id?: string; // opcional — procedimento avulso
  itens_plano_ids?: string[]; // opcional — itens do Plano de Tratamento (Feature 012)
  data_hora_inicio: string;
  data_hora_fim: string;
  status: 'agendado' | 'em_espera' | 'iniciado' | 'concluido' | 'cancelado';
  iniciado_por?: string; // usuario_id — Dentista responsável ou Admin
  concluido_em?: string; // preenchido ao salvar a Evolução (Feature 010)
  emergencia: boolean; // true = registrado retroativamente, sem validações
  criado_por: string; // usuario_id
}

interface BloqueioAgenda {
  id: string;
  clinica_id: string;
  dentista_id: string;
  inicio: string;
  fim: string;
  motivo?: string;
  recorrencia?: unknown; // ⚠️ PENDENTE: formato da recorrência
  criado_por: string; // usuario_id — Dentista (o próprio) ou Admin
}

// Exemplo de uso esperado
const agendamento = await agendamentoService.criar({
  paciente_id: 'paciente-001',
  dentista_id: 'dentista-005',
  cadeira_id: 'cadeira-001',
  data_hora_inicio: '2026-10-15T14:00:00',
  data_hora_fim: '2026-10-15T14:30:00'
});
// agendamento.status === 'agendado'
```

---

## Dependências

- Feature 001 (Autenticação & Roles)
- Feature 002 (Criar/Configurar Clínica) — horário, dias de atendimento e cadeiras
- Feature 003 (Cadastro de Dentistas)
- Feature 004 (Cadastro de Pacientes)
- Feature 005 (Criar Procedimento) — vínculo opcional; agendamento funciona sem procedimento
- Feature 012 (Plano de Tratamento) — vínculo opcional a itens do plano, disponível a partir do V1

---

## Regras de Negócio

- [stated] Todos os papéis podem agendar (Admin, Dentista, Recepcionista)
- [stated] Dois dentistas não podem atender na mesma cadeira no mesmo horário
- [stated] Dentista marca compromissos extra-horário que bloqueiam sua agenda
- [stated] Paciente não tem acesso ao sistema — não confirma nem interage diretamente
- [stated] Ciclo de vida: `agendado` → `em_espera` (opcional) → `iniciado` → `concluido`, mais `cancelado` como estado terminal. "Confirmado" nas demais specs significa `agendado`
- [stated] O agendamento nasce com status `agendado` (substitui a regra anterior "nasce em espera")
- [stated] Só o Dentista responsável e o Admin (este em qualquer agendamento) marcam `iniciado`
- [stated] Salvar a Evolução (Feature 010) conclui o atendimento automaticamente; o estado `concluido` alimenta o Histórico de Consultas (Feature 010), o cálculo de retorno (Feature 009), a baixa de estoque (Feature 017), o faturamento e a ocupação no Dashboard (Feature 019)
- [stated] Bloqueios de agenda (antes "compromissos extra-horário") são criados pelo Dentista ou pelo Admin e suportam recorrência
- [stated] Cadeira inativa, dentista inativo e dia fora de `dias_atendimento` bloqueiam novos agendamentos; a emergência retroativa ignora essas validações
- [stated] Agendamento pode ter procedimento avulso **ou** itens do Plano de Tratamento, **nunca os dois** no mesmo agendamento
- [stated] Não há reserva de material no agendamento
- [stated] No MVP, cenários que dependem de features futuras testam só a parte desta feature; o restante vira `it.todo`
- [stated] 2026-10-05 — não há antecedência máxima para agendar
- [stated] 2026-10-05 — emergência retroativa pode ser registrada por **todos os papéis**
- [correção] Criação de agendamento é protegida por controle de concorrência/transação: duas solicitações simultâneas para a mesma cadeira/horário nunca são ambas confirmadas
- [correção] Paciente não pode ter dois agendamentos ativos no mesmo horário — EXCETO em registros de emergência
- [correção] Agendamento pode ser criado sem procedimento vinculado — duração é definida diretamente por hora de início e hora de término
- [correção] Não existe especialidade obrigatória para agendar um procedimento com um dentista — especialidade é apenas informativa (Feature 003/005)
- [correção] Atendimentos de emergência/extraordinários podem ser registrados retroativamente na agenda, sem passar pelas validações normais de conflito
- [correção] Não há antecedência mínima exigida para criar um agendamento

### ⚠️ PENDENTE (não definido ainda pelo usuário)
- ⚠️ Bloqueio de agenda: formato da recorrência (semanal? diária? com data de fim?), se é possível remover uma única ocorrência da série, e o nome final do conceito ("bloqueio de agenda" ou "compromisso do dentista") — fora do MVP

---

## Notas

**Tamanho:** com as decisões de 2026-10-02 esta spec passou de 10 para 15 cenários, acima do ideal de 3–6. Sugestão a validar com o Bernardo: separar o **Bloqueio de Agenda** (Cenários 3 e 13) e/ou o **Ciclo de Vida do Atendimento** (Cenários 9 e 14) em specs próprias.

**Histórico:** 2026-10-02 — aplicadas decisões da análise de consistência (`context/ANALISE_SPECS.md`: INC-01, INC-02, INC-04, INC-05, ESC-03, ESC-04, ESC-05, REF-03). Adicionados os Cenários 10 a 14. 2026-10-05 — Bernardo: sem antecedência máxima; emergência por todos os papéis; bloqueio recorrente fora do MVP; avulso XOR itens do plano.
