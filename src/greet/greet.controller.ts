import { Controller, Get } from '@nestjs/common';

@Controller('greet')
export class GreetController {
    @Get()
    sayHello(): { message: string } {
    return { message: 'Hello from CodeXecutioner- Niyaz Malik 👋' };
  }
}
