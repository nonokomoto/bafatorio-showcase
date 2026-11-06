import { useState, useMemo, useEffect, useCallback } from 'react';

const ITEMS_PER_BATCH = 20; // Número de itens a carregar por batch

export const useParticipantTable = (data, searchTerm, filters = {}) => {
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_BATCH);
  const [sortConfig, setSortConfig] = useState({ key: 'registrationDate', direction: 'descending' });

  // Os dados já vêm filtrados do componente pai (ParticipantTable.jsx)
  // Apenas aplicar ordenação
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      if (a[sortConfig.key] == null) return 1;
      if (b[sortConfig.key] == null) return -1;
      
      const aValue = String(a[sortConfig.key]).toLowerCase();
      const bValue = String(b[sortConfig.key]).toLowerCase();
      
      if (aValue < bValue) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortConfig]);

  // Lazy loading - mostrar apenas os primeiros N itens
  const tableData = useMemo(() => {
    return sortedData.slice(0, visibleCount);
  }, [sortedData, visibleCount]);

  // Reset visibleCount quando mudar filtro ou pesquisa
  useEffect(() => {
    setVisibleCount(ITEMS_PER_BATCH);
  }, [searchTerm, filters.status, filters.roleId, filters.dependentCategory]);

  // Função para carregar mais itens
  const loadMore = useCallback(() => {
    if (visibleCount < sortedData.length) {
      setVisibleCount(prev => Math.min(prev + ITEMS_PER_BATCH, sortedData.length));
    }
  }, [visibleCount, sortedData.length]);

  // Verificar se há mais itens para carregar
  const hasMore = visibleCount < sortedData.length;

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  return {
    tableData,
    requestSort,
    sortConfig,
    filteredDataLength: sortedData.length,
    loadMore,
    hasMore,
    visibleCount
  };
};