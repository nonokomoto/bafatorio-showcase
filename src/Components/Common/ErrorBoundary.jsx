import { Component } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import * as Sentry from '@sentry/react';

const CHUNK_ERROR_PATTERNS = [
    /Failed to fetch dynamically imported module/i,
    /Importing a module script failed/i,
    /Loading chunk [\d]+ failed/i,
    /Loading CSS chunk [\d]+ failed/i,
    /error loading dynamically imported module/i,
];

const RELOAD_FLAG = 'errorBoundary:chunkReload';

const isChunkLoadError = (error) => {
    if (!error) return false;
    if (error.name === 'ChunkLoadError') return true;
    const message = String(error.message || '');
    return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(message));
};

class ErrorBoundary extends Component {
    state = { error: null };

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        if (isChunkLoadError(error)) {
            // Stale hashed chunk (typically after a deploy). Reload once to pull fresh index.html.
            if (sessionStorage.getItem(RELOAD_FLAG) !== '1') {
                sessionStorage.setItem(RELOAD_FLAG, '1');
                window.location.reload();
                return;
            }
        }
        console.error('[ErrorBoundary] Caught error:', error, info);
        // Reporta ao Sentry apenas erros reais de render; chunk-loads recuperam via reload acima.
        Sentry.captureException(error, { contexts: { react: { componentStack: info?.componentStack } } });
    }

    componentDidMount() {
        // If we rendered successfully after a reload, clear the flag.
        if (sessionStorage.getItem(RELOAD_FLAG) === '1') {
            sessionStorage.removeItem(RELOAD_FLAG);
        }
    }

    handleRetry = () => {
        sessionStorage.removeItem(RELOAD_FLAG);
        window.location.reload();
    };

    render() {
        const { error } = this.state;
        const { children, fallback } = this.props;

        if (!error) return children;

        if (fallback) {
            return typeof fallback === 'function'
                ? fallback({ error, retry: this.handleRetry })
                : fallback;
        }

        return <DefaultFallback onRetry={this.handleRetry} />;
    }
}

ErrorBoundary.propTypes = {
    children: PropTypes.node.isRequired,
    fallback: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
};

const DefaultFallback = ({ onRetry }) => {
    const { t } = useTranslation('common');
    return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
            <h2 className="text-lg font-semibold text-foreground">
                {t('errorBoundary.title', 'Algo correu mal ao carregar esta página')}
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
                {t('errorBoundary.description', 'Tente recarregar. Se o problema persistir, saia e entre novamente na aplicação.')}
            </p>
            <button
                type="button"
                onClick={onRetry}
                className="px-4 py-2 rounded-md bg-primary text-white text-sm hover:bg-primary-600 transition-colors"
            >
                {t('errorBoundary.retry', 'Recarregar')}
            </button>
        </div>
    );
};

DefaultFallback.propTypes = {
    onRetry: PropTypes.func.isRequired,
};

export default ErrorBoundary;
