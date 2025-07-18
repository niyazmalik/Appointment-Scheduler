import { Module } from '@nestjs/common';
import { GreetModule } from './greet/greet.module';

@Module({
  imports: [GreetModule]
})
export class AppModule {}
