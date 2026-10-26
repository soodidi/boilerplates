import { type INestApplication } from '@nestjs/common';
import { DocumentBuilder, type SchemaObject, SwaggerModule } from '@nestjs/swagger';
import { z } from 'zod';

/** BE-004 : contrat OpenAPI généré depuis le code. Les schémas Zod des décorateurs sont convertis par Nest. */
export function createOpenApiDocument(app: INestApplication, version: string) {
  const config = new DocumentBuilder()
    .setTitle('API')
    .setVersion(version)
    .addCookieAuth('session')
    .build();
  return SwaggerModule.createDocument(app, config, {
    operationIdFactory: (_controllerKey, methodKey) => methodKey,
  });
}

export function setupOpenApi(app: INestApplication, version: string) {
  SwaggerModule.setup('docs', app, () => createOpenApiDocument(app, version), {
    jsonDocumentUrl: 'docs/openapi.json',
  });
}

/** Schéma de réponse pour `@ApiOkResponse({ schema })`, dérivé du schéma Zod de sortie. */
export function responseSchema(schema: z.ZodType): SchemaObject {
  return z.toJSONSchema(schema, { target: 'openapi-3.0', io: 'output' }) as SchemaObject;
}
