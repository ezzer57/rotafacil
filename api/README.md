# RotaFácil API

Servidor do RotaFácil: autenticação, persistência e o motor de roteirização
com estimativa de custo.

## Como rodar

```bash
cd api
npm install
cp .env.example .env          # ajuste o JWT_SECRET
npm run db:up                 # sobe o PostgreSQL via Docker
npx prisma migrate deploy     # cria as tabelas
npm run db:seed               # carrega cidades, tarifas e pontos
npm run dev                   # http://localhost:3333
```

Verificações:

```bash
npm run typecheck   # tipos
npm test            # testes automatizados
npm run contrato    # teste de contrato da API com a Postman CLI (servidor no ar)
```

## Estrutura

```
src/
├─ config/env.ts     configuração validada no boot (falha rápido)
├─ core/             motor puro: geo, tarifa e roteirização (+ testes)
├─ lib/              logger, cliente do banco e erros da aplicação
├─ middlewares/      autenticação, validação e tratamento de erros
├─ modules/          auth, cidades, pontos, roteiros e saúde
├─ contratos/        schemas Zod de entrada
├─ app.ts            montagem do Express
└─ server.ts         ciclo de vida do processo
```

A pasta `core/` é código puro: não conhece banco, HTTP nem Prisma. É o que
permite testar o algoritmo do trabalho sem subir infraestrutura.

## Endpoints

| Método | Rota | Autenticado | Função |
|---|---|---|---|
| GET | `/health/live` | não | Processo no ar |
| GET | `/health/ready` | não | Banco respondendo |
| POST | `/v1/users` | não | Cadastro |
| POST | `/v1/sessions` | não | Login, devolve JWT |
| GET | `/v1/me` | sim | Usuário da sessão |
| DELETE | `/v1/me` | sim | Exclusão da conta e de todos os dados |
| POST | `/v1/consents` | sim | Registro de consentimento |
| GET | `/v1/cities` | não | Cidades atendidas |
| GET | `/v1/places/:id` | não | Ponto de interesse |
| POST | `/v1/itineraries` | sim | Gera o roteiro |
| GET | `/v1/itineraries` | sim | Histórico paginado |
| GET | `/v1/itineraries/:id` | sim | Roteiro completo |
| PATCH | `/v1/itineraries/:id` | sim | Remove, troca ponto, muda ou tira o teto de gasto |
| POST | `/v1/itineraries/:id/checkins` | sim | Registra visita |
| DELETE | `/v1/itineraries/:id` | sim | Apaga o roteiro |

Todo erro sai no mesmo formato, com código estável:

```json
{ "erro": { "codigo": "NAO_ENCONTRADO", "mensagem": "Roteiro não encontrado" } }
```

## Decisões de projeto

**Motor separado do transporte.** O algoritmo vive em `core/`, sem
dependências. A camada HTTP só traduz entrada e saída.

**Dinheiro em `Decimal`.** Valores monetários usam `Decimal(10,2)` no banco.
Ponto flutuante acumula erro de arredondamento quando se somam custos.

**Teto de gasto opcional.** Sem `orcamento` (ou com `null`), nenhum ponto é
descartado pelo preço, mas o custo continua pesando na escolha, medido por
uma régua fixa de R$ 80 (`ORCAMENTO_DE_REFERENCIA`). Assim o roteiro segue
preferindo caminhadas e lugares mais baratos, e o app mostra o custo médio
previsto em vez do uso do orçamento.

**Senha com bcrypt custo 12.** O hash nunca sai do servidor. No login, a
comparação acontece mesmo quando o e-mail não existe, para o tempo de
resposta não denunciar quais e-mails estão cadastrados.

**Mensagem de erro genérica no login.** "E-mail ou senha incorretos" evita
enumeração de usuários.

**Validação na entrada, sempre.** Os schemas Zod são os mesmos do
aplicativo. A validação do cliente é conveniência; esta é a que vale.

**Transação na gravação do roteiro.** Roteiro, itens e descartados entram
juntos ou não entram.

**Limite de requisições.** 300 por 15 minutos no geral e 10 nas rotas de
credencial, para conter força bruta.

**Log estruturado com identificador de requisição.** Cada requisição recebe
um `x-request-id`, devolvido no cabeçalho, que acompanha todas as linhas de
log daquela chamada. Senha, token e cabeçalho de autorização são removidos
antes de gravar.

**Desligamento gracioso.** Em `SIGTERM`, o servidor para de aceitar conexões,
espera as requisições em andamento e fecha o banco antes de sair.

**Exclusão em cascata.** Apagar a conta apaga roteiros, itens, visitas e as
coordenadas de origem (LGPD, art. 18).

## Dados dos pontos

Nome, coordenada e endereço dos pontos de interesse vêm do
[OpenStreetMap](https://www.openstreetmap.org/copyright), © colaboradores do
OpenStreetMap, sob a licença ODbL. A carga fica em `prisma/seed.ts`, e cada
ponto guarda em `fonte` o elemento de origem. A coordenada é a do ponto de
chegada (a entrada, o início da trilha), não a do centro do lugar.

Ponto que sai da lista não é apagado: fica com `ativo = false`, fora dos
roteiros novos e visível nos antigos.

## Escolha e ordem das paradas

O benefício de cada ponto mistura a **relevância** (curadoria de 1 a 5, o mesmo
critério em todas as cidades, coluna `relevancia`) com a nota das avaliações
(média bayesiana, que pode faltar): 70% relevância, 30% nota. A relevância
entra ao cubo, para o símbolo da cidade (5) valer cerca de 4,6 vezes um ponto
de relevância 3.

1. **Fases:** primeiro entram os pontos de relevância 5, depois os de 4, por
   fim o resto, sempre pela razão benefício/consumo de tempo e dinheiro e só
   se couberem no tempo, no teto e nos horários. Sem as fases, um roteiro de
   4 horas em Quixadá ficava no centro, sem Açude do Cedro nem Galinha Choca.
   Nas fases dos imperdíveis só entram categorias que o usuário escolheu.
2. **2-opt:** com os pontos escolhidos, o motor inverte trechos da rota
   enquanto isso reduzir tempo e custo e a rota continuar válida (horários
   incluídos). Isso desfaz o zigue-zague da inserção gulosa. O tempo que
   sobra volta para a etapa 1.

A relevância é opinião do autor, não dado do OpenStreetMap: está em
`prisma/seed.ts` e deve ser validada por quem conhece cada cidade.

## Rotas pelas ruas

Distância e tempo entre as paradas vêm de um servidor **OSRM** (dados do
OpenStreetMap), a pé e de carro. A cada roteiro a API faz uma consulta de
matriz com a origem e todos os candidatos, e o motor decide a ordem e o modal
(a pé até 1 km de caminho) com essas medidas. Depois traça, trecho a trecho, as
ruas por onde o percurso passa; o aplicativo desenha o traçado no mapa.

- Cada trecho informa `fonte`: `ruas` (medido) ou `estimada` (linha reta ×
  1,3). O roteiro informa em `diagnostico.rotas` se foi `ruas`, `parcial` ou
  `estimada`, e o aplicativo mostra isso sob o mapa.
- Se o servidor não responder (6 s de prazo), o roteiro sai com a estimativa e
  a API para de insistir por 60 s, para o usuário não esperar a cada pedido.
- Os servidores públicos (`router.project-osrm.org` e
  `routing.openstreetmap.de`) são de demonstração: já levaram mais de 6 s para
  responder e não têm garantia. Para a apresentação, use um OSRM próprio:

```bash
bash osrm/preparar.sh                                # uma vez: baixa o mapa (~450 MB) e processa
docker compose -f osrm/docker-compose.yml up -d      # liga carro (5000) e a pé (5001)
```

  e, em `api/.env`: `OSRM_URL_CARRO=http://localhost:5000` e
  `OSRM_URL_A_PE=http://localhost:5001`. Com o servidor próprio, um roteiro de
  10 paradas sai em cerca de 100 ms.
- `ROTAS_PELAS_RUAS=false` desliga a consulta (os testes já rodam assim).

## Pendências conhecidas

- As tarifas carregadas pelo seed são **provisórias**; precisam ser trocadas
  pelos valores dos decretos municipais de Quixadá e Fortaleza.
- Parte dos horários dos pontos é suposição (a carga informa quantos), e
  tempo de visita e faixa de preço são estimativas. As notas dos pontos mais
  antigos são fictícias, e os pontos novos não têm nota.
- Os candidatos de um roteiro são todos os pontos ativos da cidade (até 40).
  Quando o volume de pontos crescer, vale filtrar por proximidade com PostGIS.
