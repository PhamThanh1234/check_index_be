import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { getCheckIndexData } from '../../controller/checkdata/checkdata';

interface SearchInput {
  data: string;
  'x-api-key': string;
}

const checkindexRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/checkindex', async (
    request: FastifyRequest<{ Body: SearchInput }>,
    reply: FastifyReply
  ) => {
    return getCheckIndexData(fastify, request, reply);
  });
};

export default checkindexRoute;
