# Finan — Design

App de finanças pessoal, local, usuário único. Minimalista mas funcional.

## Decisões

- Stack: Next.js (App Router, TS) + Prisma + SQLite. Um container.
- Sem auth, sem export/import. Backup = copiar `data/finan.db`.
- BRL, UI em pt-BR.
- Escopo v1: entradas/saídas, categorias + tags, recorrentes e parcelas.
- Fora da v1: orçamento, múltiplas contas, import/export, mobile-first.
- Recorrentes/parcelas: **materializadas** como transações reais ligadas por `Recurrence`.

## Arquitetura

- Server Components leem o banco; Server Actions escrevem. Sem API REST.
- SQLite em `/data/finan.db`, volume do host (`./data:/data`).
- Dockerfile multi-stage, Next `standalone`, imagem final `node:alpine`.
- `docker-compose.yml`: porta `127.0.0.1:3000:3000`, volume de dados.
- Na subida: `prisma migrate deploy` → seed de categorias (se vazio) → `ensureGenerated` → servidor.

## Modelo de dados

- `Category`: id, name, color, kind (`INCOME` | `EXPENSE`).
- `Tag`: id, name. N:N com `Transaction`.
- `Transaction`: id, type, amountCents (Int), date, description, categoryId, recurrenceId (nullable), installmentNo / installmentTotal (nullable), isPaid.
- `Recurrence`: id, kind (`INSTALLMENT` | `RECURRING`), startDate, endDate (nullable), amountCents, categoryId, type, description, lastGeneratedUntil.
- Valores em centavos inteiros. Frequência mensal apenas.
- `isPaid` = Completed/Pending. Futuros nascem pendentes.

### Geração

- Parcelado: cria as N transações na criação. Centavos restantes vão para a primeira parcela; soma sempre bate.
- Recorrente: `ensureGenerated(+12 meses)` idempotente, usa `lastGeneratedUntil`. Roda na subida e ao abrir o app.
- Dia 31 em mês curto usa o último dia do mês.
- Editar/excluir item de grupo: "só esta" ou "esta e as seguintes".

## Telas

Sidebar fixa colapsável. Abaixo de ~1024px vira menu hambúrguer; cards empilham; tabela rola na horizontal.

1. **Dashboard**: seletor de mês; cards Saldo / Entradas / Saídas; gráfico de fluxo de caixa 12 meses (barras entradas vs saídas); gastos por categoria (treemap ou donut); últimas transações.
2. **Transações**: tabela com busca, filtros (mês, tipo, categoria, tag, status), ordenação; ações editar / excluir / marcar pago.
3. **Recorrentes e parcelas**: grupos ativos, próximo vencimento, restante; encerrar ou excluir.
4. **Categorias e tags**: CRUD com seletor de cor.

### Drawer "+ Novo"

Drawer lateral, aberto por botão ou tecla `N`. Toggle Entrada/Saída, valor grande, descrição, categoria em chips, data (hoje), tags. Seção recolhida "Repetir": Não repete / Mensal / Parcelado (N). Enter salva; opção "salvar e novo".

## Design visual

Dark mode, similar ao Fundcy de referência, com azul e laranja.

- Fundo `#0B0E14`, cards `#12161F`, bordas `#1C2230`, cantos 16–20px.
- Azul (`#3B82F6`–`#60A5FA`): entradas e ação primária. Laranja (`#F59E0B`–`#FB923C`): saídas e destaque.
- Pago em azul claro, Pendente em laranja suave.
- Números grandes com centavos em cor mais fraca; tooltip escuro nos gráficos (Recharts); listras diagonais sutis nas barras de fundo.
- Tipografia e detalhes finos definidos na implementação com a skill `frontend-design`.

## Estrutura

```
prisma/            schema.prisma, migrations/
src/
  app/             dashboard, transacoes, recorrentes, categorias
  components/      ui, charts
  server/          db.ts, actions.ts, queries.ts, recurrence.ts
  lib/             money.ts, dates.ts
Dockerfile, docker-compose.yml
```

## Erros

Validação básica no form (valor > 0, categoria obrigatória) com mensagem inline. Sem páginas de erro customizadas.

## Testes

Um arquivo Vitest para `recurrence.ts`: parcelas somam o valor exato; gerar duas vezes não duplica. Resto verificado manualmente: UI no browser e `docker compose up` + lançamento persistindo após restart.

## Seed

Categorias padrão na primeira subida (Salário, Alimentação, Moradia, Transporte, Lazer, Saúde...), editáveis.
