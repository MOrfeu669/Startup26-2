# Feature 017: Notificações Internas

**Status:** 🟡 Em Definição
**Fase:** V1.5
**Complexidade:** 🟡 Média
**Dependências:** Feature 006, Feature 008, Feature 009

---

## Contexto

O sistema precisa avisar internamente Dentistas e Recepcionistas sobre eventos que exigem ação deles — sem depender de canais externos (email/SMS/WhatsApp, que são tratados separadamente para o paciente, ver Notas). Gatilhos identificados: paciente aguardando atendimento, retorno que precisa ser reagendado, cancelamento que precisa ser comunicado ao paciente, e alertas críticos (estoque, cadeira indisponível, fora de horário).

---

## Requisitos

- [ ] Notificar o Dentista quando um paciente está com status "em espera" (aguardando atendimento)
- [ ] Marcar a chegada do paciente ("em espera") é uma ação manual e opcional — a consulta pode ocorrer normalmente mesmo sem essa marcação; a notificação funciona como um lembrete conveniente para o Dentista, não como pré-requisito
- [ ] Notificar a Recepcionista quando um retorno programado precisa ser reagendado (Feature 009)
- [ ] Notificar a Recepcionista quando um agendamento é cancelado, para que ela comunique o paciente (Feature 008)
- [ ] Notificações possuem diferentes níveis de urgência: as mais críticas (estoque crítico, atendimento fora de horário, atendimento em cadeira indisponível) permanecem sempre visíveis até serem tratadas
- [ ] Notificações são internas ao sistema (não enviadas por email/SMS)
- [ ] Notificações aparecem em um ícone de sino no canto superior da tela e também no Dashboard (Feature 018)
- [ ] Usuário consegue visualizar suas notificações pendentes

---

## Cenários

### Cenário 1: Paciente aguardando atendimento (marcação manual e opcional)
```
Dado um agendamento confirmado
Quando a Recepcionista marca manualmente a chegada do paciente
Então o status de presença muda para "em espera"
E o sistema notifica o Dentista responsável: "Paciente aguardando atendimento"
```

### Cenário 1b: Consulta ocorre sem marcação de chegada
```
Dado um agendamento confirmado sem marcação de chegada
Quando o Dentista inicia o atendimento diretamente
Então o sistema permite normalmente, sem exigir que o status "em espera" tenha sido marcado antes
```

### Cenário 2: Retorno precisa ser reagendado
```
Dado um retorno programado (Feature 009) dentro do prazo configurado pela clínica
Quando o sistema roda a verificação diária
Então notifica a Recepcionista: "Paciente [Nome] precisa ser reagendado"
```

### Cenário 3: Cancelamento precisa ser comunicado
```
Dado um agendamento cancelado com motivo registrado (Feature 008)
Quando o cancelamento é confirmado
Então o sistema notifica a Recepcionista para comunicar o paciente sobre o cancelamento
```

### Cenário 4: Marcar notificação como lida
```
Dado uma notificação pendente para o Dentista
Quando ele visualiza e marca como lida
Então a notificação deixa de aparecer como pendente
```

### Cenário 5: Notificação crítica permanece sempre visível
```
Dado um material em estoque crítico (Feature 016) ou um agendamento em cadeira desativada (Feature 002)
Quando essa notificação é gerada
Então ela permanece visível no sino e no Dashboard até que a situação seja resolvida, mesmo que o usuário a tenha visualizado
```

---

## Exemplos de Código

```typescript
interface NotificacaoInterna {
  id: string;
  destinatario_id: string; // usuario_id
  tipo: 'paciente_aguardando' | 'retorno_reagendar' | 'cancelamento_comunicar' | 'estoque_critico' | 'cadeira_indisponivel' | 'fora_de_horario';
  urgencia: 'normal' | 'critica'; // crítica permanece visível até resolução, não só até leitura
  referencia_id: string; // agendamento_id, retorno_id ou material_id
  mensagem: string;
  lida: boolean;
  resolvida: boolean; // usado para notificações críticas
  criada_em: string;
}

// Exemplo de uso esperado
await notificacaoService.criar({
  destinatario_id: 'dentista-005',
  tipo: 'paciente_aguardando',
  urgencia: 'normal',
  referencia_id: 'agendamento-020',
  mensagem: 'Paciente João está aguardando atendimento'
});
```

---

## Dependências

- Feature 006 (Criar Agendamento) — gatilho de "em espera"
- Feature 008 (Cancelar Agendamento) — gatilho de cancelamento
- Feature 009 (Reagendamento Automático) — gatilho de retorno

---

## Regras de Negócio

- [stated] Dentista recebe notificação interna: "paciente aguardando atendimento"
- [stated] Recepcionista recebe notificação interna: "paciente agendado com retorno precisa ser reagendado"
- [stated] Recepcionista recebe notificação de cancelamento para comunicar o paciente
- [correção] Marcação de chegada do paciente ("em espera") é manual e opcional; não bloqueia o início do atendimento
- [correção] Notificações têm dois níveis de urgência: normal e crítica. Críticas (estoque crítico, cadeira indisponível, fora de horário) permanecem visíveis até a situação ser resolvida, não apenas até serem lidas
- [correção] Notificações aparecem em um sino no canto superior da tela e também no Dashboard (Feature 018)

---

## Notas

Esta feature cobre **apenas** notificações internas (dentro do sistema, entre a equipe). O contato direto com o paciente (SMS/Email/WhatsApp) é responsabilidade da Feature 019 (Comunicação Externa ao Paciente), que cobre os eventos de confirmação de agendamento e lembrete de consulta.
