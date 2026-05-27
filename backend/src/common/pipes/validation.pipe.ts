import { ValidationPipe as NestValidationPipe, UnprocessableEntityException } from '@nestjs/common';

export class ValidationPipe extends NestValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors) =>
        new UnprocessableEntityException(
          errors.flatMap((e) => Object.values(e.constraints ?? {})),
        ),
    });
  }
}
