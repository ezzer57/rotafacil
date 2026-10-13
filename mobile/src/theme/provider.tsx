/**
 * Controle de tema (claro, escuro ou o do sistema).
 *
 * A preferencia fica salva no aparelho, entao o aplicativo reabre no modo
 * escolhido. Telas e componentes consomem apenas useCores(); nenhum deles
 * precisa saber qual tema esta ativo.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';

import { paletaClara, paletaEscura, type Paleta } from './tokens';

export type ModoTema = 'claro' | 'escuro' | 'sistema';

const CHAVE_ARMAZENAMENTO = '@rotafacil:tema';

interface ContextoTema {
  cores: Paleta;
  /** O que o usuario escolheu. */
  modo: ModoTema;
  /** O tema realmente aplicado depois de resolver 'sistema'. */
  escuro: boolean;
  definirModo: (modo: ModoTema) => void;
  alternar: () => void;
}

const TemaContext = createContext<ContextoTema | null>(null);

export function ProvedorDeTema({ children }: { children: ReactNode }) {
  const esquemaDoSistema = useColorScheme();
  const [modo, setModo] = useState<ModoTema>('sistema');

  // Recupera a preferencia salva no primeiro carregamento.
  useEffect(() => {
    AsyncStorage.getItem(CHAVE_ARMAZENAMENTO)
      .then((salvo) => {
        if (salvo === 'claro' || salvo === 'escuro' || salvo === 'sistema') setModo(salvo);
      })
      .catch(() => {
        // Sem armazenamento disponivel: segue com o padrao do sistema.
      });
  }, []);

  const definirModo = useCallback((novo: ModoTema) => {
    setModo(novo);
    AsyncStorage.setItem(CHAVE_ARMAZENAMENTO, novo).catch(() => {});
  }, []);

  const escuro = modo === 'sistema' ? esquemaDoSistema === 'dark' : modo === 'escuro';

  const valor = useMemo<ContextoTema>(
    () => ({
      cores: escuro ? paletaEscura : paletaClara,
      modo,
      escuro,
      definirModo,
      alternar: () => definirModo(escuro ? 'claro' : 'escuro'),
    }),
    [escuro, modo, definirModo],
  );

  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>;
}

export function useTema(): ContextoTema {
  const ctx = useContext(TemaContext);
  if (!ctx) throw new Error('useTema precisa estar dentro de <ProvedorDeTema>');
  return ctx;
}

/** Atalho para quem so precisa das cores. */
export function useCores(): Paleta {
  return useTema().cores;
}
