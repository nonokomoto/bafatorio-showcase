import React from 'react';
import PropTypes from 'prop-types';

// Tailwind não gera classes a partir de valores dinâmicos — daí o mapa em vez
// de interpolar o tamanho.
const SIZES = {
  sm: { box: 'h-8 w-8', text: 'text-sm' },
  lg: { box: 'h-24 w-24', text: 'text-3xl' },
};

/**
 * Avatar do utilizador com fallback para iniciais.
 *
 * O `src` costuma ser um URL S3 assinado que pode já ter expirado — sem tratar
 * o onError, a imagem partida aparece com o alt text em vez do avatar. Quem
 * usar isto deve passar `key={src}` para repor o estado quando a foto muda
 * (https://react.dev/reference/react/useState#resetting-state-with-a-key).
 */
const ProfileAvatar = ({ src, name, size = 'sm' }) => {
  const [imgError, setImgError] = React.useState(false);
  const { box, text } = SIZES[size] || SIZES.sm;

  if (src && !imgError) {
    return (
      <img
        className={`${box} rounded-full object-cover`}
        src={src}
        alt={name || ''}
        onError={() => setImgError(true)}
      />
    );
  }
  if (name) {
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
    return (
      <div className={`${box} ${text} rounded-full bg-primary-500 flex items-center justify-center text-white font-display font-semibold`}>
        {initials}
      </div>
    );
  }
  return <div className={`${box} rounded-full bg-muted`}></div>;
};

ProfileAvatar.propTypes = {
  src: PropTypes.string,
  name: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'lg']),
};

export default ProfileAvatar;
