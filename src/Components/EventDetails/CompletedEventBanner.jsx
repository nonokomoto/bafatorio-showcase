import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheck, FiFileText, FiAward, FiLock } from 'react-icons/fi';
import { useMarkEventStatusMutation } from '../../Api/services/eventApi';
import { useEventReport } from '../Reports/EventReportPdf/hooks/useEventReport';
import { useAuthz } from '../../Hook/useAuthz';
import { useLazyListParticipantsByEventLambdaQuery } from '../../Api/services/participantApi';
import { useLazyListEventSuppliersByEventEnhancedQuery } from '../../Api/services/eventSupplierApi';
import { useTranslation } from 'react-i18next';
import { Badge, Card, Text, Button } from '../UI';
import ReportModeModal from './ReportModeModal';
import PropTypes from 'prop-types';

const CompletedEventBanner = ({ eventId, event, markedCompleted = true, canMarkCompleted = false }) => {
  const { t } = useTranslation(['event', 'common']);
  const navigate = useNavigate();
  // Relatório PDF é do nível pago (§2). Gate cosmético — o PDF é gerado
  // client-side, por isso este é o único ponto de imposição (decisão 2026-07-13).
  const { entitlements } = useAuthz(eventId);
  const reportLocked = !entitlements.report;
  const { generateReport, isGenerating, error: reportError } = useEventReport();
  const [markEventStatus, { isLoading: isMarking, isError: markFailed }] = useMarkEventStatusMutation();
  const [fetchParticipants, { isFetching: isLoadingReportData }] =
    useLazyListParticipantsByEventLambdaQuery();
  const [fetchEventSuppliers, { isFetching: isLoadingSuppliers }] =
    useLazyListEventSuppliersByEventEnhancedQuery();
  const [loadFailed, setLoadFailed] = useState(false);
  const [showModeModal, setShowModeModal] = useState(false);

  // Evento terminado por data mas ainda não marcado: com escrita aberta, a
  // ação primária é fechar o estado — o relatório vem a seguir, já coerente
  // com o badge. Sem escrita (janela fechada), salta-se direto ao relatório.
  const promptMarkCompleted = !markedCompleted && canMarkCompleted;

  const handleMarkCompleted = () => markEventStatus({ id: eventId, eventStatus: 'COMPLETED' });

  // O relatório só usa os participantes deste evento (processReportData filtra por
  // eventId), por isso lê-se a query já do evento em vez da lista global da conta.
  // preferCacheValue: a tab de Participantes costuma já ter preenchido esta cache.
  const handleGenerateReport = async (mode) => {
    setShowModeModal(false);
    setLoadFailed(false);

    let items;
    let eventSuppliers = [];
    try {
      ({ items = [] } = await fetchParticipants({ eventId }, true).unwrap());
      // Os custos por fornecedor são uma secção do relatório; sem isto o PDF
      // dizia sempre "sem fornecedores associados", mesmo com eles no evento.
      ({ items: eventSuppliers = [] } = await fetchEventSuppliers({ eventId }, true).unwrap());
    } catch {
      setLoadFailed(true);
      return;
    }

    await generateReport({
      eventId,
      mode,
      dashboardData: {
        raw: {
          // processReportData só procura este evento na lista; a página já o
          // tem completo (getEventAsCollaborator) e passa-o por prop. Listar a
          // conta inteira custava duas queries para servir uma entrada.
          events: [event],
          participants: items,
          dependents: items.flatMap((p) => p.dependents ?? []),
          eventSuppliers,
        },
      },
    });
  };

  const error =
    (markFailed && t('eventDetails.completeEventBanner.markCompletedError', { ns: 'event' })) ||
    reportError ||
    (loadFailed && t('eventDetails.completeEventBanner.loadDataError', { ns: 'event' }));
  const isDisabled = isGenerating || isLoadingReportData || isLoadingSuppliers;

  const getButtonText = () => {
    if (isGenerating) return t('eventDetails.completeEventBanner.generating', { ns: 'event' });
    if (isLoadingReportData || isLoadingSuppliers) return t('eventDetails.completeEventBanner.loading', { ns: 'event' });
    return t('eventDetails.completeEventBanner.generateReport', { ns: 'event' });
  };

  return (
    <>
      <Card 
        variant="success" 
        className="animate-fade-in-up mt-0 overflow-hidden"
        bordered
        padded="md"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="shrink-0">
              <Badge 
                variant="success" 
                tone="outline"
                pill
                className="h-10 w-10 flex items-center justify-center border-2"
              >
                <FiAward className="text-success-600 dark:text-success-400 text-xl" />
              </Badge>
            </div>
            
            <div className="flex-1">
              <Text 
                variant="h6" 
                className="flex items-center font-medium text-success-800 dark:text-success-100"
              >
                <FiCheck className="mr-1.5 text-current" />
                {t(
                  markedCompleted
                    ? 'eventDetails.completeEventBanner.title'
                    : 'eventDetails.completeEventBanner.endedTitle',
                  { ns: 'event' }
                )}
              </Text>
              
              <Text 
                variant="body2" 
                className="mt-1 text-success-700 dark:text-success-200/90"
              >
                {t(
                  markedCompleted
                    ? 'eventDetails.completeEventBanner.reportDescription'
                    : promptMarkCompleted
                      ? 'eventDetails.completeEventBanner.markCompletedDescription'
                      : 'eventDetails.completeEventBanner.endedDescription',
                  { ns: 'event' }
                )}
              </Text>
              
              {error && (
                <Text 
                  variant="caption" 
                  className="mt-1 font-medium text-error-600 dark:text-error-300 block"
                >
                  {error}
                </Text>
              )}
            </div>
          </div>
          
          {promptMarkCompleted ? (
            <Button
              variant="primary"
              color="success"
              size="sm"
              startIcon={<FiCheck />}
              disabled={isMarking}
              onClick={handleMarkCompleted}
              className="whitespace-nowrap mt-2 sm:mt-0 w-full sm:w-auto"
            >
              {t(
                isMarking
                  ? 'eventDetails.completeEventBanner.markCompletedSaving'
                  : 'eventDetails.completeEventBanner.markCompletedCta',
                { ns: 'event' }
              )}
            </Button>
          ) : reportLocked ? (
            <Button
              variant="primary"
              size="sm"
              startIcon={<FiLock />}
              onClick={() => navigate('/app/plan-selection')}
              className="whitespace-nowrap mt-2 sm:mt-0 w-full sm:w-auto"
            >
              {t('eventDetails.completeEventBanner.upgradeForReport', { ns: 'event' })}
            </Button>
          ) : (
            <Button
              variant="primary"
              color="success"
              size="sm"
              startIcon={<FiFileText className={isGenerating ? 'animate-spin' : ''} />}
              disabled={isDisabled}
              onClick={() => setShowModeModal(true)}
              className="whitespace-nowrap mt-2 sm:mt-0 w-full sm:w-auto"
            >
              {getButtonText()}
            </Button>
          )}
        </div>
      </Card>

      <ReportModeModal
        isOpen={showModeModal}
        onClose={() => setShowModeModal(false)}
        onSelect={handleGenerateReport}
      />
    </>
  );
};

CompletedEventBanner.propTypes = {
  // Registo completo do evento, quando quem renderiza já o tem: o relatório
  // precisa de campos que a lista minimal não devolve.
  event: PropTypes.object.isRequired,
  eventId: PropTypes.string.isRequired,
  markedCompleted: PropTypes.bool,
  canMarkCompleted: PropTypes.bool
};

export default CompletedEventBanner;