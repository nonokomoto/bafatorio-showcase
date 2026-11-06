import { useTranslation } from 'react-i18next';
import NoDataImage from '../../../../assets/NoData.svg';
import { Text } from '../../../UI';

const NoParticipants = () => {
  const { t } = useTranslation('participant');
  
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 bg-card rounded-b-lg border-t border-border">
      <img 
        src={NoDataImage} 
        alt={t('pages.participantTable.noParticipants.imageAlt')} 
        className="mx-auto w-28 mb-6" 
      />
      <Text 
        variant="h5" 
        className="font-medium mb-3 text-text-900 dark:text-text-100"
      >
        {t('pages.participantTable.noParticipants.title')}
      </Text>
      <Text 
        variant="body2" 
        className="max-w-md mx-auto text-center text-muted-foreground"
      >
        {t('pages.participantTable.noParticipants.message')}
      </Text>
    </div>
  );
};

export default NoParticipants;