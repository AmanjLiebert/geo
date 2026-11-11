import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { isPublicSlug } from './dto/public-scientific-query.dto';

@Injectable()
export class PublicSlugPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    const normalized = value.trim();
    if (!isPublicSlug(normalized)) {
      throw new BadRequestException('The requested public path is invalid.');
    }
    return normalized;
  }
}
