// Metro, o empacotador do aplicativo, com acesso ao motor da API.
//
// O modo de demonstração usa o MESMO motor de roteirização da API
// (api/src/core), e não uma cópia: assim os dois nunca divergem. O motor fica
// fora da pasta do aplicativo, por isso entra em watchFolders. E ele importa
// os vizinhos no padrão do Node ("./geo.js" para o arquivo geo.ts), que o
// Metro não traduz sozinho.
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const MOTOR = path.resolve(__dirname, '..', 'api', 'src', 'core');

const config = getDefaultConfig(__dirname);

config.watchFolders = [...(config.watchFolders ?? []), MOTOR];

const resolverPadrao = config.resolver.resolveRequest;
config.resolver.resolveRequest = (contexto, nome, plataforma) => {
  const doMotor = contexto.originModulePath.startsWith(MOTOR);
  const semExtensao =
    doMotor && nome.startsWith('.') && nome.endsWith('.js') ? nome.slice(0, -3) : nome;
  return (resolverPadrao ?? contexto.resolveRequest)(contexto, semExtensao, plataforma);
};

module.exports = config;
