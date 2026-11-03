import { render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Portal } from './portal';

describe('Portal', () => {
  it('renders children into document.body, outside the parent', () => {
    const { container } = render(
      <div>
        <Portal>
          <p>Overlay</p>
        </Portal>
      </div>,
    );

    const overlay = screen.getByText('Overlay');
    expect(container).not.toContainElement(overlay);
    expect(overlay.parentElement).toBe(document.body);
  });

  it('renders into a custom container', () => {
    const host = document.createElement('section');
    document.body.append(host);

    render(
      <Portal container={host}>
        <p>Overlay</p>
      </Portal>,
    );

    expect(host).toContainElement(screen.getByText('Overlay'));
    host.remove();
  });

  it('renders nothing on the server', () => {
    expect(
      renderToString(
        <Portal>
          <p>Overlay</p>
        </Portal>,
      ),
    ).toBe('');
  });
});
