// API publique du module (BE-002). Les autres modules n'importent que ce fichier.
export { AccountModule } from './account.module.js';
export { type AccountExportResponse, accountExportResponseSchema } from './account.schemas.js';
export { AccountService } from './account.service.js';
