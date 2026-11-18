# API do RotaFácil em contêiner.
#
# Usada pelo docker-compose.yml da raiz do projeto. Ao subir, aplica as
# migrações e a carga inicial (as duas podem rodar de novo sem duplicar nada)
# e só então liga a API.

FROM node:22-bookworm-slim

# O Prisma precisa do OpenSSL para falar com o PostgreSQL.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependências primeiro: o Docker reaproveita esta camada enquanto o
# package-lock.json não mudar. Instala também as de desenvolvimento, porque
# o Prisma CLI (migrações) é uma delas.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund && npx prisma generate

COPY tsconfig.json ./
COPY src ./src

ENV NODE_ENV=production
ENV PORT=3333
EXPOSE 3333

CMD ["sh", "-c", "npx prisma migrate deploy && npm run db:seed && npm start"]
