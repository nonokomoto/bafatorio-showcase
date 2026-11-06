/**
 * WIP_COMPONENTS — registo central de componentes em desenvolvimento activo.
 *
 * Para bloquear: set `true`
 * Para lançar:   set `false` (ou remover a entrada)
 *
 * Ver ADR-022 para o inventário completo e padrão de implementação.
 *
 * Uso em secções (não-modal):
 *   <DevOverlay active={WIP_COMPONENTS.REPORTS}>
 *     <RelatoriosSection />
 *   </DevOverlay>
 *
 * Uso em modais (prop no Modal):
 *   <Modal wip={WIP_COMPONENTS.SEND_EMAIL} ...>
 */
export const WIP_COMPONENTS = {
  SEND_EMAIL: false,
  DASHBOARD: true,
  PLAN_SELECTION: false,
  SETTINGS_BILLING: false,
  SETTINGS_NOTIFICATION: true,
  SETTINGS_SECURITY: false,
  SETTINGS_INTEGRATION: false, // Enabled for Fidelize integration (Notion still disabled at Lambda level)
  CONFIRM_PRESENCE: false,
  DOCUMENT_PREVIEW_PDF: false,
  DOCUMENT_PREVIEW_OFFICE: false, // Enabled: Excel/CSV/Word document preview with inline editing
};
