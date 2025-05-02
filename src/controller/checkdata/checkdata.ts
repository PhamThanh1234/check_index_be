
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import mysql from 'mysql2/promise';

export const getCheckIndexData = async (
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'check_index',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
    const [rows] = await pool.query('SELECT * FROM check_index');
    await pool.end();
    return reply.send(rows);
  } catch (error: any) {
    fastify.log.error('Error querying check_index table:', error.message || error);
    return reply.status(500).send({ error: `Failed to fetch data from check_index table: ${error.message || error}` });
  }
};

