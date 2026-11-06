import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMail, FiEye, FiEyeOff, FiLock, FiCheck } from 'react-icons/fi';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import ForgotPassword from './ForgotPassword';
import Spinner from '../UI/spinner';
import { userSignIn } from '../../Redux/Auth/userSlice';
import { Text, Button, Card, Input } from '../UI';
import { useInvitationHandler } from '../../Hook/useInvitationHandler';

const SignIn = () => {
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [showPassword, setShowPassword] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const navigateTo = useNavigate();
    const dispatch = useDispatch();
    const { t } = useTranslation('login');
    const { isAuthenticated, isLoading, error } = useSelector(state => state.user);

    // Handle invitation flow
    const {
        isProcessingInvitation,
        invitationError,
        invitationSuccess
    } = useInvitationHandler();

    useEffect(() => {
        // Only redirect to events if not processing an invitation
        if (isAuthenticated && !isProcessingInvitation && !invitationSuccess) {
            // Delay to allow invitation processing
            const timer = setTimeout(() => {
                if (!isProcessingInvitation && !invitationSuccess) {
                    navigateTo('/app/events');
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isAuthenticated, navigateTo, isProcessingInvitation, invitationSuccess]);

    const onSubmit = async (data) => {
        setHasSubmitted(true);
        try {
            await dispatch(userSignIn({
                email: data.email,
                password: data.password
            })).unwrap();
        } catch (err) {
            console.error('Erro durante o início de sessão:', err);
        }
    };

    if (showForgotPassword) {
        return <ForgotPassword onResetPassword={() => setShowForgotPassword(false)} />;
    }

    if (isLoading || isProcessingInvitation) {
        const message = isProcessingInvitation
            ? t('signin.processingInvitation', 'A processar convite...')
            : t('common.loading');
        return <Spinner status='loadingWithMessage' loadingMessage={message} />;
    }

    // Show success message after invitation is accepted
    if (invitationSuccess) {
        return (
            <div className="flex justify-center items-center min-h-screen font-sans px-4">
                <Card className="w-full max-w-md p-8 text-center">
                    <div className="mb-4 flex justify-center">
                        <div className="h-16 w-16 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
                            <FiCheck className="h-8 w-8 text-success-600 dark:text-success-400" />
                        </div>
                    </div>
                    <Text variant="h5" weight="bold" className="mb-2">
                        {t('signin.invitationAccepted', 'Convite aceite com sucesso!')}
                    </Text>
                    <Text variant="body2" className="text-muted-foreground">
                        {t('signin.redirectingToEvent', 'A redirecionar para o evento...')}
                    </Text>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex justify-center items-center min-h-screen font-sans px-4 py-6 sm:px-0">
            <Card className="w-full max-w-md p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
                <div className="text-center">
                    <Text variant="h4" weight="bold" className="text-primary font-display mb-1 sm:mb-2">
                        {t('signIn.title')}
                    </Text>
                    <Text variant="body2" className="text-muted-foreground">
                        {t('signIn.subtitle')}
                    </Text>
                </div>
    
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
                    <div className="space-y-3 sm:space-y-4">
                        <div className="flex items-center border-b border-background-200 dark:border-background-700 py-2">
                            <FiMail className="text-text-500 dark:text-text-400 mr-2" />
                            <Input 
                                type="email"
                                placeholder={t('common.email.placeholder')}
                                {...register("email", { 
                                    required: t('common.email.required'),
                                    pattern: {
                                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                        message: t('common.email.invalid')
                                    }
                                })}
                                className="w-full bg-transparent border-none text-text-800 dark:text-text-200 focus:ring-0 placeholder-text-500 dark:placeholder-text-600"
                            />
                        </div>
                        {errors.email && <Text variant="caption" className="text-error">{errors.email.message}</Text>}
                        
                        <div className="flex items-center border-b border-background-200 dark:border-background-700 py-2 relative">
                            <FiLock className="text-text-500 dark:text-text-400 mr-2" />
                            <Input 
                                type={showPassword ? 'text' : 'password'}
                                placeholder={t('common.password.placeholder')}
                                {...register("password", {
                                    required: t('common.password.required'),
                                    minLength: {
                                        value: 8,
                                        message: t('common.password.minLength')
                                    }
                                })}
                                className="w-full bg-transparent border-none text-text-800 dark:text-text-200 focus:ring-0 placeholder-text-500 dark:placeholder-text-600"
                            />
                            <Button 
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowPassword(!showPassword)} 
                                className="absolute right-0 text-text-500 dark:text-text-400 hover:text-text-700 dark:hover:text-text-300 transition-colors duration-normal"
                            >
                                {showPassword ? <FiEyeOff /> : <FiEye />}
                            </Button>
                        </div>
                        {errors.password && <Text variant="caption" className="text-error">{errors.password.message}</Text>}
                    </div>
                    
                    <div className="text-right">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowForgotPassword(true)}
                            className="font-medium"
                        >
                            {t('signIn.buttons.forgotPassword')}
                        </Button>
                    </div>

                    <Button 
                        type="submit" 
                        variant="primary"
                        size="md"
                        className="w-full"
                    >
                        {t('signIn.buttons.submit')}
                    </Button>

                    {hasSubmitted && error && (
                        <Text variant="caption" className="text-error text-center">
                            {error}
                        </Text>
                    )}

                    {invitationError && (
                        <Text variant="caption" className="text-error text-center">
                            {t('signin.invitationError', 'Erro ao aceitar convite')}: {invitationError}
                        </Text>
                    )}

                    <div className="text-center pt-2">
                        <Text variant="body2" className="text-foreground inline">
                            {t('signIn.register.message')}
                        </Text>
                        <Button
                            variant="ghost"
                            onClick={() => navigateTo('/signup')}
                            className="font-medium ml-1"
                        >
                            {t('signIn.register.action')}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default SignIn;