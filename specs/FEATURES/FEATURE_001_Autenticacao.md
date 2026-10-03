# Feature 001: Autenticação & Roles

**Status:** 🟡 Em Definição
**Fase:** MVP
**Complexidade:** 🔴 Alta
**Dependências:** Nenhuma (feature base)

---

## Contexto

O sistema precisa distinguir três tipos de usuários que acessam a clínica: **Admin**, **Dentista** e **Recepcionista**. Cada papel tem permissões diferentes sobre as demais features do sistema (agendamento, prontuário, estoque, procedimentos, etc).

Sem autenticação e controle de papéis, não é possível aplicar nenhuma das regras de permissão já definidas nas outras specs (ex: apenas Dentista — e, pela hierarquia, o Admin — preenche Raio X/Odontograma/Anamnese).

O paciente **não** é um usuário autenticado do sistema — ele não acessa nenhuma tela (confirmado no levantamento).

---

## Requisitos

- [ ] Sistema permite login com email + senha, usando **Supabase Auth** como mecanismo de autenticação
- [ ] Sistema possui 3 papéis (roles) organizados em hierarquia piramidal: `admin` (dono, acesso completo), `dentista` (acesso intermediário), `recepcionista` (acesso mais restrito)
- [ ] Hierarquia é **piramidal pura**: o Admin pode executar tudo que o Dentista pode, inclusive as ações clínicas descritas como "exclusivas do Dentista" nas demais specs
- [ ] Cada usuário pertence a exatamente uma clínica (multi-tenant por clínica) — sem suporte a múltiplas clínicas por login no MVP
- [ ] Admin cadastra novos usuários (Dentista, Recepcionista) — cada clínica cadastra seus próprios profissionais, sem compartilhamento entre clínicas
- [ ] Sistema valida credenciais e retorna sessão/token autenticado
- [ ] Sistema bloqueia acesso a rotas/ações não permitidas para o papel do usuário
- [ ] Sessão não expira automaticamente no MVP — usuário permanece autenticado até logout manual
- [ ] Recuperação de senha via email de redefinição (fluxo do Supabase Auth)
- [ ] Admin pode remover um usuário (Dentista/Recepcionista); dados clínicos (agendamentos, prontuários, etc) pertencem à clínica, não ao usuário — permanecem intactos após a remoção, apenas o vínculo de permissões é removido

---

## Cenários

### Cenário 1: Login com sucesso
```
Dado um usuário cadastrado com email "dra.ana@clinica.com" e senha válida
Quando ele faz login com essas credenciais
Então o sistema retorna uma sessão autenticada
E o sistema identifica seu papel como "dentista"
```

### Cenário 2: Login com senha incorreta
```
Dado um usuário cadastrado com email "dra.ana@clinica.com"
Quando ele tenta logar com senha incorreta
Então o sistema retorna erro "Credenciais inválidas"
E nenhuma sessão é criada
```

### Cenário 3: Admin cadastra novo usuário
```
Dado um Admin autenticado
Quando ele cadastra um novo usuário com papel "recepcionista"
Então o sistema cria o usuário vinculado à clínica do Admin
E o novo usuário pode fazer login com as credenciais definidas
```

### Cenário 4: Acesso negado por papel
```
Dado uma Recepcionista autenticada
Quando ela tenta preencher o Odontograma de um paciente (ação exclusiva de Dentista/Admin)
Então o sistema bloqueia a ação
E retorna erro "Ação não permitida para seu papel"
```
> No MVP, este cenário valida apenas a **matriz de permissões** (a ação `odontograma:preencher` existe na matriz); o Odontograma em si é a Feature 011 (V1).

### Cenário 5: Usuário de uma clínica não acessa dados de outra
```
Dado um Dentista autenticado, vinculado à Clínica A
Quando ele tenta acessar um paciente da Clínica B
Então o sistema bloqueia o acesso
```

### Cenário 6: Recuperação de senha
```
Dado um usuário cadastrado que esqueceu a senha
Quando ele solicita recuperação informando o email
Então o sistema envia um email com link/código de redefinição
E permite que ele defina uma nova senha
```

### Cenário 7: Admin remove um dentista
```
Dado um Dentista cadastrado com agendamentos e prontuários já vinculados à clínica
Quando o Admin remove o acesso desse Dentista
Então o sistema remove apenas o vínculo de login/permissões do usuário
E os dados de agendamentos e prontuários permanecem intactos, pois pertencem à clínica
```

---

## Exemplos de Código

```typescript
interface Usuario {
  id: string; // mesmo id do usuário no Supabase Auth
  nome: string;
  email: string;
  papel: 'admin' | 'dentista' | 'recepcionista';
  clinica_id: string;
  ativo: boolean; // false após remoção; dados clínicos não são afetados
}
// Senha e sessão são geridas pelo Supabase Auth — não há senha_hash na tabela de domínio.

// Exemplo de uso esperado
const sessao = await authService.login({
  email: 'dra.ana@clinica.com',
  senha: '********'
});

// sessao.usuario.papel === 'dentista'
// sessao.usuario.clinica_id === 'clinica-001'

await authService.solicitarRecuperacaoSenha({ email: 'dra.ana@clinica.com' });
```

---

## Dependências

- Nenhuma — é a feature base do sistema. Todas as demais features dependem desta.

---

## Regras de Negócio

- [stated] Três papéis distintos: **Admin**, **Dentista**, **Recepcionista**
- [stated] Cada papel tem permissões diferentes sobre as demais funcionalidades (detalhadas em cada spec correspondente)
- [stated] Paciente não é usuário autenticado do sistema
- [correção] Papéis seguem hierarquia piramidal de permissões: Admin (dono, acesso total) > Dentista > Recepcionista. Essa granularidade pode evoluir em versões futuras
- [stated] Hierarquia piramidal pura: o Admin pode tudo que o Dentista pode; nas demais specs, "exclusivo do Dentista" significa "Dentista ou Admin"
- [stated] Autenticação usa Supabase Auth (senha, sessão e email de recuperação ficam com o Supabase)
- [correção] Recuperação de senha via serviço de email
- [correção] Cada clínica cadastra seus próprios dentistas; não há compartilhamento de login entre clínicas
- [correção] MVP não possui expiração de sessão
- [correção] Dados clínicos (agendamentos, prontuários, etc) são vinculados à clínica, não ao usuário; remover um usuário não afeta esses dados, apenas o vínculo de permissões
- [correção] MVP não possui "Super Admin" acima do Admin da clínica

### ⚠️ PENDENTE (não definido ainda pelo usuário)
- ⚠️ Um usuário pode acumular mais de um papel simultaneamente (ex: dono que também atua como dentista e precisa aparecer na agenda com CRO), ou os papéis são sempre exclusivos?
- ⚠️ Provedor de email (SMTP) para produção — o envio padrão do Supabase Auth tem limites (relacionado ao gap de provedor da Feature 020)

---

## Notas

Este spec deve ser validado com o usuário antes de prosseguir para a Feature 002 (Criar/Configurar Clínica), já que Feature 002 depende do conceito de Admin definido aqui.

**Histórico:** 2026-10-02 — aplicadas decisões da análise de consistência (`context/ANALISE_SPECS.md`: INC-02, ESC-02, ESC-05).
