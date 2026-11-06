import { useState, useEffect } from 'react';
import { getUrl } from 'aws-amplify/storage';

/**
 * Resolves a profile picture value to a displayable URL.
 * Handles both legacy signed URLs (https://...) and S3 paths (profile-pictures/...).
 * S3 paths are resolved to fresh signed URLs via Amplify Storage.
 */
// Cache da URL assinada por tab (sessionStorage): sem ela, cada reload refaz o
// getUrl e o avatar pisca (iniciais → foto). TTL abaixo dos 15 min da
// assinatura do Amplify — dentro da validade nem refazemos o pedido.
const CACHE_PREFIX = 'profileImageUrl:';
const CACHE_TTL_MS = 10 * 60 * 1000;

const readCachedUrl = (path) => {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + path);
    if (!raw) return null;
    const { url, ts } = JSON.parse(raw);
    return Date.now() - ts < CACHE_TTL_MS ? url : null;
  } catch {
    return null;
  }
};

const writeCachedUrl = (path, url) => {
  try {
    sessionStorage.setItem(CACHE_PREFIX + path, JSON.stringify({ url, ts: Date.now() }));
  } catch {
    // storage cheio/indisponível — segue sem cache
  }
};

/** Invalidar após re-upload: o path é estável (avatar.<ext>), a foto não. */
export const invalidateProfileImageCache = (path) => {
  try {
    sessionStorage.removeItem(CACHE_PREFIX + path);
  } catch {
    // noop
  }
};

const useProfileImage = (picture) => {
  const [imageUrl, setImageUrl] = useState(() => {
    // Legacy signed URLs can be used immediately (may be expired though)
    if (picture?.startsWith('http')) return picture;
    if (picture) return readCachedUrl(picture);
    return null;
  });

  useEffect(() => {
    if (!picture) {
      setImageUrl(null);
      return;
    }

    // Legacy signed URL — use directly
    if (picture.startsWith('http')) {
      setImageUrl(picture);
      return;
    }

    // Cache válida: usa e não refaz o pedido — refazer trocava a URL assinada
    // e remontava o <img> (key={url}), causando o próprio flash a evitar.
    const cached = readCachedUrl(picture);
    if (cached) {
      setImageUrl(cached);
      return;
    }

    // S3 path — resolve to signed URL
    let cancelled = false;
    getUrl({ path: picture }).then(({ url }) => {
      const value = url.toString();
      writeCachedUrl(picture, value);
      if (!cancelled) setImageUrl(value);
    }).catch(() => {
      if (!cancelled) setImageUrl(null);
    });
    return () => { cancelled = true; };
  }, [picture]);

  return imageUrl;
};

export default useProfileImage;
