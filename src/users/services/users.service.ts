import { Injectable } from '@nestjs/common';
import { User } from '../models';
import { DatabaseService } from '../../database/services/database.service';

@Injectable()
export class UsersService {
  constructor(private db: DatabaseService) {}

  async findOne(name: string): Promise<User | null> {
    const result = await this.db.query<any>(
      `SELECT * 
        FROM users 
        WHERE name = $1 LIMIT 1`,
      [name],
    );
    return result.rows[0] ?? null;
  }

  async createOne({ name, password }: User): Promise<User> {
    const result = await this.db.query<any>(
      `INSERT INTO users (name, password) 
       VALUES ($1, $2) RETURNING *`,
      [name, password],
    );
    return result.rows[0];
  }
}
