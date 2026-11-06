import { render } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import useSectionView from './useSectionView.js';

const observers = [];

function Section({ name }) {
  const ref = useSectionView(name);
  return <section ref={ref}>{name}</section>;
}

function SectionWithOwnRef({ name, onRef }) {
  const ownRef = useRef(null);
  const ref = useSectionView(name, ownRef);
  return (
    <section ref={ref} onClick={() => onRef(ownRef.current)}>
      {name}
    </section>
  );
}

const enterViewport = () => observers.forEach((observer) => observer.trigger(true));

beforeEach(() => {
  observers.length = 0;
  window.umami = { track: vi.fn() };
  globalThis.IntersectionObserver = class {
    constructor(callback, options) {
      this.callback = callback;
      this.options = options;
      observers.push(this);
    }

    observe() {
      this.observing = true;
    }

    disconnect() {
      this.observing = false;
    }

    trigger(isIntersecting) {
      if (this.observing) this.callback([{ isIntersecting }], this);
    }
  };
});

afterEach(() => {
  delete window.umami;
});

describe('useSectionView', () => {
  it('reports the section once it enters the viewport', () => {
    render(<Section name="features" />);
    expect(window.umami.track).not.toHaveBeenCalled();

    enterViewport();

    expect(window.umami.track).toHaveBeenCalledWith('section_view', { section: 'features' });
  });

  // A section taller than the viewport can never reach a fractional threshold:
  // on mobile the features section is 2163px against a 687px viewport, so at
  // most 0.32 of it is ever visible and a 0.4 threshold never fires.
  it('does not require a fraction of the section, so tall sections still count', () => {
    render(<Section name="features" />);

    const { threshold, rootMargin } = observers[0].options;
    expect(threshold).toBe(0);
    expect(rootMargin).toBeTruthy();
  });

  it('still fills a ref the section already uses for its reveal animation', () => {
    const onRef = vi.fn();
    const { getByText } = render(<SectionWithOwnRef name="proof" onRef={onRef} />);

    getByText('proof').click();

    expect(onRef).toHaveBeenCalledWith(getByText('proof'));
  });

  it('reports a section only once, however often it re-enters', () => {
    render(<Section name="features" />);

    enterViewport();
    enterViewport();

    expect(window.umami.track).toHaveBeenCalledTimes(1);
  });
});
