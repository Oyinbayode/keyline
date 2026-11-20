import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TypeaheadKeyEvent } from './use-typeahead';
import { useTypeahead } from './use-typeahead';

const labels = ['Apple', 'Apricot', 'Banana', 'Blueberry', 'Cherry', 'New file', 'New window'];

function key(value: string, modifiers: Partial<TypeaheadKeyEvent> = {}) {
  return {
    key: value,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    preventDefault: vi.fn(),
    ...modifiers,
  };
}

describe('useTypeahead', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function setup(timeout?: number) {
    const { result } = renderHook(() => useTypeahead({ timeout }));
    return result.current;
  }

  it('moves to the next item that starts with a typed letter, case-insensitively', () => {
    const typeahead = setup();

    expect(typeahead(key('b'), labels, 0)).toBe(2);
    vi.advanceTimersByTime(600);
    expect(typeahead(key('C'), labels, 0)).toBe(4);
  });

  it('builds a search from keys typed within the timeout', () => {
    const typeahead = setup();

    expect(typeahead(key('a'), labels, -1)).toBe(0);
    expect(typeahead(key('p'), labels, 0)).toBe(0);
    expect(typeahead(key('r'), labels, 0)).toBe(1);
  });

  it('starts over once the timeout passes', () => {
    const typeahead = setup();

    typeahead(key('b'), labels, 0);
    vi.advanceTimersByTime(499);
    expect(typeahead(key('l'), labels, 2)).toBe(3);
    vi.advanceTimersByTime(500);
    expect(typeahead(key('c'), labels, 3)).toBe(4);
  });

  it('honours a custom timeout', () => {
    const typeahead = setup(1000);

    typeahead(key('b'), labels, 0);
    vi.advanceTimersByTime(800);
    expect(typeahead(key('l'), labels, 2)).toBe(3);
  });

  it('cycles through items with the same first letter when one letter is repeated', () => {
    const typeahead = setup();

    expect(typeahead(key('a'), labels, 4)).toBe(0);
    expect(typeahead(key('a'), labels, 0)).toBe(1);
    expect(typeahead(key('a'), labels, 1)).toBe(0);
  });

  it('wraps past the end of the list', () => {
    const typeahead = setup();

    expect(typeahead(key('a'), labels, 6)).toBe(0);
  });

  it('returns -1 and leaves the position alone when nothing matches', () => {
    const typeahead = setup();
    const event = key('z');

    expect(typeahead(event, labels, 2)).toBe(-1);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('ignores keys with Ctrl, Meta or Alt, and keys that are not printable', () => {
    const typeahead = setup();

    for (const event of [
      key('b', { ctrlKey: true }),
      key('b', { metaKey: true }),
      key('b', { altKey: true }),
      key('ArrowDown'),
      key('Enter'),
    ]) {
      expect(typeahead(event, labels, 0)).toBe(-1);
      expect(event.preventDefault).not.toHaveBeenCalled();
    }
  });

  it('treats Space as text only while a search is in progress', () => {
    const typeahead = setup();
    const lone = key(' ');

    expect(typeahead(lone, labels, 0)).toBe(-1);
    expect(lone.preventDefault).not.toHaveBeenCalled();

    expect(typeahead(key('n'), labels, 0)).toBe(5);
    expect(typeahead(key('e'), labels, 5)).toBe(5);
    expect(typeahead(key('w'), labels, 5)).toBe(5);
    const inSearch = key(' ');
    expect(typeahead(inSearch, labels, 5)).toBe(5);
    expect(inSearch.preventDefault).toHaveBeenCalled();
    expect(typeahead(key('w'), labels, 5)).toBe(6);
  });

  it('matches labels with leading whitespace and non-Latin text', () => {
    const typeahead = setup();

    expect(typeahead(key('ق'), ['  نسخ', 'قص'], 0)).toBe(1);
  });
});
