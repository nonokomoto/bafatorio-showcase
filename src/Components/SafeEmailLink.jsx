import React from 'react';
import PropTypes from 'prop-types';

const SafeEmailLink = ({ email, className = '' }) => {
  const [isEmailVisible, setIsEmailVisible] = React.useState(false);
  const [isCopied, setIsCopied] = React.useState(false);

  const handleClick = (e) => {
    e.preventDefault();
    setIsEmailVisible(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(email).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  //const obfuscatedEmail = email.replace(/./g, '*');

  return (
    <div className={`inline-flex items-center space-x-2 ${className}`}>
      {isEmailVisible ? (
        <div className="relative">
          <a
            href={`mailto:${email}`}
            className="text-blue-600 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {email}
          </a>
          <button
            onClick={copyToClipboard}
            className="ml-2 text-sm text-muted-foreground hover:text-foreground"
          >
            {isCopied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
      ) : (
        <button
          onClick={handleClick}
          className=" hover:underline"
        >
          {email}
        </button>
      )}
    </div>
  );
};

SafeEmailLink.propTypes = {
  email: PropTypes.string,
  className: PropTypes.string,
};

export default SafeEmailLink;