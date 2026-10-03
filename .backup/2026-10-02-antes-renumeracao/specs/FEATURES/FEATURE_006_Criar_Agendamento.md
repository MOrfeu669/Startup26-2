# Feature 006: Criar Agendamento

**Status:** 🟡 Em Definição
**Fase:** MVP
**Complexidade:** 🔴 Alta
**Dependências:** Feature 001, Feature 002, Feature 003, Feature 004

---

## Contexto

É o coração do sistema: qualquer usuário autenticado (Admin, Dentista ou Recepcionista) pode marcar uma consulta para um paciente, em um horário e cadeira disponíveis, com um dentista específico. A regra mais crítica é que **dois dentistas não podem atender na mesma cadeira no mesmo horário**.

---

## Requisitos

- [ ] Admin, Dentista e Recepcionista podem criar agendamento
- [ ] Agendamento requer: paciente, dentista, cadeira, data/hora de início e hora de término
- [ ] Agendamento pode ser criado sem procedimento vinculado (procedimento é opcional)
- [ ] Sistema valida se a cadeira está livre naquele horário
- [ ] Sistema valida se o dentista está disponível (sem outro compromisso/consulta no mesmo horário)
- [ ] Sistema valida se o paciente já não possui outro agendamento no mesmo horário (em qualquer dentista/cadeira)
- [ ] Sistema garante que duas solicitações simultâneas não reservem a mesma cadeira/horário (controle de concorrência/transação na criação)
- [ ] Sistema permite registrar um atendimento de emergência/extraordinário já ocorrido, sem passar pelas validações normais de conflito, para fins de registro histórico na agenda
- [ ] Duração da consulta é definida pelo intervalo início/fim informado; quando há procedimento vinculado, o tempo médio dele pode ser usado como sugestão, ajustável manualmente
- [ ] Agendamento nasce com status de presença "em espera" e evolui até "concluído", sendo o Dentista responsável quem marca a transição para "concluído"
- [ ] Não há antecedência mínima exigida para criar um agendamento
- [ ] Dentista pode marcar compromissos extra-horário que bloqueiam aquele intervalo para novos agendamentos

---

## Cenários

### Cenário 1: Agendar com sucesso
```
Dado o paciente "João", o dentista "Dr. Carlos" e a cadeira "Cadeira 1" livres em "2026-10-15 14:00"
Quando qualquer usuário autenticado cria o agendamento
Então o sistema salva o agendamento com status de presença "em espera"
E retorna confirmação com ID único
```

### Cenário 2: Cadeira já ocupada no horário
```
Dado a cadeira "Cadeira 1" já ocupada em "2026-10-15 14:00" por outro dentista
Quando um usuário tenta agendar outro dentista na mesma cadeira e horário
Então o sistema bloqueia e retorna erro "Cadeira indisponível nesse horário"
```

### Cenário 3: Dentista com compromisso extra-horário
```
Dado o dentista "Dr. Carlos" com um compromisso extra marcado das 14:00 às 15:00
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
Dado o paciente "João" já com um agendamento confirmado em "2026-10-15 14:00" com o "Dr. Carlos"
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
Quando um usuário registra esse atendimento retroativamente na agenda
Então o sistema salva o registro sem aplicar as validações normais de conflito de cadeira/dentista/paciente
E o atendimento passa a constar no histórico da agenda, para fins de registro
```

### Cenário 9: Concluir agendamento
```
Dado um agendamento com status "iniciado"
Quando o Dentista responsável finaliza o atendimento
Então o sistema atualiza o status de presença para "concluído"
E esse agendamento passa a integrar o Histórico de Consultas (Feature 010) como realizado
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
  procedimento_id?: string; // opcional
  data_hora_inicio: string;
  data_hora_fim: string;
  status_presenca: 'em_espera' | 'iniciado' | 'concluido';
  concluido_por?: string; // dentista_id — só o dentista responsável marca "concluído"
  emergencia: boolean; // true = registrado retroativamente, sem validações de conflito
  criado_por: string; // usuario_id
}

// Exemplo de uso esperado
const agendamento = await agendamentoService.criar({
  paciente_id: 'paciente-001',
  dentista_id: 'dentista-005',
  cadeira_id: 'cadeira-001',
  data_hora_inicio: '2026-10-15T14:00:00',
  data_hora_fim: '2026-10-15T14:30:00'
});
```

---

## Dependências

- Feature 001 (Autenticação & Roles)
- Feature 002 (Criar/Configurar Clínica) — horário e cadeiras
- Feature 003 (Cadastro de Dentistas)
- Feature 004 (Cadastro de Pacientes)
- Feature 005 (Criar Procedimento) — vínculo opcional; agendamento funciona sem procedimento

---

## Regras de Negócio

- [stated] Todos os papéis podem agendar (Admin, Dentista, Recepcionista)
- [stated] Dois dentistas não podem atender na mesma cadeira no mesmo horário
- [stated] Dentista marca compromissos extra-horário que bloqueiam sua agenda
- [stated] Agendamento nasce com status de presença "em espera"
- [stated] Paciente não tem acesso ao sistema — não confirma nem interage diretamente
- [correção] Criação de agendamento é protegida por controle de concorrência/transação: duas solicitações simultâneas para a mesma cadeira/horário nunca são ambas confirmadas
- [correção] Paciente não pode ter dois agendamentos ativos no mesmo horário — EXCETO em registros de emergência
- [correção] Status de presença possui três estados: "em espera" → "iniciado" → "concluído". O estado "concluído" é o que alimenta o Histórico de Consultas (Feature 010), o cálculo de retorno (Feature 009) e a ocupação no Dashboard (Feature 018)
- [correção] A transição "iniciado" → "concluído" é feita pelo Dentista responsável pelo atendimento
- [correção] Agendamento pode ser criado sem procedimento vinculado — duração é definida diretamente por hora de início e hora de término
- [correção] Não existe especialidade obrigatória para agendar um procedimento com um dentista — especialidade é apenas informativa (Feature 003/007)
- [correção] Atendimentos de emergência/extraordinários podem ser registrados retroativamente na agenda, sem passar pelas validações normais de conflito
- [correção] Não há antecedência mínima exigida para criar um agendamento

### ⚠️ PENDENTE (não definido ainda pelo usuário)
- ⚠️ Existe antecedência MÁXIMA para agendar (ex: não pode agendar com mais de X meses de antecedência)?
- ⚠️ Quem pode registrar um atendimento de emergência retroativo — todos os papéis, ou só Dentista/Admin?
