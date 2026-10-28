import { HOST } from './host';
import { type LegalContent } from './types';

/** Templates to review before going live: they describe the app as shipped by the boilerplate. */
export const en: LegalContent = (info) => ({
  notice: {
    title: 'Legal notice',
    sections: [
      {
        heading: 'Publisher',
        blocks: [
          `This application is published by ${info.publisherName} (${info.publisherStatus}), ${info.publisherAddress}.`,
          `Phone: ${info.publisherPhone}. Contact: ${info.contactEmail}.`,
          `Registration: ${info.publisherRegistration}.`,
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
          'The publisher only collects what the service needs:',
          [
            'your account: name, email address and password, stored only in an irreversible form (hash);',
            'your sign-in sessions: IP address and browser or device type, to keep your account secure;',
            'your IP address, for the time needed to limit repeated sign-in or sign-up attempts;',
            'the content you create in the application.',
          ],
        ],
      },
      {
        heading: 'Purposes and legal bases',
        blocks: [
          [
            'providing the service and managing your account: performance of the contract (terms of use);',
            'sending service emails (address confirmation, password reset, alert when someone signs up with your address): performance of the contract;',
            'protecting your account and the application against abuse, and fixing technical errors: legitimate interest.',
          ],
          'Your data is never sold or used for advertising.',
        ],
      },
      {
        heading: 'Retention periods',
        blocks: [
          [
            'account and content: until you delete your account;',
            'sessions: valid for 30 days after their last use and at most 90 days after sign-in, then erased within 24 hours;',
            'IP address used to limit attempts: 24 hours;',
            'links sent by email: until they expire, one hour at most, then erased within 24 hours;',
            `server technical logs (requested addresses, results, without IP address or browser): ${info.logRetentionDays} days;`,
            `technical error reports: ${info.errorRetentionDays} days;`,
            `database backups: ${info.backupRetentionDays} days. Deleted data disappears from the backups after this period.`,
          ],
        ],
      },
      {
        heading: 'Recipients and processors',
        blocks: [
          'Only the publisher and the following providers can access your data, solely to run the service:',
          [
            `${HOST.name} (France): hosting of the application and database, technical logs, sending emails; backups copied to another region of the European Union;`,
            'Sentry (Functional Software, Inc., United States): technical error reports (page visited, browser and system, error trace), without name, email address, IP address or content, hosted in the European Union; any access from the United States is covered by the European Commission’s standard contractual clauses;',
            'Apple and Google: distribution of the mobile apps, if you use them.',
          ],
        ],
      },
      {
        heading: 'Cookies',
        blocks: [
          'The application uses a single cookie, the session cookie that keeps you signed in, and one technical entry in your browser storage to keep your sign-in in sync across tabs. Both are strictly necessary for the service and therefore do not require your consent. No advertising tracker or audience measurement tool is used.',
        ],
      },
      {
        heading: 'Your rights',
        blocks: [
          'From the “My account” page, you can at any time:',
          [
            'export all your data to a file (right of access and portability);',
            `delete your account and all your data, immediately and permanently (right to erasure); only the backups keep them, for ${info.backupRetentionDays} days at most.`,
          ],
          `You can also ask for your data to be corrected, restrict or object to its processing, or set instructions on what happens to it after your death, by writing to ${info.contactEmail}. If you believe your rights are not respected, you can lodge a complaint with the CNIL (www.cnil.fr) or the supervisory authority of your country of residence.`,
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
          `These terms govern the use of the application published by ${info.publisherName}. By creating an account, you accept them.`,
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
          'You can delete your account at any time from the “My account” page; your data is then erased. The publisher may suspend or delete an account in case of a serious breach of these terms, after informing you by email.',
        ],
      },
      {
        heading: 'Liability',
        blocks: [
          'The publisher uses reasonable means to keep the service running and your content safe, including regular backups. You can export your data at any time from the “My account” page.',
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
