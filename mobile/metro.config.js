// Metro, o empacotador do aplicativo, com acesso ao motor e aos dados da API.
//
// O modo de demonstração usa o MESMO motor de roteirização da API
// (api/src/core) e os MESMOS dados das cidades (api/prisma/dados), e não
// cópias: assim os dois nunca divergem. As pastas ficam fora da pasta do
// aplicativo, por isso entram em watchFolders. E o motor importa os vizinhos
// no padrão do Node ("./geo.js" para o arquivo geo.ts), que o Metro não
// traduz sozinho.
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const MOTOR = path.resolve(__dirname, '..', 'api', 'src', 'core');
const DADOS = path.resolve(__dirname, '..', 'api', 'prisma', 'dados');

const config = getDefaultConfig(__dirname);

config.watchFolders = [...(config.watchFolders ?? []), MOTOR, DADOS];
// O código dessas pastas, depois de transformado, usa bibliotecas do app
// (como @babel/runtime): elas são procuradas também em mobile/node_modules.
config.resolver.nodeModulesPaths = [
  ...(config.resolver.nodeModulesPaths ?? []),
  path.resolve(__dirname, 'node_modules'),
];

const resolverPadrao = config.resolver.resolveRequest;
config.resolver.resolveRequest = (contexto, nome, plataforma) => {
  const doMotor = contexto.originModulePath.startsWith(MOTOR);
  const semExtensao =
    doMotor && nome.startsWith('.') && nome.endsWith('.js') ? nome.slice(0, -3) : nome;
  return (resolverPadrao ?? contexto.resolveRequest)(contexto, semExtensao, plataforma);
};

module.exports = config;
