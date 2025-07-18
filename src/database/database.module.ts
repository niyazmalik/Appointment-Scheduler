import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import typeOrmModuleConfig from 'src/config/typeorm.module.config';

@Module({
  imports: [TypeOrmModule.forRoot(typeOrmModuleConfig)],
})
export class DatabaseModule {}
