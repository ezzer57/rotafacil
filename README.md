# RotaFácil

Aplicativo móvel para roteirização turística urbana baseada em geolocalização,
com estimativa de custo de deslocamento e controle de micro-orçamento diário.

Trabalho de Conclusão de Curso — Sistemas de Informação
Centro Universitário Católica de Quixadá

---

## Estado atual

| Parte | Situação |
|---|---|
| Telas (login, nova rota, roteiro, histórico, perfil) | Funcionando, no celular e no navegador |
| Algoritmo de roteirização | Funcionando na API: escolha gulosa por relevância, tempo e custo, com 2-opt contra zigue-zague |
| Localização (GPS) | Funcionando, só em primeiro plano, com mapa da posição, margem de erro e correção por toque |
| Pontos turísticos | 22 lugares reais do OpenStreetMap (13 em Quixadá, 9 em Fortaleza) |
| Distância e tempo | Pelas ruas (OSRM, dados do OpenStreetMap), com reserva em linha reta × 1,3 quando o servidor não responde |
| Mapa do percurso | Leaflet + OpenStreetMap, sem chave de API, com o trajeto pelas ruas |
| Backend e banco | API em Node.js com PostgreSQL, migrações e carga inicial |
| Rodar sem Expo Go | Um comando com Docker, abrindo no navegador |

Ainda provisório: as tarifas de táxi (a trocar pelos decretos municipais de
Quixadá e Fortaleza), 10 dos 22 horários de funcionamento (suposições), as
fotos dos lugares (imagens aleatórias) e a relevância de cada ponto
(curadoria do autor). Nenhum ponto tem nota de avaliação, porque o
OpenStreetMap não traz essa informação.

## Tecnologias necessárias

### Para usar o aplicativo (testar, avaliar, apresentar)

| Programa | Para quê | Onde baixar |
|---|---|---|
| **Docker Desktop** (Windows ou macOS) ou Docker Engine com Compose v2 (Linux) | Sobe banco, API e site sem instalar mais nada | https://www.docker.com/products/docker-desktop/ |
| **Git** (opcional) | Baixar o projeto; dá para baixar como ZIP pelo GitHub | https://git-scm.com/ |
| Navegador atualizado | Usar o aplicativo | Chrome, Edge, Firefox ou Safari |

No Windows, o Docker Desktop pede o WSL 2 na instalação; é só aceitar e
reiniciar. Deixe cerca de 3 GB livres em disco para as imagens.

### Para desenvolver (mexer no código, testar no celular)

| Programa | Versão | Para quê |
|---|---|---|
| **Node.js** com npm | 22 LTS ou mais recente | Rodar a API e o aplicativo |
| **Docker Desktop** | atual | Banco de dados PostgreSQL |
| **Expo Go** no celular | a da loja, atualizada (SDK 57) | Abrir o aplicativo no celular |
| Postman CLI (opcional) | atual | Teste de contrato da API (`npm run contrato`) |

## Como rodar

Primeiro, baixe o projeto:

```bash
git clone https://github.com/ezzer57/rotafacil.git
cd rotafacil
```

Sem Git: no GitHub, **Code → Download ZIP**, descompacte e abra um terminal
dentro da pasta.

### 1. No navegador, com um comando (recomendado para quem só quer usar)

Com o Docker Desktop aberto, na pasta do projeto:

```bash
docker compose up --build
```

Quando o terminal mostrar `RotaFácil API no ar`, abra
**http://localhost:8080** e crie uma conta. Sobem o banco (com as cidades e os
pontos já carregados), a API e o aplicativo como site. A primeira vez leva
alguns minutos, porque o Docker baixa as imagens e monta o site.

- **Parar:** `Ctrl+C` no terminal, ou `docker compose down`. Os dados
  continuam salvos; `docker compose down -v` apaga também o banco.
- **Atualizar depois de baixar uma versão nova:** rode de novo
  `docker compose up --build` e recarregue a página com `Ctrl+F5`.
- **Porta 3333 ou 8080 ocupada:** copie `.env.example` para `.env` e troque
  `API_PORTA` ou `WEB_PORTA`.
- **Posição no computador:** o navegador acha a posição pelo Wi-Fi, com erro
  de centenas de metros. Toque no mapa da tela Nova rota para marcar o ponto
  de partida.

### 2. No celular, com o Expo Go (desenvolvimento)

São três terminais, todos a partir da pasta do projeto. O celular precisa
estar no mesmo Wi-Fi do computador.

**Terminal 1, banco de dados** (pode fechar depois que terminar):

```bash
cd api
npm install
cp .env.example .env
npm run db:up
npx prisma migrate deploy
npm run db:seed
```

No `api/.env`, troque o `JWT_SECRET` por um texto longo qualquer (mínimo de
32 caracteres). Se a porta 5432 já estiver em uso por outro PostgreSQL, use
`DB_PORTA=5433` e ajuste a porta na `DATABASE_URL`.

**Terminal 2, API** (fica aberto):

```bash
cd api
npm run dev
```

Confira em http://localhost:3333/health/live, que deve responder `ok`.

**Terminal 3, aplicativo** (fica aberto). Antes, crie o arquivo `mobile/.env`
com o IP do computador na rede (no Windows, veja com `ipconfig`; no macOS e
no Linux, com `ip addr` ou nas configurações de rede):

```
EXPO_PUBLIC_API_URL=http://192.168.0.10:3333
```

Depois:

```bash
cd mobile
npm install
npx expo start
```

Escaneie o QR code com o Expo Go (Android) ou com a câmera (iPhone). Para
abrir no navegador do computador em vez do celular, aperte `w` no terminal.

Não rode este modo e o do Docker ao mesmo tempo: os dois usam a porta 3333.

### 3. Só o aplicativo, sem servidor (modo de demonstração)

Deixe `EXPO_PUBLIC_API_URL` vazio no `mobile/.env` (ou não crie o arquivo) e
rode só o terminal 3. O aplicativo usa dados simulados: entre com qualquer
e-mail válido e a senha `12345678`. Nesse modo as distâncias são sempre
estimadas em linha reta e nada fica salvo.

### Problemas comuns

| Sintoma | O que fazer |
|---|---|
| O celular abre o app, mas não entra ou não gera roteiro | Confira o IP no `mobile/.env`, se celular e computador estão no mesmo Wi-Fi e se o firewall do Windows libera o Node na rede privada. Redes de faculdade costumam bloquear isso: use o modo 1 |
| `port is already allocated` ou `EADDRINUSE` | Outra coisa usa a porta: feche a outra API, ou troque a porta (`API_PORTA`, `WEB_PORTA`, `DB_PORTA`) |
| Roteiro avisa "distâncias estimadas em linha reta" | O servidor público de rotas demorou. Tente de novo, ou use um servidor próprio: `bash osrm/preparar.sh` (baixa cerca de 450 MB) e o perfil `osrm` do `docker-compose.yml` |
| Lugar aparece "Fechado nesse horário" | Não é erro: o lugar entra no roteiro marcado para você decidir. Escolha outro horário de início para vê-lo aberto |

## Tecnologias usadas

| Parte | Tecnologias |
|---|---|
| Aplicativo | React Native 0.86 com Expo SDK 57, TypeScript, Expo Router, TanStack Query, Zod, expo-location |
| Mapas | Leaflet 1.9 com mapas do OpenStreetMap (WebView no celular, iframe no navegador) |
| API | Node.js, Express 5, TypeScript (executado com tsx), Zod, JWT, bcrypt, pino |
| Banco | PostgreSQL 16 com Prisma 6 (migrações e carga inicial) |
| Rotas | OSRM com dados do OpenStreetMap (servidores públicos ou próprio, em Docker) |
| Testes | Vitest (motor, cliente de rotas e HTTP) e Postman CLI (contrato da API) |
| Entrega | Docker Compose, nginx (site), GitHub Actions (integração contínua) |

Dados de mapa e de pontos: © colaboradores do OpenStreetMap, licença ODbL.

## Estrutura

```
api/
└─ src/
   ├─ core/        motor puro: geo, tarifa, roteirização e medidas pelas ruas (com testes)
   ├─ lib/         banco, log, erros e cliente do servidor de rotas (OSRM)
   ├─ modules/     auth, cidades, pontos, roteiros e saúde
   ├─ middlewares/ autenticação, validação e erros
   └─ config/      configuração validada no boot

mobile/
└─ src/
   ├─ app/        telas (expo-router)
   ├─ components/ biblioteca de componentes visuais
   │  └─ mapa/    mapas do percurso e do ponto de partida (WebView no celular, iframe no navegador)
   ├─ domain/     tipos, validação e formatação (contrato com a API)
   ├─ data/
   │  ├─ mock/    dados e algoritmo do modo de demonstração (espelham a API)
   │  ├─ http/    cliente da API real
   │  ├─ services.ts  interfaces dos serviços
   │  └─ provider.tsx ÚNICO ponto de troca entre modo de demonstração e API
   ├─ hooks/      acesso a dados e à localização do aparelho
   └─ theme/      tokens e temas claro/escuro

osrm/              preparo de um servidor de rotas próprio (opcional)
docker-compose.yml tudo em um comando: banco, API e site
```

## Versionamento

Cada versão estável recebe uma etiqueta (`tag`), para ser possível voltar a
qualquer ponto caso uma alteração quebre o aplicativo.

```bash
git tag -n                 # lista as versões com descrição
git checkout v0.1.0        # abre uma versão anterior para conferir
git switch main            # volta para a versão atual
```

| Versão | Conteúdo |
|---|---|
| v0.1.0 | Camada visual completa com dados simulados: login, cadastro, início, nova rota, roteiro com custo por trecho, histórico, perfil e tema claro/escuro |
