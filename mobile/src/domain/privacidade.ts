/**
 * Política de Privacidade do RotaFácil.
 *
 * Fica no domínio, e não na tela, porque o mesmo texto e a mesma versão são
 * usados em dois lugares: na tela que a pessoa lê e no registro do aceite
 * enviado à API (LGPD, art. 8º). Ao mudar o texto, suba a versão: quem
 * aceitou a anterior não aceitou esta.
 */

export const POLITICA_PRIVACIDADE = {
  versao: '1.0',
  vigencia: 'novembro de 2026',
} as const;

/** Como o aceite é registrado na API (POST /v1/consents). */
export const CONSENTIMENTO_POLITICA = {
  tipo: 'politica-privacidade',
  versao: POLITICA_PRIVACIDADE.versao,
} as const;

export interface SecaoPolitica {
  titulo: string;
  itens: string[];
}

export const SECOES_POLITICA: SecaoPolitica[] = [
  {
    titulo: 'Quem cuida dos seus dados',
    itens: [
      'O RotaFácil é um protótipo desenvolvido no Trabalho de Conclusão de Curso de Sistemas de Informação do Centro Universitário Católica de Quixadá (Unicatólica).',
      'Responsável pelos dados (controlador, na LGPD): Francisco Nogueira de Lima Junior, que conduz a pesquisa. O contato para qualquer pedido sobre os seus dados está no Termo de Consentimento Livre e Esclarecido (TCLE) que você recebe ao participar.',
    ],
  },
  {
    titulo: 'Quais dados o app usa',
    itens: [
      'Conta: nome, e-mail e senha. A senha é guardada só como código embaralhado (hash), nunca como texto.',
      'Localização: a posição do aparelho, lida só quando você abre a tela de nova rota e só com o app aberto, nunca em segundo plano. Ela é o ponto de partida do roteiro e fica guardada junto com ele.',
      'Roteiros: cidade, interesses, tempo disponível e, se você definir, o teto de gasto.',
      'Check-ins: a hora em que você chegou a cada parada e, se informar, quanto pagou na corrida.',
      'Aceite: a versão desta política que você aceitou e quando.',
    ],
  },
  {
    titulo: 'Para que os dados servem',
    itens: [
      'Montar e ajustar os roteiros a partir de onde você está.',
      'Guardar o histórico das suas viagens.',
      'A pesquisa do TCC: medir a precisão da estimativa de custo, comparando-a com os valores pagos que você informar, e o desempenho do algoritmo. Na análise, os dados não identificam você.',
    ],
  },
  {
    titulo: 'Com quem os dados são compartilhados',
    itens: [
      'Ninguém compra nem recebe os seus dados do RotaFácil.',
      'Para desenhar o mapa, o app busca as imagens no servidor do OpenStreetMap, que recebe a região do mapa exibida.',
      'O nome do bairro mostrado na nova rota vem do serviço de localização do próprio celular (Google no Android, Apple no iPhone), que recebe a sua coordenada.',
    ],
  },
  {
    titulo: 'Por quanto tempo',
    itens: [
      'Enquanto a sua conta existir. Ao excluí-la, tudo é apagado na hora.',
      'Ao fim da pesquisa, os dados usados na análise ficam anônimos e o restante é descartado, como prevê o TCLE.',
    ],
  },
  {
    titulo: 'Base legal',
    itens: [
      'O seu consentimento, dado ao criar a conta (LGPD, art. 7º, I), e a execução do serviço que você pede ao app (art. 7º, V).',
    ],
  },
  {
    titulo: 'Seus direitos',
    itens: [
      'Pela LGPD (art. 18), você pode confirmar quais dados existem, acessá-los, corrigi-los e pedir informações sobre o compartilhamento.',
      'Pode também apagar tudo e revogar o consentimento a qualquer momento, em Perfil, "Excluir minha conta e meus dados", ou pelo contato informado no TCLE.',
    ],
  },
  {
    titulo: 'Segurança',
    itens: [
      'O acesso exige login, e cada pessoa só vê os próprios roteiros. As tentativas de login são limitadas, para dificultar a adivinhação de senhas.',
    ],
  },
];
