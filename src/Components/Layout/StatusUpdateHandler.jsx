import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { getClient } from '../../Api/amplifyClient.js';
import { FiCheck, FiAlertTriangle, FiLoader } from 'react-icons/fi';
import { extractStatusUpdateParams } from '../../Utils/participantUtils';
import { confirmParticipant } from '../../../Graphql/mutations';
import { useTranslation } from 'react-i18next';
import 'animate.css';

const StatusUpdateHandler = () => {
  const { t, i18n } = useTranslation('common');
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const location = useLocation();
  const updateAttempted = useRef(false);

  const currentLanguage = i18n.language.substring(0, 2);

  // Auto language change if 'lang' is present in the URL
  // This useEffect has maximum priority to change the language before any rendering
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlLang = params.get('lang');
    
    if (urlLang && i18n.language.substring(0, 2) !== urlLang) {
      i18n.changeLanguage(urlLang);
    }
  }, [location.search, i18n]);

  useEffect(() => {
    const updateStatus = async () => {
      if (updateAttempted.current) return;
      updateAttempted.current = true;

      const { participantId, eventId, newStatus, lang } = extractStatusUpdateParams(location.search);
      console.log('Parâmetros extraídos:', { participantId, eventId, newStatus, lang });

      if (!participantId || !eventId || !newStatus) {
        setStatus('error');
        setMessage(t('statusUpdateHandler.errors.invalidParams'));
        return;
      }
      
      try {
        const result = await getClient().graphql({
          query: confirmParticipant,
          variables: {
            id: participantId,
            participantStatus: newStatus,
            eventId: eventId,
            language: lang || currentLanguage,
            idempotencyKey: `${participantId}-${newStatus}-${Date.now()}` // Add idempotency key
          },
          authMode: 'apiKey',
        });

        const success = result.data.confirmParticipant;
        if (success) {
          setStatus('success');
          // Sempre renderiza a mensagem de sucesso usando o i18n do frontend
          setMessage(t('statusUpdateHandler.success.confirmation'));
        } else {
          setStatus('error');
          setMessage(t('statusUpdateHandler.errors.updateFailed'));
        }
      } catch (error) {
        console.error('Erro ao atualizar o estado:', error);
        setStatus('error');
        setMessage(t('statusUpdateHandler.errors.updateFailed'));
      }
    };

    updateStatus();
  }, [location.search, currentLanguage, t]);

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <FiLoader className="animate-spin text-primary" size={48} />;
      case 'success':
        return <FiCheck className="text-green-500" size={48} />;
      case 'error':
        return <FiAlertTriangle className="text-red-500" size={48} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md bg-card rounded-xl shadow-2xl overflow-hidden transform transition-all duration-500 ease-in-out hover:scale-105 animate__animated animate__fadeIn">
        <div className="p-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            {getStatusIcon()}
            <h2 className="text-2xl font-bold text-center text-primary mt-4">
              {status === 'loading' 
                ? t('statusUpdateHandler.status.loading.title') 
                : status === 'success' 
                  ? t('statusUpdateHandler.status.success') 
                  : t('statusUpdateHandler.status.error')}
            </h2>
            <p className="text-center text-muted-foreground mt-2">
              {status === 'loading' 
                ? t('statusUpdateHandler.status.loading.message') 
                : message}
            </p>
          </div>
        </div>
        {status !== 'loading' && (
          <div className="bg-muted p-4">
            <p className="text-sm text-center text-muted-foreground">
              {status === 'success'
                ? t('statusUpdateHandler.success.thankYou')
                : t('statusUpdateHandler.errors.contactOrganizer')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(StatusUpdateHandler);