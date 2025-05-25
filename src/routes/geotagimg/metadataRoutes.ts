import { FastifyInstance } from 'fastify';
import { setMetadataHandler } from '../../controller/geotagimg/metadataController';

export default async function metadataRoutes(fastify: FastifyInstance) {
  fastify.post('/set', setMetadataHandler);
}
