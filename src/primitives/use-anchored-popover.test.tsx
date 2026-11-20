import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isPopoverOpen, lightDismiss, stubPopover } from '../../tests/stub-popover';
import type { UseAnchoredPopoverOptions } from './use-anchored-popover';
import { useAnchoredPopover } from './use-anchored-popover';

stubPopover();

type Options = Omit<UseAnchoredPopoverOptions, 'open' | 'onOpenChange' | 'anchorRef'>;

function Example({
  initialOpen = false,
  refuseClose = false,
  onOpenChange,
  ...options
}: Options & {
  initialOpen?: boolean;
  refuseClose?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(initialOpen);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const popover = useAnchoredPopover<HTMLDivElement>({
    ...options,
    open,
    anchorRef,
    onOpenChange: (next) => {
      onOpenChange?.(next);
      if (!refuseClose) setOpen(next);
    },
  });
  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => {
          setOpen(!open);
        }}
      >
        Anchor
      </button>
      <div {...popover} data-testid="surface">
        Surface
      </div>
    </>
  );
}

const surface = () => screen.getByTestId('surface');

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return DOMRect.fromRect({ x: left, y: top, width, height });
}

/*
 * jsdom lays nothing out, so the measured fallback is driven with boxes
 * stubbed on the elements: the anchor's rect and the surface's size.
 */
function layout(anchor: DOMRect, size: { width: number; height: number }) {
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(size.width);
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(size.height);
  return vi
    .spyOn(screen.getByRole('button', { name: 'Anchor' }), 'getBoundingClientRect')
    .mockReturnValue(anchor);
}

function setViewport(width: number, height: number) {
  vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(height);
  vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(width);
}

async function open() {
  await userEvent.setup().click(screen.getByRole('button', { name: 'Anchor' }));
}

describe('useAnchoredPopover', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('popover state', () => {
    it('renders the surface as a closed auto popover by default', () => {
      render(<Example />);

      expect(surface()).toHaveAttribute('popover', 'auto');
      expect(isPopoverOpen(surface())).toBe(false);
      expect(surface()).not.toBeVisible();
    });

    it('uses manual mode when asked', () => {
      render(<Example mode="manual" />);

      expect(surface()).toHaveAttribute('popover', 'manual');
    });

    it('shows and hides the popover with `open`', async () => {
      render(<Example />);

      await open();
      expect(isPopoverOpen(surface())).toBe(true);
      expect(surface()).toBeVisible();

      await open();
      expect(isPopoverOpen(surface())).toBe(false);
    });

    it('shows it on first render when it starts open', () => {
      render(<Example initialOpen />);

      expect(isPopoverOpen(surface())).toBe(true);
    });

    it('reports a light dismiss as a request to close', async () => {
      const onOpenChange = vi.fn();
      render(<Example onOpenChange={onOpenChange} />);
      await open();

      act(() => {
        lightDismiss(surface());
      });

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
      });
    });

    it('shows it again when the parent refuses the close', async () => {
      const onOpenChange = vi.fn();
      render(<Example initialOpen refuseClose onOpenChange={onOpenChange} />);

      act(() => {
        lightDismiss(surface());
      });

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
      expect(isPopoverOpen(surface())).toBe(true);
    });

    it('does not report its own close as a browser close', async () => {
      const onOpenChange = vi.fn();
      render(<Example onOpenChange={onOpenChange} />);
      await open();
      await open();

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(onOpenChange).not.toHaveBeenCalled();
    });
  });

  describe('with CSS anchor positioning', () => {
    function supportAnchoring() {
      vi.spyOn(CSS, 'supports').mockImplementation((property) =>
        property.startsWith('anchor-name'),
      );
    }

    it('names the anchor and tethers the surface to it with logical insets', async () => {
      supportAnchoring();
      render(<Example />);
      await open();

      const anchorName = screen
        .getByRole('button', { name: 'Anchor' })
        .style.getPropertyValue('anchor-name');
      const { style } = surface();
      expect(anchorName).toMatch(/^--kl-anchor-[\w-]+$/);
      expect(style.getPropertyValue('position-anchor')).toBe(anchorName);
      expect(style.getPropertyValue('inset-block-start')).toBe('anchor(end)');
      expect(style.getPropertyValue('inset-inline-start')).toBe('anchor(self-start)');
      expect(style.getPropertyValue('position-try-fallbacks')).toBe(
        'flip-block, flip-inline, flip-block flip-inline',
      );
      expect(style.getPropertyValue('min-inline-size')).toBe('');
    });

    it('opens on the top side and aligns to the end edge when asked', async () => {
      supportAnchoring();
      render(<Example side="top" align="end" matchAnchorWidth />);
      await open();

      const { style } = surface();
      expect(style.getPropertyValue('inset-block-end')).toBe('anchor(start)');
      expect(style.getPropertyValue('inset-inline-end')).toBe('anchor(self-end)');
      expect(style.getPropertyValue('min-inline-size')).toBe('anchor-size(width)');
    });

    it('gives two instances different anchor names', async () => {
      supportAnchoring();
      render(
        <>
          <Example initialOpen />
          <Example initialOpen />
        </>,
      );

      const names = screen
        .getAllByRole('button', { name: 'Anchor' })
        .map((anchor) => anchor.style.getPropertyValue('anchor-name'));
      await waitFor(() => {
        expect(new Set(names).size).toBe(2);
      });
    });
  });

  describe('measured fallback', () => {
    beforeEach(() => {
      // jsdom's CSS.supports() accepts any declaration with a dashed ident.
      vi.spyOn(CSS, 'supports').mockReturnValue(false);
    });

    it('places the surface below the anchor, at its start edge', async () => {
      setViewport(800, 600);
      render(<Example />);
      layout(rect(100, 50, 80, 30), { width: 200, height: 100 });
      await open();

      expect(surface().style.top).toBe('80px');
      expect(surface().style.left).toBe('100px');
    });

    it('flips above when there is no room below, and to the end edge when there is none inline', async () => {
      setViewport(800, 600);
      render(<Example />);
      layout(rect(700, 550, 80, 30), { width: 200, height: 100 });
      await open();

      expect(surface().style.top).toBe('450px');
      expect(surface().style.left).toBe('580px');
    });

    it('keeps the preferred side when neither side fits', async () => {
      setViewport(800, 120);
      render(<Example />);
      layout(rect(100, 50, 80, 30), { width: 200, height: 100 });
      await open();

      expect(surface().style.top).toBe('80px');
    });

    it('mirrors the start edge in RTL', async () => {
      setViewport(800, 600);
      render(
        <div dir="rtl" style={{ direction: 'rtl' }}>
          <Example />
        </div>,
      );
      layout(rect(500, 50, 80, 30), { width: 200, height: 100 });
      await open();

      expect(surface().style.left).toBe('380px');
    });

    it('honours side="top", align="end" and matchAnchorWidth', async () => {
      setViewport(800, 600);
      render(<Example side="top" align="end" matchAnchorWidth />);
      layout(rect(300, 300, 80, 30), { width: 200, height: 100 });
      await open();

      expect(surface().style.top).toBe('200px');
      expect(surface().style.left).toBe('180px');
      expect(surface().style.minWidth).toBe('80px');
    });

    it('follows the anchor on scroll and resize while open, and stops when closed', async () => {
      setViewport(800, 600);
      render(<Example />);
      const anchorRect = layout(rect(100, 50, 80, 30), { width: 200, height: 100 });
      await open();

      anchorRect.mockReturnValue(rect(100, 20, 80, 30));
      act(() => {
        document.body.dispatchEvent(new Event('scroll'));
      });
      expect(surface().style.top).toBe('50px');

      anchorRect.mockReturnValue(rect(120, 40, 80, 30));
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });
      expect(surface().style.left).toBe('120px');

      await open();
      anchorRect.mockReturnValue(rect(0, 0, 80, 30));
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });
      expect(surface().style.left).toBe('120px');
    });
  });
});
