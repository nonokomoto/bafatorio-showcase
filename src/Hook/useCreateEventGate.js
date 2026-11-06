/**
 * @file useCreateEventGate.js
 * @description Pré-gate cosmético do "criar evento" (a autoridade é a Lambda
 * createEvent): sem direito a criar, o clique devolve um reason para mostrar
 * o BillingGateNotice em vez de abrir o form. Fail-open — enquanto a query
 * carrega (ou falha), navega; o submit continua protegido no servidor.
 * Partilhado por todos os pontos de entrada para /app/register-event.
 */

import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetAccountAccessQuery } from '../Api/services/eventApi';

export const useCreateEventGate = () => {
  const navigate = useNavigate();
  const { data: accountAccess } = useGetAccountAccessQuery();
  const [gateReason, setGateReason] = useState(null);

  const handleCreateEventClick = useCallback(() => {
    if (accountAccess?.canCreateEvent === false) {
      setGateReason(accountAccess.reason || 'UNKNOWN');
      return;
    }
    navigate('/app/register-event');
  }, [navigate, accountAccess]);

  return { gateReason, handleCreateEventClick };
};
