import { descreverLocalizacao } from '../descrever-localizacao';

const leitura = {
  estado: 'obtida' as const,
  precisaoM: 20,
  descricao: 'Centro, Quixadá',
  erro: null,
  refinando: false,
  aproximada: false,
  precisaAbrirAjustes: false,
};
const usandoGps = { modo: 'gps' as const, gpsNaCidade: true, detectada: null };
const noCentro = { modo: 'centro' as const, gpsNaCidade: false, detectada: null };

describe('descreverLocalizacao', () => {
  it('GPS preciso: diz onde a pessoa está e a margem de erro', () => {
    const d = descreverLocalizacao(leitura, usandoGps, 'Quixadá', false);
    expect(d.tom).toBe('sucesso');
    expect(d.titulo).toBe('Você está em Centro, Quixadá');
    expect(d.detalhe).toMatch(/cerca de 20 m/);
    expect(d.acao).toBeNull();
  });

  it('GPS impreciso: alerta e oferece atualizar', () => {
    const d = descreverLocalizacao({ ...leitura, precisaoM: 450 }, usandoGps, 'Quixadá', false);
    expect(d.tom).toBe('alerta');
    expect(d.acao).toBe('atualizar');
  });

  it('localização aproximada (Android 12+, iOS 14+): pede para conferir no mapa', () => {
    const d = descreverLocalizacao({ ...leitura, aproximada: true }, usandoGps, 'Quixadá', false);
    expect(d.detalhe).toMatch(/aproximada/);
    expect(d.acao).toBe('atualizar');
  });

  it('permissão negada de vez, no celular: leva aos ajustes', () => {
    const negada = { ...leitura, estado: 'negada' as const, precisaAbrirAjustes: true };
    expect(descreverLocalizacao(negada, noCentro, 'Quixadá', false).acao).toBe('abrir-ajustes');
    // No navegador não há ajustes para abrir: tenta de novo.
    expect(descreverLocalizacao(negada, noCentro, 'Quixadá', true).acao).toBe('tentar-de-novo');
  });

  it('fora das cidades atendidas: diz qual é a mais próxima e a distância', () => {
    const detectada = {
      cidade: {
        id: 'quixada',
        nome: 'Quixadá',
        uf: 'CE',
        pais: 'Brasil',
        bandeira: 'BR',
        centro: { lat: -4.97, lng: -39.01 },
        tarifaCalibrada: true,
      },
      distanciaKm: 420,
      dentroDaCobertura: false,
    };
    const d = descreverLocalizacao(leitura, { ...noCentro, detectada }, 'Quixadá', false);
    expect(d.titulo).toBe('Você está fora das cidades atendidas');
    expect(d.detalhe).toMatch(/Quixadá, a 420 km/);
  });

  it('GPS desligado: explica e oferece tentar de novo', () => {
    const d = descreverLocalizacao(
      { ...leitura, estado: 'desligada' as const },
      noCentro,
      'Quixadá',
      false,
    );
    expect(d.titulo).toMatch(/desligada/);
    expect(d.detalhe).toMatch(/centro de Quixadá/);
    expect(d.acao).toBe('tentar-de-novo');
  });
});
