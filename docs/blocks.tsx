import { useLayoutEffect, useRef, useState } from 'react';
import { Switch } from '../src';

type TestStatus = 'pass' | 'pending';

export function Status({ value }: { value: TestStatus }) {
  return (
    <span className="kl-status" data-status={value}>
      {value}
    </span>
  );
}

const colorTokens = [
  { name: '--kl-color-bg', role: 'Page background' },
  { name: '--kl-color-surface', role: 'Raised surfaces' },
  { name: '--kl-color-line', role: 'Decorative borders' },
  { name: '--kl-color-text', role: 'Body text' },
  { name: '--kl-color-muted', role: 'Secondary text' },
  { name: '--kl-color-accent', role: 'Selection, focus, "on"' },
  { name: '--kl-color-on-accent', role: 'Content on accent' },
  { name: '--kl-color-slate', role: 'Control outlines, "off"' },
];

function toHex(rgb: string): string {
  const channels = rgb
    .match(/\d+(\.\d+)?/g)
    ?.slice(0, 3)
    .map(Number);
  if (channels?.length !== 3) return rgb;
  return `#${channels.map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`;
}

/*
 * Reads each value back from the browser instead of hard-coding it here, so
 * the page cannot drift from tokens.css.
 */
function TokenRow({ name, role }: { name: string; role: string }) {
  const chipRef = useRef<HTMLSpanElement>(null);
  const [resolvedValue, setResolvedValue] = useState('');

  useLayoutEffect(() => {
    if (chipRef.current) setResolvedValue(toHex(getComputedStyle(chipRef.current).backgroundColor));
  }, []);

  return (
    <li className="kl-token-row">
      <span ref={chipRef} className="kl-token-chip" style={{ backgroundColor: `var(${name})` }} />
      <span>
        <span className="kl-token-name">{name}</span>
        <br />
        {role}
      </span>
      <span className="kl-token-value">{resolvedValue}</span>
    </li>
  );
}

export function TokenThemes() {
  return (
    <div className="kl-token-themes">
      {(['dark', 'light'] as const).map((theme) => (
        <section
          key={theme}
          className="kl-token-panel"
          data-theme={theme}
          aria-label={`${theme} theme`}
        >
          <h3>{theme}</h3>
          <ul className="kl-token-list">
            {colorTokens.map((token) => (
              <TokenRow key={token.name} {...token} />
            ))}
          </ul>
          <div className="kl-token-sample">
            <label className="kl-example-label">
              <Switch defaultChecked /> On
            </label>
            <label className="kl-example-label">
              <Switch /> Off
            </label>
          </div>
        </section>
      ))}
    </div>
  );
}
