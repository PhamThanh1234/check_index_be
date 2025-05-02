import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { getCheckIndexData } from '../../controller/checkdata/checkdata';

const checkIndexDataRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/checkindex/data', async (request: FastifyRequest, reply: FastifyReply) => {
    return getCheckIndexData(request.server, request, reply);
  });
};

export default checkIndexDataRoute;
