import 'fastify';
import type { Pool } from 'mysql2/promise';

declare module 'fastify' {
  interface FastifyInstance {
    mysql: Pool;
    mysqlCheckConnection: () => Promise<boolean>;
  }
}
