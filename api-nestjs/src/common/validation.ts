import { BadRequestException, StandardSchemaValidationPipe } from '@nestjs/common';
import { type StandardIssue } from './problem-details.js';

/** Erreur de validation qui conserve les issues, pour produire des erreurs par champ (BE-004). */
export class ValidationProblemException extends BadRequestException {
  constructor(readonly issues: readonly StandardIssue[]) {
    super('Validation failed');
  }
}

/**
 * BE-005 : toute donnée entrante est validée par le schéma déclaré sur le décorateur
 * (`@Body({ schema })`, `@Query({ schema })`, `@Param('id', { schema })`).
 */
export function createValidationPipe() {
  return new StandardSchemaValidationPipe({
    exceptionFactory: (issues) => new ValidationProblemException(issues),
  });
}
