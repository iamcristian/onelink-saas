import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import type { ArgumentMetadata } from '@nestjs/common';
import type { ZodType } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema?: ZodType<any, any, any>) {}

  transform(value: unknown, metadata?: ArgumentMetadata) {
    if (!this.schema) {
      return value;
    }

    // When applied via method-level @UsePipes(), only validate the request body
    if (metadata?.type && metadata.type !== 'body') {
      return value;
    }

    const parseResult = this.schema.safeParse(value);
    if (!parseResult.success) {
      const errorDetails = parseResult.error.errors.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      const firstDetail = errorDetails.length > 0
        ? `: ${errorDetails[0].field} (${errorDetails[0].message})`
        : '';

      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: `Validation failed${firstDetail}`,
        details: errorDetails,
      });
    }

    return parseResult.data;
  }
}
