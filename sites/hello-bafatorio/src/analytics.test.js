import { afterEach, describe, expect, it, vi } from 'vitest';

import { track } from './analytics.js';

afterEach(() => {
  delete window.umami;
});

describe('track', () => {
  it('forwards the event name and payload to Umami', () => {
    window.umami = { track: vi.fn() };

    track('cta_click', { placement: 'hero' });

    expect(window.umami.track).toHaveBeenCalledWith('cta_click', { placement: 'hero' });
  });

  it('omits the payload when there is nothing to report', () => {
    window.umami = { track: vi.fn() };

    track('cta_click');

    expect(window.umami.track).toHaveBeenCalledWith('cta_click');
  });

  it('does nothing when the script was blocked or has not loaded yet', () => {
    expect(() => track('cta_click', { placement: 'hero' })).not.toThrow();
  });

  it('never lets a tracking failure reach the caller', () => {
    window.umami = {
      track: vi.fn(() => {
        throw new Error('network down');
      }),
    };

    expect(() => track('lead_captured')).not.toThrow();
  });
});
