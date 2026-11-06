// fallow-ignore-file duplicate-export
// Os nomes repetem-se em src/Utils/scheduleColors.js de propósito: o frontend e
// as Lambdas não partilham módulos (shared/ tem o seu próprio node_modules), por
// isso a paleta é espelhada e scheduleColors.sync.test.ts falha se divergirem —
// mesmo padrão do plans.ts/plans.js. Não é ambiguidade de barrel: nada
// re-exporta os dois.
//
// Paleta curada da agenda. Este lado é o que valida: o picker do frontend é
// conveniência, este é o gate.
export const SCHEDULE_COLORS: string[] = [
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
export function isValidScheduleColor(color: unknown): boolean {
  return typeof color === 'string' && SCHEDULE_COLORS.includes(color);
}
