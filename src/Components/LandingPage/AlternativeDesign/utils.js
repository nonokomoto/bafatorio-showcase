/**
 * Utilitário para o design alternativo da landing page
 * 
 * Fornece helpers para lidar com imagens, conversões e outros recursos
 * usados pelos componentes da landing page alternativa.
 */

/**
 * URLs de imagens de alta qualidade do Unsplash para seções de features
 * Todas as imagens são gratuitas para uso comercial, sem necessidade de atribuição
 * Focando exclusivamente em representação com profissionais negros em ambientes de trabalho
 * Selecionando imagens com iluminação suave e ambiente calmo
 */
export const featureImages = {
  // Gestão de Eventos - profissional em ambiente sereno de escritório
  eventManagement: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
  
  // Gestão de Participantes - reunião pequena e tranquila
  participantManagement: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
  
  // Fornecedores - conversa tranquila em escritório
  suppliers: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',

  // Documentação - pessoa trabalhando em ambiente calmo
  documentation: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',

  // Agenda - pessoa trabalhando calmamente com planeamento
  agenda: 'https://images.unsplash.com/photo-1573497620053-ea5300f94f21?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',

  // Equipa e permissões - ambiente tecnológico sereno
  team: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80'
};

/**
 * Cria uma URL de fallback para ser usada quando imagens não estão disponíveis
 * 
 * @param {string} text - Texto a ser exibido na imagem placeholder
 * @param {string} bgColor - Cor de fundo (sem '#')
 * @param {string} textColor - Cor do texto (sem '#')
 * @param {number} width - Largura da imagem
 * @param {number} height - Altura da imagem
 * @returns {string} URL da imagem placeholder
 */
export const createPlaceholderImage = (text, bgColor = '4069FF', textColor = 'FFFFFF', width = 800, height = 600) => {
  return `https://placehold.co/${width}x${height}/${bgColor}/${textColor}?text=${encodeURIComponent(text)}`;
};

/**
 * Obtém URL da imagem da feature, com fallback para placeholder se necessário
 * 
 * @param {string} featureKey - Chave da feature (corresponde a uma propriedade em featureImages)
 * @param {string} fallbackText - Texto a ser usado no placeholder se a imagem não estiver disponível
 * @returns {string} URL da imagem
 */
export const getFeatureImage = (featureKey, fallbackText = 'Bafatorio') => {
  if (featureImages[featureKey]) {
    return featureImages[featureKey];
  }
  return createPlaceholderImage(fallbackText);
};

/**
 * Verifica se uma URL de imagem é válida e existe
 * Usado principalmente para desenvolvimento local
 * 
 * @param {string} path - Caminho da imagem
 * @param {string} fallback - URL de fallback caso a imagem não exista
 * @returns {string} URL da imagem ou fallback
 */
export const getImageUrl = (path, fallback) => {
  // Em produção, podemos implementar verificação real
  // Por enquanto, apenas retorna o fallback para desenvolvimento local
  return fallback;
};

/**
 * Formata preço com separador de milhares para melhor legibilidade
 * 
 * @param {string|number} price - Preço a ser formatado
 * @returns {string} Preço formatado
 */
export const formatPrice = (price) => {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};
