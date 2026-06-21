import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './services';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [OrderService],
  controllers: [OrderController],
  exports: [OrderService],
})
export class OrderModule {}
