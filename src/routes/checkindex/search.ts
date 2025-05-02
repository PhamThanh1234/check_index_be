import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { checkindexHandler } from '../../controller/checkindex/checkindex';

interface SearchInput {
  data: string;
  'x-api-key': string;
  'mode':string;
}

const checkindexRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post('/search', async (
    request: FastifyRequest<{ Body: SearchInput }>,
    reply: FastifyReply
  ) => {
    return checkindexHandler(fastify, request, reply);
  });
};

export default checkindexRoute;
