import { Pool, QueryResult, PoolClient, QueryResultRow } from 'pg';

export class DatabaseService {
  private readonly pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 5432),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl:
        process.env.DB_SSL !== 'false' ? { rejectUnauthorized: false } : false,
    });
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async connect(): Promise<PoolClient> {
    return this.pool.connect();
  }
}

export const db = new DatabaseService();
