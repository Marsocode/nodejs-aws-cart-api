import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { BasicAuthGuard } from '../auth';
import { Order } from './models';
import { OrderService } from './services';
import { PutOrderPayload } from 'src/order/type';

@Controller('api/order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @UseGuards(BasicAuthGuard)
  @Get('')
  async getOrder(): Promise<Order[]> {
    return this.orderService.getAll();
  }

  @UseGuards(BasicAuthGuard)
  @Get(':id')
  async getOrderById(@Param('id') id: string): Promise<Order | null> {
    const order = await this.orderService.findById(id);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  @UseGuards(BasicAuthGuard)
  @Put(':id/status')
  async updateOrderStatus(
    @Body() body: PutOrderPayload,
    @Param('id') id: string,
  ) {
    const order = await this.orderService.update(id, body);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }
}
