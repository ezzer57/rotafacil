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

## Pendências conhecidas

- As tarifas carregadas pelo seed são **provisórias**; precisam ser trocadas
  pelos valores dos decretos municipais de Quixadá e Fortaleza.
- Parte dos horários dos pontos é suposição (a carga informa quantos), e
  tempo de visita e faixa de preço são estimativas. As notas dos pontos mais
  antigos são fictícias, e os pontos novos não têm nota.
- Distância e tempo ainda são estimados pela linha reta × 1,3, não pelas ruas.
- Os candidatos de um roteiro são todos os pontos ativos da cidade (até 40).
  Quando o volume de pontos crescer, vale filtrar por proximidade com PostGIS.
