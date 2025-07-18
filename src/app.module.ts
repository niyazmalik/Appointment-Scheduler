import { Module } from '@nestjs/common';
import { GreetModule } from './greet/greet.module';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    GreetModule
  ]
})
export class AppModule {}
