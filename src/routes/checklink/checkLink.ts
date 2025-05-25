import { FastifyInstance } from 'fastify';
import { checkUrlsHandler } from '../../controller/checklink/checkLink.controller';

export default async function urlCheckerRoutes(fastify: FastifyInstance) {
  fastify.post('/check-urls', checkUrlsHandler);
}