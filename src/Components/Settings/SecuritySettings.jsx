import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FiEye, FiEyeOff, FiExternalLink, FiLock } from 'react-icons/fi';
import { useSelector, shallowEqual, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { updateUserPasswordThunk } from '../../Redux/Auth/userSlice';
import { Text, Button, Card, Badge, Input } from '../UI';

const GOOGLE_ACCOUNT_URL = 'https://myaccount.google.com/security';

/** Devolve a chave i18n do primeiro requisito falhado, ou null se estiver tudo bem. */
const validatePassword = ({ currentPassword, newPassword, confirmPassword }) => {
  if (!currentPassword) return 'security.password.current.required';
  if (!newPassword) return 'security.password.new.required';
  if (newPassword !== confirmPassword) return 'security.password.mismatch';
  if (newPassword.length < 8) return 'security.password.tooShort';

  const meetsComplexity = /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) &&
    /\d/.test(newPassword) && /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  if (!meetsComplexity) return 'security.password.tooWeak';

  return null;
};

const SecuritySettings = () => {
  const { register, handleSubmit, reset } = useForm();
  const { t } = useTranslation('settings');
  const user = useSelector((state) => state.user, shallowEqual);
  const dispatch = useDispatch();

  const [showPasswords, setShowPasswords] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: '' });

  const onSubmit = async (data) => {
    const errorKey = validatePassword(data);
    if (errorKey) {
      setFeedback({ message: t(errorKey), type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setFeedback({ message: '', type: '' });

    try {
      await dispatch(updateUserPasswordThunk({
        oldPassword: data.currentPassword,
        newPassword: data.newPassword,
      })).unwrap();

      setFeedback({ message: t('security.feedback.updated'), type: 'success' });
      reset();
    } catch (error) {
      console.error('Password update error:', error);
      // O thunk rejeita com rejectWithValue(error.message) — uma string — e o
      // unwrap() lança o payload tal e qual, não um Error.
      const message = (typeof error === 'string' ? error : error?.message || '').toLowerCase();
      // Sem expor error.message ao utilizador — só a categoria
      let userMessage = t('security.feedback.unknownError');
      if (message.includes('incorrect') || message.includes('notauthorized')) {
        userMessage = t('security.feedback.incorrectPassword');
      } else if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
        userMessage = t('security.feedback.networkError');
      } else if (message.includes('password')) {
        userMessage = t('security.feedback.updateError');
      }
      setFeedback({ message: userMessage, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordFields = [
    { name: 'currentPassword', label: t('security.password.current.label') },
    { name: 'newPassword', label: t('security.password.new.label') },
    { name: 'confirmPassword', label: t('security.password.confirm.label') },
  ];

  return (
    <Card className="p-6">
      <Text variant="h5" weight="medium" className="mb-1">{t('security.title')}</Text>
      <Text variant="body2" className="text-muted-foreground mb-6">{t('security.subtitle')}</Text>

      {/* Contas Google não têm password no Cognito — é gerida do lado da Google */}
      {user?.providerName === 'Google' ? (
        <div className="max-w-md">
          <Text variant="h6" weight="medium" className="mb-2">{t('security.googleAccount.title')}</Text>
          <Text variant="body2" className="text-muted-foreground mb-4">
            {t('security.googleAccount.description')}
          </Text>
          <Button
            variant="secondary"
            size="md"
            startIcon={<FiExternalLink />}
            onClick={() => window.open(GOOGLE_ACCOUNT_URL, '_blank', 'noopener,noreferrer')}
          >
            {t('security.googleAccount.buttonText')}
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-md">
          {feedback.message && (
            <Badge
              variant={feedback.type === 'success' ? 'success' : 'error'}
              tone="soft"
              className="w-full p-3"
            >
              {feedback.message}
            </Badge>
          )}

          <Text variant="h6" weight="medium">{t('security.password.title')}</Text>

          {/* Mesmo padrão dos inputs do SignIn/SignUp: underline com ícone à
              esquerda e o toggle de visibilidade sobreposto à direita */}
          {passwordFields.map(({ name, label }) => (
            <div key={name} className="flex items-center border-b border-background-200 dark:border-background-700 py-2 relative">
              <FiLock className="text-text-500 dark:text-text-400 mr-2" />
              <Input
                {...register(name)}
                type={showPasswords ? 'text' : 'password'}
                placeholder={label}
                className="w-full bg-transparent border-none text-text-800 dark:text-text-200 focus:ring-0 placeholder-text-500 dark:placeholder-text-600"
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowPasswords(!showPasswords)}
                className="absolute right-0 text-text-500 dark:text-text-400 hover:text-text-700 dark:hover:text-text-300 transition-colors duration-normal"
              >
                {showPasswords ? <FiEyeOff /> : <FiEye />}
              </Button>
            </div>
          ))}

          <Button type="submit" variant="primary" size="md" loading={isSubmitting}>
            {isSubmitting ? t('security.form.submit.saving') : t('security.form.submit.saveButton')}
          </Button>
        </form>
      )}
    </Card>
  );
};

export default SecuritySettings;
