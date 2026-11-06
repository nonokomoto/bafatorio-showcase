import { useState, useCallback } from 'react';
import { pdf } from '@react-pdf/renderer';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { processReportData } from '../utils/processReportData';
import { useLazyListEventRolesQuery } from '../../../../Api/services/roleApi';

// Lazy load PDF component only when report generation is needed
const loadEventReportPdf = async () => {
  const module = await import('../index');
  return module.default;
};

export const useEventReport = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const { t } = useTranslation('report');
  // As roles vão-se buscar ao clique, como os participantes e os fornecedores.
  // Subscrever no mount abria uma corrida: quem clicasse antes de a query
  // responder levava um mapa vazio e um relatório em que toda a gente aparecia
  // sem categoria — errado em silêncio, que é o pior modo de falhar.
  const [fetchRoles] = useLazyListEventRolesQuery();

  // Function to generate report PDF
  const generateReport = useCallback(async ({ eventId: targetEventId, dashboardData, mode = 'summary' }) => {
    // If eventId and dashboard data is missing, set error and return
    if (!targetEventId || !dashboardData?.raw) {
      setError(t('eventReport.errors.insufficientData', 'Dados insuficientes para gerar o relatório'));
      return;
    }

    // Set is generating to true
    setIsGenerating(true);
    setError(null);

    let roleMap = {};
    try {
      const roles = await fetchRoles({ eventId: targetEventId }, true).unwrap();
      roleMap = Object.fromEntries((roles || []).map((r) => [r.id, r.name]));
    } catch {
      // Sem as roles, a distribuição sairia "Sem categoria: 100%": mais vale
      // não entregar relatório nenhum do que um que descreve mal o evento.
      setError(t('eventReport.errors.generationFailed', 'Não foi possível gerar o relatório. Tente novamente.'));
      setIsGenerating(false);
      return false;
    }

    try {
      /*
      * Process report data
      * Process report data is a function that process the dashboard data and return the data in a format that can be used to create the PDF document
      * We need to pass the dashboard raw data, the eventId and the report mode ('summary'|'detailed') to the function
      */
      const processedData = processReportData(dashboardData.raw, targetEventId, roleMap, mode);

      /*
      * Create PDF document (lazy loaded)
      * Load the EventReportPdf component only when generating PDF to reduce bundle size
      * We use React.createElement to create the PDF document
      * We need to pass the eventId and the processed data to the EventReportPdf component
      */
      const EventReportPdf = await loadEventReportPdf();
      const pdfDoc = React.createElement(EventReportPdf, {
        eventId: targetEventId,
        data: processedData
      });

      // Gerar o PDF e baixar
      const asPdf = pdf([]);
      asPdf.updateContainer(pdfDoc);
      const blob = await asPdf.toBlob();

      const fileName = `${t('eventReport.filename')}-${targetEventId}-${new Date().getTime()}.pdf`;

      if (window.navigator && window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveOrOpenBlob(blob, fileName);
      } else {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        window.URL.revokeObjectURL(url);
      }

      return true;
    } catch (err) {
      console.error('Erro ao gerar relatório:', err);
      setError(t('eventReport.errors.generationFailed', 'Não foi possível gerar o relatório. Tente novamente.'));
      return false;
    } finally {
      setIsGenerating(false);
    }
  }, [t, fetchRoles]);

  return {
    generateReport,
    isGenerating,
    error
  };
};