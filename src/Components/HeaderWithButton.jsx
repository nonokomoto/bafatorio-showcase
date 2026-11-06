import { FiPlus, FiEdit } from 'react-icons/fi';
import PropTypes from 'prop-types';

const HeaderWithButton = ({
    title,
    paragraph,
    buttonText,
    onButtonClick,
    type = 'create',
    buttonClassName = '',
    className = '',
    showButton = true,
}) => {
    // Determinar o ícone a ser usado baseado no tipo
    const icon = type === 'create'
        ? <FiPlus className="w-5 h-5 stroke-[2px]" />
        : <FiEdit className="w-5 h-5 stroke-[2px]" />;

        return (
          // Container principal com borda inferior
          <div className={`w-full pb-4 mb-4 border-b border-border ${className}`}>
              {/* Flex container: coluna em telas pequenas, linha em médias+ */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-2 md:space-y-0">
  
                  {/* Seção de Texto (Título e Parágrafo) */}
                  <div className="flex-1 text-start max-w-2xl">
                      {typeof title === 'string' ? (
                          <h1 className="text-2xl font-medium text-foreground font-display">
                              {title}
                          </h1>
                      ) : (
                          // Permite passar um nó React como título
                          title
                      )}
  
                      {paragraph && ( // Renderiza apenas se o parágrafo existir
                          typeof paragraph === 'string' ? (
                              <p className="mt-1 text-base text-muted-foreground">
                                  {paragraph}
                              </p>
                          ) : (
                              // Permite passar um nó React como parágrafo
                              <div className="mt-1 text-muted-foreground">
                                  {paragraph}
                              </div>
                          )
                      )}
                  </div>
  
                  {/* Seção do Botão CTA com Tooltip Melhorada - só mostra se showButton for true */}
                  {showButton && (
                  <div className="relative group w-full flex justify-end md:w-auto md:ml-8 md:flex-shrink-0">
                      {/* Botão principal redondo */}
                      <button
                          onClick={onButtonClick}
                          className={`
                              relative flex items-center justify-center z-10 /* Garante que o botão fique sobre a tooltip se necessário */
                              h-12 w-12 sm:h-14 sm:w-14 rounded-full
                              bg-primary-500 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-500
                              text-white
                              shadow-md hover:shadow-lg
                              overflow-hidden
                              transition-all duration-300 ease-in-out
                              hover:scale-105 hover:-translate-y-1
                              active:scale-95 active:shadow-inner
                              ${buttonClassName}
                          `}
                          aria-label={buttonText}
                      >
                          {/* Ícone centralizado com animação */}
                          <span className="flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
                              {icon}
                          </span>
                      </button>

                      {/* Tooltip Responsiva (com visibilidade no foco e pointer-events) */}
                      <div className={`
                          absolute z-20 pointer-events-none /* Impede tooltip de bloquear cliques no botão */
                          text-foreground text-sm font-medium /* Estilo do texto */

                          invisible opacity-0
                          group-hover:visible group-hover:opacity-100 /* Visível no Hover */
                          group-focus-within:visible group-focus-within:opacity-100 /* VISÍVEL NO FOCUS (Acessibilidade) */
                          transition-all duration-200 ease-in-out /* Transição suave */
                          border border-border /* Borda sutil */
                          whitespace-nowrap /* Impede quebra de linha no texto */

                          /* Posicionamento padrão (acima) para telas pequenas */
                          bottom-full left-1/2 transform -translate-x-1/2 mb-2
                          group-hover:-translate-y-1 group-focus-within:-translate-y-1 /* Efeito de subida no hover/focus */

                          /* Posicionamento para telas médias e maiores (à esquerda) */
                          md:right-full md:left-auto md:top-1/2 md:transform md:-translate-y-1/2 md:mr-3 md:mb-0
                          md:group-hover:translate-x-0 md:group-focus-within:translate-x-0 /* Ajusta transformação X no hover/focus para md+ */
                          md:group-hover:-translate-y-1/2 md:group-focus-within:-translate-y-1/2 /* Garante transformação Y no hover/focus para md+ */
                      `}>
                          {buttonText}

                          {/* Seta do Tooltip (Responsiva) - Opcional, considere remover para simplicidade */}
                          {/* Certifique-se que as cores da borda da seta (ex: border-t-background-light) correspondem EXATAMENTE ao fundo da tooltip */}

                          {/* Seta Padrão (apontando para baixo) */}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 md:hidden"> {/* Visível apenas em telas < md */}
                              <div className="w-0 h-0
                                  border-x-4 border-t-4
                                  border-transparent border-t-background-light dark:border-t-background-800">
                              </div>
                          </div>
                          {/* Seta para Telas Médias+ (apontando para a direita) */}
                          <div className="absolute top-1/2 right-0 transform translate-x-full -translate-y-1/2 hidden md:block"> {/* Visível apenas em telas >= md */}
                                 <div className="w-0 h-0
                                  border-y-4 border-l-4
                                  border-transparent border-l-background-light dark:border-l-background-800">
                                 </div>
                          </div>
                      </div>
                  </div>
                  )}
              </div>
          </div>
      );
};

// Definição das PropTypes para validação e documentação
HeaderWithButton.propTypes = {
    /** Título a ser exibido (string ou nó React) */
    title: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
    
    /** Texto ou componente de parágrafo (opcional) */
    paragraph: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
    
    /** Texto do botão (exibido no tooltip) */
    buttonText: PropTypes.string.isRequired,
    
    /** Função para executar ao clicar no botão */
    onButtonClick: PropTypes.func.isRequired,
    
    /** Tipo do botão: 'create' (padrão) ou 'edit' (muda o ícone) */
    type: PropTypes.oneOf(['create', 'edit']),
    
    /** Classes CSS adicionais para customizar o botão */
    buttonClassName: PropTypes.string,
    
    /** Classes CSS adicionais para customizar o container principal */
    className: PropTypes.string,

    /** Controla a visibilidade do botão (útil para controle de permissões) */
    showButton: PropTypes.bool,
};

export default HeaderWithButton;
