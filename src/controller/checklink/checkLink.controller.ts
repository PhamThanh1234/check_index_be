import { FastifyRequest, FastifyReply } from 'fastify';
import { checkUrlsInBatch } from '../../service/checkLink.service';

export const checkUrlsHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const { urls } = req.body as { urls: string[] };
  if (!urls || !Array.isArray(urls)) {
    return reply.status(400).send({ error: 'Invalid URL list' });
  }

  const results = await checkUrlsInBatch(urls);
  return reply.send({ results });
};