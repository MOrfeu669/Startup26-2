# Specs — Agendamento Odontológico

Índice das features especificadas com SDD. Cada spec fica em `FEATURES/FEATURE_NNN_Nome.md` e é a fonte de verdade das regras de negócio (ver `AGENTS.md`).

- Ordem de implementação: MVP (001–006) → V1 (007–013) → V1.5 (014–020), uma feature por vez.
- Ciclo por feature: Spec → Migration → Exemplo → Teste → Código → Rota/UI.
- Análise de consistência e decisões de 2026-10-02: `context/ANALISE_SPECS.md`.

## Roadmap

| # | Feature | Fase | Status | Dependências |
|---|---|---|---|---|
| 001 | [Autenticação & Roles](FEATURES/FEATURE_001_Autenticacao.md) | MVP | 🟡 Em Definição | — |
| 002 | [Criar/Configurar Clínica](FEATURES/FEATURE_002_Criar_Configurar_Clinica.md) | MVP | 🟡 Em Definição | 001 |
| 003 | [Cadastro de Dentistas](FEATURES/FEATURE_003_Cadastro_Dentistas.md) | MVP | 🟡 Em Definição | 001, 002 |
| 004 | [Cadastro de Pacientes](FEATURES/FEATURE_004_Cadastro_Pacientes.md) | MVP | 🟡 Em Definição | 001, 002 |
| 005 | [Criar Procedimento](FEATURES/FEATURE_005_Criar_Procedimento.md) | MVP | 🟡 Em Definição | 001 (017 complementar) |
| 006 | [Criar Agendamento](FEATURES/FEATURE_006_Criar_Agendamento.md) | MVP | 🟡 Em Definição | 001, 002, 003, 004 (005 e 012 opcionais) |
| 007 | [Visualizar Agenda](FEATURES/FEATURE_007_Visualizar_Agenda.md) | V1 | 🟡 Em Definição | 002, 003, 006 |
| 008 | [Cancelar Agendamento](FEATURES/FEATURE_008_Cancelar_Agendamento.md) | V1 | 🟡 Em Definição | 006, 009, 011, 018 (interface temporária) |
| 009 | [Reagendamento Automático](FEATURES/FEATURE_009_Reagendamento_Automatico.md) | V1 | 🟡 Em Definição | 006, 008, 018 (interface temporária) |
| 010 | [Prontuário Básico](FEATURES/FEATURE_010_Prontuario_Basico.md) | V1 | 🟡 Em Definição | 004, 006 (integra 011, 012, 017) |
| 011 | [Odontograma](FEATURES/FEATURE_011_Odontograma.md) | V1 | 🟡 Em Definição | 005, 008, 010, 012 (integra 015, 016) |
| 012 | [Plano de Tratamento](FEATURES/FEATURE_012_Plano_Tratamento.md) | V1 | 🟡 Em Definição | 004, 005, 006, 010, 011 |
| 013 | [Débitos](FEATURES/FEATURE_013_Debitos.md) | V1 | 🔴 A especificar | 012 (demais pendentes) |
| 014 | [Documentos](FEATURES/FEATURE_014_Documentos.md) | V1.5 | 🟡 Em Definição | 001, 004, 010 |
| 015 | [Raio X & Imagens](FEATURES/FEATURE_015_RaioX_Imagens.md) | V1.5 | 🟡 Em Definição | 010, 011 |
| 016 | [Controle de Prótese](FEATURES/FEATURE_016_Controle_Protese.md) | V1.5 | 🟡 Em Definição | 004, 005, 011, 018 |
| 017 | [Controle de Estoque](FEATURES/FEATURE_017_Controle_Estoque.md) | V1.5 | 🟡 Em Definição | 001, 005, 010, 012, 018, 019 |
| 018 | [Notificações Internas](FEATURES/FEATURE_018_Notificacoes_Internas.md) | V1.5 | 🟡 Em Definição | 002, 003, 006, 008, 009, 016, 017, 020 |
| 019 | [Dashboard & Alertas](FEATURES/FEATURE_019_Dashboard_Alertas.md) | V1.5 | 🟡 Em Definição | 005, 006, 012, 017, 018 (016 pendente) |
| 020 | [Comunicação Externa ao Paciente](FEATURES/FEATURE_020_Comunicacao_Externa.md) | V1.5 | 🟡 Em Definição | 004, 006, 008, 009, 014, 018 |

## Dependências que apontam para frente

Algumas features dependem de outras de fase posterior. Regra adotada:

- **MVP:** o Cenário testa só a parte da feature atual; o restante vira `it.todo` (ex: 006 Cenário 9, concluir pela Evolução da 010).
- **V1 → V1.5:** usa-se uma interface temporária, substituída quando a feature real existir (ex: 008/009 → Notificações 018; 010 → baixa de Estoque 017).
- **Bidirecionais documentadas:** 008 ↔ 011 (reversão de odontograma), 008 ↔ 009 (reagendar após cancelar), 017 ↔ 019 e 018 ↔ 019 (alertas).

## Convenções da spec

- `[stated]`: dito pelo Bernardo, fonte de verdade.
- `[correção]`: ajuste vindo de análise, aprovado.
- `⚠️ PENDENTE`: não definido; não implementar por suposição.
- Linha `**Histórico:**` nas Notas: registra mudanças aplicadas e os IDs da análise correspondente.
