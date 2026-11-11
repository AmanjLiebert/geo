import { Controller, Get } from '@nestjs/common';
import { Public } from './identity/access.decorators';

@Public()
@Controller({ path: '', version: '1' })
export class AppController {
  @Get()
  getServiceInfo(): { name: string; version: string; status: string } {
    return {
      name: 'Geo-Kurdistan API',
      version: '1',
      status: 'foundation',
    };
  }
}
