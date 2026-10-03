# Feature 019: Dashboard & Alertas

**Status:** 🟡 Em Definição
**Fase:** V1.5
**Complexidade:** 🔴 Alta
**Dependências:** Feature 005, Feature 006, Feature 012 (Plano de Tratamento), Feature 017, Feature 018 — Feature 016 ⚠️ PENDENTE

---

## Contexto

O Dashboard reúne dados cruzados de diferentes partes do sistema para dar uma visão geral da clínica: situação financeira, estoque, ocupação da agenda. É também onde aparecem os alertas de estoque abaixo do mínimo definidos na Feature 017 e outras notificações críticas (Feature 018).

Os dados financeiros do Dashboard têm origem principal no **Plano de Tratamento** (Feature 012): cada item do plano concluído entra no faturamento na data da conclusão, pelo valor definido no plano. Procedimentos **avulsos** (fora do plano) concluídos também entram, pelo valor médio do procedimento (Feature 005).

---

## Requisitos

- [ ] Todos os papéis podem acessar o Dashboard
- [ ] Admin pode limitar/ocultar quais campos cada papel visualiza no Dashboard
- [ ] Usuário pode ocultar informações específicas do próprio Dashboard, para melhor visualização
- [ ] Alertas também podem ser ocultados no Dashboard, mas as notificações críticas continuam sempre visíveis no sino (Feature 018)
- [ ] Faturamento = itens do Plano de Tratamento concluídos (valor do item) + procedimentos avulsos concluídos (valor médio do procedimento), contabilizados na data de conclusão do atendimento
- [ ] Faturamento por dentista é atribuído ao dentista que **executou** o procedimento
- [ ] Exibir alerta vermelho para materiais abaixo da quantidade mínima (Feature 017), com nome do material e quantidade atual
- [ ] Exibir relatórios de ocupação da agenda, calculados com base nos agendamentos `concluido` (Feature 006) em relação à capacidade
- [ ] Capacidade = dentistas ativos × horas de funcionamento × dias de atendimento no período, descontados os bloqueios de agenda (Feature 006)
- [ ] Exibir faturamento total, e também discriminado por dentista e por procedimento individualmente
- [ ] Período de exibição dos relatórios é configurável pelo usuário, conforme sua preferência de uso
- [ ] Relatórios podem ser exportados em PDF e Excel
- [ ] Layout do Dashboard é exibido em scrollview (rolagem vertical), dinâmico e responsivo a mudanças de dados

---

## Cenários

### Cenário 1: Ver alerta de estoque abaixo do mínimo
```
Dado o material "Luvas Descartáveis" abaixo da quantidade mínima (Feature 017)
Quando qualquer usuário abre o Dashboard
Então vê um alerta vermelho mostrando "Luvas Descartáveis — 15 unidades restantes"
```

### Cenário 2: Ver faturamento a partir de procedimentos concluídos
```
Dado, no período, itens de Plano de Tratamento concluídos (Feature 012) e procedimentos avulsos concluídos
Quando o usuário abre o Dashboard
Então vê o total faturado no período: soma dos valores dos itens do plano concluídos + valor médio dos procedimentos avulsos concluídos
```

### Cenário 3: Ver ocupação da agenda
```
Dado os agendamentos de todos os dentistas no mês, alguns com status "concluido", outros "cancelado"
Quando o usuário abre o Dashboard
Então vê a taxa de ocupação calculada com base nos agendamentos "concluido" em relação à capacidade (dentistas ativos × horas × dias de atendimento, menos bloqueios de agenda)
E agendamentos "cancelado" não contam como ocupação
```

### Cenário 4: Faturamento discriminado por dentista e procedimento
```
Dado faturamento registrado ao longo do mês
Quando o usuário consulta o detalhamento financeiro
Então pode visualizar o faturamento total, por dentista individualmente (quem executou) e por procedimento individualmente
```

### Cenário 5: Configurar período de visualização
```
Dado o Dashboard aberto com período padrão (ex: mês atual)
Quando o usuário altera o período para "últimos 7 dias"
Então todos os widgets do Dashboard recalculam os dados para esse novo período
```

### Cenário 6: Exportar relatório
```
Dado um relatório financeiro exibido no Dashboard
Quando o usuário solicita exportação
Então o sistema gera o arquivo em PDF ou Excel, conforme escolhido
```

### Cenário 7: Admin limita visualização de campo para Recepcionista
```
Dado um Admin configurando permissões do Dashboard
Quando ele oculta o campo "Faturamento total" para o papel Recepcionista
Então usuários com papel Recepcionista deixam de ver esse campo específico, mantendo acesso aos demais
```

### Cenário 8: Ocultar widget para visualização pessoal
```
Dado um usuário com o Dashboard aberto
Quando ele oculta o widget de "Ocupação da agenda" para si mesmo
Então esse widget deixa de aparecer na sua própria visualização, sem afetar a de outros usuários
```

---

## Exemplos de Código

```typescript
interface DashboardResumo {
  clinica_id: string;
  periodo: { inicio: string; fim: string }; // configurável pelo usuário
  financeiro: {
    total_faturado: number; // itens do plano concluídos (Feature 012) + avulsos concluídos (valor médio)
    faturamento_por_dentista: Record<string, number>; // dentista que executou
    faturamento_por_procedimento: Record<string, number>;
  };
  estoque: {
    materiais_criticos: MaterialCritico[];
  };
  ocupacao: {
    percentual_ocupado: number; // concluídos / capacidade (dentistas ativos × horas × dias − bloqueios)
  };
}

interface MaterialCritico {
  material_id: string;
  nome: string;
  quantidade_atual: number;
  quantidade_minima: number;
}

interface ConfiguracaoVisibilidadeDashboard {
  clinica_id: string;
  papel: 'admin' | 'dentista' | 'recepcionista';
  campos_ocultos: string[]; // definido pelo Admin
}

interface PreferenciaDashboardUsuario {
  usuario_id: string;
  widgets_ocultos: string[]; // definido pelo próprio usuário
  periodo_padrao: string;
}

// Exemplo de uso esperado
const dashboard = await dashboardService.obterResumo({
  clinica_id: 'clinica-001',
  periodo: { inicio: '2026-10-01', fim: '2026-10-31' }
});

await dashboardService.exportar({
  clinica_id: 'clinica-001',
  periodo: { inicio: '2026-10-01', fim: '2026-10-31' },
  formato: 'pdf'
});
```

---

## Dependências

- Feature 005 (Criar Procedimento) — valor médio dos procedimentos avulsos
- Feature 006 (Criar Agendamento) — dados de ocupação, bloqueios de agenda e procedimentos avulsos concluídos
- Feature 012 (Plano de Tratamento) — origem principal dos dados financeiros
- Feature 017 (Controle de Estoque) — alertas de estoque abaixo do mínimo
- Feature 018 (Notificações Internas) — alertas críticos exibidos também aqui
- Feature 016 (Controle de Prótese) — ⚠️ PENDENTE: só se as comissões entrarem no financeiro

---

## Regras de Negócio

- [stated] Dashboard recebe dados cruzados para visualização
- [stated] Principais informações: Financeiro e Estoque
- [stated] Alerta de estoque mínimo em vermelho, com quantidade e nome do material
- [stated] Faturamento contabilizado por procedimento concluído: itens do Plano de Tratamento (valor do item) e procedimentos avulsos (valor médio do procedimento), na data da conclusão (substitui a regra anterior "financeiro vem só do Plano de Tratamento, não de valor solto")
- [stated] Faturamento por dentista é atribuído a quem executou o procedimento
- [stated] Capacidade de ocupação = dentistas ativos × horas de funcionamento × dias de atendimento, menos bloqueios de agenda
- [stated] Alertas podem ser ocultados no Dashboard; o sino (Feature 018) sempre mostra os críticos
- [correção] Cálculo de ocupação usa o status "concluido" do agendamento (Feature 006) como referência de atendimento realizado; agendamentos cancelados são excluídos do cálculo
- [correção] Todos os papéis acessam o Dashboard; o Admin pode ocultar campos específicos por papel
- [correção] Cada usuário pode ocultar widgets/informações da própria visualização, sem afetar outros usuários
- [correção] Período de exibição é configurável pelo usuário
- [correção] Relatórios exportáveis em PDF e Excel
- [correção] Faturamento é exibido tanto no total geral quanto discriminado por dentista e por procedimento
- [correção] Layout em scrollview, dinâmico e responsivo a mudanças de dados

### ⚠️ PENDENTE (não definido ainda pelo usuário)
- ⚠️ Comissões de prótese (Feature 016) entram no financeiro (como despesa, por exemplo)?
- ⚠️ Atendimentos de emergência retroativos contam na ocupação e no faturamento?
- ⚠️ Pagamentos recebidos (Feature 013, Débitos) aparecem no Dashboard além do faturamento?

---

## Notas

**Histórico:** 2026-10-02 — renumerada de 018 para 019; aplicadas decisões da análise de consistência (`context/ANALISE_SPECS.md`: PEN-03, INC-05, INC-11, INC-12, ESC-15, ESC-08).
