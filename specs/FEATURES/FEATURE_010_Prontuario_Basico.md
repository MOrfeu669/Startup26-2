# Feature 010: Prontuário Básico

**Status:** 🟡 Em Definição
**Fase:** V1
**Complexidade:** 🟡 Média
**Dependências:** Feature 004, Feature 006 — integra com Feature 011, Feature 012 e Feature 017

---

## Contexto

O Prontuário é o registro central de tudo relacionado a um paciente. Esta feature cobre a parte "básica": complementa a Visão Geral (já criada na Feature 004) com Anamnese, Evolução (relatório de texto) e Histórico de Consultas. As partes mais complexas do prontuário (Odontograma, Raio X, Documentos, Débitos) são especificadas em features próprias (011, 015, 014 e 013).

---

## Requisitos

- [ ] Prontuário reúne: Visão Geral (Feature 004), Anamnese, Histórico de Consultas, Evolução
- [ ] Apenas o Dentista (ou o Admin, pela hierarquia da Feature 001) pode preencher a Anamnese
- [ ] Anamnese pode ser editada livremente pelo Dentista; toda alteração fica registrada na trilha de auditoria (quem alterou e o que mudou), sem exigir justificativa adicional
- [ ] Histórico de Consultas é populado automaticamente a partir dos agendamentos do paciente, incluindo consultas canceladas (com a respectiva data)
- [ ] Evolução é um relatório de texto livre, registrado pelo Dentista (ou Admin), e é OBRIGATÓRIA para concluir um atendimento
- [ ] **Salvar a Evolução conclui o atendimento automaticamente** (status `concluido`, Feature 006) — não existe ação separada de "concluir"
- [ ] Ao concluir, o sistema:
  - dá baixa dos materiais dos procedimentos executados no atendimento — procedimento avulso ou itens do Plano de Tratamento (Feature 017; no V1, via interface temporária);
  - marca como concluídos os itens do Plano de Tratamento executados naquele agendamento (Feature 012)
- [ ] Trilha de auditoria cobre Anamnese, Evolução, Documentos (Feature 014) e registros do Odontograma (Feature 011), e é acessível apenas pelo Admin
- [ ] No MVP/V1, todos os papéis podem editar a **Visão Geral** do prontuário (Feature 004); as seções clínicas seguem as regras de cada feature

---

## Cenários

### Cenário 1: Dentista preenche Anamnese
```
Dado um paciente com prontuário existente
Quando o Dentista preenche a anamnese com histórico de saúde do paciente
Então o sistema salva a anamnese vinculada ao paciente
```

### Cenário 2: Recepcionista tenta preencher Anamnese
```
Dado uma Recepcionista autenticada
Quando ela tenta preencher a anamnese de um paciente
Então o sistema bloqueia a ação, pois é exclusiva do Dentista (ou Admin)
```

### Cenário 3: Histórico de consultas populado automaticamente (incluindo canceladas)
```
Dado um paciente com 3 consultas realizadas e 1 consulta cancelada
Quando qualquer usuário abre o prontuário desse paciente
Então vê as 3 consultas concluídas e a consulta cancelada no Histórico, cada uma com sua respectiva data
```

### Cenário 4: Salvar a evolução conclui a consulta
```
Dado uma consulta com status "iniciado"
Quando o Dentista escreve e salva o relatório de evolução
Então o sistema salva o texto de evolução vinculado àquela consulta específica no prontuário
E muda automaticamente o status do agendamento para "concluido" (Feature 006)
```

### Cenário 4b: Tentativa de salvar evolução vazia
```
Dado uma consulta com status "iniciado"
Quando o Dentista tenta salvar a evolução sem texto
Então o sistema bloqueia a ação e exige o preenchimento da evolução
E o agendamento permanece com status "iniciado"
```

### Cenário 5: Registrar alteração na trilha de auditoria
```
Dado uma anamnese já registrada para um paciente
Quando o Dentista atualiza o conteúdo da anamnese
Então o sistema mantém o registro anterior no histórico de auditoria, com autor, data/hora e conteúdo alterado
E o prontuário passa a exibir a versão mais recente
```

---

## Exemplos de Código

```typescript
interface Prontuario {
  paciente_id: string;
  anamnese?: Anamnese;
  historico_consultas: HistoricoConsulta[]; // derivado de Feature 006, inclui canceladas
  evolucoes: Evolucao[];
}

interface Anamnese {
  conteudo: string;
  preenchido_por: string; // usuario_id — Dentista ou Admin
  atualizado_em: string;
}

interface RegistroAuditoria {
  id: string;
  entidade: 'anamnese' | 'evolucao' | 'documento' | 'odontograma'; // ver Features 011 e 014
  entidade_id: string;
  usuario_id: string;
  acao: 'criacao' | 'edicao';
  conteudo_anterior?: string;
  registrado_em: string;
}

interface Evolucao {
  agendamento_id: string;
  texto: string; // obrigatório; salvar conclui o atendimento
  registrado_por: string; // usuario_id — Dentista ou Admin
  registrado_em: string;
}

// Exemplo de uso esperado — salvar a evolução conclui o atendimento
await prontuarioService.registrarEvolucao({
  agendamento_id: 'agendamento-020',
  texto: 'Paciente relatou sensibilidade após procedimento. Recomendado retorno em 30 dias.',
  registrado_por: 'dentista-005'
});
```

---

## Dependências

- Feature 004 (Cadastro de Pacientes) — Visão Geral já existente
- Feature 006 (Criar Agendamento) — fonte do Histórico de Consultas; esta feature fornece o gatilho de conclusão
- Feature 011 (Odontograma) — edições do odontograma entram na trilha de auditoria
- Feature 012 (Plano de Tratamento) — itens executados são marcados como concluídos
- Feature 017 (Controle de Estoque) — baixa de materiais na conclusão; no V1 via interface temporária

---

## Regras de Negócio

- [stated] MVP: Todos podem criar prontuário; Admin gerencia permissões específicas em versões futuras
- [stated] "Todos podem criar/editar o prontuário" vale apenas para a Visão Geral (Feature 004)
- [stated] Anamnese: exclusiva do Dentista
- [stated] Pela hierarquia piramidal (Feature 001), o Admin pode tudo que o Dentista pode — inclusive Anamnese e Evolução
- [stated] Evolução: relatório de texto, registrado pelo Dentista
- [stated] Salvar a Evolução é o gatilho que conclui o atendimento (status `concluido`, Feature 006); não há ação separada de concluir
- [stated] A conclusão dispara a baixa de materiais (Feature 017) dos procedimentos executados — avulso ou itens do plano
- [correção] Alterações em Anamnese, Evolução e Documentos (Feature 014) geram registro de auditoria (usuário, data/hora, ação, conteúdo alterado)
- [stated] Edições em registros do Odontograma (Feature 011) também geram registro de auditoria
- [correção] Anamnese pode ser editada livremente pelo Dentista, sem exigir justificativa — a rastreabilidade vem do registro de auditoria
- [correção] Histórico de Consultas exibe também consultas canceladas, com sua data
- [correção] Evolução é obrigatória para concluir um atendimento
- [correção] Trilha de auditoria é acessível apenas pelo Admin

### ⚠️ PENDENTE (não definido ainda pelo usuário)
- ⚠️ A Evolução pode ser editada depois de salva (o atendimento já estará concluído)? Se sim, a edição já entra na auditoria (`entidade: 'evolucao'`)
- ⚠️ O que acontece se a baixa na conclusão encontrar estoque insuficiente (bloqueia a conclusão, permite saldo negativo ou só alerta)? Ver Feature 017

---

## Notas

**Histórico:** 2026-10-02 — aplicadas decisões da análise de consistência (`context/ANALISE_SPECS.md`: INC-02, INC-04, INC-05, INC-08, ESC-06). O Cenário 4b passou de "concluir sem evolução" para "salvar evolução vazia", já que não existe mais ação separada de concluir.
