# Finan

Finanças pessoais, local.

    docker compose up -d --build   # http://127.0.0.1:3333 (FINAN_PORT muda a porta)
    docker compose down

Dados em `./data/finan.db` (backup = copiar esse arquivo).

Desenvolvimento: `npm i && npx prisma migrate dev && npm run dev`. Testes: `npm test`.
