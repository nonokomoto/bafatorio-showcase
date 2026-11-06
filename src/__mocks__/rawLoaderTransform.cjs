// Jest transform para imports `?raw` (sintaxe Vite) de ficheiros não-JS —
// espelha o comportamento do Vite (devolve o conteúdo do ficheiro como
// string) para os testes lerem o mesmo texto que a app usa em runtime, em
// vez de rebentar por o Jest não saber resolver o sufixo `?raw`. Emparelhado
// com a entrada `.hbs?raw$` → `.hbs` no moduleNameMapper do jest.config.cjs,
// que tira o sufixo antes do Jest resolver o módulo.
module.exports = {
  process(sourceText) {
    return { code: `module.exports = ${JSON.stringify(sourceText)};` };
  },
};
