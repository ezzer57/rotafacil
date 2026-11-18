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
```

O arquivo `.env` desta pasta define com qual API o aplicativo conversa:

```
EXPO_PUBLIC_API_URL=http://<IP do computador>:3333
```

Vazio ou ausente, o aplicativo roda em modo de demonstração, com dados
simulados (qualquer e-mail válido e a senha `12345678`).
