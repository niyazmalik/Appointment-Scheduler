import { Controller, Get } from '@nestjs/common';

@Controller()
export class GreetController {
    @Get()
    sayHello(): { message: string } {
    return { message: 'Hello I am Niyaz Malik 👋' };
  }
}
