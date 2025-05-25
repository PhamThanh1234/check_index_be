// routes/metadataRoutes.ts
import { FastifyInstance } from 'fastify';
import { setMetadataHandler1 } from '../../controller/geotagimg/metadataController';

export default async function metadataRoutes(fastify: FastifyInstance) {
 
  fastify.post('/sett', setMetadataHandler1);
}
