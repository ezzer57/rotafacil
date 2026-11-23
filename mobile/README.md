# RotaFácil: aplicativo

Aplicativo em React Native com Expo (SDK 57). Roda no celular pelo Expo Go e
no navegador.

O passo a passo completo (tecnologias necessárias, como rodar com Docker, no
celular ou em modo de demonstração, e problemas comuns) está no
[README da raiz do projeto](../README.md).

## Resumo

```bash
npm install
npx expo start      # QR code para o Expo Go; aperte "w" para abrir no navegador
npx tsc --noEmit    # confere os tipos
npm run lint        # regras de código
npm test            # componentes, regras e os fluxos principais (entrar, gerar roteiro, check-in, recalcular)
npx expo-doctor     # versões dos pacotes de acordo com o SDK
```

Os testes rodam sempre no modo de demonstração, mesmo com o `.env` apontando
para a API.

No PowerShell do Windows, se aparecer "a execução de scripts foi
desabilitada", use `npm.cmd` e `npx.cmd` no lugar de `npm` e `npx` (por
exemplo, `npx.cmd expo start`). Para testar no celular com a API do Docker,
siga o modo 2 do [README da raiz](../README.md#2-no-celular-com-o-docker-e-o-expo-go-recomendado-para-testar-no-aparelho).

## Dependências

- Instale e atualize pacotes com `npx expo install`, que escolhe a versão
  compatível com o SDK 57; confira depois com `npx expo-doctor`.
- `react-test-renderer` fica na mesma versão exata do `react`: com versões
  diferentes, os testes não renderizam.
- Os `overrides` do `package.json` trocam o `glob` e o `minimatch` usados pelo
  `@expo/fingerprint` (ferramenta de build) por versões sem falha conhecida.
  O resultado dele foi conferido igual com e sem a troca.
- **Não force** uma versão nova do `query-string` no `expo-router`: o
  `expo-router` do SDK 57 o importa de um jeito que a versão 9 não aceita, e
  a navegação quebra (os testes de fluxo acusam). Os 3 avisos que o
  `npm audit` ainda mostra vêm daí e somem com o SDK 58; o risco está
  descrito no [README da API](../api/README.md#segurança-e-lgpd).

O arquivo `.env` desta pasta define com qual API o aplicativo conversa:

```
EXPO_PUBLIC_API_URL=http://<IP do computador>:3333
```

Vazio ou ausente, o aplicativo roda em modo de demonstração, com dados
simulados (qualquer e-mail válido e a senha `12345678`).
