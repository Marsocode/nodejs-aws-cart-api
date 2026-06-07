import { Injectable } from '@nestjs/common';
import { Cart, CartStatuses } from '../models';
import { PutCartPayload } from 'src/order/type';
import { DatabaseService } from '../../database/services/database.service';

@Injectable()
export class CartService {
  constructor(private db: DatabaseService) {}

  async findByUserId(userId: string): Promise<Cart | null> {
    const cartResult = await this.db.query<{
      id: string;
      user_id: string;
      created_at: Date;
      updated_at: Date;
      status: CartStatuses;
    }>(
      `
      SELECT * FROM carts
      WHERE user_id = $1::uuid
        AND status = 'OPEN'
      LIMIT 1
    `,
      [userId],
    );

    const cart = cartResult.rows[0];

    if (!cart) {
      return null;
    }

    const itemsResult = await this.db.query<any>(
      `
      SELECT *
      FROM cart_items
      WHERE cart_id = $1::uuid
    `,
      [cart.id],
    );

    return {
      ...cart,
      created_at: cart.created_at.getTime(),
      updated_at: cart.updated_at.getTime(),
      items: itemsResult.rows.map((item) => ({
        product: {
          id: item.product_id,
          title: '',
          description: '',
          price: Number(item.price),
        },
        count: item.count,
      })),
    };
  }

  async createByUserId(userId: string): Promise<Cart> {
    const result = await this.db.query<{
      id: string;
      user_id: string;
      created_at: Date;
      updated_at: Date;
      status: CartStatuses;
    }>(
      `
      INSERT INTO carts (id, user_id, created_at, updated_at, status)
      VALUES (
        uuid_generate_v4(),
        $1::uuid,
        NOW(),
        NOW(),
        'OPEN'
      )
      RETURNING *
    `,
      [userId],
    );

    const cart = result.rows[0];
    return {
      id: cart.id,
      user_id: cart.user_id,
      created_at: cart.created_at.getTime(),
      updated_at: cart.updated_at.getTime(),
      status: cart.status,
      items: [],
    };
  }

  async findOrCreateByUserId(userId: string): Promise<Cart> {
    const cart = await this.findByUserId(userId);

    if (cart) {
      return cart;
    }

    return this.createByUserId(userId);
  }

  async updateByUserId(userId: string, payload: PutCartPayload): Promise<Cart> {
    const cart = await this.findOrCreateByUserId(userId);

    const existingItem = await this.db.query(
      `
      SELECT 1
      FROM cart_items
      WHERE cart_id = $1::uuid
        AND product_id = $2::uuid
    `,
      [cart.id, payload.product.id],
    );

    if (payload.count === 0) {
      await this.db.query(
        `
        DELETE FROM cart_items
        WHERE cart_id = $1::uuid
          AND product_id = $2::uuid
      `,
        [cart.id, payload.product.id],
      );
    } else if (existingItem.rowCount) {
      await this.db.query(
        `
        UPDATE cart_items
        SET 
          count = $3
          price = $4
        WHERE cart_id = $1::uuid
          AND product_id = $2::uuid
      `,
        [cart.id, payload.product.id, payload.count, payload.product.price],
      );
    } else {
      await this.db.query(
        `
        INSERT INTO cart_items (
          cart_id,
          product_id,
          count,
          price
        )
        VALUES (
          $1::uuid,
          $2::uuid,
          $3,
          $4
        )
      `,
        [cart.id, payload.product.id, payload.count, payload.product.price],
      );
    }

    const updatedCart = await this.findByUserId(userId);

    if (!updatedCart) {
      throw new Error('Cart not found after update');
    }

    return updatedCart;
  }

  async removeByUserId(userId: string): Promise<void> {
    const cart = await this.findByUserId(userId);

    if (!cart) {
      return;
    }

    await this.db.query(
      `
        DELETE FROM cart_items WHERE cart_id = (
          SELECT id FROM carts WHERE user_id = $1 AND status = 'OPEN' LIMIT 1
        )
      `,
      [userId],
    );
  }
}
