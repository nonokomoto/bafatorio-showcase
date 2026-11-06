import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { getUrl } from 'aws-amplify/storage';
import { getAvatarColor, getInitials } from '../../Utils/avatarColors';

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
};

const ParticipantAvatar = ({ participant, size = 'md', className = '' }) => {
  const color = getAvatarColor(participant.participantEmail || participant.id);
  const initials = getInitials(participant.participantName, participant.participantEmail);
  const sizeClass = sizeClasses[size] || sizeClasses.md;

  const [resolvedUrl, setResolvedUrl] = useState(null);

  useEffect(() => {
    if (!participant.photoUrl) {
      setResolvedUrl(null);
      return;
    }

    // If it's already a full URL (legacy) or a blob URL (local preview), use directly
    if (participant.photoUrl.startsWith('http') || participant.photoUrl.startsWith('blob:')) {
      setResolvedUrl(participant.photoUrl);
      return;
    }

    // It's an S3 path — resolve to a signed URL
    let cancelled = false;
    getUrl({ path: participant.photoUrl })
      .then((result) => {
        if (!cancelled) setResolvedUrl(result.url.href);
      })
      .catch(() => {
        if (!cancelled) setResolvedUrl(null);
      });
    return () => { cancelled = true; };
  }, [participant.photoUrl]);

  if (resolvedUrl) {
    return (
      <img
        src={resolvedUrl}
        alt={participant.participantName}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div className={`${sizeClass} rounded-full ${color.bg} ${color.text} flex items-center justify-center font-semibold flex-shrink-0 ${className}`}>
      {initials}
    </div>
  );
};

ParticipantAvatar.propTypes = {
  participant: PropTypes.shape({
    id: PropTypes.string,
    participantEmail: PropTypes.string,
    participantName: PropTypes.string,
    photoUrl: PropTypes.string,
  }).isRequired,
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
  className: PropTypes.string,
};

export default ParticipantAvatar;
