import { useNavigate } from 'react-router-dom';
import ForgotPassword from './ForgotPassword';

const ForgotPasswordRouteWrapper = () => {
  const navigate = useNavigate();

  // Esta função será passada para o ForgotPassword
  const handleNavigateToSignIn = () => {
    navigate('/signin'); // Navega para a página de login
  };

  return <ForgotPassword onResetPassword={handleNavigateToSignIn} />;
};

export default ForgotPasswordRouteWrapper;