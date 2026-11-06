import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import VideoShowcase from './VideoShowcase.jsx';
import { initializeI18n } from './i18n/index.js';

const play = (nome = /ver o v[íi]deo/i) =>
  fireEvent.click(screen.getByRole('button', { name: nome }));

describe('VideoShowcase', () => {
  beforeEach(async () => {
    await initializeI18n({ browserLocales: ['pt-PT'], storage: null });
  });

  it('does not download the video before the visitor asks for it', () => {
    const { container } = render(<VideoShowcase />);

    expect(container.querySelector('video')).toBeNull();
    expect(screen.getByRole('img', { name: /bafat[óo]rio/i })).toBeInTheDocument();
  });

  it('plays the localized video only after the click', () => {
    const { container } = render(<VideoShowcase />);

    play();

    const video = container.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('controls');
    expect(video.getAttribute('src')).toContain('bafatorio-pt');
  });

  it('serves the English subtitled cut to non-lusophone visitors', async () => {
    await initializeI18n({ browserLocales: ['fr-FR'], storage: null });
    const { container } = render(<VideoShowcase />);

    play(/voir la vid[ée]o/i);

    expect(container.querySelector('video').getAttribute('src')).toContain('bafatorio-en');
  });

  it('serves the English cut to English visitors', async () => {
    await initializeI18n({ browserLocales: ['en-US'], storage: null });
    const { container } = render(<VideoShowcase />);

    play(/watch the introduction/i);

    expect(container.querySelector('video').getAttribute('src')).toContain('bafatorio-en');
  });
});
