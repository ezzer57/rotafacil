# RotaFácil

Aplicativo móvel para roteirização turística urbana baseada em geolocalização,
com estimativa de custo de deslocamento e controle de micro-orçamento diário.

Trabalho de Conclusão de Curso — Sistemas de Informação
Centro Universitário Católica de Quixadá

---

## Estado atual

| Parte | Situação |
|---|---|
| Camada visual (telas) | Funcionando |
| Algoritmo de roteirização e custo | Funcionando, rodando localmente no aplicativo |
| Localização (GPS) | Funcionando (`expo-location`, apenas em primeiro plano) |
| Dados | Simulados por padrão; com `EXPO_PUBLIC_API_URL` definida, o app usa a API |
| Backend (Node.js + Express) | Funcionando (`api/`) |
| Banco de dados (PostgreSQL) | Modelado, com migração e carga inicial |
| APIs do Google (Places e Routes) | A fazer |
| Mapa do percurso | Funcionando (Leaflet + OpenStreetMap, sem chave de API) |

As tarifas de táxi usadas na estimativa são **provisórias** e precisam ser
substituídas pelos valores dos decretos municipais de Quixadá e Fortaleza.

## Como rodar

```bash
cd mobile
npm install
npm run web      # abre em http://localhost:8081
npx expo start   # QR code para o aplicativo Expo Go no celular
```

Credencial de demonstração (modo simulado): qualquer e-mail válido com a senha `123456`.

### Rodando com a API de verdade

```bash
cd api && npm install && cp .env.example .env
npm run db:up && npx prisma migrate deploy && npm run db:seed
npm run dev                                   # http://localhost:3333
```

Depois, no aplicativo, crie `mobile/.env` com o endereço do servidor:

```
EXPO_PUBLIC_API_URL=http://localhost:3333
```

Sem essa variável o aplicativo continua com dados simulados, o que mantém a
demonstração funcionando sem servidor. No celular pelo Expo Go, use o IP do
computador na rede local em vez de `localhost`.

## Estrutura

```
api/
└─ src/
   ├─ core/        motor puro: geo, tarifa e roteirização (com testes)
   ├─ modules/     auth, cidades, pontos, roteiros e saúde
   ├─ middlewares/ autenticação, validação e erros
   └─ config/      configuração validada no boot

mobile/
└─ src/
   ├─ app/        telas (expo-router)
   ├─ components/ biblioteca de componentes visuais
   │  └─ mapa/    mapa do percurso (WebView no celular, iframe no navegador)
   ├─ domain/     tipos, validação e formatação (contrato com a API)
   ├─ data/
   │  ├─ mock/    dados e algoritmo simulados (sai quando o backend entrar)
   │  ├─ http/    cliente da API real (pronto, desligado)
   │  ├─ services.ts  interfaces dos serviços
   │  └─ provider.tsx ÚNICO ponto de troca entre mock e backend
   ├─ hooks/      acesso a dados e à localização do aparelho
   └─ theme/      tokens e temas claro/escuro
```

## Tecnologias

- **Aplicativo:** React Native (Expo SDK 57), TypeScript, expo-router, TanStack Query, Zod
- **Backend (planejado):** Node.js, Express, TypeScript, Prisma, PostgreSQL + PostGIS, JWT
- **APIs externas (planejado):** Google Places API (New) e Routes API

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
