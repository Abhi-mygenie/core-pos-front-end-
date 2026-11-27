// BUG-723 — matchPreset reconciles an applied range back to its preset chip label
import { computePresetRange, matchPreset, fmtISO } from '../datePresets';

describe('BUG-723 — matchPreset', () => {
  it('matches 7D (default-ish range) to its label', () => {
    const r = computePresetRange('7D');
    expect(matchPreset(r.from, r.to)).toBe('7D');
  });

  it('matches Today', () => {
    const r = computePresetRange('Today');
    expect(matchPreset(r.from, r.to)).toBe('Today');
  });

  it('matches LM (last month)', () => {
    const r = computePresetRange('LM');
    expect(matchPreset(r.from, r.to)).toBe('LM');
  });

  it('matches FY (financial year)', () => {
    const r = computePresetRange('FY');
    expect(matchPreset(r.from, r.to)).toBe('FY');
  });

  it('returns "" for a custom range that matches no preset', () => {
    expect(matchPreset('2020-01-01', '2020-01-15')).toBe('');
  });

  it('returns "" when either bound is empty', () => {
    expect(matchPreset('', '')).toBe('');
    expect(matchPreset('2026-01-01', '')).toBe('');
  });
});
