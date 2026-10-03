# Feature 010: Prontuário Básico

**Status:** 🟡 Em Definição
**Fase:** V1
**Complexidade:** 🟡 Média
**Dependências:** Feature 004, Feature 006

---

## Contexto

O Prontuário é o registro central de tudo relacionado a um paciente. Esta feature cobre a parte "básica": complementa a Visão Geral (já criada na Feature 004) com Anamnese, Evolução (relatório de texto) e Histórico de Consultas. As partes mais complexas do prontuário (Odontograma, Raio X, Documentos, Débitos) são especificadas em features próprias.

---

## Requisitos

- [ ] Prontuário reúne: Visão Geral (Feature 004), Anamnese, Histórico de Consultas, Evolução
- [ ] Apenas o Dentista pode preencher a Anamnese
- [ ] Anamnese pode ser editada livremente pelo Dentista; toda alteração fica registrada na trilha de auditoria (quem alterou e o que mudou), sem exigir justificativa adicional
- [ ] Histórico de Consultas é populado automaticamente a partir dos agendamentos do paciente, incluindo consultas canceladas (com a respectiva data)
- [ ] Evolução é um relatório de texto livre, registrado pelo Dentista, e é OBRIGATÓRIA para concluir um atendimento (transição para status "concluído", Feature 006)
- [ ] Trilha de auditoria é acessível apenas pelo Admin
- [ ] No MVP/V1, todos os papéis podem criar/editar o prontuário (regra temporária, ver Regras de Negócio)

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
Então o sistema bloqueia a ação, pois é exclusiva do Dentista
```

### Cenário 3: Histórico de consultas populado automaticamente (incluindo canceladas)
```
Dado um paciente com 3 consultas realizadas e 1 consulta cancelada
Quando qualquer usuário abre o prontuário desse paciente
Então vê as 3 consultas concluídas e a consulta cancelada no Histórico, cada uma com sua respectiva data
```

### Cenário 4: Dentista registra evolução ao concluir a consulta
```
Dado uma consulta com status "iniciado"
Quando o Dentista finaliza o atendimento e escreve o relatório de evolução
Então o sistema muda o status do agendamento para "concluído" (Feature 006)
E salva o texto de evolução vinculado àquela consulta específica no prontuário
```

### Cenário 4b: Tentativa de concluir sem evolução
```
Dado uma consulta com status "iniciado"
Quando o Dentista tenta marcar a consulta como "concluído" sem escrever a evolução
Então o sistema bloqueia a ação e exige o preenchimento da evolução
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
  preenchido_por: string; // sempre um dentista_id
  atualizado_em: string;
}

interface RegistroAuditoria {
  id: string;
  entidade: 'anamnese' | 'evolucao' | 'documento'; // ver também Feature 013
  entidade_id: string;
  usuario_id: string;
  acao: 'criacao' | 'edicao';
  conteudo_anterior?: string;
  registrado_em: string;
}

interface Evolucao {
  agendamento_id: string;
  texto: string;
  registrado_por: string; // dentista_id
  registrado_em: string;
}

// Exemplo de uso esperado
await prontuarioService.registrarEvolucao({
  agendamento_id: 'agendamento-020',
  texto: 'Paciente relatou sensibilidade após procedimento. Recomendado retorno em 30 dias.',
  registrado_por: 'dentista-005'
});
```

---

## Dependências

- Feature 004 (Cadastro de Pacientes) — Visão Geral já existente
- Feature 006 (Criar Agendamento) — fonte do Histórico de Consultas

---

## Regras de Negócio

- [stated] MVP: Todos podem criar prontuário; Admin gerencia permissões específicas em versões futuras
- [stated] Anamnese: exclusiva do Dentista
- [stated] Evolução: relatório de texto, registrado pelo Dentista
- [correção] Registrar a Evolução é o que dispara a transição do agendamento para o status "concluído" (Feature 006), que por sua vez alimenta o Histórico de Consultas
- [correção] Alterações em Anamnese, Evolução e Documentos (Feature 013) geram registro de auditoria (usuário, data/hora, ação, conteúdo alterado)
- [correção] Anamnese pode ser editada livremente pelo Dentista, sem exigir justificativa — a rastreabilidade vem do registro de auditoria
- [correção] Histórico de Consultas exibe também consultas canceladas, com sua data
- [correção] Evolução é obrigatória para concluir um atendimento
- [correção] Trilha de auditoria é acessível apenas pelo Admin
