import { describe, it, expect } from 'vitest';
import { progressFor } from './progress';

describe('progressFor', () => {
  it('keeps a stage and percent from the page, in range', () => {
    expect(progressFor('in_progress', { stage: 'Data and sovereignty', percent: 42.4 })).toEqual({ stage: 'Data and sovereignty', percent: 42 });
  });
  it('clamps the percent and cuts the stage to size', () => {
    expect(progressFor('in_progress', { stage: 'x'.repeat(200), percent: 250 })).toEqual({ stage: 'x'.repeat(80), percent: 100 });
    expect(progressFor('draft', { percent: -5 })).toEqual({ percent: 0 });
  });
  it('drops control characters from the stage', () => {
    expect(progressFor('in_progress', { stage: 'Step\r\n1,"2"\u0000' }).stage).toBe('Step  1,"2"');
  });
  it('ignores anything that is not a string stage and a finite number percent', () => {
    expect(progressFor('in_progress', { stage: 7, percent: '40' })).toEqual({});
    expect(progressFor('in_progress', { percent: NaN })).toEqual({});
    expect(progressFor('in_progress', null)).toEqual({});
    expect(progressFor('in_progress', ['Step', 3])).toEqual({});
    expect(progressFor('in_progress', undefined)).toEqual({});
  });
  it('is Completed at 100 once completed, whatever the page sent', () => {
    expect(progressFor('completed', { stage: 'Step 1', percent: 10 })).toEqual({ stage: 'Completed', percent: 100 });
  });
  it('sends nothing for an archived assessment, so the stored progress stays', () => {
    expect(progressFor('archived', { stage: 'Step 1', percent: 10 })).toEqual({});
  });
});
