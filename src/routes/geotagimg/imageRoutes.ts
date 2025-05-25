// routes/imageRoutes.ts
import { FastifyInstance } from 'fastify';
import { geotagImageHandler } from '../../controller/geotagimg/imageController';

export default async function imageRoutes(fastify: FastifyInstance) {
 
  fastify.post('/geotag', geotagImageHandler);
}