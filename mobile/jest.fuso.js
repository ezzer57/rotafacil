// Preparo global dos testes: roda uma vez, no processo principal do Jest,
// antes dos testes. Os horários das paradas aparecem no fuso de Quixadá, como
// no aparelho de quem usa o app; assim o teste dá o mesmo resultado em
// qualquer máquina, inclusive na integração contínua, que roda em UTC.
//
// Precisa ser aqui, e não no jest.setup.ts: lá cada teste recebe uma cópia do
// process.env, e mudar a cópia não muda o fuso.
module.exports = () => {
  process.env.TZ = 'America/Fortaleza';
};
