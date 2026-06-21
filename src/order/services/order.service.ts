import { Injectable } from '@nestjs/common';
import { Order } from '../models';
import { CreateOrderPayload, OrderStatus, PutOrderPayload } from '../type';
import { DatabaseService } from '../../database/services/database.service';

@Injectable()
export class OrderService {
  constructor(private db: DatabaseService) {}

  async getAll(): Promise<Order[]> {
    const result = await this.db.query<Order>(
      `
        SELECT *
        FROM orders
        ORDER BY id
      `,
    );

    return result.rows.map((row: any) => this.mapRowToOrder(row));
  }

  async findById(orderId: string): Promise<Order | null> {
    const result = await this.db.query<Order>(
      `
        SELECT *
        FROM orders
        WHERE id = $1::uuid
      `,
      [orderId],
    );

    const row = result.rows[0];

    return row ? this.mapRowToOrder(row) : null;
  }

  async create(data: CreateOrderPayload): Promise<Order> {
    const result = await this.db.query<any>(
      `
       INSERT INTO orders (user_id, cart_id, delivery, status, total)
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *
      `,
      [
        data.userId,
        data.cartId,
        JSON.stringify(data.address),
        OrderStatus.Open,
        data.total,
      ],
    );

    const row = result.rows[0];

    return this.mapRowToOrder(row, data.items);
  }

  async createWithTransaction(data: CreateOrderPayload): Promise<Order> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const { rows: orderRows } = await client.query(
        `
         INSERT INTO orders (user_id, cart_id, delivery, status, total)
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *
        `,
        [
          data.userId,
          data.cartId,
          JSON.stringify(data.address),
          OrderStatus.Open,
          data.total,
        ],
      );

      await client.query(
        `
         UPDATE carts 
         SET 
            status = 'ORDERED', 
            updated_at = NOW() 
         WHERE id = $1
        `,
        [data.cartId],
      );

      await client.query('COMMIT');

      return this.mapRowToOrder(orderRows[0], data.items);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async update(orderId: string, data: PutOrderPayload): Promise<Order | null> {
    const status = data.status ?? OrderStatus.Open;
    await this.db.query(
      `
      UPDATE orders
      SET
        status = $2,
        comments = COALESCE($3::text, comments)
      WHERE id = $1::uuid 
    `,
      [orderId, status, data.comment ?? null],
    );

    return this.findById(orderId);
  }

  private mapRowToOrder(
    row: any,
    items?: Array<{ productId: string; count: number }>,
  ): Order {
    return {
      id: row.id,
      userId: row.user_id,
      cartId: row.cart_id,
      address: row.delivery ?? {},
      items: items ?? [],
      statusHistory: [
        {
          status: row.status ?? OrderStatus.Open,
          timestamp: Date.now(),
          comment: row.comment || row.comments || '',
        },
      ],
    };
  }
}
