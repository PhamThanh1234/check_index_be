import { FastifyPluginAsync, FastifyInstance, HookHandlerDoneFunction } from 'fastify';
import mysql from 'mysql2';

const mysqlPlugin: FastifyPluginAsync = async (fastify, opts) => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'check_index',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  }).promise();

  fastify.decorate('mysql', pool);

  // Add a function to check database connection
  fastify.decorate('mysqlCheckConnection', async () => {
    try {
      const connection = await pool.getConnection();
      connection.release();
      console.log("MySQL connection")
      return true;
    } catch (error) {
      console.log("MySQL connection check failed:")
      fastify.log.error('MySQL connection check failed:', error);
      return false;
    }
  });

  fastify.addHook('onClose', (fastifyInstance: FastifyInstance, done: HookHandlerDoneFunction) => {
    pool.end()
      .then(() => done())
      .catch(done);
  });
};

export default mysqlPlugin;
