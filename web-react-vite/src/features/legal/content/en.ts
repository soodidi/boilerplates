import { HOST, type LegalContent } from './types';

/** Templates to review before going live: they describe the app as shipped by the boilerplate. */
export const en: LegalContent = (info) => ({
  notice: {
    title: 'Legal notice',
    sections: [
      {
        heading: 'Publisher',
        blocks: [
          `This application is published by ${info.publisherName} (${info.publisherStatus}), ${info.publisherAddress}.`,
          `Registration: ${info.publisherRegistration}.`,
          `Contact: ${info.contactEmail}.`,
        ],
      },
      {
        heading: 'Publication director',
        blocks: [info.publicationDirector],
      },
      {
        heading: 'Host',
        blocks: [
          HOST.name,
          `Registered office: ${HOST.address}`,
          `Phone: ${HOST.phone}`,
          `Website: ${HOST.website}`,
        ],
      },
      {
        heading: 'Personal data',
        blocks: [
          'How your data is processed is described in the privacy policy, linked at the bottom of every page.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy policy',
    sections: [
      {
        heading: 'Data controller',
        blocks: [
          `${info.publisherName}, ${info.publisherAddress}. For any question about your data: ${info.contactEmail}.`,
        ],
      },
      {
        heading: 'Data we collect',
        blocks: [
          'We only collect what the service needs:',
          [
            'your account: name, email address and password, stored only in an irreversible form (hash);',
            'your sign-in sessions: IP address and browser or device type, to keep your account secure;',
            'the content you create in the application.',
          ],
        ],
      },
      {
        heading: 'Purposes and legal bases',
        blocks: [
          [
            'providing the service and managing your account: performance of the contract (terms of use);',
            'sending service emails (address confirmation, new password): performance of the contract;',
            'protecting your account and the application against abuse: legitimate interest.',
          ],
          'Your data is never sold or used for advertising.',
        ],
      },
      {
        heading: 'Retention periods',
        blocks: [
          [
            'account and content: until you delete your account;',
            'sessions: 30 days after their last use, and never more than 90 days;',
            'links sent by email: until they expire, one hour at most;',
            `database backups: ${info.backupRetentionDays} days. Deleted data disappears from the backups after this period.`,
          ],
        ],
      },
      {
        heading: 'Recipients and processors',
        blocks: [
          'Only the publisher and the following providers can access your data, solely to run the service:',
          [
            `${HOST.name} (France): hosting of the application and database, sending emails;`,
            'Sentry (Functional Software, Inc.): technical error tracking, data hosted in the European Union, without personal data;',
            'Apple and Google: distribution of the mobile apps, if you use them.',
          ],
        ],
      },
      {
        heading: 'Cookies',
        blocks: [
          'The application uses a single cookie: the session cookie, which keeps you signed in. It is strictly necessary for the service and therefore does not require your consent. No advertising tracker or audience measurement tool is used.',
        ],
      },
      {
        heading: 'Your rights',
        blocks: [
          'From the “My account” page, you can at any time:',
          [
            'export all your data to a file (right of access and portability);',
            'delete your account and all your data, immediately and permanently (right to erasure).',
          ],
          `You can also ask for your data to be corrected, or object to its processing, by writing to ${info.contactEmail}. If you believe your rights are not respected, you can lodge a complaint with the CNIL (www.cnil.fr).`,
        ],
      },
      {
        heading: 'Security',
        blocks: [
          'Traffic is encrypted (HTTPS), passwords are hashed with Argon2id, and your sessions can be revoked at any time by signing out or changing your password.',
        ],
      },
    ],
  },
  terms: {
    title: 'Terms of use',
    sections: [
      {
        heading: 'Purpose',
        blocks: [
          `These terms govern the use of the application published by ${info.publisherName}. Creating an account means you accept them.`,
        ],
      },
      {
        heading: 'Access to the service',
        blocks: [
          'The service is available to anyone with an account. The publisher strives to keep it available at all times but cannot guarantee it: it may be interrupted for maintenance or in case of failure.',
        ],
      },
      {
        heading: 'Account',
        blocks: [
          'You agree to provide a valid email address and to keep your password confidential. Any action taken from your account is deemed to be taken by you.',
        ],
      },
      {
        heading: 'Content',
        blocks: [
          'You remain the owner of the content you create, and solely responsible for it. It must not break the law or infringe the rights of others. The publisher may remove manifestly unlawful content reported to it.',
        ],
      },
      {
        heading: 'Account deletion',
        blocks: [
          'You can delete your account at any time from the “My account” page; your data is then erased. The publisher may suspend or delete an account in case of a serious breach of these terms.',
        ],
      },
      {
        heading: 'Liability',
        blocks: [
          'The service is provided as is. To the extent permitted by law, the publisher is not liable for indirect damage related to its use, nor for loss of content: export your data regularly if it matters to you.',
        ],
      },
      {
        heading: 'Personal data',
        blocks: ['How your data is processed is described in the privacy policy.'],
      },
      {
        heading: 'Changes to these terms',
        blocks: [
          'The publisher may change these terms. The date of the last update is shown at the top of the page; you will be informed by email of any significant change.',
        ],
      },
      {
        heading: 'Governing law',
        blocks: [
          `These terms are governed by French law. In case of dispute, first contact the publisher at ${info.contactEmail} to find an amicable solution.`,
        ],
      },
    ],
  },
});
