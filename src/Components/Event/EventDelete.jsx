import { useState, Fragment } from 'react'
import PropTypes from 'prop-types'
import { Dialog, TransitionChild, Transition, DialogPanel, DialogTitle } from '@headlessui/react'
import { FiTrash2, FiAlertTriangle, FiLoader, FiCheck } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { useDeleteEventCascadeMutation } from "../../Api/services/eventApi"

// Retry automático (ADR-035 §8): a Lambda é idempotente e só apaga o Event no
// fim, por isso repetir após timeout retoma onde a execução anterior ficou.
const MAX_DELETE_ATTEMPTS = 3
// Backoff linear entre tentativas — não martelar o servidor num loop apertado
// quando o erro é transiente (timeout/rede).
const RETRY_BACKOFF_MS = 500
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Só timeouts/erros de rede justificam retry — autorização/validação falham sempre.
const isTransientError = (error) => {
  const messages = [
    error?.message,
    error?.data?.message,
    ...(error?.data?.errors?.map((e) => `${e.errorType || ''} ${e.message || ''}`) || []),
  ].filter(Boolean).join(' ')
  return /timed?\s?out|timeout|network|econnreset|failed to fetch/i.test(messages)
}

export default function EventDelete({ eventId, eventTitle }) {
  const [isOpen, setIsOpen] = useState(false)
  const [deleteEventCascade] = useDeleteEventCascadeMutation()
  const [error, setError] = useState(null)
  const [status, setStatus] = useState('idle')
  const { t } = useTranslation('event')

  const handleDelete = async () => {
    setStatus('loading')

    for (let attempt = 1; attempt <= MAX_DELETE_ATTEMPTS; attempt += 1) {
      try {
        const result = await deleteEventCascade(eventId).unwrap()

        if (result?.success) {
          // Invalidação de cache (collaboratorApi) vive no onQueryStarted da mutation.
          setStatus('success')
          setTimeout(() => {
            setIsOpen(false)
            setStatus('idle')
          }, 1500)
          return
        }
        // Falha parcial: o Event sobreviveu (marcador de retry) — tentar de novo.
        console.error('Partial event delete, retrying:', { attempt, errors: result?.errors })
      } catch (deleteError) {
        if (!isTransientError(deleteError)) {
          console.error('Failed to delete event:', deleteError)
          break
        }
        console.error('Transient delete error, retrying:', { attempt, error: deleteError })
      }

      // Só espera se ainda houver tentativa a seguir (break/return já saíram).
      if (attempt < MAX_DELETE_ATTEMPTS) await sleep(RETRY_BACKOFF_MS * attempt)
    }

    setStatus('error')
    setError(t('eventDelete.error.message'))
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="group relative p-2 text-error hover:text-error-dark transition-colors rounded-full hover:bg-card"
        aria-label={t('eventDelete.button')}
      >
        <FiTrash2 className="w-4 h-4" />
        <span className="absolute whitespace-nowrap -top-8 left-1/2 -translate-x-1/2 py-1 px-2 bg-text text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-normal">
          {t('eventDelete.button')}
        </span>
      </button>

      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => status !== 'loading' && setIsOpen(false)}>
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-normal"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-normal"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50" />
          </TransitionChild>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-normal"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-normal"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-xl bg-card p-6 shadow-modal">
                  {status === 'idle' && (
                    <>
                      <DialogTitle className="text-lg font-medium text-foreground flex items-center">
                        <FiAlertTriangle className="mr-2 text-error" />
                        {t('eventDelete.title')}
                      </DialogTitle>
                      <div className="mt-4">
                        {/* O modal é centrado no ecrã e o card fica atrás do
                            overlay: sem o nome aqui, nada no ecrã distingue qual
                            dos eventos vai ser apagado em cascata. */}
                        <p className="text-sm text-muted-foreground">
                          {t('eventDelete.confirmTarget')}
                        </p>
                        <p className="mt-1 text-base font-medium text-foreground break-words">
                          {eventTitle}
                        </p>
                        <p className="mt-4 text-sm text-muted-foreground whitespace-pre-line">
                          {t('eventDelete.confirmMessage')}
                        </p>
                      </div>
                      <div className="mt-6 flex justify-end gap-3">
                        <button
                          type="button"
                          className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-normal"
                          onClick={() => setIsOpen(false)}
                        >
                          {t('eventDelete.cancel')}
                        </button>
                        <button
                          type="button"
                          className="px-4 py-2 bg-error hover:bg-error-dark text-white text-sm font-medium rounded-lg transition-colors duration-normal"
                          onClick={handleDelete}
                        >
                          {t('eventDelete.button')}
                        </button>
                      </div>
                    </>
                  )}

                  {status === 'loading' && (
                    <div className="py-6 flex flex-col items-center">
                      <FiLoader className="w-12 h-12 text-primary animate-spin mb-4" />
                      <p className="text-muted-foreground font-medium">{t('eventDelete.loading.deletingEvent')}</p>
                    </div>
                  )}

                  {status === 'success' && (
                    <div className="py-6 flex flex-col items-center animate-fade-in">
                      <div className="w-12 h-12 bg-success rounded-full flex items-center justify-center mb-4">
                        <FiCheck className="w-6 h-6 text-white" />
                      </div>
                      <p className="text-success-dark font-medium">{t('eventDelete.success')}</p>
                    </div>
                  )}

                  {status === 'error' && (
                    <div className="py-6 flex flex-col items-center animate-fade-in">
                      <div className="w-12 h-12 bg-error rounded-full flex items-center justify-center mb-4">
                        <FiAlertTriangle className="w-6 h-6 text-white" />
                      </div>
                      <p className="text-error font-medium mb-2">{t('eventDelete.error.title')}</p>
                      <p className="text-sm text-error/80">{error || t('eventDelete.error.message')}</p>
                    </div>
                  )}
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}

EventDelete.propTypes = {
  eventId: PropTypes.string.isRequired,
  eventTitle: PropTypes.string.isRequired,
}