# Feature 018: Notificações Internas

**Status:** 🟡 Em Definição
**Fase:** V1.5
**Complexidade:** 🟡 Média
**Dependências:** Feature 002, Feature 003, Feature 006, Feature 008, Feature 009, Feature 016, Feature 017, Feature 020

---

## Contexto

O sistema precisa avisar internamente Dentistas e Recepcionistas sobre eventos que exigem ação deles — sem depender de canais externos (email/SMS/WhatsApp, que são tratados separadamente para o paciente, ver Notas). Gatilhos identificados: paciente aguardando atendimento, retorno que precisa ser reagendado, cancelamento que precisa ser comunicado ao paciente, e alertas (estoque, cadeira indisponível, fora de horário, dentista removido, falha de envio ao paciente, atraso de prótese).

As Features 008 e 009 (V1) usam uma interface temporária de notificação até esta feature ser implementada no V1.5.

---

## Requisitos

- [ ] Notificar o Dentista quando um paciente está com status "em espera" (aguardando atendimento)
- [ ] Marcar a chegada do paciente (`agendado` → `em_espera`) é uma ação manual e opcional — a consulta pode ocorrer normalmente mesmo sem essa marcação; a notificação funciona como um lembrete conveniente para o Dentista, não como pré-requisito
- [ ] Notificar a Recepcionista quando um retorno programado precisa ser reagendado (Feature 009) — notificação **crítica**, que persiste até o novo agendamento ser marcado
- [ ] Notificar a Recepcionista quando um agendamento é cancelado, para que ela comunique o paciente (Feature 008)
- [ ] Notificar quando um dentista é removido com agendamentos futuros (Feature 003)
- [ ] Notificar a Recepcionista quando o envio de uma mensagem ao paciente falha definitivamente (Feature 020)
- [ ] Notificar atraso de prótese no laboratório (Feature 016)
- [ ] Notificações possuem diferentes níveis de urgência: as críticas (estoque abaixo do mínimo, atendimento fora de horário, atendimento em cadeira indisponível, retorno a reagendar) permanecem sempre visíveis até serem tratadas
- [ ] Notificações são internas ao sistema (não enviadas por email/SMS)
- [ ] Notificações aparecem em um ícone de sino no canto superior da tela e também no Dashboard (Feature 019); o sino **sempre** mostra as críticas, mesmo que estejam ocultas no Dashboard
- [ ] Usuário consegue visualizar suas notificações pendentes

---

## Cenários

### Cenário 1: Paciente aguardando atendimento (marcação manual e opcional)
```
Dado um agendamento com status "agendado"
Quando a Recepcionista marca manualmente a chegada do paciente
Então o status muda para "em_espera"
E o sistema notifica o Dentista responsável: "Paciente aguardando atendimento"
```

### Cenário 1b: Consulta ocorre sem marcação de chegada
```
Dado um agendamento com status "agendado", sem marcação de chegada
Quando o Dentista inicia o atendimento diretamente
Então o sistema permite normalmente (agendado → iniciado), sem exigir que o status "em_espera" tenha sido marcado antes
```

### Cenário 2: Retorno precisa ser reagendado
```
Dado um retorno programado (Feature 009) dentro do prazo configurado pela clínica
Quando o sistema roda a verificação diária
Então notifica a Recepcionista, com urgência crítica: "Paciente [Nome] precisa ser reagendado"
E a notificação permanece visível até que um novo agendamento seja marcado para o paciente
```

### Cenário 3: Cancelamento precisa ser comunicado
```
Dado um agendamento cancelado com motivo registrado (Feature 008)
Quando o cancelamento é confirmado
Então o sistema notifica a Recepcionista para comunicar o paciente sobre o cancelamento
```

### Cenário 4: Marcar notificação como lida
```
Dado uma notificação normal pendente para o Dentista
Quando ele visualiza e marca como lida
Então a notificação deixa de aparecer como pendente
```

### Cenário 5: Notificação crítica permanece sempre visível
```
Dado um material com estoque abaixo do mínimo (Feature 017) ou um agendamento em cadeira desativada (Feature 002)
Quando essa notificação é gerada
Então ela permanece visível no sino e no Dashboard até que a situação seja resolvida, mesmo que o usuário a tenha visualizado
E continua visível no sino mesmo que o usuário tenha ocultado o widget no Dashboard
```

---

## Exemplos de Código

```typescript
interface NotificacaoInterna {
  id: string;
  destinatario_id: string; // usuario_id
  tipo:
    | 'paciente_aguardando'
    | 'retorno_reagendar'
    | 'cancelamento_comunicar'
    | 'estoque_abaixo_minimo'
    | 'cadeira_indisponivel'
    | 'fora_de_horario'
    | 'dentista_removido'
    | 'falha_envio_mensagem'
    | 'atraso_protese';
  urgencia: 'normal' | 'critica'; // crítica permanece visível até resolução, não só até leitura
  referencia_id: string; // agendamento_id, retorno_id, material_id, protese_id ou mensagem_id
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

- Feature 002 (Criar/Configurar Clínica) — gatilhos de cadeira indisponível e fora de horário
- Feature 003 (Cadastro de Dentistas) — gatilho de dentista removido
- Feature 006 (Criar Agendamento) — gatilho de "em espera"
- Feature 008 (Cancelar Agendamento) — gatilho de cancelamento
- Feature 009 (Reagendamento Automático) — gatilho de retorno
- Feature 016 (Controle de Prótese) — gatilho de atraso de prótese
- Feature 017 (Controle de Estoque) — gatilho de estoque abaixo do mínimo
- Feature 020 (Comunicação Externa) — gatilho de falha final de envio

---

## Regras de Negócio

- [stated] Dentista recebe notificação interna: "paciente aguardando atendimento"
- [stated] Recepcionista recebe notificação interna: "paciente agendado com retorno precisa ser reagendado"
- [stated] Recepcionista recebe notificação de cancelamento para comunicar o paciente
- [stated] A notificação de retorno é crítica: persiste até o novo agendamento ser marcado
- [stated] Novos tipos: dentista removido, falha final de envio de mensagem ao paciente, atraso de prótese; o termo padronizado é "estoque abaixo do mínimo"
- [stated] Alertas podem ser ocultados no Dashboard (Feature 019), mas o sino sempre mostra os críticos
- [correção] Marcação de chegada do paciente ("em espera") é manual e opcional; não bloqueia o início do atendimento
- [correção] Notificações têm dois níveis de urgência: normal e crítica. Críticas (estoque abaixo do mínimo, cadeira indisponível, fora de horário, retorno a reagendar) permanecem visíveis até a situação ser resolvida, não apenas até serem lidas
- [correção] Notificações aparecem em um sino no canto superior da tela e também no Dashboard (Feature 019)

### ⚠️ PENDENTE (não definido ainda pelo usuário)
- ⚠️ Urgência (normal ou crítica) dos tipos `dentista_removido`, `falha_envio_mensagem` e `atraso_protese`
- ⚠️ Quando a notificação é "para a Recepcionista" e a clínica tem várias (ou nenhuma), quem recebe: todas as Recepcionistas, o Admin como fallback, ou outro critério?
- ⚠️ Destinatário das notificações de estoque, cadeira indisponível, fora de horário e dentista removido

---

## Notas

Esta feature cobre **apenas** notificações internas (dentro do sistema, entre a equipe). O contato direto com o paciente (SMS/Email/WhatsApp) é responsabilidade da Feature 020 (Comunicação Externa ao Paciente), que cobre os eventos de confirmação de agendamento e lembrete de consulta.

**Histórico:** 2026-10-02 — renumerada de 017 para 018; aplicadas decisões da análise de consistência (`context/ANALISE_SPECS.md`: INC-01, INC-07, INC-11, INC-15, ESC-06, ESC-08). O Cenário 1 passou a partir de "agendado" (antes partia de "confirmado").
