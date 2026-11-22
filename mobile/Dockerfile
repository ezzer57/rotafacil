# Aplicativo do RotaFácil como site, servido pelo nginx.
#
# Usado pelo docker-compose.yml da raiz do projeto. O endereço da API entra
# no momento do build (EXPO_PUBLIC_API_URL) e fica gravado no site; vazio, o
# site roda em modo de demonstração, com dados simulados e sem servidor.

FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# O motor de roteirização da API, que o modo de demonstração usa (ver
# metro.config.js). Fica em ../api/src/core, como no repositório.
COPY --from=motor . /api/src/core

ARG EXPO_PUBLIC_API_URL=
ENV EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}
ENV CI=1
RUN npx expo export --platform web --output-dir dist-web

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist-web /usr/share/nginx/html
EXPOSE 80
