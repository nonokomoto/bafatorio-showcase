import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { sendEmail } from '../../../../../Graphql/mutations';
import { getClient } from '../../../../Api/amplifyClient.js';
import { ERROR_MESSAGES } from '../utils/constants';

export const useEmailSender = () => {
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [successCount, setSuccessCount] = useState(0);
  const [totalEmails, setTotalEmails] = useState(0);
  const { t } = useTranslation('participant');

  const sendEmails = async (emailData, participants) => {
    setStatus('loading');
    setTotalEmails(participants.length);

    try {
      const response = await getClient().graphql({
        query: sendEmail,
        variables: {
          ...emailData.variables,
          to: emailData.variables.to,
          participantId: emailData.variables.participantId,
          confirmationLink: emailData.variables.confirmationLink,
          participantName: emailData.variables.participantName
        }
      });

      const { success, message } = response.data.sendEmail;

      if (success) { 
        const sentCount = parseInt(message.split('/')[0]);
        console.log(sentCount);
        setSuccessCount(sentCount);
        setStatus('success');
      } else {
        setStatus('error');
        
        // Verificar erros específicos conhecidos
        if (message.includes('Message must be shorter than 262144 bytes')) {
          setErrorMessage(t(ERROR_MESSAGES.VALIDATION.FILE_TOO_LARGE));
        } else {
          setErrorMessage(message || t(ERROR_MESSAGES.SENDING.FAILED));
        }
        
        throw new Error(message || t(ERROR_MESSAGES.SENDING.FAILED));
      }
    } catch (error) {
      setStatus('error');
      
      // Verificar erros específicos do AWS SES
      if (error.message && error.message.includes('Message must be shorter than 262144 bytes')) {
        setErrorMessage(t(ERROR_MESSAGES.VALIDATION.FILE_TOO_LARGE));
      } else {
        setErrorMessage(error.message || t(ERROR_MESSAGES.SENDING.NETWORK));
      }
      
      throw error;
    }
  };

  return {
    sendEmails,
    status,
    errorMessage,
    successCount,
    setSuccessCount,
    totalEmails,
    setTotalEmails,
    setStatus,
    setErrorMessage,
    resetStatus: () => setStatus('idle')
  };
};