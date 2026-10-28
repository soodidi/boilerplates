import { DrizzleQueryError } from 'drizzle-orm/errors';
import { stdSerializers } from 'pino';
import { describe, expect, it } from 'vitest';
import { scrubErrorText, serializeError } from './scrub-error.js';

describe('serializeError', () => {
  it('drops the values of a failed query from the message, the stack and the cause', () => {
    const cause = Object.assign(new Error('duplicate key'), {
      detail: 'Key (email)=(ada@example.com) already exists.',
    });
    const error = new DrizzleQueryError(
      'insert into "notes" ("title", "user_id") values ($1, $2)',
      ['my secret note', '019a1f3e-0000-7000-8000-00000000000a'],
      cause,
    );

    const serialized = JSON.stringify(serializeError(error));

    expect(serialized).toContain('insert into \\"notes\\"');
    expect(serialized).not.toContain('my secret note');
    expect(serialized).not.toContain('019a1f3e-0000-7000-8000-00000000000a');
    expect(serialized).not.toContain('ada@example.com');
  });

  it('leaves other errors readable', () => {
    expect(serializeError(new Error('boom'))).toMatchObject({ type: 'Error', message: 'boom' });
  });

  it('keeps the error type when pino has already serialized the error', () => {
    const viaPino = stdSerializers.wrapErrorSerializer(serializeError as never);
    const error = new DrizzleQueryError('select 1', ['secret'], new Error('down'));

    const serialized = viaPino(error);

    expect(serialized).toMatchObject({ type: 'DrizzleQueryError' });
    expect(JSON.stringify(serialized)).not.toContain('secret');
  });
});

describe('scrubErrorText', () => {
  it('keeps the stack frames after the params line', () => {
    expect(scrubErrorText('Failed query: select 1\nparams: a,b\n    at fn (file.js:1:1)')).toBe(
      'Failed query: select 1\nparams: [redacted]\n    at fn (file.js:1:1)',
    );
  });
});
