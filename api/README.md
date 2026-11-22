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

Em produção, com `NODE_ENV=production` no `.env` ou no ambiente:

```bash
npm start                     # mesma API, sem recarregar a cada alteração
```

A API roda direto do TypeScript com o `tsx`, como no desenvolvimento: não há
etapa de compilação, e os atalhos de importação `@/` funcionam igual nos dois
modos. `npm run build` só confere os tipos do código de produção.

Verificações:

```bash
npm run typecheck          # tipos
npm test                   # testes de unidade (motor, cliente de rotas, HTTP sem banco)
npm run test:integracao    # API inteira contra o PostgreSQL (precisa do npm run db:up)
npm run contrato           # teste de contrato da API com a Postman CLI (servidor no ar)
```

Os testes de integração usam um banco à parte, `rotafacil_test`, criado na
primeira execução no mesmo PostgreSQL do Docker, e apagam os dados dele antes
de cada teste. Por segurança, só rodam em banco com "test" no nome.

## Estrutura

```
src/
├─ config/env.ts     configuração validada no boot (falha rápido)
├─ core/             motor puro: geo, tarifa e roteirização (+ testes)
├─ lib/              logger, cliente do banco e erros da aplicação
├─ middlewares/      autenticação, validação e tratamento de erros
├─ modules/          auth, cidades, pontos, roteiros e saúde
│  └─ roteiros/      serviço (regras), repositório (banco) e gravação (motor → tabelas)
├─ testes/           apoio dos testes de integração
├─ contratos/        schemas Zod de entrada
├─ app.ts            montagem do Express
└─ server.ts         ciclo de vida do processo
```

A pasta `core/` é código puro: não conhece banco, HTTP nem Prisma. É o que
permite testar o algoritmo do trabalho sem subir infraestrutura, e o que deixa
o modo de demonstração do aplicativo usar este mesmo motor, sem cópia (ver
`mobile/metro.config.js`). Por isso nada em `core/` pode importar biblioteca
de Node, de banco ou de rede.

O contrato com o aplicativo é conferido na compilação:
`src/modules/roteiros/formato-do-app.ts` exige que cada resposta caiba nos
tipos de `mobile/src/domain/types.ts`, e `npm run typecheck` falha se não couber.

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

## Segurança e LGPD

Riscos considerados e como cada um está tratado. O que diz "aceito" é uma
limitação conhecida do protótipo, justificada.

| Risco | Como está tratado |
|---|---|
| Senha vazada do banco | Hash bcrypt com custo 12; o hash nunca sai da API. A senha vai até 72 bytes, o que o bcrypt de fato lê |
| Adivinhar senha | 10 tentativas de cadastro e login por IP a cada 15 minutos; mensagem igual para senha errada e e-mail inexistente, com o mesmo tempo de resposta |
| Escapar do limite trocando de IP | O cabeçalho `X-Forwarded-For` só vale com `TRUST_PROXY` configurado para a hospedagem (0 por padrão) |
| Token forjado ou adulterado | JWT HS256 com segredo de 32 caracteres ou mais, conferido na partida. Só HS256 é aceito (nem `none`, nem outro algoritmo), e o emissor e o usuário são conferidos |
| Token de conta apagada | Toda requisição autenticada confere se a conta ainda existe |
| Token roubado do aparelho | No celular, fica no SecureStore (Keychain no iPhone, Keystore no Android) e expira em 7 dias. No navegador fica no armazenamento local, ao alcance de um script malicioso na página: aceito no protótipo, que não carrega script de terceiros além do Leaflet |
| Ver ou mexer no roteiro de outra pessoa | Toda consulta filtra pelo dono. Roteiro alheio responde 404, sem confirmar que existe |
| Pedido vindo de outro site, pelo navegador | Lista de origens autorizadas (`CORS_ORIGENS`), sem credenciais de navegador: o token vai no cabeçalho, nunca em cookie |
| Dado pessoal no log | Senha, token e cabeçalho `Authorization` são removidos; o corpo das requisições, com a posição do usuário, não vai para o log; o identificador de requisição vindo do cliente só é aceito se for curto e simples |
| Corpo gigante ou JSON malformado | Limite de 100 KB e erro no formato padrão |
| Erro interno revelando detalhes | Em produção, 500 genérico; o detalhe fica só no log |
| Injeção de SQL | Prisma com consultas parametrizadas; nenhuma SQL é montada com dado do usuário |
| Dados enviados a terceiros | O OSRM recebe a partida e as coordenadas dos pontos; mapa, fotos e Leaflet recebem o IP. Tudo declarado na Política de Privacidade, com a transferência internacional (art. 33, VIII). Com servidor de rotas próprio, as coordenadas não saem |
| Direito de eliminação (art. 18) | `DELETE /v1/me` apaga conta, roteiros, paradas, visitas e aceites, em cascata; um teste de integração confere |
| Prova do consentimento (art. 8º) | O aceite fica gravado com tipo, versão da política e data |
| Cadastro revela se o e-mail existe | Inevitável num cadastro ("e-mail já cadastrado"); contido pelo limite de tentativas. Aceito |
| Tráfego sem criptografia | Local, em HTTP. Pendente: exigir HTTPS na hospedagem, quando ela for escolhida |
| Segredos de demonstração | O `JWT_SECRET` e a senha do banco do `docker-compose.yml` são de demonstração e precisam ser trocados ao publicar |
| Dependências com falha conhecida | Pendente: `npm audit` e atualização na etapa 9 da revisão |

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

**Horário de funcionamento não tira ninguém do roteiro.** Um lugar fechado na
hora prevista entra marcado (`situacaoNoHorario`: `fechado` ou
`fecha-durante-a-visita`) e o aplicativo avisa na parada. Ele vale um quinto de
um aberto na escolha, as fases dos imperdíveis só aceitam lugares abertos, e o
2-opt não troca uma visita aberta por uma fechada. Lugares ao ar livre
(`arLivre`: parques, praças, praias, mirantes e trilhas) nunca ficam fora do
horário; o Parque do Cocó tem portões no OpenStreetMap, mas entra como os demais.

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

## Fotos dos pontos

As fotos são do Wikimedia Commons, só com licença livre (domínio público, CC0,
CC BY ou CC BY-SA), e foram conferidas uma a uma. Cada ponto guarda a URL da
miniatura (`fotoUrl`), o crédito com autor e licença (`fotoCredito`) e a página
da foto (`fotoFonte`); o aplicativo mostra o crédito junto da foto. Ponto sem
foto livre conhecida fica sem imagem: hoje são o Mercado Público de Quixadá,
os quatro restaurantes de Quixadá e o Centro das Tapioqueiras.

## Pendências conhecidas

- As tarifas carregadas pelo seed são **provisórias**; precisam ser trocadas
  pelos valores dos decretos municipais de Quixadá e Fortaleza.
- Parte dos horários dos pontos é suposição (a carga informa quantos), e
  tempo de visita e faixa de preço são estimativas. Nenhum ponto tem nota de
  avaliação (o OpenStreetMap não traz): a parte da nota no benefício fica
  neutra até haver uma fonte real.
- Os candidatos de um roteiro são todos os pontos ativos da cidade (até 40).
  Quando o volume de pontos crescer, vale filtrar por proximidade com PostGIS.
