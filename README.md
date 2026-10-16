# Finan

Finanças pessoais, local, para uso individual. Next.js + Prisma + SQLite.

## Rodar (desenvolvimento)

    npm install
    cp .env.example .env
    npm run dev                 # aplica as migrations e sobe em http://localhost:3333

O banco é um arquivo SQLite, definido por `DATABASE_URL` no `.env`. Por padrão é `data/finan.db`, o mesmo arquivo que o Docker usa. Para fazer backup, copie esse arquivo.

Testes: `npm test`.

## Docker

    docker compose up -d --build   # http://127.0.0.1:3333 (FINAN_PORT muda a porta)
    docker compose down

No Docker o banco também fica em `./data/finan.db`, então dev e Docker compartilham os dados. Não rode os dois ao mesmo tempo: ambos usam a porta 3333 e o mesmo arquivo.

## Agente WhatsApp (Mastra + Wuzapi)

O sistema possui um agente financeiro integrado ao WhatsApp usando [Mastra](https://mastra.ai) (agente) e [Wuzapi](https://github.com/asternic/wuzapi) (conexão WhatsApp).

### Arquitetura

```
WhatsApp → Wuzapi (:8088) → webhook → Finan (:3000)
                                       ↓
                                   Mastra Agent
                                   ├── financas (texto: nemotron)
                                   └── financas-visao (mídia: gemma)
                                       ↓
                                   Resposta → Wuzapi → WhatsApp
```

### Configuração do agente

Variáveis no `.env`:

```bash
# OpenRouter (provedor de IA)
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=nvidia/nemotron-3-ultra-550b-a55b:free
OPENROUTER_VISION_MODEL=google/gemma-4-26b-a4b-it:free
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Wuzapi (WhatsApp)
WUZAPI_ADMIN_TOKEN=           # token admin do Wuzapi
WUZAPI_USER_TOKEN=            # token do usuário WhatsApp (ex: finan-whatsapp-token)
WUZAPI_GLOBAL_ENCRYPTION_KEY= # chave de criptografia (32 bytes)
WUZAPI_GLOBAL_HMAC_KEY=       # chave HMAC para assinatura de webhooks
WUZAPI_WEBHOOK_URL=http://finan:3000/api/whatsapp/webhook
```

### Conectar WhatsApp

1. Suba os containers: `docker compose up -d --build`
2. Acesse `http://localhost:3333/conexao`
3. Clique em "Conectar"
4. Escaneie o QR Code com o WhatsApp
5. Após conectado, o agente responderá mensagens de:
   - **Lucas** (5522981073895)
   - **Larissa** (5522981503492)

### Funcionalidades do agente

O agente financeiro entende linguagem natural e pode:

| Operação | Exemplo |
|---|---|
| Consultar saldo | "Quanto tenho disponível?" |
| Registrar receita/despesa | "Registre uma despesa de R$ 80 com alimentação" |
| Listar transações | "Quais foram meus últimos gastos?" |
| Editar transação | "Altere o valor daquela despesa para R$ 150" |
| Excluir transação | "Exclua a movimentação que registrei por engano" |
| Resumo do mês | "Resumo de outubro" |
| Gastos por categoria | "Quanto gastei com alimentação este mês?" |
| Contas pendentes | "Quais contas vencem esta semana?" |
| Fluxo de caixa | "Como foi meu fluxo de caixa em outubro?" |

### Modelos de IA

- **Texto:** `nvidia/nemotron-3-ultra-550b-a55b:free` (configurável via `OPENROUTER_MODEL`)
- **Mídia (imagens/docs/vídeos):** `google/gemma-4-26b-a4b-it:free` (configurável via `OPENROUTER_VISION_MODEL`)

### Estrutura do agente

```
src/
├── mastra/
│   ├── index.ts              # Instância Mastra com 2 agentes
│   └── tools.ts              # 12 ferramentas financeiras
├── app/
│   ├── api/
│   │   ├── [...mastra]/      # API Mastra (gerenciamento de agentes)
│   │   ├── whatsapp/webhook/ # Webhook do WhatsApp
│   │   └── conexao/          # API de conexão (QR Code)
│   └── conexao/              # Página de conexão WhatsApp
```