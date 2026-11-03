import type { ReactNode } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';
import { useDocsTheme } from '../.storybook/docs-theme';
import { Switch } from '../src';

type Theme = 'dark' | 'light';
const themes: readonly Theme[] = ['dark', 'light'];

type TestStatus = 'pass' | 'pending';

export function Status({ value }: { value: TestStatus }) {
  return (
    <span className="kl-status" data-status={value}>
      {value}
    </span>
  );
}

export function Datasheet({
  entries,
}: {
  entries: readonly { label: string; value: ReactNode }[];
}) {
  return (
    <dl className="kl-datasheet">
      {entries.map(({ label, value }) => (
        <div key={label} className="kl-datasheet-cell">
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

const corners = ['top-start', 'top-end', 'bottom-start', 'bottom-end'] as const;

/*
 * Frames an example like a print proof. The caption names the theme the
 * example is showing, so screenshots of the docs say which one they are.
 */
export function ProofSheet({
  figure,
  title,
  children,
}: {
  figure: number;
  title: string;
  children: ReactNode;
}) {
  const theme = useDocsTheme();
  return (
    <figure className="kl-proof">
      <div className="kl-proof-frame">
        {corners.map((corner) => (
          <span key={corner} className="kl-crop" data-corner={corner} aria-hidden="true" />
        ))}
        {children}
      </div>
      <figcaption>
        Fig {String(figure).padStart(2, '0')} · {title} · {theme}
      </figcaption>
    </figure>
  );
}

function toHex(rgb: string): string {
  const channels = rgb
    .match(/\d+(\.\d+)?/g)
    ?.slice(0, 3)
    .map(Number);
  if (channels?.length !== 3) return rgb;
  return `#${channels.map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`;
}

/*
 * Reads a colour back from the browser instead of hard-coding it here, so the
 * page cannot drift from tokens.css.
 */
function useResolvedColour() {
  const ref = useRef<HTMLSpanElement>(null);
  const [hex, setHex] = useState('');
  useLayoutEffect(() => {
    if (ref.current) setHex(toHex(getComputedStyle(ref.current).backgroundColor));
  }, []);
  return [ref, hex] as const;
}

function ScaleStep({ scale, step }: { scale: string; step: number }) {
  const [chipRef, hex] = useResolvedColour();
  return (
    <li className="kl-scale-step">
      <span
        ref={chipRef}
        className="kl-scale-chip"
        style={{ backgroundColor: `var(--kl-${scale}-${String(step)})` }}
      />
      <span>{step}</span>
      <span>{hex.slice(1)}</span>
    </li>
  );
}

const steps = Array.from({ length: 12 }, (_, index) => index + 1);

export function ScaleThemes() {
  return (
    <div className="kl-token-themes">
      {themes.map((theme) => (
        <section
          key={theme}
          className="kl-token-panel"
          data-theme={theme}
          aria-label={`${theme} theme scales`}
        >
          {['slate', 'blue'].map((scale) => (
            <div key={scale} className="kl-scale-group">
              <h3>
                {scale} · {theme}
              </h3>
              <ul className="kl-scale">
                {steps.map((step) => (
                  <ScaleStep key={step} scale={scale} step={step} />
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

const colorTokens = [
  { name: '--kl-color-bg', role: 'Page background · slate-1' },
  { name: '--kl-color-surface', role: 'Raised surfaces · slate-2' },
  { name: '--kl-color-line', role: 'Hairlines · slate-6' },
  { name: '--kl-color-text', role: 'Body text · slate-12' },
  { name: '--kl-color-muted', role: 'Secondary text · slate-11' },
  { name: '--kl-color-accent', role: 'Selection, focus, "on" · blue-9' },
  { name: '--kl-color-on-accent', role: 'Content on the accent' },
  { name: '--kl-success', role: 'Passed, saved, healthy' },
  { name: '--kl-warning', role: 'Pending, needs attention' },
  { name: '--kl-danger', role: 'Failed, destructive' },
];

function TokenRow({ name, role }: { name: string; role: string }) {
  const [chipRef, hex] = useResolvedColour();
  return (
    <li className="kl-token-row">
      <span ref={chipRef} className="kl-token-chip" style={{ backgroundColor: `var(${name})` }} />
      <span>
        <span className="kl-token-name">{name}</span>
        <br />
        <span className="kl-token-role">{role}</span>
      </span>
      <span className="kl-token-value">{hex}</span>
    </li>
  );
}

export function TokenThemes() {
  return (
    <div className="kl-token-themes">
      {themes.map((theme) => (
        <section
          key={theme}
          className="kl-token-panel"
          data-theme={theme}
          aria-label={`${theme} theme semantic colours`}
        >
          <h3>Semantic · {theme}</h3>
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
            <label className="kl-example-label">
              <Switch disabled /> Disabled
            </label>
          </div>
        </section>
      ))}
    </div>
  );
}

const typeStyles = [
  { name: 'Display', className: 'kl-type-display', metrics: '44/48 · −0.03em · 600' },
  { name: 'Title', className: 'kl-type-title', metrics: '32/40 · −0.025em · 600' },
  { name: 'Heading', className: 'kl-type-heading', metrics: '24/32 · −0.02em · 600' },
  { name: 'Subhead', className: 'kl-type-subhead', metrics: '18/28 · −0.01em · 600' },
  { name: 'Body', className: 'kl-type-body', metrics: '16/26 · 0 · 400' },
  { name: 'Small', className: 'kl-type-small', metrics: '14/22 · 0 · 400' },
  { name: 'Caption', className: 'kl-type-caption', metrics: '12/18 · 0 · 400' },
  { name: 'Label', className: 'kl-type-label', metrics: '11/16 · +0.08em · 500 mono' },
  { name: 'Code', className: 'kl-type-code', metrics: '13/22 · 0 · 400 mono' },
];

export function TypeSpecimens() {
  return (
    <div className="kl-specimens">
      {typeStyles.map(({ name, className, metrics }) => (
        <div key={name} className="kl-specimen">
          <div className="kl-specimen-meta">
            <span className="kl-type-label">{name}</span>
            <span>{metrics}</span>
          </div>
          <div className={className}>
            {className === 'kl-type-code'
              ? '<Switch aria-label="Wi-Fi" defaultChecked />'
              : 'Space toggles the switch'}
          </div>
        </div>
      ))}
    </div>
  );
}

const spaceSteps = [4, 8, 12, 16, 24, 32, 48, 64];

export function SpaceScale() {
  return (
    <ul className="kl-measures">
      {spaceSteps.map((pixels, index) => (
        <li key={pixels} className="kl-measure">
          <span>--kl-space-{index + 1}</span>
          <span className="kl-measure-value">{pixels}px</span>
          <span
            className="kl-measure-bar"
            style={{ inlineSize: `var(--kl-space-${String(index + 1)})` }}
          />
        </li>
      ))}
    </ul>
  );
}

const radii = [
  { name: 'sm', value: '4px' },
  { name: 'md', value: '6px' },
  { name: 'lg', value: '10px' },
  { name: 'xl', value: '14px' },
  { name: 'full', value: '9999px' },
];

export function RadiusScale() {
  return (
    <ul className="kl-measures">
      {radii.map(({ name, value }) => (
        <li key={name} className="kl-measure">
          <span>--kl-radius-{name}</span>
          <span className="kl-measure-value">{value}</span>
          <span className="kl-radius-sample" style={{ borderRadius: `var(--kl-radius-${name})` }} />
        </li>
      ))}
    </ul>
  );
}

export function DepthSamples() {
  return (
    <div className="kl-token-themes">
      {themes.map((theme) => (
        <section
          key={theme}
          className="kl-token-panel"
          data-theme={theme}
          aria-label={`${theme} theme shadows`}
        >
          <h3>Depth · {theme}</h3>
          <div className="kl-depth-row">
            <div className="kl-depth-sample" style={{ boxShadow: 'var(--kl-shadow-raised)' }}>
              Raised
            </div>
            <div className="kl-depth-sample" style={{ boxShadow: 'var(--kl-shadow-floating)' }}>
              Floating
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

export function FocusRingSamples() {
  return (
    <div className="kl-token-themes">
      {themes.map((theme) => (
        <section
          key={theme}
          className="kl-token-panel"
          data-theme={theme}
          aria-label={`${theme} theme focus ring`}
        >
          <h3>Focus ring · {theme}</h3>
          <div className="kl-token-sample">
            <span className="kl-focus-sample">Always showing the ring</span>
            <label className="kl-example-label">
              <Switch /> Tab here to see it live
            </label>
          </div>
        </section>
      ))}
    </div>
  );
}
