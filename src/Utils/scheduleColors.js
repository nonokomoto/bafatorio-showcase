// Paleta curada da agenda. Espelho de amplify/function/shared/scheduleColors.ts
// — scheduleColors.sync.test.ts falha se divergirem.
//
// Hues escolhidos à mão, agrupados. O hash anterior usava o ângulo dourado
// (137.508°), que existe para espalhar pontos o mais afastados possível na roda
// cromática: optimizava distinguibilidade e produzia discórdia.
//
// Tomate e Manjericão ficam deliberadamente afastados de success-500 (#10B981)
// e error-500 (#EF4444), que EventDetailsCard.jsx:67 reserva ao estado real.
export const SCHEDULE_COLORS = [
  '#D50000', // tomate
  '#E67C73', // flamingo
  '#F4511E', // tangerina
  '#F6BF26', // banana
  '#0B8043', // manjericão
  '#039BE5', // pavão
  '#3F51B5', // mirtilo
  '#8E24AA', // uva
];

export const DEFAULT_SCHEDULE_COLOR = '#039BE5';

// Só cores da paleta. Hex arbitrário é recusado de propósito: mantém a porta
// aberta para renomear ou reagrupar a paleta sem migrar dados já gravados.
export function isValidScheduleColor(color) {
  return SCHEDULE_COLORS.includes(color);
}

// Slug por cor, só para o rótulo acessível dos swatches — o backend valida
// hexes e não tem nada que saber nomes.
//
// Isto NÃO é a "cores nomeadas" que o plano corta: essa seria legenda e filtro,
// vocabulário partilhado entre colaboradores. Aqui é a11y — um botão redondo
// sem texto precisa de nome, senão o leitor de ecrã anuncia "botão".
export const SCHEDULE_COLOR_NAMES = {
  '#D50000': 'tomato',
  '#E67C73': 'flamingo',
  '#F4511E': 'tangerine',
  '#F6BF26': 'banana',
  '#0B8043': 'basil',
  '#039BE5': 'peacock',
  '#3F51B5': 'blueberry',
  '#8E24AA': 'grape',
};
