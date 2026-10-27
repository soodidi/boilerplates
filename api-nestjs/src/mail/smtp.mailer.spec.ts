import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type Env, envSchema } from '../config/env.js';
import { type Email } from './mailer.js';
import { type MailTransport, RETRY_DELAYS_MS, SmtpMailer } from './smtp.mailer.js';

const sentry = vi.hoisted(() => ({ captureException: vi.fn() }));
vi.mock('@sentry/nestjs', () => sentry);

const email: Email = {
  template: 'verify-email',
  to: 'ada@example.com',
  subject: 'Subject',
  text: 'Text',
  html: '<p>Html</p>',
};

function createEnv(overrides: Record<string, string> = {}): Env {
  return envSchema.parse({
    DATABASE_URL: 'postgres://app:app@localhost:5432/app',
    SMTP_URL: 'smtp://localhost:1025',
    MAIL_FROM: 'App <noreply@example.com>',
    ...overrides,
  });
}

/** Faux transport : seul le comportement de `sendMail` compte ici. */
function createTransport(sendMail: (...args: never[]) => unknown): MailTransport {
  return { sendMail: sendMail as MailTransport['sendMail'], close: vi.fn() };
}

describe('SmtpMailer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sentry.captureException.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends the email from MAIL_FROM without blocking the caller', async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: '<1@example.com>' });
    const mailer = new SmtpMailer(createTransport(sendMail), createEnv());

    mailer.send(email);
    expect(sendMail).toHaveBeenCalledTimes(1);
    await mailer.flush();

    expect(sendMail).toHaveBeenCalledWith({
      from: 'App <noreply@example.com>',
      to: 'ada@example.com',
      subject: 'Subject',
      text: 'Text',
      html: '<p>Html</p>',
    });
  });

  it('retries with increasing delays, then succeeds', async () => {
    const sendMail = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('down'), { code: 'ECONNREFUSED' }))
      .mockResolvedValue({ messageId: '<1@example.com>' });
    const mailer = new SmtpMailer(createTransport(sendMail), createEnv());

    mailer.send(email);
    await vi.advanceTimersByTimeAsync(RETRY_DELAYS_MS[0] ?? 0);
    await mailer.flush();

    expect(sendMail).toHaveBeenCalledTimes(2);
    expect(sentry.captureException).not.toHaveBeenCalled();
  });

  it('reports to Sentry after the last retry on a transient error', async () => {
    const sendMail = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }));
    const mailer = new SmtpMailer(createTransport(sendMail), createEnv());

    mailer.send(email);
    await vi.runAllTimersAsync();
    await mailer.flush();

    expect(sendMail).toHaveBeenCalledTimes(RETRY_DELAYS_MS.length + 1);
    expect(sentry.captureException).toHaveBeenCalledWith(expect.any(Error), {
      tags: { template: 'verify-email', code: 'ETIMEDOUT' },
    });
  });

  it('does not retry a permanent SMTP error and reports it without the recipient', async () => {
    const sendMail = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error('550 ada@example.com: mailbox unavailable'), { responseCode: 550 }),
      );
    const mailer = new SmtpMailer(createTransport(sendMail), createEnv());

    mailer.send(email);
    await vi.runAllTimersAsync();
    await mailer.flush();

    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sentry.captureException).toHaveBeenCalledTimes(1);
    const [error, context] = sentry.captureException.mock.calls[0] as [Error, unknown];
    expect(error.message).not.toContain('ada@example.com');
    expect(JSON.stringify(context)).not.toContain('ada@example.com');
    expect(context).toEqual({ tags: { template: 'verify-email', code: '550' } });
  });

  it('only sends to MAIL_ALLOWED_RECIPIENTS when the list is set (staging)', async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: '<1@example.com>' });
    const mailer = new SmtpMailer(
      createTransport(sendMail),
      createEnv({ MAIL_ALLOWED_RECIPIENTS: 'Me@Example.com, other@example.com' }),
    );

    mailer.send({ ...email, to: 'stranger@example.com' });
    mailer.send({ ...email, to: 'me@example.com' });
    await mailer.flush();

    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'me@example.com' }));
  });

  it('waits for pending emails and closes the transport on shutdown', async () => {
    let resolve: (value: { messageId: string }) => void = () => undefined;
    const sendMail = vi.fn(() => new Promise<{ messageId: string }>((r) => (resolve = r)));
    const transport = createTransport(sendMail);
    const mailer = new SmtpMailer(transport, createEnv());

    mailer.send(email);
    const shutdown = mailer.onApplicationShutdown();
    resolve({ messageId: '<1@example.com>' });
    await shutdown;

    expect(transport.close).toHaveBeenCalled();
  });
});
