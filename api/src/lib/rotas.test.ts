/**
 * Testes do cliente de rotas, com um "fetch" de mentira: sem rede.
 */

import { describe, expect, it, vi } from 'vitest';

import { criarClienteDeRotas, simplificarTracado } from './rotas.js';

const A = { lat: -4.9712, lng: -39.0156 };
const B = { lat: -5.0312, lng: -39.0156 };

const resposta = (corpo: unknown, ok = true) =>
  ({ ok, status: ok ? 200 : 503, json: async () => corpo }) as Response;

const tabela = {
  code: 'Ok',
  distances: [
    [0, 9100],
    [9200, 0],
  ],
  durations: [
    [0, 780],
    [790, 0],
  ],
};

function cliente(fetchFn: typeof fetch, agora = () => 0) {
  return criarClienteDeRotas({
    urlCarro: 'https://carro.exemplo',
    urlAPe: 'https://a-pe.exemplo/',
    timeoutMs: 1000,
    pausaAposFalhaMs: 60_000,
    fetchFn,
    agora,
  });
}

describe('criarClienteDeRotas', () => {
  it('pede a matriz de cada modal ao servidor certo, com longitude antes da latitude', async () => {
    const fetchFn = vi.fn(async () => resposta(tabela));
    const medidor = await cliente(fetchFn as unknown as typeof fetch).medirTudo([A, B]);

    const urls = fetchFn.mock.calls.map((c) => (c as unknown as [string])[0]);
    expect(urls).toContain(
      'https://carro.exemplo/table/v1/driving/-39.0156,-4.9712;-39.0156,-5.0312?annotations=distance,duration',
    );
    expect(urls.some((u) => u.startsWith('https://a-pe.exemplo/table/'))).toBe(true);
    expect(medidor?.deCarro(A, B)?.distanciaKm).toBe(9.1);
  });

  it('identifica o aplicativo no User-Agent, como pede o OpenStreetMap', async () => {
    const fetchFn = vi.fn(async () => resposta(tabela));
    await cliente(fetchFn as unknown as typeof fetch).medirTudo([A, B]);

    const opcoes = (fetchFn.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect((opcoes.headers as Record<string, string>)['User-Agent']).toContain('RotaFacil');
  });

  it('devolve null, sem lançar erro, quando os dois servidores falham', async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error('sem rede');
    });
    expect(await cliente(fetchFn as unknown as typeof fetch).medirTudo([A, B])).toBeNull();
  });

  it('aproveita o servidor que respondeu quando o outro falha', async () => {
    const fetchFn = vi.fn(async (url: string) =>
      url.startsWith('https://a-pe') ? resposta({}, false) : resposta(tabela),
    );
    const medidor = await cliente(fetchFn as unknown as typeof fetch).medirTudo([A, B]);

    expect(medidor?.aPe(A, B)).toBeNull();
    expect(medidor?.deCarro(A, B)).not.toBeNull();
  });

  it('recusa matriz em formato inesperado', async () => {
    const fetchFn = vi.fn(async () => resposta({ code: 'Ok', distances: [[0]], durations: [[0]] }));
    expect(await cliente(fetchFn as unknown as typeof fetch).medirTudo([A, B])).toBeNull();
  });

  it('para de insistir por um tempo depois de uma falha', async () => {
    let relogio = 0;
    const fetchFn = vi.fn(async () => resposta({}, false));
    const rotas = cliente(fetchFn as unknown as typeof fetch, () => relogio);

    await rotas.medirTudo([A, B]);
    const chamadasNaFalha = fetchFn.mock.calls.length;

    await rotas.medirTudo([A, B]);
    expect(fetchFn.mock.calls.length).toBe(chamadasNaFalha);

    relogio = 61_000;
    await rotas.medirTudo([A, B]);
    expect(fetchFn.mock.calls.length).toBeGreaterThan(chamadasNaFalha);
  });

  it('não chama o servidor com pontos demais para a matriz', async () => {
    const fetchFn = vi.fn(async () => resposta(tabela));
    const muitos = Array.from({ length: 101 }, () => A);
    expect(await cliente(fetchFn as unknown as typeof fetch).medirTudo(muitos)).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('traça o trecho em [lat, lng], arredondado', async () => {
    const fetchFn = vi.fn(async () =>
      resposta({
        code: 'Ok',
        routes: [{ geometry: { coordinates: [[-39.0156123, -4.9712987], [-39.01, -5.03]] } }],
      }),
    );
    const linha = await cliente(fetchFn as unknown as typeof fetch).tracar('carro', A, B);
    expect(linha).toEqual([
      [-4.9713, -39.01561],
      [-5.03, -39.01],
    ]);
  });

  it('devolve null no traçado quando a resposta não tem rota', async () => {
    const fetchFn = vi.fn(async () => resposta({ code: 'Ok', routes: [] }));
    expect(await cliente(fetchFn as unknown as typeof fetch).tracar('pe', A, B)).toBeNull();
  });
});

describe('simplificarTracado', () => {
  it('mantém o traçado curto como está', () => {
    const curto: [number, number][] = [[0, 0], [1, 1]];
    expect(simplificarTracado(curto)).toBe(curto);
  });

  it('reduz o traçado longo, preservando início e fim', () => {
    const longo: [number, number][] = Array.from({ length: 1000 }, (_, i) => [i, i]);
    const reduzido = simplificarTracado(longo, 100);

    expect(reduzido).toHaveLength(100);
    expect(reduzido[0]).toEqual([0, 0]);
    expect(reduzido[99]).toEqual([999, 999]);
  });
});
