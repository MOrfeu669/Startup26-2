# Análise de Consistência das Specs (001–019)

**Data:** 2026-09-30
**Escopo:** as 19 specs em `specs/FEATURES/`, cruzadas com `context/Resumo.md`, `context/HARNESS_ENGINEERING.md` e `AGENTS.md`.
**Status:** decisões registradas como `[stated]` (2026-09-30 a 2026-10-02) e aplicadas em 2026-10-02 nas specs, em `AGENTS.md`, `context/Resumo.md`, `context/HARNESS_ENGINEERING.md` e `specs/README.md`. Backup do estado anterior: `.backup/2026-10-02-antes-renumeracao/`.

> **Atenção à numeração.** Este relatório usa a numeração **anterior** à inclusão da Feature 013 (Débitos). Nas specs atuais, as antigas 013–019 são 014–020. Por exemplo, "017" neste relatório corresponde à atual 018 (Notificações Internas).

## Por que este documento existe

No SDD, cada Cenário da spec vira um `it` no teste. Se duas specs se contradizem, os testes também se contradizem, e nenhum código consegue passar nos dois. Resolver agora, no papel, é mais barato do que descobrir durante a implementação.

## Como usar

- Cada achado tem um **ID**, um **tipo**, as **specs afetadas** (com as linhas), a **gravidade** e **opções** de resolução.
- Escolha uma opção (ou descreva outra) no campo **Decisão**. A resposta passa a valer como `[stated]`.
- Só depois de decidido, e **com pedido explícito**, as specs e os docs de contexto serão atualizados.

**Tipos**

| Sigla | Significado |
|---|---|
| `PEN` | Pendência que outra spec já responde ou contradiz |
| `INC` | Contradição entre specs, ou dentro da mesma spec |
| `ESC` | Inconsistência de escopo, fase ou stack, ou lacuna não marcada como pendente |
| `REF` | Referência cruzada errada (sobra das renumerações) |
| `DOC` | Divergência entre as specs e os docs de contexto |

**Gravidade**

| Nível | Significado |
|---|---|
| 🔴 MVP | Bloqueia ou distorce a implementação de 001–006 |
| 🟠 V1 | Bloqueia 007–012 |
| 🟡 V1.5 | Bloqueia 013–019 |
| ⚪ Cosmético | Não muda comportamento; só texto ou referência |

---

## 🔴 Prioridade: achados que bloqueiam o MVP (001–006)

Resolva estes antes de seguir com a migration e os testes de 002–006.

| ID | Resumo | Specs |
|---|---|---|
| [INC-01](#inc-01) | Ciclo de vida do agendamento: nasce `em_espera`, mas a 017 "muda para em espera"; os status "confirmado" e "cancelado" não existem | 006, 017, 002, 003, 008, 010, 016, 018, 019 |
| [INC-02](#inc-02) | "Admin tem acesso total" contra ações "exclusivas do Dentista"; papéis acumulados | 001, 004, 010, 011, 014 |
| [INC-03](#inc-03) | Responsável legal obrigatório para menor, mas a data de nascimento é opcional | 004 |
| [ESC-01](#esc-01) | 005 (MVP) tem cenários de reserva de estoque que dependem da 016 (V1.5); a 006 não menciona reserva | 005, 006, 016 |
| [ESC-02](#esc-02) | 001 modela `senha_hash` próprio, mas o uso de Supabase Auth está pendente | 001, HARNESS |
| [ESC-03](#esc-03) | "Compromisso extra" do dentista não tem entidade, dono nem regras | 006, 003 |
| [ESC-04](#esc-04) | 006 não diz se bloqueia cadeira inativa, dentista inativo ou dia sem atendimento | 006, 002, 003 |
| [ESC-05](#esc-05) | Cenários do MVP que dependem de features futuras (como testar agora) | 001, 002, 003, 006 |
| [INC-04](#inc-04) | Concluir atendimento: a Evolução é gatilho ou pré-requisito? (afeta o Cenário 9 da 006) | 006, 010 |

---

## 1. Pendências já respondidas ou contraditas por outra spec (`PEN`)

### PEN-01
**Transferência de paciente entre clínicas.** ⚪ Cosmético

- A pendência da 004 (linha 152) pergunta se o paciente pode ser transferido "se o sistema suportar múltiplas clínicas".
- A 001 já responde parte disso: o sistema é multi-tenant (linha 24) e bloqueia o acesso entre clínicas (Cenário 5, linhas 68–73).
- A 002 diz que um Admin gerencia uma clínica (linha 27).
- **Opções:**
  - **A)** Fechar a pendência: o cadastro é exclusivo da clínica e não há transferência.
  - **B)** Manter aberta como feature futura, reescrevendo a pergunta sem o "se o sistema suportar".
- **Decisão:** `[stated]` Os pacientes são **exclusivos da clínica**, sem transferência direta. A lista de cadastros de pacientes pode ser **exportada e importada**.
  - Isso amplia a regra da 004 (linha 149), que hoje fala só em exportação futura.
  - ⚠️ PENDENTE:
    - em que fase entram a exportação e a importação (a 004 diz "versão futura");
    - o formato do arquivo;
    - o que a importação faz com um CPF que já existe na clínica de destino (a regra de CPF único bloqueia);
    - se a importação leva só a Visão Geral ou também dados clínicos.

### PEN-02
**Reverter um procedimento já confirmado ao cancelar.** 🟠 V1

- A pendência da 008 (linha 121) pergunta se existe uma ação formal de "reverter procedimento".
- A 011 já responde para o odontograma: o registro ganha o status `revertido` (requisito na linha 25; Cenário 5 nas linhas 61–67).
- **Contradição:**
  - O requisito da 008 (linha 24) diz que o cancelamento "apenas sinaliza a inconsistência para revisão manual".
  - O Cenário 5 da 011 diz que, com a confirmação explícita, o **sistema** marca `revertido`.
- **Lacuna:** para o estoque, nenhuma spec define como desfazer uma **baixa** já confirmada. A 016 tem o tipo `estorno` (linha 129), mas só para reservas.
- **Opções:**
  - **A)** A confirmação extra no cancelamento reverte automaticamente: o odontograma vira `revertido` e a baixa é devolvida ao estoque com um movimento `estorno`.
  - **B)** A confirmação extra só autoriza o cancelamento. A reversão do odontograma e do estoque é feita depois, manualmente, por ações próprias nas Features 011 e 016.
  - **C)** Reverte o odontograma automaticamente, mas a devolução de material fica manual (o material pode ter sido realmente usado).
- **Decisão:** `[stated]` **Opção A.** A confirmação extra no cancelamento reverte automaticamente: o odontograma vira `revertido` e o material volta ao estoque.
  - Consequência, somada a [INC-05](#inc-05) (baixa na conclusão) e [INC-09](#inc-09) (só cancela antes de concluir): um cancelamento nunca encontra baixa efetiva, porque ela só acontece ao concluir. Na prática, a reversão automática atua sobre:
    - registros `confirmado` do odontograma, que viram `revertido`;
    - a **reserva** de material, que é estornada.
  - O texto do Cenário 6 da 008 ("com baixa de estoque efetuada") precisa ser ajustado.

### PEN-03
**Quando o faturamento é contabilizado.** 🟠 V1

- A pendência da 012 (linha 107) pergunta se é na criação, na conclusão ou no pagamento.
- O Cenário 3 da própria 012 (linhas 44–48) já assume a **conclusão**: "planos concluídos no mês somando R$ 5.000".
- O Cenário 2 da 018 (linhas 42–46) sugere outra coisa: "planos com procedimentos selecionados no período", que soa como a **criação**.
- **Opções:**
  - **A)** Na conclusão do plano. Ajustar o Cenário 2 da 018.
  - **B)** Por procedimento concluído: cada item do plano ligado a um agendamento `concluido` conta na data dele. Isso exige ligar item do plano e agendamento (ver [INC-12](#inc-12)).
  - **C)** No pagamento. Nesse caso, a feature de Débitos/Pagamentos precisa existir antes (ver [ESC-10](#esc-10)).
- **Decisão:** `[stated]` **Opção B.** O faturamento conta **por procedimento concluído**: cada item do plano ligado a um agendamento `concluido` entra no faturamento na data da conclusão.
  - Consequências:
    - exige ligar o item do plano ao agendamento ([INC-12](#inc-12), opção B);
    - o Cenário 3 da 012 ("planos concluídos") e o Cenário 2 da 018 precisam ser reescritos.
  - O pagamento efetivo fica com a nova feature de Débitos ([ESC-10](#esc-10)).

### PEN-04
**Quem age no alerta de material vencido com reserva futura.** 🟡 V1.5

- A pendência da 016 (linha 182) pergunta se há um responsável ou se o alerta fica visível a todos.
- A 017 responde parte: notificações críticas ficam visíveis "até que a situação seja resolvida" (linha 22; regra na linha 117).
- **Porém:**
  - O tipo desse alerta não existe no enum da 017 (linha 82). Ver [INC-15](#inc-15).
  - A notificação da 017 tem um único `destinatario_id` (linha 81).
- **Opções:**
  - **A)** É uma notificação crítica para todos os usuários da clínica, visível até ser resolvida.
  - **B)** É crítica para o Dentista do agendamento afetado, e o Admin também vê.
  - **C)** É crítica para o papel responsável pelo estoque (a definir).
- **Decisão:** `[stated]` Opção B: crítica para o Dentista do agendamento afetado, e o Admin também vê.
  - **Obsoleta:** com a remoção da reserva ([INC-05](#inc-05)), o alerta de "vencido com reserva futura" deixa de existir. O material vencido é removido automaticamente.

### PEN-05
**Um usuário acumular papéis.** 🔴 MVP (tratado em [INC-02](#inc-02))

- A pendência da 001 (linha 139) afeta diretamente as regras "exclusivo do Dentista" das Features 010, 011 e 014.
- O caso real citado na própria pendência (o dono que também atende) é exatamente o conflito descrito em INC-02.
- **Decisão:** decidir junto com INC-02.

---

## 2. Contradições entre specs (`INC`)

### INC-01
**Ciclo de vida do agendamento.** 🔴 MVP

- **006:** o agendamento "nasce com status de presença 'em espera'" (requisito na linha 28; regra na linha 156). O enum tem só `em_espera | iniciado | concluido` (linha 123).
- **017, Cenário 1 (linhas 31–36):** "Recepcionista marca manualmente a chegada → o status de presença **muda para** 'em espera'". Não dá para mudar para o estado em que o agendamento já nasceu.
- **017, Cenário 1b (linhas 39–44):** a consulta pode acontecer "sem exigir que 'em espera' tenha sido marcado antes". Isso também pressupõe um estado anterior.
- **Status "confirmado" citado, mas inexistente:**
  - 002, Cenário 5 (linha 62);
  - 003, Cenário 6 (linha 72);
  - 008, Cenários 1 e 2 (linhas 35 e 44);
  - 016, requisito (linha 24);
  - 019, Cenários 2 e 2b (linhas 41 e 48).
  - Note que a 006 diz que "paciente não confirma nem interage" (linha 157). Portanto "confirmado" provavelmente significa só "ativo, não cancelado".
- **Status "cancelado" citado, mas inexistente:**
  - 008, Cenário 1 (linha 37);
  - 010, Histórico (linha 21);
  - 018, Cenário 3 (linhas 51–54).
- **Lacuna:** não está definido quem faz a transição para `iniciado`. A 007 (Cenário 4, linha 57) diz "o dentista marca".
- **Opções:**
  - **A)** Um único campo: `agendado → em_espera (opcional) → iniciado → concluido`, mais `cancelado` como estado terminal. "Confirmado" passa a ser sinônimo de `agendado`.
  - **B)** Dois campos:
    - `situacao: 'ativo' | 'cancelado'`;
    - `status_presenca: null | 'em_espera' | 'iniciado' | 'concluido'`, onde `null` significa que o paciente ainda não chegou.
  - **C)** Manter o nascimento em `em_espera` e trocar o Cenário 1 da 017 para registrar só a hora de chegada (`chegada_em`), sem mudar o status. Nesse caso, falta apenas `cancelado`.
- **Sub-decisão:** quem pode marcar `iniciado`? Só o Dentista responsável, ou também Recepcionista e Admin?
- **Decisão:** `[stated]` **Opção A.** Um único campo de status: `agendado → em_espera (opcional) → iniciado → concluido`, mais `cancelado` como estado terminal. "Confirmado" nas outras specs significa `agendado`.
  - **Sub-decisão:** `[stated]` marcam `iniciado` o **Dentista responsável** e o **Admin**, este em qualquer agendamento (pirâmide, [INC-02](#inc-02)).

### INC-02
**"Admin tem acesso total" contra "exclusivo do Dentista".** 🔴 MVP

- A 001 define uma hierarquia piramidal: "Admin (dono, acesso total) > Dentista > Recepcionista" (linhas 23 e 131).
- Regras que excluem o Admin:
  - 010: "Apenas o Dentista pode preencher a Anamnese" (linhas 19 e 129);
  - 011: `registrado_por` é "sempre um dentista_id" (linha 98);
  - 014: "Apenas o Dentista pode adicionar imagens" (linhas 18 e 102).
- Regras que afirmam o contrário:
  - 010: "todos os papéis podem criar/editar o prontuário" (linha 23; regra na linha 128);
  - 004: a mesma coisa (linha 143).
  - As duas chocam com a Anamnese exclusiva do Dentista.
- **Impacto no teste já escrito:** o Cenário 4 de `tests/unit/modules/autenticacao/FEATURE_001.test.ts` usa a ação `odontograma:preencher`. A resposta aqui define o que a matriz de autorização deve devolver para o Admin nessa ação.
- **Opções:**
  - **A)** Pirâmide pura: o Admin herda tudo do Dentista, e "exclusivo do Dentista" passa a significar "Dentista ou Admin".
  - **B)** As ações clínicas exigem que o usuário tenha um **cadastro de Dentista** (003, com CRO) vinculado, qualquer que seja o papel. Isso resolve o dono que também atende e fecha PEN-05 sem papéis múltiplos.
  - **C)** Exclusivo do papel `dentista`: o Admin só lê os dados clínicos.
- **Sub-decisão:** "todos editam o prontuário" vale só para a Visão Geral (dados cadastrais da 004)?
- **Decisão:** `[stated]` **Opção A.** Pirâmide pura: o Admin pode tudo que o Dentista pode. "Exclusivo do Dentista" passa a significar "Dentista ou Admin".
  - Consequência: campos como `registrado_por` e `preenchido_por` ("sempre um dentista_id", nas Features 010, 011 e 014) passam a ser `usuario_id`.
  - Ainda em aberto: a sub-decisão sobre "todos editam o prontuário" e a pendência da 001 sobre acumular papéis (PEN-05). Com a pirâmide, o dono que atende pode usar o papel Admin, mas talvez precise de um cadastro de Dentista (CRO) para aparecer nos agendamentos.

### INC-03
**Paciente menor de idade sem data de nascimento.** 🔴 MVP

- A 004 exige o responsável legal (nome e CPF) quando o paciente é menor (requisito na linha 24; regra na linha 148).
- Mas a data de nascimento é opcional (linha 96), e o único campo obrigatório é o nome (linha 145). Sem a data, o sistema não sabe se o paciente é menor.
- Contradição menor: o requisito da linha 21 diz que o cadastro "captura idade" como campo, mas o Cenário 4 (linhas 54–59) e a interface dizem que a idade é **calculada**.
- **Opções:**
  - **A)** A regra do responsável só se aplica quando a data de nascimento for informada e resultar em menos de 18 anos. Sem data, não há exigência.
  - **B)** Adicionar um campo explícito "é menor de idade" que exige o responsável mesmo sem data.
  - **C)** Tornar a data de nascimento obrigatória (muda a regra "só o nome é obrigatório").
- **Sub-decisão:** confirmar que "idade" não é campo armazenado, só calculado.
- **Decisão:** `[stated]` **Opção A.** O responsável legal só é exigido quando a data de nascimento for informada e resultar em menos de 18 anos. Sem data, não há exigência. (Sub-decisão sobre "idade": ⚠️ PENDENTE.)

### INC-04
**Concluir atendimento: a Evolução é gatilho ou pré-requisito?** 🟠 V1 (afeta o Cenário 9 da 006)

- 010, regra (linha 131): "Registrar a Evolução é o que **dispara** a transição para 'concluído'".
- 010, Cenário 4b (linhas 59–64), e 006, requisito (linha 28): o Dentista **marca** "concluído", e a Evolução é **exigida** para isso.
- **Opções:**
  - **A)** Pré-requisito: existe a ação "concluir" do Dentista, que falha sem Evolução. Ajustar a regra da linha 131 da 010.
  - **B)** Gatilho: salvar a Evolução conclui automaticamente e não existe uma ação separada de concluir. Ajustar o Cenário 9 da 006 e o Cenário 4b da 010.
  - **C)** Uma única ação, "concluir com evolução", que recebe o texto e conclui na mesma operação. Na prática, é A e B juntos.
- **Nota para o MVP:** a 010 é V1. No MVP, o Cenário 9 da 006 conclui sem exigir Evolução, e a exigência entra depois. Confirmar se isso é aceitável.
- **Decisão:** `[stated]` **Opção B.** Gatilho: salvar a Evolução conclui o atendimento automaticamente, e não existe uma ação separada de "concluir".
  - Consequência no MVP: a 010 (Evolução) é V1, então no MVP não há como concluir um atendimento. O Cenário 9 da 006 não tem gatilho até a 010 existir.
  - **Desdobramento:** `[stated]` o Cenário 9 da 006 vira `it.todo` no MVP e é implementado junto com a 010. No MVP, nenhum agendamento chega a `concluido`.

### INC-05
**Três momentos de "confirmar procedimento".** 🟠 V1

- Os três momentos:
  - concluir o agendamento (006 linha 28; 010 Cenário 4);
  - confirmar o procedimento **no dente**, que deduz o estoque (011, requisito na linha 23; Cenário 2 nas linhas 40–45);
  - confirmar a **baixa** de estoque (016, requisito na linha 26; Cenário 2 nas linhas 41–46; `confirmarBaixaPorProcedimento` na linha 151).
- Não está definido qual deles efetiva a baixa, nem como ficam os procedimentos **sem dente** (por exemplo, a Limpeza).
- **Opções:**
  - **A)** A baixa acontece ao concluir o agendamento (006/010). O odontograma só registra o que foi feito em cada dente, sem mexer no estoque.
  - **B)** A baixa acontece na confirmação do odontograma. Procedimentos sem dente confirmam a baixa na conclusão do agendamento.
  - **C)** A baixa é sempre uma ação explícita da 016, separada. A conclusão e o odontograma só lembram o Dentista de confirmar.
- **Decisão (revisada):** `[stated]` O modelo é **plano de tratamento → itens (procedimento + um ou mais dentes, obrigatório) → materiais do procedimento**.
  - O agendamento pode ter um **procedimento solto** OU **itens do plano**.
  - **Não existe reserva de material.** A **baixa** acontece ao **concluir o atendimento** (salvar a Evolução, [INC-04](#inc-04)), cobrindo os materiais dos itens do plano executados naquele agendamento e também os do procedimento solto.
  - O odontograma não mexe no estoque.
  - Um procedimento solto concluído **entra no faturamento** pelo valor médio do procedimento.
  - Consequências:
    - saem das specs o "reservado/disponível", o "Estoque insuficiente" ao agendar, o estorno de reserva no cancelamento e o alerta de "vencido com reserva futura";
    - substitui o `[stated]` da 011 "Ao vincular procedimento ao dente, reduz estoque".

### INC-06
**Contato com o paciente sobre retorno.** 🟠 V1

- A 009 diz que "o contato direto com o paciente sobre o retorno é responsabilidade da Feature 019" (regra na linha 138; Notas na linha 150).
- A 019 diz que o aviso de retorno **não** gera mensagem automática e fica manual (requisito na linha 23; regra `[stated]` na linha 155).
- A 019 é `[stated]`, portanto prevalece como fala do usuário.
- **Opções:**
  - **A)** Ajustar a 009: o contato sobre retorno é manual, feito pela Recepcionista a partir da notificação interna.
  - **B)** Rever a 019 e incluir uma mensagem automática de retorno (contradiz um `[stated]`).
- **Decisão:** `[stated]` **Opção A.** Ajustar a 009: o contato com o paciente sobre o retorno é manual, feito pela Recepcionista a partir da notificação interna.

### INC-07
**Notificação de retorno contra os níveis de urgência.** 🟠 V1

- A 009 diz que a notificação "permanece pendente até que a próxima consulta seja efetivamente marcada" (requisito na linha 26; Cenário 6 nas linhas 81–87).
- Na 017, uma notificação `normal` deixa de ser pendente quando é marcada como lida (Cenário 4, linhas 60–65). Só as `critica` persistem até a resolução, e a lista de críticas não inclui retorno (linhas 22 e 117).
- **Opções:**
  - **A)** A notificação de retorno é crítica, ou seja, persiste até ser resolvida.
  - **B)** Criar um terceiro comportamento: "normal, persistente até resolução". O campo `resolvida` da 017 (linha 87) passaria a valer para qualquer tipo que exija uma ação.
  - **C)** Pode ser marcada como lida, mas o **retorno** continua com status `notificado` (e não `reagendado`) até existir um agendamento. A pendência fica no retorno, não na notificação.
- **Decisão:** `[stated]` **Opção A.** A notificação de retorno passa a ser **crítica**: persiste até a resolução, ou seja, até o novo agendamento ser marcado. Incluir retorno na lista de críticas da 017.

### INC-08
**Edição direta no odontograma.** 🟠 V1

- O Cenário 7 da 011 (linhas 76–81) diz que o Dentista edita um registro confirmado e o sistema "salva a alteração diretamente no registro existente". Isso sobrescreve o dado.
- Isso conflita com:
  - "cada dente mantém histórico completo" (linha 139);
  - "registro nunca é apagado" (linha 137);
  - a filosofia de auditoria da 010.
- A trilha de auditoria da 010 cobre apenas `anamnese | evolucao | documento` (linha 95).
- **Opções:**
  - **A)** A edição é permitida, mas gera um registro de auditoria (incluir `odontograma` no enum da 010).
  - **B)** A edição cria uma nova versão do registro, e a anterior vira `revertido` ou `substituido`. O histórico fica intacto.
  - **C)** Manter a edição direta sem histórico (aceitar a perda da versão anterior).
- **Decisão:** `[stated]` **Opção A.** A edição direta é permitida, mas gera um registro na trilha de auditoria. Incluir `odontograma` no enum `entidade` da 010 (linha 95). A trilha continua visível só ao Admin.

### INC-09
**Cancelar um agendamento já realizado.** 🟠 V1

- O Cenário 6 da 008 (linhas 70–77) permite cancelar um agendamento cujo procedimento **já foi confirmado**, com baixa feita e odontograma registrado. Na prática, a consulta já aconteceu.
- Não há transição definida de `concluido` para `cancelado` (ver INC-01).
- O resultado distorce o Histórico (010, que passa a mostrar como cancelada uma consulta que ocorreu) e a Ocupação (018, que só conta `concluido`).
- **Opções:**
  - **A)** Só é possível cancelar antes de `concluido`. O Cenário 6 passa a valer para `iniciado` com o procedimento já confirmado no dente.
  - **B)** Permitir cancelar depois de `concluido`, como estorno administrativo (por exemplo, só o Admin). O Histórico mostra os dois eventos.
  - **C)** Criar uma ação separada, "estornar atendimento", distinta de "cancelar agendamento".
- **Decisão:** `[stated]` **Opção A.** Só é possível cancelar antes de `concluido`. O Cenário 6 da 008 passa a valer para um agendamento `iniciado` que já tem registro confirmado no odontograma.

### INC-10
**Canal de comunicação: quem escolhe e onde fica.** 🟡 V1.5

- 019, Contexto (linha 12): "conforme a preferência que o **próprio paciente escolheu** no cadastro".
- 019, requisito (linha 18) e regra `[stated]` (linha 153): o canal é "**definido pela clínica**".
- A 019 diz que "complementa a Feature 004", mas a 004 não tem campo de canal. A `PreferenciaComunicacao` da 019 (linhas 97–102) é uma entidade separada.
- **Opções:**
  - **A)** Corrigir o Contexto da 019 para ficar igual à regra `[stated]`. O canal continua em uma entidade própria da 019.
  - **B)** Idem, mas colocar `canal_preferido` como campo opcional do paciente na 004.
- **Decisão:** `[stated]` Deve haver **pelo menos um canal de comunicação indicado pelo paciente**, e ele é **obrigatório no cadastro** (004).
  - O paciente pode ter **vários canais**, com **um marcado como preferido**. As mensagens vão só pelo preferido.
  - O canal é registrado pela clínica a partir do que o paciente informa.
  - Isso muda a regra "só o nome é obrigatório", que passa a ser "nome + pelo menos um canal".

### INC-11
**Alerta sempre visível contra poder ocultar no Dashboard.** 🟡 V1.5

- A 016 diz que o alerta de estoque é visível para todos, "sem distinção de papel" (Cenário 9, linhas 94–99; regra na linha 179).
- A 017 diz que notificações críticas ficam visíveis até serem resolvidas (linha 117).
- A 018 permite que o Admin oculte campos por papel e que cada usuário oculte widgets (requisitos nas linhas 21–22; Cenários 7 e 8).
- **Opções:**
  - **A)** Alertas críticos (estoque e os da 017) não podem ser ocultados, nem pelo Admin nem pelo usuário.
  - **B)** O Admin pode ocultar alertas por papel, mas o usuário não pode ocultar os próprios.
  - **C)** Tudo pode ser ocultado no Dashboard, mas o sino da 017 continua mostrando os críticos.
- **Decisão:** `[stated]` Opção C: alertas podem ser ocultados no Dashboard, mas o sino sempre mostra os críticos.

### INC-12
**Faturamento por dentista e custos de prótese.** 🟠 V1

- A 018 exige faturamento "por dentista" e "por procedimento" (linha 27; Cenário 4).
- O plano da 012 só guarda `criado_por` (linha 66). O `ProcedimentoDoPlano` (linhas 73–77) não tem ligação com um agendamento nem com o dentista que executou o procedimento.
- A 018 lista a 015 como dependência para "custos/comissões, se aplicável ao financeiro" (linha 152). Mas a regra da própria 018 diz que o financeiro vem **só** da 012 (linha 163).
- **Opções:**
  - **A)** O faturamento por dentista usa o `criado_por` do plano. Tirar a 015 das dependências da 018.
  - **B)** Adicionar `agendamento_id` e `dentista_id` a cada item do plano. O faturamento por dentista usa quem executou. Isso combina com a opção B de PEN-03.
  - **C)** Incluir comissões de prótese (015) como despesa no Dashboard (é uma nova regra de negócio).
- **Decisão:** `[stated]` **Opção B.** Cada item do plano ganha `agendamento_id` e `dentista_id`. O faturamento por dentista é atribuído a **quem executou** o procedimento.
  - ⚠️ PENDENTE: a 015 continua como dependência da 018 (comissões)? Pela regra da 018, o financeiro vem só da 012.

### INC-13
**Documento gerado pela Recepcionista e quem cria modelo.** 🟡 V1.5

- A Recepcionista pode gerar documentos (Cenário 4, linhas 56–61; regra na linha 119).
- Mas todo PDF leva "assinatura digital do **Dentista**" (requisito na linha 21; regra na linha 122). Não está dito qual Dentista assina nem quando.
- O requisito da linha 19 diz "**Usuário** pode criar modelo personalizado". O requisito da linha 23 e a interface (linha 79) dizem que o modelo é criado por um **Dentista**.
- **Opções:**
  - **A)** A Recepcionista gera o documento sem assinatura ("rascunho"), e um Dentista assina depois.
  - **B)** A Recepcionista gera e escolhe o Dentista responsável. A assinatura é a dele (depende do provedor de assinatura).
  - **C)** Documentos gerados pela Recepcionista (por exemplo, um termo de consentimento) não exigem assinatura de Dentista.
- **Sub-decisão:** a Recepcionista e o Admin podem criar modelos personalizados?
- **Decisão:** `[stated]` O **Dentista gera o documento e o Dentista assina**. A Recepcionista deixa de gerar documentos, o que substitui o `[stated]` anterior "Dentista e Recepcionista podem gerar documentos".
  - **Sub-decisão:** `[stated]` Dentista e Admin criam modelos personalizados.
  - ⚠️ PENDENTE: o Admin pode gerar ou assinar documentos? A assinatura é de um Dentista com CRO.

### INC-14
**Mudanças de regra ainda registradas como `[stated]`.** ⚪ Cosmético

- **005:** a regra `[stated]` "Materiais são vinculados no momento da criação do procedimento" (linha 122) convive com a `[correção]` "pode ser criado sem materiais" (linha 127).
- **009:** o requisito diz que o reagendamento pré-preenche "paciente/dentista/**procedimento**" (linha 22). O Cenário 1 pré-preenche só "paciente e dentista" (linha 40).
- **Opções:**
  - **A)** Riscar ou remover o `[stated]` que foi superado na 005. Alinhar o Cenário 1 da 009 com o requisito, incluindo o procedimento.
  - **B)** Idem na 005, mas alinhar o requisito da 009 com o Cenário 1 (sem procedimento).
- **Decisão:** `[stated]` **Opção A.** O reagendamento pré-preenche paciente, dentista **e procedimento**. Ajustar o Cenário 1 da 009. (Parte da 005: ⚠️ PENDENTE de confirmação.)

### INC-15
**Lista de tipos de notificação da 017 incompleta.** 🟡 V1.5

- O enum da 017 (linha 82) é: `paciente_aguardando | retorno_reagendar | cancelamento_comunicar | estoque_critico | cadeira_indisponivel | fora_de_horario`.
- Gatilhos que outras specs definem, mas que não estão no enum:
  - dentista removido com agendamentos futuros (003, linha 28; 007, linha 25);
  - material vencido com reserva futura (016, linha 25; Cenário 6);
  - falha final de envio ao paciente, com alerta para a Recepcionista (019, linha 25);
  - atraso de prótese no laboratório (015, linha 24).
- Termos diferentes para o mesmo conceito: a 016 usa "estoque **mínimo**" (linhas 28 e 173) e "estoque **crítico**" (linha 179). A 017 e a 018 usam "crítico".
- **Opções:**
  - **A)** Incluir os quatro tipos na 017 e definir a urgência de cada um. Padronizar o termo como "estoque abaixo do mínimo".
  - **B)** Incluir só os que você confirmar; os outros aparecem apenas visualmente na agenda ou no módulo.
- **Decisão:** `[stated]` Opção A: incluir os tipos e padronizar como "estoque abaixo do mínimo".
  - O tipo "vencido com reserva" fica obsoleto (não há mais reserva).
  - Entram `dentista_removido`, `falha_envio_mensagem` e `atraso_protese`, além de `retorno_reagendar` como crítica ([INC-07](#inc-07)).

---

## 3. Escopo, fase, stack e lacunas (`ESC`)

### ESC-01
**A 005 (MVP) depende do Estoque (V1.5).** 🔴 MVP

- Os Cenários 4, 5 e 6 da 005 (linhas 52–72) descrevem reserva de material ao agendar, bloqueio por "Estoque insuficiente" e o vínculo de materiais. Tudo isso exige as entidades `Material` e `LoteMaterial` da 016 (V1.5).
- A 006, que é onde o agendamento é criado, **não menciona** reserva de material nem o erro "Estoque insuficiente".
- **Opções:**
  - **A)** No MVP, os Cenários 4, 5 e 6 da 005 viram `it.todo`, e o vínculo de materiais só existe a partir da 016. Documentar isso na 005.
  - **B)** Antecipar para o MVP o cadastro mínimo de material (sem lotes nem logs).
  - **C)** Mover os Cenários 4 e 5 da 005 para a 016 (ou para a 006 como requisito condicional: "se a 016 existir").
- **Decisão:** `[stated]` **Opção A.** No MVP, os Cenários 4, 5 e 6 da 005 viram `it.todo`. O vínculo de materiais só passa a existir com a 016.

### ESC-02
**Mecanismo de autenticação.** 🔴 MVP

- A interface da 001 modela `senha_hash` próprio (linha 100).
- O `HARNESS_ENGINEERING.md` (seção 9, linha 160) deixa pendente o uso de Supabase Auth.
- O teste atual da 001 isola as credenciais atrás de uma dependência (`credenciais`), então **o teste não está bloqueado**. Bloqueadas estão a migration e a implementação real.
- **Opções:**
  - **A)** Usar Supabase Auth (senhas, sessão e e-mail de recuperação ficam com o Supabase). A tabela `usuarios` guarda só papel, clínica e `ativo`.
  - **B)** Autenticação própria, com `senha_hash` na tabela `usuarios`. Nesse caso a sessão e o envio de e-mail são implementados por nós.
- **Nota:** a opção A também pode resolver, pelo menos no MVP, a pendência do provedor de e-mail de recuperação.
- **Decisão:** `[stated]` **Opção A.** Usar Supabase Auth.
  - Consequências:
    - a interface `Usuario` da 001 deixa de ter `senha_hash`;
    - o `HARNESS_ENGINEERING.md` (seção 9) e o `AGENTS.md` precisam registrar que o Auth está decidido;
    - o teste atual da 001 continua válido, porque a dependência `credenciais` passa a ser implementada sobre o Supabase Auth.
  - ⚠️ PENDENTE: o provedor de e-mail continua aberto para produção, já que o envio padrão do Supabase tem limites e o normal é configurar um SMTP próprio.

### ESC-03
**"Compromisso extra" do dentista não tem modelo.** 🔴 MVP

- A 006 exige que o Dentista possa marcar compromissos que bloqueiam a agenda (requisito na linha 29; Cenário 3 nas linhas 50–55; regra na linha 155). A 003 remete para lá (linha 26).
- Falta definir:
  - a entidade (não há interface);
  - quem cria (só o próprio Dentista? o Admin? a Recepcionista?);
  - se o compromisso ocupa uma cadeira;
  - se é recorrente;
  - se aparece na agenda (a 007, linha 24, diz que sim).
- O termo "extra-horário" sugere algo **fora** do expediente, mas o compromisso bloqueia horário **dentro** dele.
- **Opções:**
  - **A)** Uma entidade simples `BloqueioAgenda { dentista_id, inicio, fim, motivo? }`, criada pelo próprio Dentista ou pelo Admin, pontual e sem cadeira.
  - **B)** Idem, e qualquer papel pode criar.
  - **C)** Idem, com suporte a recorrência (por exemplo, "toda terça 12h–13h").
- **Sub-decisão:** renomear para "bloqueio de agenda" ou "compromisso do dentista"?
- **Decisão:** `[stated]` **Opção C.** Uma entidade de bloqueio de agenda (dentista, início, fim, motivo opcional), criada pelo Dentista ou pelo Admin, **com suporte a recorrência**.
  - ⚠️ PENDENTE:
    - o formato da recorrência (semanal? diária? com data de fim?);
    - se dá para remover uma única ocorrência da série;
    - o nome do conceito.
  - A recorrência aumenta a 006. Avaliar se isso vira uma feature própria (sugestão: dividir).

### ESC-04
**Validações ausentes na criação do agendamento.** 🔴 MVP

- A 002 diz que uma cadeira desativada fica "indisponível para novos agendamentos" (interface, linha 95). A 006 não lista essa validação.
- A 003 diz que um dentista removido fica `ativo: false` (linha 93). A 006 não diz se isso bloqueia novos agendamentos com ele.
- A 002 define `dias_atendimento` (linha 85). A 006 valida só o **horário** (Cenário 5, linhas 64–69), não o **dia**.
- **Opções:**
  - **A)** A 006 bloqueia: cadeira inativa, dentista inativo e dia fora de `dias_atendimento`. A emergência retroativa ignora tudo isso.
  - **B)** Bloqueia cadeira e dentista inativos, mas só **avisa** quando o dia está fora do atendimento (permite atender em um dia excepcional).
- **Decisão:** `[stated]` **Opção A.** A 006 bloqueia cadeira inativa, dentista inativo e dia fora de `dias_atendimento`. A emergência retroativa ignora essas validações.

### ESC-05
**Cenários do MVP que dependem de features futuras.** 🔴 MVP (como testar)

- Os cenários:
  - 001, Cenário 4: usa o Odontograma (011, V1);
  - 002, Cenário 5, e 003, Cenário 6: "aparecem destacados na Agenda (Feature 007)", que é V1;
  - 006, Cenário 9: "passa a integrar o Histórico (Feature 010)", que é V1.
- **Opções:**
  - **A)** Testar no MVP só a parte da própria feature. No 001 C4, a permissão `odontograma:preencher` já existe na matriz. No 002 C5 e 003 C6, o agendamento fica sinalizado como "em alerta" no banco. No 006 C9, o status vira `concluido`. A parte visual e a integração ficam como `it.todo` ou são testadas na feature de destino.
  - **B)** Adiar esses cenários inteiros para a feature de destino.
- **Decisão:** `[stated]` **Opção A.** Testar no MVP só a parte da própria feature. A parte visual e a integração com features futuras ficam como `it.todo`.
  - Exceção: o Cenário 9 da 006 depende da sub-pendência de [INC-04](#inc-04).

### ESC-06
**Features do V1 que dependem do V1.5.** 🟠 V1

- 008 (V1) depende de 016 e 017 (V1.5): header na linha 6; corpo nas linhas 102–105.
- 009 (V1) depende de 017 (V1.5): linhas 6 e 129.
- 011 (V1) depende de 015 e 016 (V1.5), e cita a 014 (V1.5): linhas 6, 26–27 e 124–125.
- Isso conflita com o princípio "uma feature por vez, respeitando dependências".
- **Opções:**
  - **A)** Antecipar a 017 (Notificações Internas) para o V1, porque ela é pré-requisito de 008 e 009. As integrações com 014, 015 e 016 viram `it.todo` até o V1.5.
  - **B)** Manter as fases e usar uma interface temporária (por exemplo, `notificacaoService` com implementação mínima) no V1.
  - **C)** Reordenar as fases (por exemplo, mover o Estoque, 016, para o V1).
- **Decisão:** `[stated]` **Opção B.** As fases ficam como estão. No V1, as integrações com 014, 015, 016 e 017 usam uma **interface temporária** (por exemplo, um `notificacaoService` mínimo), que é substituída pela implementação real no V1.5.

### ESC-07
**Dependências circulares.** 🟠 V1

- 011 depende de 015 (linha 125), e 015 depende de 011 (linha 112).
- 011 depende de 008 (linha 122), e 008 depende de 011 (linha 104).
- **Opções:**
  - **A)** Definir uma direção só em cada par:
    - a 015 depende da 011 (a prótese aparece no odontograma), e a 011 só exibe a prótese se ela existir;
    - a 008 depende da 011 (chama a reversão que a 011 expõe), e a 011 não depende da 008.
  - **B)** Manter e documentar como "integração bidirecional", indicando qual é implementada primeiro.
- **Decisão:** `[stated]` **Opção B.** As dependências ficam como integração bidirecional documentada. Pela ordem do roadmap, a ordem de implementação seria:
  - 008 antes da 011: a reversão do odontograma entra quando a 011 for implementada;
  - 011 antes da 015: a prótese no odontograma entra com a 015, usando a interface temporária de [ESC-06](#esc-06).

### ESC-08
**Cabeçalho `Dependências:` diferente da seção Dependências.** ⚪ Cosmético

| Spec | Cabeçalho | Faltam no cabeçalho |
|---|---|---|
| 008 | 006, 017 | 005, 016, 011 |
| 017 | 006, 008, 009 | 016 e 002 (usadas nos alertas críticos), 019 (alerta de falha) |
| 018 | 006, 016, 015, 012 | 017 |
| 019 | 004, 006, 009 | 008, 013 |

- **Opção:** alinhar o cabeçalho com o corpo depois de ESC-06 e ESC-07.
- **Decisão:** aplicado junto com as demais decisões (aprovado em 2026-10-02).

### ESC-09
**"Tempo real" na Agenda.** 🟠 V1

- A 007 exige atualização em tempo real (linha 27; Cenários 4 e 5).
- O `HARNESS_ENGINEERING.md` (linha 160) deixa pendente o uso de Supabase Realtime.
- **Opções:**
  - **A)** Usar Supabase Realtime.
  - **B)** Polling periódico (por exemplo, a cada 30 s): mais simples, "quase" tempo real.
  - **C)** Atualizar só ao navegar ou agir (sem tempo real). Muda a spec.
- **Decisão:** `[stated]` **Opção A.** Usar Supabase Realtime. O `HARNESS_ENGINEERING.md` (seção 9) e o `AGENTS.md` precisam registrar o Realtime como decidido.

### ESC-10
**"Débitos" citado como feature que não existe.** 🟠 V1

- A 004 (Notas, linha 158) e a 010 (Contexto, linha 12) dizem que Débitos é "especificado em feature própria". Não há feature de Débitos entre as 19.
- Hoje o assunto só aparece como pendência da 012 (linha 108).
- **Opções:**
  - **A)** Criar a spec **FEATURE_020 Débitos e Pagamentos** (definir a fase).
  - **B)** Declarar fora do escopo das 19 features e corrigir o texto da 004 e da 010.
- **Decisão:** `[stated]` Criar uma feature **"Débitos"** posicionada **depois da 010**.
  - **Numeração e fase:** `[stated]` Débitos = **Feature 013** (depois do Plano de Tratamento, 012), fase **V1**. As atuais 013–019 passam a ser 014–020.
  - ⚠️ PENDENTE: o conteúdo da spec (o que é um débito, registro de pagamento, parcelamento, relação com o plano) precisa ser especificado com você.

### ESC-11
**Laboratório de prótese: está ou não no escopo?** 🟡 V1.5

- A 015 é V1.5. As regras dizem "MVP: laboratório interno" e "**V1.5+**: clínica pode registrar laboratórios" (linhas 121–122). Portanto não está claro se o cadastro de laboratórios entra na própria 015.
- O Cenário 1 (linha 35) cita "laboratório parceiro", mas `laboratorio` é texto livre (linha 86).
- A interface `Protese` não tem `dente`, embora o Cenário 4 da 011 mostre prótese no dente 16.
- Também não há vínculo com os procedimentos "Avaliação/Consulta" e "Cirurgia Implante" (regra na linha 119).
- "Alerta quando ultrapassa entre 15 e 30 dias" (linha 24; Cenário 3) é ambíguo:
  - o limite é fixo (15? 30?) ou configurável?
  - conta a partir do envio ou a partir do prazo estipulado?
- **Opções:**
  - **A)** Na 015, o laboratório é texto livre e o cadastro de laboratórios vira pendência futura. Adicionar `dente` à `Protese`. O limite de atraso é configurável pela clínica, entre 15 e 30 dias, e conta a partir do prazo de retorno.
  - **B)** Incluir o cadastro de laboratórios na 015 (a feature cresce; talvez dividir).
- **Decisão:** `[stated]` Opção A:
  - laboratório em texto livre;
  - `dente` adicionado à `Protese`;
  - limite de atraso configurável pela clínica, entre 15 e 30 dias, contado a partir do prazo de retorno.

### ESC-12
**Imagem "sem tamanho máximo" contra a stack.** 🟡 V1.5

- A 014 diz que não há tamanho máximo por imagem (linha 20; regra na linha 104).
- O Vercel limita o corpo de requisições em funções (alguns MB), e o Supabase Storage tem limite por arquivo conforme o plano.
- **Opções:**
  - **A)** Upload direto do navegador para o storage (URL assinada), sem passar pelo Vercel. O limite passa a ser só o do storage (documentar qual).
  - **B)** Definir um limite prático (por exemplo, 50 MB), o que muda a regra.
- **Nota:** o storage ainda é uma pendência aberta (013 e 014).
- **Decisão:** `[stated]` Opção A: upload direto do navegador para o storage, sem passar pelo Vercel. O provedor de storage continua ⚠️ PENDENTE.

### ESC-13
**Qual lote é reservado?** 🟡 V1.5

- A 016 guarda `quantidade_reservada` **por lote** (linha 118). O Cenário 6 (linhas 70–77) depende de saber qual lote foi reservado.
- Nenhuma regra define a escolha do lote.
- **Opções:**
  - **A)** Primeiro o que vence primeiro (FEFO): reserva no lote válido com validade mais próxima.
  - **B)** Primeiro que entra, primeiro que sai (FIFO): reserva no lote mais antigo.
  - **C)** Reserva no nível do material, e o lote só é escolhido na baixa. Isso muda o Cenário 6.
- **Decisão:** `[stated]` Opção A, FEFO. Como não há mais reserva ([INC-05](#inc-05)), a regra vale para a **baixa**: consome primeiro o lote válido que vence antes.

### ESC-14
**Mensagem "Você foi agendado" para emergência retroativa.** 🟡 V1.5

- A 019 envia confirmação quando qualquer agendamento é criado (linha 19; Cenário 1).
- A 006 permite registrar uma emergência **já ocorrida** (Cenário 8b). O paciente receberia a confirmação de uma consulta passada, e os lembretes de 24 h e 5 h também seriam calculados sobre uma data passada.
- **Opções:**
  - **A)** Agendamentos com `emergencia = true` não geram mensagem nem lembretes.
  - **B)** Não gerar mensagens para nenhum agendamento cujo início já passou (vale para emergência e para qualquer registro retroativo).
- **Decisão:** `[stated]` Opção B: nenhum agendamento cujo início já passou gera mensagem ou lembrete.

### ESC-15
**"Capacidade disponível" na ocupação.** 🟡 V1.5

- A 018 calcula a ocupação como os agendamentos `concluido` "em relação à capacidade disponível" (Cenário 3, linhas 49–55). A capacidade não está definida.
- Também não está definido se emergências retroativas contam.
- **Opções:**
  - **A)** Capacidade = cadeiras ativas × horas de funcionamento × dias de atendimento no período.
  - **B)** Capacidade = dentistas ativos × horas de funcionamento × dias de atendimento (menos os bloqueios de agenda).
  - **C)** Mostrar as duas: ocupação de cadeiras e ocupação de dentistas.
- **Decisão:** `[stated]` Opção B: capacidade = dentistas ativos × horas de funcionamento × dias de atendimento, menos os bloqueios de agenda. (Se emergências contam: ⚠️ PENDENTE.)

---

## 4. Referências cruzadas erradas (`REF`)

São sobras das renumerações. Todas são ⚪ cosméticas, e a correção é óbvia. Basta confirmar se podem ser corrigidas.

| ID | Spec, linha | Texto atual | Deveria ser |
|---|---|---|---|
| REF-01 | 003, linha 12 | "própria agenda/notificações (Feature 007, 012)" | Features 007 e 017 |
| REF-02 | 007, linha 132 (Notas) | "dados já criados nas Features 002, 003 e 005" | Features 002, 003 e 006 |
| REF-03 | 003, linha 92, e 006, linha 162 | especialidade "(Feature 006/007)" e "(Feature 003/007)" | provavelmente 005 no lugar de 007 |
| REF-04 | 019, linhas 12 e 168 | "gap identificado nas Features 009 e 012"; "009 e 012 devem ser atualizadas" | a 012 hoje é Plano de Tratamento, sem relação. Provavelmente 009 e 017 |

- **Decisão:** corrigir (aprovado em 2026-10-02). As referências foram ajustadas junto com a renumeração.

---

## 5. Divergências com os docs de contexto (`DOC`)

### DOC-01
**A lista de pendências do Resumo está incompleta.** ⚪ Cosmético

- A seção 8 do `context/Resumo.md` (linhas 309–316) não lista estas pendências, que existem nas specs:
  - 003: o dentista tem foto de perfil? (linha 128)
  - 004: o CPF do responsável legal pode se repetir? (linha 153)
  - 004: transferência entre clínicas (linha 152; ver PEN-01)
  - 005: excluir um procedimento já usado; arquivar? (linha 134)
  - 006: quem pode registrar emergência retroativa? (linha 169)
  - 007: há visualização por mês? (linha 127)
  - 008: ação formal de reverter (linha 121; ver PEN-02)
  - 012: o plano é editável depois de ter procedimentos concluídos? (linha 109)
  - 016: quem age no alerta de vencido (linha 182; ver PEN-04)
- A lista de pendências do `AGENTS.md` repete essa omissão.
- **Opção:** atualizar o Resumo (e o `AGENTS.md`) depois das decisões deste documento.

### DOC-02
**Caminho das specs.** ⚪ Cosmético

- O `context/Resumo.md` (linha 340) diz `/mnt/user-data/outputs/specs/`, que era o ambiente da sessão de especificação.
- O `context/HARNESS_ENGINEERING.md` (linhas 78–80) diz `specs/FEATURE/`.
- O caminho real é `specs/FEATURES/`.
- **Opção:** corrigir os dois documentos.

### DOC-03
**`specs/README.md` vazio.** ⚪ Cosmético

- A metodologia prevê um `specs/README.md` com índice e roadmap. O arquivo existe, mas está vazio.
- **Opção:** preencher com a tabela das 19 features (fase, status, dependências), atualizada depois das decisões de ESC-06.

---

## Próximos passos

1. Decidir os itens 🔴 MVP (tabela no topo).
2. Decidir os itens 🟠 V1 antes de começar a 007.
3. Decidir os itens 🟡 V1.5 antes de começar a 013.
4. Com pedido explícito, aplicar as decisões nas specs (como `[stated]`) e atualizar `Resumo.md`, `HARNESS_ENGINEERING.md`, `AGENTS.md` e `specs/README.md`.
