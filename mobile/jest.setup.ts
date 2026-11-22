// Preparo dos testes do aplicativo (Jest com o preset jest-expo).

// Os horários das paradas aparecem no fuso de Quixadá, como no aparelho de
// quem usa o app; assim o teste dá o mesmo resultado em qualquer máquina.
process.env.TZ = 'America/Fortaleza';

// O tema guarda a preferência no armazenamento do aparelho, que não existe
// no teste: usa a versão em memória que a própria biblioteca oferece.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Os ícones carregam a fonte depois de aparecer e se redesenham, o que enche
// o teste de avisos. Aqui a fonte já conta como carregada.
jest.mock('expo-font', () => ({
  ...jest.requireActual('expo-font'),
  isLoaded: () => true,
  loadAsync: () => Promise.resolve(),
}));
