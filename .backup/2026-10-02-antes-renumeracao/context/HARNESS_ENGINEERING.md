# Harness Engineering — Especificações Técnicas de Desenvolvimento

**Projeto:** Agendamento Odontológico
**Metodologia:** SDD (Spec-Driven Development)
**Status:** Stack e ferramental de desenvolvimento 100% definidos — pronto para iniciar Harness (testes + exemplos + código)

---

## 1. Stack Técnico (decidido)

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15.x |
| Linguagem | TypeScript |
| Banco de dados | PostgreSQL |
| Backend como Serviço (BaaS) | Supabase (cliente direto, sem ORM) |
| Arquitetura | Monolito Modular |
| Hospedagem | Vercel |
| Framework de testes | Vitest |
| Ambiente de banco de teste | PostgreSQL local via Docker |
| Gerenciador de pacotes | pnpm |
| Runtime | Node.js 20.x LTS |
| Biblioteca de validação | Zod |

⚠️ **Motivo do stack atual:** o time optou por Next.js/Supabase após constatar que nenhum integrante do grupo tem conhecimento necessário para acompanhar o desenvolvimento em PHP (stack anterior — Laravel/Filament — foi descartada).

Nenhuma pendência de ferramenta de desenvolvimento em aberto (ver Seção 8).

---

## 2. Arquitetura: Monolito Modular

Cada **feature das specs (001–019)** vira um **módulo isolado** dentro da aplicação Next.js, evitando acoplamento entre domínios.

### 2.1 Estrutura de diretórios proposta

```
src/
├── modules/
│   ├── autenticacao/          (Feature 001)
│   │   ├── services/
│   │   ├── types/
│   │   └── components/
│   ├── clinica/                (Feature 002)
│   ├── dentistas/               (Feature 003)
│   ├── pacientes/               (Feature 004)
│   ├── procedimentos/           (Feature 005)
│   ├── agendamento/             (Feature 006)
│   ├── agenda/                  (Feature 007)
│   ├── cancelamento/            (Feature 008)
│   ├── reagendamento/           (Feature 009)
│   ├── prontuario/              (Feature 010)
│   ├── odontograma/             (Feature 011)
│   ├── plano-tratamento/        (Feature 012)
│   ├── documentos/              (Feature 013)
│   ├── imagens/                 (Feature 014)
│   ├── protese/                 (Feature 015)
│   ├── estoque/                 (Feature 016)
│   ├── notificacoes/            (Feature 017)
│   ├── dashboard/                (Feature 018)
│   └── comunicacao-externa/     (Feature 019)
│
├── app/                          (rotas Next.js — App Router)
└── lib/                           (infraestrutura compartilhada: cliente Supabase, utilitários)

supabase/
└── migrations/                    (uma migration por tabela, agrupada por módulo)

tests/
├── unit/
│   └── modules/<nome-do-modulo>/
├── integration/
│   └── modules/<nome-do-modulo>/
└── examples/                      (harness/exemplos executáveis)
    └── modules/<nome-do-modulo>/

specs/
├── README.md
└── FEATURE
    └──FEATURE_NNN_Nome.md        (já existentes — 19 specs)
```

Cada módulo é **auto-contido**: services (regra de negócio), types, componentes e testes vivem juntos por domínio, não por "tipo técnico" espalhado.

### 2.2 Regra de dependência entre módulos
- Um módulo pode depender de outro **apenas via service/função pública exportada** (nunca acessando o acesso a dados interno de outro módulo diretamente), preservando o isolamento do "modular".
- As dependências específicas entre features (quem depende de quem) estão documentadas nas specs de cada feature, não neste arquivo.

---

## 3. Convenções de Código

- **Nomenclatura em português** para conceitos de domínio (`Agendamento`, `Paciente`, `Dentista`) — consistente com as specs já escritas — e em inglês apenas para termos técnicos genéricos do framework (`service`, `component`, `hook`).
- **Tipos/Enums** para representar valores fechados sempre que uma spec definir um conjunto fixo de estados.
- **Validação de entrada** centralizada por caso de uso, espelhando as validações descritas em cada spec.
- **Controle de autorização por papel** (hierarquia definida na Feature 001) centralizado, sem checagem de permissão solta em componente/service.
- **Validação com Zod**: schemas definidos junto ao módulo do domínio, com tipos TypeScript inferidos do schema (`z.infer`).

---

## 4. Padrão de Testes

- **1 arquivo de teste por feature**, espelhando os Cenários da spec correspondente (`FEATURE_NNN.test.ts` para cada `FEATURE_NNN_Nome.md`).
- Nomenclatura de teste: descrição do "Cenário 1", "Cenário 2" etc. da spec, mapeada 1:1.
- **Testes de integração** para fluxos completos (rota/API + banco).
- **Testes unitários** para regras de negócio isoladas nos services de cada módulo.
- **Seeds/fixtures** para cada entidade, usadas tanto nos testes quanto nos exemplos.
- Suite: **Vitest**, rodando contra um **PostgreSQL local via Docker** (banco isolado do Supabase de produção).

---

## 5. Padrão de Exemplos (Harness)

- Cada exemplo é um **script executável isolado**, não apenas um trecho de código estático.
- Segue a seção "Exemplos de Código" já presente em cada uma das 19 specs, adaptada para a API real do Supabase/Next.js.
- Objetivo: rodar o exemplo e ver o resultado real no banco — validação prática antes do teste formal.

---

## 6. Banco de Dados (PostgreSQL via Supabase)

- Migrations do Supabase como fonte da verdade do schema (versionadas no repositório, não editadas manualmente pelo painel do Supabase).
- Uso de **UUID** como chave primária em todas as tabelas de domínio, por convenção do projeto.
- Constraints de banco (foreign keys, unique, checks) são derivadas das regras de cada spec no momento da migration daquela feature — não são antecipadas aqui.

---

## 7. Ordem Recomendada de Implementação do Harness

Seguindo o roadmap MVP → V1 → V1.5 já definido:

1. Migrations + schema base (001–006)
2. Exemplos por feature do MVP
3. Testes por feature do MVP
4. Rotas/UI por feature do MVP
5. Repetir o ciclo para V1 (007–012) e V1.5 (013–019)

---

## 8. Ferramentas de Desenvolvimento (decidido)

Todas as pendências de ferramental foram resolvidas:

| Item | Decisão |
|---|---|
| Hospedagem | Vercel |
| Framework de testes | Vitest |
| Ambiente de banco de teste | PostgreSQL local via Docker |
| Gerenciador de pacotes | pnpm |
| Versões | Node.js 20.x LTS + Next.js 15.x |
| Biblioteca de validação | Zod |
| Linguagem | TypeScript |
| Acesso ao Postgres | Cliente Supabase direto (sem ORM) |

## 9. Pendências Deixadas para Depois

Estas dependem de decisões de negócio ainda não tomadas em suas respectivas specs, então não são resolvidas neste arquivo:

- Storage de arquivos (Raio X — Feature 014, Documentos — Feature 013): decisão será tomada junto com a spec dessas features.
- Escopo do uso do Supabase além do Postgres (Auth, Storage, Realtime): depende de como as Features 001 e 014 forem detalhadas.
- Provedores externos (email, SMS/WhatsApp, assinatura digital): já registrados como pendências de negócio nas próprias specs.

---

*Este arquivo documenta apenas estrutura técnica de desenvolvimento — nenhuma regra de negócio das specs é repetida ou assumida aqui.*
