# Feature 016: Controle de Prótese

**Status:** 🟡 Em Definição
**Fase:** V1.5
**Complexidade:** 🔴 Alta
**Dependências:** Feature 004, Feature 005, Feature 011, Feature 018

---

## Contexto

O fluxo de prótese é um processo próprio dentro do tratamento odontológico, com etapas que passam por fora da clínica (laboratório). Baseia-se em dois procedimentos (Avaliação/Consulta e Cirurgia de Implante) e segue 4 etapas: Registro do Pedido, Acompanhamento, Conferência e Instalação.

---

## Requisitos

- [ ] Todos os papéis (Admin, Dentista, Recepcionista) podem gerenciar o fluxo de prótese
- [ ] Etapa 1 — Registro do Pedido: tipo de prótese, paciente, **dente (numeração FDI)**, profissional responsável, laboratório (texto livre)
- [ ] Etapa 2 — Acompanhamento: registro de saída do material para o laboratório e prazo de retorno estipulado
- [ ] Etapa 3 — Conferência: confirmação da peça retornada, sinalização de atrasos ou necessidade de ajustes
- [ ] Etapa 4 — Instalação: registro da conclusão do serviço e acerto de custos/comissões
- [ ] Sistema gera alerta de atraso (notificação interna `atraso_protese`, Feature 018) quando a peça não retornou depois de **N dias além do prazo de retorno estipulado**, sendo N configurável pela clínica entre 15 e 30 dias
- [ ] Valor de comissão é definido por acordo entre o laboratório e a clínica (não calculado automaticamente por fórmula fixa)
- [ ] Um pedido de prótese pode ser descontinuado no meio do fluxo, em qualquer etapa
- [ ] Prótese aparece no Odontograma do paciente (Feature 011), no dente informado, com todas as informações
- [ ] Nesta feature, o laboratório é texto livre (sem cadastro próprio); o cadastro de laboratórios parceiros fica para versão futura

---

## Cenários

### Cenário 1: Registrar pedido de prótese
```
Dado um paciente em tratamento de prótese
Quando o Dentista registra o pedido informando tipo de prótese, dente 16, profissional responsável e laboratório (texto livre)
Então o sistema cria o registro na etapa "Pré-envio/Solicitação"
```

### Cenário 2: Acompanhar envio ao laboratório
```
Dado um pedido de prótese registrado
Quando a Recepcionista registra a saída do material para o laboratório com prazo de retorno "10 dias"
Então o sistema atualiza o status para "Envio e Acompanhamento" com a data prevista de retorno
```

### Cenário 3: Alerta de atraso no retorno do laboratório
```
Dado a clínica com limite de atraso configurado em 15 dias
E um pedido de prótese com data prevista de retorno "2026-11-01"
Quando chega "2026-11-16" sem a peça ter retornado
Então o sistema gera um alerta de atraso para a clínica (Feature 018)
```

### Cenário 4: Conferir peça retornada com necessidade de ajuste
```
Dado um pedido de prótese com a peça retornada do laboratório
Quando o usuário confere a peça e identifica necessidade de ajuste
Então o sistema permite sinalizar "ajuste necessário" antes de avançar para instalação
```

### Cenário 5: Instalar prótese e registrar custos
```
Dado uma prótese conferida sem pendências
Quando o Dentista instala a prótese no paciente
Então o sistema registra a conclusão do serviço e permite registrar o valor de comissão acordado entre laboratório e clínica
E a prótese passa a aparecer no Odontograma do paciente
```

### Cenário 6: Descontinuar pedido de prótese no meio do fluxo
```
Dado um pedido de prótese na etapa "Envio e Acompanhamento"
Quando o usuário decide descontinuar o pedido
Então o sistema marca o pedido como descontinuado, preservando o histórico das etapas já realizadas
```

---

## Exemplos de Código

```typescript
interface Protese {
  id: string;
  paciente_id: string;
  dente: number; // numeração FDI (Feature 011)
  tipo_protese: string;
  profissional_responsavel_id: string; // dentista_id
  laboratorio: string; // texto livre nesta feature
  etapa: 'pre_envio' | 'envio_acompanhamento' | 'recebimento_conferencia' | 'instalacao';
  status: 'em_andamento' | 'concluida' | 'descontinuada';
  prazo_retorno?: string; // data prevista de retorno
  alerta_atraso: boolean; // true quando passa de prazo_retorno + limite configurado
  ajuste_necessario?: string;
  valor_comissao?: number; // acordado entre laboratório e clínica
}

interface ConfiguracaoAtrasoProtese {
  clinica_id: string;
  dias_limite_atraso: number; // configurável pela clínica, entre 15 e 30
}

// Exemplo de uso esperado
const protese = await proteseService.registrarPedido({
  paciente_id: 'paciente-001',
  dente: 16,
  tipo_protese: 'Coroa de porcelana',
  profissional_responsavel_id: 'dentista-005',
  laboratorio: 'Laboratório ProstesTech'
});

await proteseService.descontinuar({ protese_id: protese.id });
```

---

## Dependências

- Feature 004 (Cadastro de Pacientes)
- Feature 005 (Criar Procedimento) — baseado nos procedimentos "Avaliação/Consulta" e "Cirurgia Implante"
- Feature 011 (Odontograma) — exibição da prótese vinculada ao dente (integração bidirecional)
- Feature 018 (Notificações Internas) — alerta de atraso

---

## Regras de Negócio

- [stated] Todos gerenciam o fluxo de prótese
- [stated] Baseado em 2 procedimentos: Avaliação/Consulta e Cirurgia Implante
- [stated] Fluxo de 4 etapas: Registro do Pedido → Acompanhamento → Conferência → Instalação
- [stated] MVP: laboratório tratado internamente (sem cadastro)
- [stated] V1.5+: clínica pode registrar quais laboratórios cada prótese será enviada
- [stated] Nesta feature, o laboratório é texto livre; o cadastro de laboratórios parceiros fica para versão futura
- [stated] Prótese aparece no odontograma com todas as informações
- [stated] A prótese registra o dente (FDI) em que será instalada
- [stated] O limite de atraso é configurável pela clínica entre 15 e 30 dias, contado a partir do prazo de retorno estipulado
- [correção] Valor de comissão é definido por acordo entre laboratório e clínica, registrado manualmente (não calculado por fórmula automática)
- [correção] Pedido de prótese pode ser descontinuado em qualquer etapa do fluxo

### ⚠️ PENDENTE (não definido ainda pelo usuário)
- ⚠️ Como a prótese se liga aos procedimentos "Avaliação/Consulta" e "Cirurgia Implante" (vínculo a agendamento/item do plano, ou só referência informativa)?
- ⚠️ Prótese pode envolver mais de um dente (ex: ponte)?
- ⚠️ A comissão de prótese entra no financeiro do Dashboard (Feature 019)?

---

## Notas

**Histórico:** 2026-10-02 — renumerada de 015 para 016; aplicadas decisões da análise de consistência (`context/ANALISE_SPECS.md`: ESC-11, INC-15). A regra antiga "[correção] alerta quando o prazo ultrapassa entre 15 e 30 dias" foi substituída pelo limite configurável.
