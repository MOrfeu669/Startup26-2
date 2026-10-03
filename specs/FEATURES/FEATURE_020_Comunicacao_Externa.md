# Feature 020: Comunicação Externa ao Paciente

**Status:** 🟡 Em Definição
**Fase:** V1.5 (complementar)
**Complexidade:** 🟡 Média
**Dependências:** Feature 004, Feature 006, Feature 008, Feature 009, Feature 014, Feature 018

---

## Contexto

O paciente não tem acesso ao sistema (Feature 001/004), então toda comunicação com ele precisa acontecer por um canal externo — SMS, Email ou WhatsApp. O canal é indicado pelo paciente e registrado pela clínica no cadastro (Feature 004), que exige pelo menos um canal e marca exatamente um como preferido. Esta feature resolve o gap identificado nas Features 009 e 018: até aqui, o sistema só notificava a equipe interna: agora ele também envia mensagens diretamente ao paciente, disparadas por eventos específicos do fluxo de agendamento.

---

## Requisitos

- [ ] Usa os canais de comunicação do paciente cadastrados na Feature 004 (`CanalComunicacao`): o paciente indica, a clínica registra; o paciente não escolhe diretamente no sistema
- [ ] Sistema envia mensagem ao paciente quando um agendamento é criado ("Você foi agendado para uma consulta dia X")
- [ ] Sistema envia DOIS lembretes antes da consulta: um 24h antes e outro 5h antes
- [ ] Agendamento cujo início já passou no momento do registro (ex: emergência retroativa, Feature 006) NÃO gera mensagem nem lembretes
- [ ] Mensagem é enviada apenas pelo canal **preferido** do paciente (não envia por todos os canais ao mesmo tempo)
- [ ] Texto das mensagens é baseado em modelos personalizáveis pela clínica (semelhante aos modelos de Documentos, Feature 014), únicos por clínica (não variam por tipo de procedimento/consulta)
- [ ] Cancelamento (Feature 008) e aviso de retorno (Feature 009) NÃO geram mensagem automática ao paciente por esta feature — permanecem como ação manual da clínica (ver Regras de Negócio)
- [ ] Em caso de falha no envio, o sistema tenta reenviar automaticamente até 2 vezes
- [ ] Se as 2 tentativas de reenvio falharem, o sistema gera um alerta interno para a Recepcionista (Feature 018, tipo `falha_envio_mensagem`)
- [ ] Falha no envio não impede o funcionamento do restante do sistema (agendamento continua válido mesmo se a mensagem falhar)

---

## Cenários

### Cenário 1: Notificação de novo agendamento
```
Dado um paciente com canal preferido "WhatsApp" cadastrado
Quando um agendamento é criado para ele em "2026-10-15 14:00" (Feature 006)
Então o sistema envia via WhatsApp a mensagem "Você foi agendado para uma consulta dia 15/10 às 14:00"
```

### Cenário 2: Lembrete 24h antes
```
Dado um agendamento com status "agendado" para "2026-10-15 14:00"
Quando faltam 24h para o horário da consulta
Então o sistema envia ao paciente, pelo canal preferido, a mensagem "Você tem uma consulta marcada"
```

### Cenário 2b: Lembrete 5h antes
```
Dado um agendamento com status "agendado" para "2026-10-15 14:00"
Quando faltam 5h para o horário da consulta
Então o sistema envia um segundo lembrete ao paciente, pelo canal preferido
```

### Cenário 3: Canal preferido por SMS
```
Dado um paciente com os canais "SMS" (preferido) e "Email" cadastrados pela clínica (Feature 004)
Quando um agendamento é criado para ele
Então o sistema envia a notificação apenas por SMS, e não por Email ou WhatsApp
```

### Cenário 4: Reenvio automático após falha, com alerta se ambas as tentativas falharem
```
Dado um lembrete programado que falha no primeiro envio
Quando o sistema tenta reenviar automaticamente (1ª tentativa) e falha novamente
E tenta reenviar uma 2ª vez e também falha
Então o sistema gera um alerta interno para a Recepcionista (Feature 018, tipo "falha_envio_mensagem")
E o agendamento permanece criado normalmente
```

### Cenário 4b: Reenvio automático bem-sucedido
```
Dado uma mensagem que falha no primeiro envio
Quando o sistema tenta reenviar automaticamente e a 1ª tentativa de reenvio é bem-sucedida
Então a mensagem é marcada como enviada
E nenhum alerta é gerado para a Recepcionista
```

### Cenário 5: Cancelamento de agendamento antes do lembrete disparar
```
Dado um agendamento com lembretes programados (24h e 5h antes)
Quando o agendamento é cancelado (Feature 008) antes de um desses horários
Então o lembrete ainda não disparado não é enviado
```

### Cenário 6: Cancelamento não gera mensagem automática ao paciente
```
Dado um agendamento cancelado (Feature 008)
Quando o cancelamento é confirmado
Então esta feature NÃO envia mensagem automática ao paciente sobre o cancelamento
E a comunicação do cancelamento permanece como ação manual da clínica, feita fora do sistema
```

### Cenário 7: Agendamento retroativo não gera mensagem
```
Dado um paciente com canal preferido "WhatsApp"
Quando é registrado um agendamento cujo início já passou (ex: emergência retroativa, Feature 006)
Então o sistema NÃO envia mensagem de confirmação
E NÃO programa os lembretes de 24h e 5h
```

---

## Exemplos de Código

```typescript
// Canal do paciente: usa CanalComunicacao da Feature 004
// (canal: 'sms' | 'email' | 'whatsapp', contato, preferido) — envio só pelo preferido

interface ModeloMensagem {
  id: string;
  clinica_id: string;
  tipo: 'confirmacao_agendamento' | 'lembrete_24h' | 'lembrete_5h';
  conteudo_template: string; // personalizável pela clínica, com variáveis (ex: {{paciente.nome}}, {{agendamento.data}})
}

interface MensagemExterna {
  id: string;
  paciente_id: string;
  agendamento_id: string;
  tipo: 'confirmacao_agendamento' | 'lembrete_24h' | 'lembrete_5h';
  canal: 'sms' | 'email' | 'whatsapp';
  status_envio: 'enviado' | 'falhou' | 'pendente';
  tentativas: number; // até 2 reenvios automáticos após a falha inicial
  programado_para: string;
  enviado_em?: string;
}

// Exemplo de uso esperado
await comunicacaoService.notificarAgendamentoCriado({
  agendamento_id: 'agendamento-020',
  paciente_id: 'paciente-001'
});

// Job/rotina que verifica lembretes (24h e 5h) a disparar
await comunicacaoService.enviarLembretesPendentes();

// Job/rotina que reenvia mensagens falhas (até 2 tentativas) e alerta a Recepcionista se ambas falharem
await comunicacaoService.reenviarMensagensFalhas();
```

---

## Dependências

- Feature 004 (Cadastro de Pacientes) — canais de comunicação do paciente (`CanalComunicacao`, com um preferido)
- Feature 006 (Criar Agendamento) — gatilho da mensagem de confirmação
- Feature 008 (Cancelar Agendamento) — cancelamento suspende lembretes pendentes (mas não gera mensagem própria)
- Feature 009 (Reagendamento Automático) — aviso de retorno permanece como notificação interna, sem mensagem automática ao paciente por esta feature
- Feature 014 (Documentos) — modelo conceitual similar para templates de mensagem personalizáveis pela clínica
- Feature 018 (Notificações Internas) — alerta à Recepcionista na falha final de envio

---

## Regras de Negócio

- [stated] Mensagem enviada por um dos meios: SMS, Email ou WhatsApp
- [stated] Evento 1: Agendamento criado → mensagem "você foi agendado para uma consulta dia X"
- [stated] Evento 2: Dois lembretes — 24h antes e 5h antes da consulta
- [stated] Canal de comunicação é definido pela clínica (Admin/Recepcionista), não escolhido pelo paciente no sistema — o paciente comunica sua preferência à clínica por fora
- [stated] Cancelamento (Feature 008) não gera mensagem automática — a clínica comunica o paciente manualmente
- [stated] Aviso de retorno (Feature 009) não gera mensagem automática ao paciente — é apenas um lembrete interno para a clínica entrar em contato e agendar
- [stated] Textos das mensagens são personalizáveis pela clínica conforme sua necessidade
- [correção] Modelos de mensagem são únicos por clínica, não variam por tipo de procedimento/consulta
- [correção] Em caso de falha, o sistema tenta reenviar automaticamente até 2 vezes
- [correção] Se as 2 tentativas falharem, o alerta interno é enviado para a Recepcionista
- [stated] Pelo menos um canal de comunicação é obrigatório no cadastro do paciente (Feature 004); envio só pelo canal preferido
- [stated] Nenhum agendamento cujo início já passou gera mensagem ou lembrete
- [stated] A falha final de envio gera notificação interna do tipo `falha_envio_mensagem` (Feature 018)

### ⚠️ PENDENTE (não definido ainda pelo usuário)
- ⚠️ Provedor de envio (Twilio, outro serviço de SMS/WhatsApp, serviço de Email) — ainda não definido

---

## Notas

Esta feature resolve o gap identificado nas Features 009 e 018 (comunicação externa mencionada no levantamento inicial, mas até então fora do roadmap). As Features 009 e 018 devem ser atualizadas para referenciar esta spec como responsável pelo contato direto com o paciente.

**Histórico:** 2026-10-02 — renumerada de 019 para 020; aplicadas decisões da análise de consistência (`context/ANALISE_SPECS.md`: INC-01, INC-10, INC-15, ESC-14, REF-04). `PreferenciaComunicacao` foi substituída pela `CanalComunicacao` da Feature 004; adicionado o Cenário 7 (agendamento retroativo).
