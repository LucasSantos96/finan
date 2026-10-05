# Finan

Finanças pessoais, local, para uso individual. Next.js + Prisma + SQLite.

## Rodar (desenvolvimento)

    npm install
    copy .env.example .env      # Linux/Mac: cp .env.example .env
    npm run dev                 # aplica as migrations e sobe em http://localhost:3333

O banco é um arquivo SQLite, definido por `DATABASE_URL` no `.env`. Por padrão é `data/finan.db`, o mesmo arquivo que o Docker usa. Para fazer backup, copie esse arquivo.

Testes: `npm test`.

## Docker (opcional, não é o caminho padrão)

O `Dockerfile` e o `docker-compose.yml` continuam no repositório para uso futuro. O build é lento, por isso o dia a dia é com `npm run dev`.

    docker compose up -d --build   # http://127.0.0.1:3333 (FINAN_PORT muda a porta)
    docker compose down

No Docker o banco também fica em `./data/finan.db`, então dev e Docker compartilham os dados. Não rode os dois ao mesmo tempo: ambos usam a porta 3333 e o mesmo arquivo.
