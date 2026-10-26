import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { SentryExceptionCaptured } from '@sentry/nestjs';
import { type FastifyReply, type FastifyRequest } from 'fastify';
import {
  createProblem,
  fieldErrorsFromIssues,
  PROBLEM_JSON_CONTENT_TYPE,
  type ProblemDetails,
} from './problem-details.js';
import { ValidationProblemException } from './validation.js';

/** BE-004 : toutes les erreurs sortent au format Problem Details (RFC 9457). */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  // BE-007 : envoie à Sentry les erreurs inattendues ; les HttpException (4xx attendues) sont ignorées.
  @SentryExceptionCaptured()
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const reply = http.getResponse<FastifyReply>();

    const problem = toProblem(exception, request.id);
    if (problem.status >= 500) {
      this.logger.error({ err: exception, traceId: request.id }, 'Unhandled error');
    }

    void reply
      .status(problem.status)
      .header('content-type', PROBLEM_JSON_CONTENT_TYPE)
      .send(problem);
  }
}

function toProblem(exception: unknown, traceId: string): ProblemDetails {
  if (exception instanceof ValidationProblemException) {
    const errors = fieldErrorsFromIssues(exception.issues);
    return createProblem({
      status: 400,
      title: 'Validation failed',
      detail: `${errors.length} invalid field(s)`,
      errors,
      traceId,
    });
  }

  if (exception instanceof HttpException && exception.getStatus() >= 400) {
    return createProblem({
      status: exception.getStatus(),
      detail: readMessage(exception.getResponse()),
      traceId,
    });
  }

  // BE-004 : aucun détail interne (stack trace, SQL) ne sort de l'API.
  return createProblem({ status: 500, detail: 'An unexpected error occurred.', traceId });
}

function readMessage(response: string | object): string | undefined {
  if (typeof response === 'string') return response;
  if ('message' in response && typeof response.message === 'string') return response.message;
  return undefined;
}
