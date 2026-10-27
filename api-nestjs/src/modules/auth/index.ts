// API publique du module (BE-002). Les autres modules n'importent que ce fichier.
export { AuthModule } from './auth.module.js';
// BE-006 : `@Public()` ouvre une route ; `@Session()` donne la session de l'utilisateur connecté.
export { AllowAnonymous as Public, Session, type UserSession } from '@thallesp/nestjs-better-auth';
