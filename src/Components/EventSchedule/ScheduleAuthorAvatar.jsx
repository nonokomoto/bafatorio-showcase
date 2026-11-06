import PropTypes from 'prop-types';
import { getAvatarColor, getInitials } from '../../Utils/avatarColors';

/**
 * O círculo com iniciais que diz "pessoa" ao lado das barras coloridas da
 * agenda — formas diferentes, trabalhos diferentes: a cor da barra é escolhida
 * pelo autor e significa o que ele quiser; o círculo diz de quem é.
 *
 * O mesmo design da tab Equipa (cor por hash + iniciais), com uma diferença
 * inevitável: a Equipa hasha o userEmail e aqui só há userId — os authors não
 * trazem email de propósito (o staff não enumera a equipa). A mesma pessoa
 * pode por isso ter outra cor na tab Equipa. Sem nome, '??'.
 *
 * O tamanho vem do caller via className (w-8 na fila, como o avatar de perfil
 * do Header — 40px da Equipa dominava os vizinhos da toolbar; w-5 no bloco,
 * day sheet e popover) — o mesmo círculo em duas alturas.
 */
const ScheduleAuthorAvatar = ({ userId, name, className = '' }) => {
  const color = getAvatarColor(userId);
  return (
    <span
      aria-hidden="true"
      className={`rounded-full inline-flex items-center justify-center font-semibold select-none flex-shrink-0 leading-none ${color.bg} ${color.text} ${className}`}
    >
      {getInitials(name)}
    </span>
  );
};

ScheduleAuthorAvatar.propTypes = {
  userId: PropTypes.string.isRequired,
  name: PropTypes.string,
  className: PropTypes.string,
};

export default ScheduleAuthorAvatar;
