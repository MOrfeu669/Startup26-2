# Feature 018: Dashboard & Alertas

**Status:** 🟡 Em Definição
**Fase:** V1.5
**Complexidade:** 🔴 Alta
**Dependências:** Feature 006, Feature 016, Feature 015, Feature 012 (Plano de Tratamento)

---

## Contexto

O Dashboard reúne dados cruzados de diferentes partes do sistema para dar uma visão geral da clínica: situação financeira, estoque, ocupação da agenda. É também onde aparecem os alertas de estoque crítico definidos na Feature 016 e outras notificações críticas (Feature 017).

Os dados financeiros do Dashboard têm origem no **Plano de Tratamento** (Feature 012): é lá que o Dentista seleciona quais procedimentos serão realizados no paciente e quanto cada um custará — é essa seleção que alimenta o faturamento exibido aqui.

---

## Requisitos

- [ ] Todos os papéis podem acessar o Dashboard
- [ ] Admin pode limitar/ocultar quais campos cada papel visualiza no Dashboard
- [ ] Usuário pode ocultar informações específicas do próprio Dashboard, para melhor visualização
- [ ] Dados financeiros são calculados a partir do Plano de Tratamento de cada paciente (Feature 012) — não de um valor solto por procedimento
- [ ] Exibir alerta vermelho para materiais em quantidade crítica (Feature 016), com nome do material e quantidade atual
- [ ] Exibir relatórios de ocupação da agenda, calculados com base no status "concluído" dos agendamentos (Feature 006)
- [ ] Exibir faturamento total, e também discriminado por dentista e por procedimento individualmente
- [ ] Período de exibição dos relatórios é configurável pelo usuário, conforme sua preferência de uso
- [ ] Relatórios podem ser exportados em PDF e Excel
- [ ] Layout do Dashboard é exibido em scrollview (rolagem vertical), dinâmico e responsivo a mudanças de dados

---

## Cenários

### Cenário 1: Ver alerta de estoque crítico
```
Dado o material "Luvas Descartáveis" abaixo da quantidade mínima (Feature 016)
Quando qualquer usuário abre o Dashboard
Então vê um alerta vermelho mostrando "Luvas Descartáveis — 15 unidades restantes"
```

### Cenário 2: Ver dados financeiros a partir do Plano de Tratamento
```
Dado planos de tratamento com procedimentos selecionados e seus valores (Feature 012) no período
Quando o usuário abre o Dashboard
Então vê o total faturado no período, calculado a partir desses planos de tratamento
```

### Cenário 3: Ver ocupação da agenda
```
Dado os agendamentos de todos os dentistas no mês, alguns com status "concluído", outros "cancelado"
Quando o usuário abre o Dashboard
Então vê a taxa de ocupação calculada com base nos agendamentos "concluídos" em relação à capacidade disponível
E agendamentos "cancelados" não contam como ocupação
```

### Cenário 4: Faturamento discriminado por dentista e procedimento
```
Dado faturamento registrado ao longo do mês
Quando o usuário consulta o detalhamento financeiro
Então pode visualizar o faturamento total, por dentista individualmente e por procedimento individualmente
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
    total_faturado: number; // derivado de Feature 012 (Plano de Tratamento)
    faturamento_por_dentista: Record<string, number>;
    faturamento_por_procedimento: Record<string, number>;
  };
  estoque: {
    materiais_criticos: MaterialCritico[];
  };
  ocupacao: {
    percentual_ocupado: number; // baseado em agendamentos "concluídos"
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

- Feature 006 (Criar Agendamento) — dados de ocupação
- Feature 017 (Notificações Internas) — alertas críticos exibidos também aqui
- Feature 016 (Controle de Estoque) — alertas de estoque crítico
- Feature 015 (Controle de Prótese) — custos/comissões, se aplicável ao financeiro
- Feature 012 (Plano de Tratamento) — origem dos dados financeiros

---

## Regras de Negócio

- [stated] Dashboard recebe dados cruzados para visualização
- [stated] Principais informações: Financeiro e Estoque
- [stated] Alerta de estoque mínimo em vermelho, com quantidade e nome do material
- [correção] Cálculo de ocupação usa o status "concluído" do agendamento (Feature 006) como referência de atendimento realizado; agendamentos cancelados são excluídos do cálculo
- [correção] Dados financeiros têm origem no Plano de Tratamento (Feature 012), não em um valor solto por procedimento
- [correção] Todos os papéis acessam o Dashboard; o Admin pode ocultar campos específicos por papel
- [correção] Cada usuário pode ocultar widgets/informações da própria visualização, sem afetar outros usuários
- [correção] Período de exibição é configurável pelo usuário
- [correção] Relatórios exportáveis em PDF e Excel
- [correção] Faturamento é exibido tanto no total geral quanto discriminado por dentista e por procedimento
- [correção] Layout em scrollview, dinâmico e responsivo a mudanças de dados
