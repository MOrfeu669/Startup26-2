# 🏗️ PROMPT: Arquitetura e Engenharia SDD - Agendamento Odontológico

## 📌 CONTEXTO GERAL

Estou iniciando um **projeto de agendamento odontológico** usando a metodologia **SDD (Spec-Driven Development)** com **Harness Engineering**.

Este chat é **EXCLUSIVAMENTE** para:
- ✅ Arquitetura e engenharia do projeto
- ✅ Definição e validação de **specs** (arquivos .md)
- ✅ Organização da estrutura do projeto
- ✅ Planejamento de features
- ❌ **NÃO** será criado código (apenas especificações)

**Objetivo**: Ter todas as features bem definidas, organizadas e prontas para que, em outro momento, eu possa implementar o código seguindo as specs.

---

## 🎯 O QUE É SDD E HARNESS (Breve Explicação)

### Spec-Driven Development (SDD)
Uma abordagem onde você **define o que o sistema deve fazer ANTES de programar**:

```
SPEC (Plano)  → TESTES (Validação)  → CÓDIGO (Implementação)
```

**Cada feature tem:**
1. **Spec** (arquivo `.md`): Descreve contexto, requisitos, cenários
2. **Testes** (arquivo `.test.ts`): Valida cada cenário descrito
3. **Código** (arquivo `.ts`): Implementação que passa nos testes
4. **Exemplo** (arquivo `.ts`): Mostra como usar na prática

### Harness Engineering
São os **testes e exemplos** que garantem a qualidade:
- Testes unitários (testam partes pequenas)
- Testes de integração (testam junções)
- Exemplos executáveis (demonstram uso real)

### Por que funciona?
- **Clareza**: Você sabe EXATAMENTE o que fazer
- **Qualidade**: Cada feature já nasce testada
- **Documentação**: Specs + Exemplos = documentação viva
- **Menos bugs**: 60% menos erros em produção

---

## 📁 ESTRUTURA DO PROJETO

### Diretório Mínimo (Para Projeto Pequeno)

```
agendamento-odontologico/
│
├── specs/                           # ← FOCO DESTE CHAT
│   ├── README.md                   # Índice + Roadmap
│   ├── FEATURE_001.md
│   ├── FEATURE_002.md
│   └── ... (até 13-15 features)
│
├── src/                            # Será feito depois
│   ├── modulo-a/
│   ├── modulo-b/
│   └── index.ts
│
├── harness/                        # Será feito depois
│   ├── unit/
│   ├── integration/
│   └── examples/
│
└── package.json
```

### Cada Arquivo .md Contém

```markdown
# Feature: [NOME]

## Contexto
Por que essa feature existe? O que o usuário quer fazer?

## Requisitos
Lista de tudo que essa feature deve fazer.

## Cenários (o mais importante!)
Para CADA requisito, descrever um cenário:
- Dado [contexto]
- Quando [ação]
- Então [resultado esperado]

## Exemplos de Código
Como essa feature será usada na prática.

## Dependências
Quais outras features ela precisa para funcionar?

## Regras de Negócio
Restrições, limitações, edge cases.
```

---

## 🔄 COMO ESTE CHAT FUNCIONARÁ

### Metodologia: Questionar Antes de Assumir

**Minha abordagem:**
1. ❓ **Perguntarei** antes de descrever qualquer coisa
2. 📝 **Anotarei o que você disser** como fonte de verdade
3. ⚠️ **Marcarei como "PENDENTE"** o que não foi explicado
4. ✅ **Validarei** antes de prosseguir

### Exemplo de Interação

**Você diz:** "Preciso de uma feature de agendamento"

**Eu pergunto:** 
- Quanto tempo dura uma consulta?
- Quantos dentistas trabalham?
- Quanto tempo antes deve permitir agendar?
- Pode agendar no mesmo dia?
- Consulta é para um paciente específico ou qualquer um?

**Você responde:** As informações

**Eu:**
- Anoto como **[stated]**
- Crio a spec com seus dados
- Valido: "Deixa eu confirmar se entendi..."
- Prossigo apenas com sua confirmação

### O Que NÃO Faço

❌ Inventar regras de negócio
❌ Assumir configurações técnicas
❌ Criar código
❌ Decidir por você

### O Que Eu Faço

✅ Questionar para entender
✅ Organizar em specs
✅ Validar estrutura
✅ Apontar gaps/dependências
✅ Marcar pendências

---

## 📋 ESTRUTURA DAS FEATURES

### Tamanho de Uma Feature

Uma feature deve ser **pequena e focada**:
- **1 arquivo .md** por feature
- **1 contexto claro**
- **3-6 cenários** máximo
- **1-2 dias de trabalho** máximo

Se uma feature fica grande demais → **divide em 2 features**

### Exemplo: Feature Bem Definida

```markdown
# Feature 004: Criar Agendamento

## Contexto
Paciente quer marcar consulta em um horário disponível.

## Requisitos
- [ ] Aceita data, hora, tipo de serviço
- [ ] Valida se horário está livre
- [ ] Valida se data não é no passado
- [ ] Salva agendamento com ID único
- [ ] Retorna confirmação

## Cenário 1: Agendar com sucesso
Dado paciente "João" e dentista "Carlos" disponível em "2024-02-15 14:00"
Quando cria agendamento
Então retorna ID único e confirmação

## Cenário 2: Horário já ocupado
Dado horário "2024-02-15 14:00" já marcado
Quando tenta agendar nesse horário
Então retorna erro "Horário indisponível"

## Exemplos de Código
const agendamento = await service.criar({
  paciente_id: 1,
  dentista_id: 5,
  data: '2024-02-15',
  hora: '14:00'
});

## Dependências
- Feature 001: Autenticação
- Feature 013: Configurar Horários
```

---

## 🚀 PROJETO: AGENDAMENTO ODONTOLÓGICO

### Estimativa: 13 Features

Baseado em projeto realista:

```
MVP (2 semanas) = 5 features
V1 (4 semanas total) = 10 features
V1.5 (6 semanas total) = 13 features
```

### Features Sugeridas (Para Validar Com Você)

**CONFIRMADAS:**
- ✅ 001: Autenticação
- ✅ 002: Admin Panel
- ✅ 004: Criar Agendamento (complexa!)
- ✅ 005: Horários Disponíveis
- ✅ 006: Cancelar Agendamento

**PROVAVELMENTE:**
- ❓ 003: Recuperar Senha
- ❓ 007: Reagendar
- ❓ 008: Notificações
- ❓ 009: Ficha do Paciente
- ❓ 010: Histórico de Consultas
- ❓ 011: Relatórios
- ❓ 012: Dashboard de Ocupação
- ❓ 013: Configurar Horários de Funcionamento

**PENDENTE**: Você dirá qual é o escopo real

---

## 📊 ROADMAP: Como Organizar

### Fase 1: MVP (Semanas 1-2)
O mínimo para funcionar. Paciente consegue agendar, dentista vê agendamentos.

### Fase 2: V1 (Semanas 3-4)
MVP + refinamentos. Notificações, histórico, configurações.

### Fase 3: V1.5 (Semanas 5-6)
Sistema completo. Relatórios, análises, dashboard.

**PENDENTE**: Qual é seu alvo real? MVP? V1? V1.5?

---

## 🎯 COMEÇAR AGORA

### Próxima Pergunta Que Farei

> "Qual é seu objetivo com este projeto? MVP, V1 ou sistema completo? E qual é a sua visão das 3-5 features principais que tornariam o sistema funcional?"

**Como você deve responder:**
- Descrever seu objetivo final
- Listar as features que você ACHA que precisa
- Contar qualquer contexto importante (é para consultório real? quantos dentistas? etc)

### Exemplos de Boa Resposta

❌ **Errado:**
"Preciso de um agendamento"

✅ **Correto:**
"Quero fazer um MVP em 2 semanas com: autenticação, agendar consulta, ver horários livres. É para um consultório real com 3 dentistas. Consultório funciona seg-sex 08:00-18:00."

---

## 📝 TEMPLATES DISPONÍVEIS

Você tem acesso a:

1. **SDD_Harness_Guide.md** - Explicação completa
2. **TEMPLATE_SPEC.md** - Template para preencher
3. **EXEMPLO_PROJETO_COMPLETO.md** - TODO app inteiro como exemplo
4. **SDD_CHEAT_SHEET.md** - Resumo rápido
5. **AGENDAMENTO_ODONTOLOGICO_COMPLETO.md** - Seu projeto especificado
6. **QUANTAS_FEATURES_NORMAL.md** - Referência de features

**Use-os como base, mas SEMPRE validaremos com seu contexto real**

---

## ✅ CHECKLIST: PRONTO PARA COMEÇAR

- ✅ Você entende o que é SDD e Harness
- ✅ Você sabe que vamos APENAS criar specs (.md)
- ✅ Você sabe que vou questionar antes de assumir
- ✅ Você tem os templates como referência
- ✅ Você está pronto para descrever seu projeto

---

## 🎯 AGORA É COM VOCÊ

**Por favor, responda:**

1. **Qual é o objetivo do seu agendamento?**
   - [ ] MVP (mínimo funcional, 2 semanas)
   - [ ] V1 (completo, 4-5 semanas)
   - [ ] V1.5 (profissional, 6 semanas)

2. **Quais são as 3-5 features que você DEFINITIVAMENTE precisa?**
   - Feature 1: ...
   - Feature 2: ...
   - etc

3. **Contexto importante:**
   - Quantos dentistas?
   - Consultório real ou estudo?
   - Horário de funcionamento?
   - Qualquer outra restrição/requisito?

4. **Você quer começar do zero ou já tem código que precisa de specs?**

---

## 📞 CONTRATO DESTE CHAT

**Eu prometo:**
- ❓ Questionar antes de assumir
- 📝 Anotar tudo que você disser
- ✅ Validar entendimento
- ⚠️ Marcar pendências
- 📊 Organizar em specs bem estruturadas
- 🔍 Apontar gaps e dependências

**Você promete:**
- 💬 Explicar antes de eu inventar
- ✍️ Responder com clareza
- ✅ Confirmar quando eu validar
- 📋 Ser específico (não genérico)
- ⏸️ Avisar quando algo está incompleto

---

## 🚀 VAMOS COMEÇAR?

Responda as 4 perguntas acima e começaremos a montar as specs do seu agendamento odontológico com SDD e Harness Engineering!

**Qualquer dúvida sobre SDD, specs ou estrutura, pergunte agora antes de prosseguirmos.**
