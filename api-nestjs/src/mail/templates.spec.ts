import { describe, expect, it } from 'vitest';
import { escapeHtml, existingAccountEmail, resetPasswordEmail, verifyEmail } from './templates.js';

describe('email templates', () => {
  const params = {
    to: 'ada@example.com',
    appName: 'Notes',
    url: 'https://app.example.com/verify?token=abc',
  };

  it('escapes HTML special characters', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;',
    );
  });

  it.each([
    ['verify-email', verifyEmail],
    ['reset-password', resetPasswordEmail],
    ['existing-account', existingAccountEmail],
  ])('%s has a subject, a text and an HTML version with the link', (template, render) => {
    const email = render(params);

    expect(email.template).toBe(template);
    expect(email.to).toBe(params.to);
    expect(email.subject).toMatch(/^Notes : /);
    expect(email.text).toContain(params.url);
    expect(email.html).toContain(`href="${params.url}"`);
  });

  it('escapes the app name and the URL in the HTML version', () => {
    const email = verifyEmail({
      ...params,
      appName: '<script>alert(1)</script>',
      url: 'https://app.example.com/?a=1&b="2"',
    });

    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
    expect(email.html).toContain('href="https://app.example.com/?a=1&amp;b=&quot;2&quot;"');
  });
});
