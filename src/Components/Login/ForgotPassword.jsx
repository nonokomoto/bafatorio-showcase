import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useForm } from 'react-hook-form';
import { FiMail, FiEye, FiEyeOff, FiLock, FiCheck } from 'react-icons/fi';
import { userResetPassword, userConfirmResetPassword } from '../../Redux/Auth/userSlice';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import { Text, Button, Card, Input } from '../UI';

const ForgotPassword = ({ onResetPassword }) => {
    const [isCodeSent, setIsCodeSent] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [passwordResetConfirm, setPasswordResetConfirm] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const { t } = useTranslation('login');

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
    const dispatch = useDispatch();

    useEffect(() => {
        let redirectTimeout;
        if (passwordResetConfirm) {
            redirectTimeout = setTimeout(() => {
                onResetPassword();
            }, 3000);
        }
        return () => clearTimeout(redirectTimeout);
    }, [passwordResetConfirm, onResetPassword]);

    const togglePasswordVisibility = () => setShowPassword(!showPassword);

    const onSubmit = async (data) => {
        setErrorMessage('');
        try {
            if (isCodeSent) {
                await dispatch(userConfirmResetPassword({
                    email: data.email,
                    confirmationCode: data.confirmationCode,
                    newPassword: data.newPassword
                })).unwrap();
                setPasswordResetConfirm(true);
            } else {
                await dispatch(userResetPassword(data.email)).unwrap();
                setIsCodeSent(true);
            }
        } catch (error) {
            handleError(error);
        }
    };

    const handleError = (error) => {
        switch(error.message) {
            case "Invalid verification code provided, please try again.":
                setErrorMessage(t('forgotPassword.errors.invalidCode'));
                break;
            case "Password did not conform with policy: Password not long enough":
                setErrorMessage(t('forgotPassword.errors.passwordTooShort'));
                break;
            case "Username/client id combination not found.":
                setErrorMessage(t('forgotPassword.errors.emailNotFound'));
                break;
            case "Attempt limit exceeded, please try after some time.":
                setErrorMessage(t('forgotPassword.errors.attemptsExceeded'));
                break;
            default:
                setErrorMessage(t('forgotPassword.errors.generic'));
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen font-sans px-4 py-6 sm:px-0">
            <Card className="w-full max-w-md p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
                <div className="text-center">
                    <Text variant="h4" weight="bold" className="text-primary font-display mb-1 sm:mb-2">
                        {isCodeSent 
                            ? t('forgotPassword.title.reset')
                            : t('forgotPassword.title.initial')}
                    </Text>
                    <Text variant="body2" className="text-muted-foreground">
                        {isCodeSent
                            ? t('forgotPassword.subtitle.reset')
                            : t('forgotPassword.subtitle.initial')}
                    </Text>
                </div>

                {passwordResetConfirm ? (
                    <div className='text-center space-y-3 sm:space-y-4'>
                        <FiCheck className="text-5xl sm:text-6xl text-success mx-auto" />
                        <Text variant="subtitle1" weight="medium" className="text-foreground">
                            {t('forgotPassword.success.title')}
                        </Text>
                        <Text variant="body2" className="text-muted-foreground">
                            {t('forgotPassword.success.redirecting')}
                        </Text>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
                        <div className="space-y-3 sm:space-y-4">
                            <Input 
                                type="email"
                                placeholder={t('common.email.placeholder')}
                                startIcon={<FiMail />}
                                {...register("email", { 
                                    required: t('common.email.required'),
                                    pattern: {
                                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                        message: t('common.email.invalid')
                                    }
                                })}
                                className="w-full"
                            />
                            {errors.email && <Text variant="caption" className="text-error">{errors.email.message}</Text>}
                            
                            {isCodeSent && (
                                <>
                                    <Input 
                                        type="text"
                                        placeholder={t('forgotPassword.form.code.placeholder')}
                                        startIcon={<FiCheck />}
                                        {...register("confirmationCode", { 
                                            required: t('forgotPassword.form.code.required'),
                                            pattern: {
                                                value: /^[0-9]+$/,
                                                message: t('forgotPassword.form.code.onlyNumbers')
                                            },
                                            minLength: {
                                                value: 6,
                                                message: t('forgotPassword.form.code.length')
                                            }
                                        })}
                                        className="w-full"
                                    />
                                    {errors.confirmationCode && 
                                        <Text variant="caption" className="text-error">{errors.confirmationCode.message}</Text>
                                    }
                                    
                                    <Input 
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder={t('forgotPassword.form.newPassword.placeholder')}
                                        startIcon={<FiLock />}
                                        {...register("newPassword", { 
                                            required: t('forgotPassword.form.newPassword.required'),
                                            minLength: {
                                                value: 8,
                                                message: t('common.password.minLength')
                                            }
                                        })}
                                        className="w-full"
                                        onIconClick={togglePasswordVisibility}
                                        iconRight={showPassword ? <FiEyeOff /> : <FiEye />}
                                    />
                                    {errors.newPassword && 
                                        <Text variant="caption" className="text-error">{errors.newPassword.message}</Text>
                                    }
                                </>
                            )}
                        </div>

                        <Button 
                            type="submit"
                            variant="primary"
                            size="md"
                            className="w-full"
                            loading={isSubmitting}
                        >
                            {isCodeSent 
                                ? t('forgotPassword.buttons.resetPassword')
                                : t('forgotPassword.buttons.sendCode')}
                        </Button>

                        {errorMessage && (
                            <Text variant="caption" className="text-error text-center">
                                {errorMessage}
                            </Text>
                        )}

                        <Button 
                            type="button"
                            variant="ghost"
                            size="md"
                            onClick={onResetPassword} 
                            className="w-full"
                        >
                            {t('forgotPassword.buttons.backToLogin')}
                        </Button>
                    </form>
                )}
            </Card>
        </div>
    );
};

ForgotPassword.propTypes = {
    onResetPassword: PropTypes.func.isRequired
};

export default ForgotPassword;