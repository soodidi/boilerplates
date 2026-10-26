import { describe, expect, it } from 'vitest';
import { createProblem, fieldErrorsFromIssues } from './problem-details.js';

describe('Problem Details', () => {
  it('uses the default title for a known status', () => {
    expect(createProblem({ status: 404 })).toMatchObject({
      type: 'about:blank',
      title: 'Not Found',
    });
  });

  it('turns validation issues into field errors', () => {
    expect(
      fieldErrorsFromIssues([{ message: 'Too small', path: ['lines', 0, { key: 'price' }] }]),
    ).toEqual([{ field: 'lines.0.price', code: 'invalid', message: 'Too small' }]);
  });
});
