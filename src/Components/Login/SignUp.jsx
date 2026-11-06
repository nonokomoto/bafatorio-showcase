import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { FiUser, FiMail, FiEye, FiEyeOff, FiLock, FiCheckCircle, FiCheck } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { userSignUp, confirmSignUpAndSignIn, completeAutoSignIn, clearAuthState } from '../../Redux/Auth/userSlice';
import { resendSignUpCode } from 'aws-amplify/auth';
import Spinner from '../UI/spinner';
import { Text, Button, Card, Input } from '../UI';
import { markPlanSelectionPending } from '../../Utils/planSelection';
import { track } from '../../Utils/analytics';

// Nome da exceção Cognito (devolvido por userSignUp/confirmSignUpAndSignIn,
// ver userSlice.js) → chave de tradução. Sem isto, o utilizador via sempre o
// erro genérico — nunca sabia, por exemplo, que o código expirou e que
// devia usar "Reenviar código".
const AUTH_ERROR_KEYS = {
    UsernameExistsException: 'signUp.errors.emailExists',
    InvalidPasswordException: 'signUp.errors.invalidPassword',
    CodeMismatchException: 'signUp.errors.invalidCode',
    ExpiredCodeException: 'signUp.errors.codeExpired',
    LimitExceededException: 'signUp.errors.attemptsExceeded',
    TooManyFailedAttemptsException: 'signUp.errors.attemptsExceeded',
    TooManyRequestsException: 'signUp.errors.attemptsExceeded',
};

const SignUp = () => {
    const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm();

    // Estados
    const [successMessage, setSuccessMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isConfirmationStep, setIsConfirmationStep] = useState(false);
    const [resendCodeStatus, setResendCodeStatus] = useState(null);
    // true só quando se chega à confirmação pelo link manual "Confirmar
    // Email" (sem authStep persistido, ex.: depois de limpar cookies com uma
    // conta por confirmar) — nesse caso o email vem vazio e tem de ser
    // editável. No fluxo normal (signUp() nesta sessão) o email vem
    // pré-preenchido e correto, por isso fica só-leitura.
    const [manualConfirmEmail, setManualConfirmEmail] = useState(false);

    const navigateTo = useNavigate();
    const dispatch = useDispatch();
    const { t, i18n } = useTranslation('login');
    const { authStep, isAuthenticated, isLoading, resumedExistingAccount } = useSelector(state => state.user);

    const password = watch('password', '');

    // Nota: /signup está envolvido em PublicOnlyRoute, que navega para
    // /app/events assim que isAuthenticated fica true — na MESMA atualização
    // em que este efeito reagiria a essa mudança. Isso desmonta o SignUp antes
    // do corpo do efeito chegar a correr, por isso o modal de plano NÃO pode
    // depender de nada feito aqui dentro (ver onSubmit: a flag é marcada logo
    // que a confirmação do código é aceite, não aqui). O modal em si mostra-se
    // em Layout.jsx, já dentro de /app — a única zona sem esta corrida.
    useEffect(() => {
        if (isAuthenticated) {
            setSuccessMessage(t('signUp.success.confirmed'));
            setTimeout(() => navigateTo('/app/events'), 2000);
        } else if (authStep === 'AWAITING_CONFIRMATION') {
            setIsConfirmationStep(true);
            setValue('code', '');
        } else if (authStep === 'AUTO_SIGN_IN') {
            dispatch(completeAutoSignIn()).unwrap();
        } else if (authStep === 'CONFIRMATION_SUCCESS') {
            setSuccessMessage(t('signUp.success.confirmedManualSignIn'));
            setTimeout(() => navigateTo('/signin'), 2000);
        }
    }, [authStep, isAuthenticated, dispatch, navigateTo, setValue, t]);

    const getProfileImage = (name) => {
        if (name) {
            const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
            return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect width="40" height="40" rx="20" fill="%234069FF"/><text x="50%" y="50%" font-family="Arial" font-size="20" fill="white" text-anchor="middle" dy=".3em">${initials}</text></svg>`;
        }
        return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect width="40" height="40" rx="20" fill="%23E2E8F0"/></svg>`;
    };

    const onSubmit = async (data) => {
        setErrorMessage('');
        try {
            if (!isConfirmationStep) {
                const pictureData = getProfileImage(data.name);
                await dispatch(userSignUp({
                    email: data.email,
                    password: data.password,
                    name: data.name,
                    picture: pictureData,
                    signupLanguage: i18n.language
                })).unwrap();
            } else {
                await dispatch(confirmSignUpAndSignIn({
                    email: data.email,
                    confirmationCode: data.code
                })).unwrap();
                // Marca aqui, não no useEffect: a conta acabou de se confirmar
                // (independentemente de o auto sign-in a seguir resultar ou
                // cair no SignIn manual) e este handler corre até ao fim sem
                // o risco do redirect de PublicOnlyRoute o interromper a meio.
                markPlanSelectionPending();
                track('signup_completed');
            }
        } catch (err) {
            console.error('SignUp/Confirmation error:', err);
            // err é a string devolvida por rejectWithValue (nome da exceção
            // Cognito, ou a mensagem em último recurso) — não um Error.
            const errorKey = AUTH_ERROR_KEYS[err];
            setErrorMessage(errorKey ? t(errorKey) : (err || t('signUp.errors.generic')));
        }
    };

    const togglePasswordVisibility = () => setShowPassword(!showPassword);

    const renderPasswordRequirement = (condition, text) => (
        <li className={`flex items-center text-sm gap-1 ${condition ? 'text-success' : 'text-muted-foreground'}`}>
            {condition ? <FiCheckCircle className="text-success" /> : <span className="opacity-50">•</span>} 
            <Text variant="caption" className={condition ? "text-success" : ""}>
                {text}
            </Text>
        </li>
    );

    // O username no Cognito é o email — é imutável após o signUp(), por isso
    // corrigir um email errado exige sempre um signUp() novo, não dá para
    // "editar e confirmar". Este handler devolve ao formulário de registo:
    // limpa o authStep (senão o efeito acima volta logo a mostrar a
    // confirmação) e o código já preenchido.
    const handleBackToSignUp = () => {
        dispatch(clearAuthState());
        setIsConfirmationStep(false);
        setManualConfirmEmail(false);
        setErrorMessage('');
        setResendCodeStatus(null);
        setValue('code', '');
    };

    // Link "Já criaste conta? Confirmar Email" no formulário de registo —
    // vai direto para a confirmação sem passar por um signUp() novo, para
    // quem já tem conta (por confirmar) mas perdeu o authStep persistido.
    const handleManualConfirmEmail = () => {
        setManualConfirmEmail(true);
        setIsConfirmationStep(true);
        setErrorMessage('');
        setValue('email', '');
        setValue('code', '');
    };

    const handleResendCode = async () => {
        setResendCodeStatus('pending');
        setErrorMessage('');
        try {
            const { email } = watch();
            await resendSignUpCode({ username: email });
            setResendCodeStatus('success');
            setSuccessMessage(`${t('signUp.buttons.resend.success')} ${email}`);
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            setResendCodeStatus('failed');
            setErrorMessage(error.message || t('signUp.errors.resendCode'));
        }
    };

    if (isLoading) {
        return <Spinner status='loading'/>;
    }

    if (successMessage) {
        return (
            <div className="flex justify-center items-center min-h-screen font-sans px-4 py-6 sm:px-0">
                <Card className="w-full max-w-md p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 text-center">
                    <FiCheckCircle className="text-5xl sm:text-6xl text-success mx-auto" />
                    <Text variant="h5" className="text-success font-medium">
                        {successMessage}
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
                        {isConfirmationStep ? t('signUp.title.confirmation') : t('signUp.title.register')}
                    </Text>
                    <Text variant="body2" className="text-muted-foreground">
                        {isConfirmationStep
                            ? t('signUp.subtitle.confirmation')
                            : t('signUp.subtitle.register')}
                    </Text>
                </div>

                {isConfirmationStep && resumedExistingAccount && (
                    <Text variant="caption" className="block text-center text-muted-foreground">
                        {t('signUp.resumedAccount.note')}
                    </Text>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
                    {!isConfirmationStep ? (
                        <>
                            <div className="space-y-3 sm:space-y-4">
                                <div className="flex items-center border-b border-background-200 dark:border-background-700 py-2">
                                    <FiUser className="text-text-500 dark:text-text-400 mr-2" />
                                    <Input 
                                        type="text" 
                                        placeholder={t('signUp.form.name.placeholder')}
                                        {...register("name", { required: t('signUp.form.name.required') })}
                                        className="w-full bg-transparent border-none text-text-800 dark:text-text-200 focus:ring-0 placeholder-text-500 dark:placeholder-text-600" 
                                    />
                                </div>
                                {errors.name && <Text variant="caption" className="text-error">{errors.name.message}</Text>}
        
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
                                            },
                                            pattern: {
                                                value: /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>])/,
                                                message: t('signUp.form.password.pattern')
                                            }
                                        })}
                                        className="w-full bg-transparent border-none text-text-800 dark:text-text-200 focus:ring-0 placeholder-text-500 dark:placeholder-text-600" 
                                    />
                                    <Button 
                                        type="button"
                                        variant="ghost"
                                        onClick={togglePasswordVisibility} 
                                        className="absolute right-0 text-text-500 dark:text-text-400 hover:text-text-700 dark:hover:text-text-300 transition-colors duration-normal"
                                    >
                                        {showPassword ? <FiEyeOff /> : <FiEye />}
                                    </Button>
                                </div>
                                {errors.password && <Text variant="caption" className="text-error">{errors.password.message}</Text>}

                                {password && (
                                    <ul className="list-none p-0 space-y-1 mt-2">
                                        {renderPasswordRequirement(
                                            password.length >= 8,
                                            t('signUp.form.password.requirements.length')
                                        )}
                                        {renderPasswordRequirement(
                                            /[A-Z]/.test(password),
                                            t('signUp.form.password.requirements.uppercase')
                                        )}
                                        {renderPasswordRequirement(
                                            /[0-9]/.test(password),
                                            t('signUp.form.password.requirements.number')
                                        )}
                                        {renderPasswordRequirement(
                                            /[!@#$%^&*(),.?":{}|<>]/.test(password),
                                            t('signUp.form.password.requirements.special')
                                        )}
                                    </ul>
                                )}
        
                                <div className="flex items-center border-b border-background-200 dark:border-background-700 py-2 relative">
                                    <FiLock className="text-text-500 dark:text-text-400 mr-2" />
                                    <Input 
                                        type={showPassword ? 'text' : 'password'} 
                                        placeholder={t('signUp.form.confirmPassword.placeholder')}
                                        {...register("confirmPassword", {
                                            required: t('signUp.form.confirmPassword.required'),
                                            validate: value => value === password || t('signUp.form.confirmPassword.match')
                                        })}
                                        className="w-full bg-transparent border-none text-text-800 dark:text-text-200 focus:ring-0 placeholder-text-500 dark:placeholder-text-600" 
                                    />
                                </div>
                                {errors.confirmPassword && <Text variant="caption" className="text-error">{errors.confirmPassword.message}</Text>}
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center border-b border-background-200 dark:border-background-700 py-2">
                                <FiMail className="text-text-500 dark:text-text-400 mr-2" />
                                <Input
                                    type="email"
                                    readOnly={!manualConfirmEmail}
                                    placeholder={t('common.email.placeholder')}
                                    {...register("email", {
                                        required: t('common.email.required'),
                                        pattern: {
                                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                            message: t('common.email.invalid')
                                        }
                                    })}
                                    className={`w-full bg-transparent border-none focus:ring-0 placeholder-text-500 dark:placeholder-text-600
                                        ${manualConfirmEmail ? 'text-text-800 dark:text-text-200' : 'text-text-500 dark:text-text-400 cursor-default'}`}
                                />
                            </div>
                            {errors.email && <Text variant="caption" className="text-error">{errors.email.message}</Text>}

                            <div className="flex items-center border-b border-background-200 dark:border-background-700 py-2">
                                <FiCheck className="text-text-500 dark:text-text-400 mr-2" />
                                <Input
                                    type="text"
                                    placeholder={t('signUp.form.confirmationCode.placeholder')}
                                    {...register("code", {
                                        required: t('signUp.form.confirmationCode.required'),
                                        pattern: {
                                            value: /^[0-9]+$/,
                                            message: t('signUp.form.confirmationCode.onlyNumbers')
                                        },
                                        minLength: {
                                            value: 6,
                                            message: t('signUp.form.confirmationCode.length')
                                        }
                                    })}
                                    className="w-full bg-transparent border-none text-text-800 dark:text-text-200 focus:ring-0 placeholder-text-500 dark:placeholder-text-600"
                                />
                            </div>
                            {errors.code && <Text variant="caption" className="text-error">{errors.code.message}</Text>}

                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleResendCode}
                                disabled={resendCodeStatus === 'pending'}
                                className="font-medium"
                            >
                                {resendCodeStatus === 'pending'
                                    ? t('signUp.buttons.resend.loading')
                                    : t('signUp.buttons.resend.text')}
                            </Button>

                            <div className="text-center">
                                <Text variant="body2" className="text-foreground inline">
                                    {t('signUp.buttons.wrongEmail.message')}
                                </Text>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={handleBackToSignUp}
                                    className="font-medium ml-1"
                                >
                                    {t('signUp.buttons.wrongEmail.action')}
                                </Button>
                            </div>
                        </div>
                    )}
                    
                    {errorMessage && (
                        <Text variant="caption" className="text-error text-center">
                            {errorMessage}
                        </Text>
                    )}
    
                    <Button 
                        type='submit' 
                        variant="primary"
                        size="md"
                        className="w-full"
                    >
                        {isConfirmationStep 
                            ? t('signUp.buttons.submit.confirm')
                            : t('signUp.buttons.submit.register')}
                    </Button>

                    {!isConfirmationStep && (
                        <div className="text-center pt-2">
                            <Text variant="body2" className="text-foreground inline">
                                {t('signUp.login.message')}
                            </Text>
                            <Button
                                variant="ghost"
                                onClick={() => navigateTo('/signin')}
                                className="font-medium ml-1"
                            >
                                {t('signUp.login.action')}
                            </Button>
                        </div>
                    )}

                    {!isConfirmationStep && (
                        <div className="text-center">
                            <Text variant="body2" className="text-foreground inline">
                                {t('signUp.confirmEmail.message')}
                            </Text>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleManualConfirmEmail}
                                className="font-medium ml-1"
                            >
                                {t('signUp.confirmEmail.action')}
                            </Button>
                        </div>
                    )}
                </form>
            </Card>
        </div>
    );
};

export default SignUp;