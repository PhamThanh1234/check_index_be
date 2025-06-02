// src/controller/keywordClustering/keywordClusteringController.ts
import { FastifyRequest, FastifyReply } from "fastify";
import { groupKeywordsWithAI } from "../../service/keywordClusteringservice";

export async function groupKeywordsHandler(
  request: FastifyRequest<{ Body: { keywords: string[] } }>,
  reply: FastifyReply
) {
  try {
    const { keywords } = request.body;
    const grouped = await groupKeywordsWithAI(keywords);

    return reply.send({ groups: grouped });
  } catch (err) {
    console.error("AI processing failed:", err);
    return reply.code(500).send({ error: "AI processing failed" });
  }
}
