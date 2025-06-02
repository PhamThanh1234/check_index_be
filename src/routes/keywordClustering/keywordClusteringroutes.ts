// src/routes/keywordClustering/keywordClusteringRoutes.ts
import { FastifyInstance } from "fastify";
import { groupKeywordsHandler } from "../../controller/keywordClustering/keywordClusteringController";

export default async function keywordClusteringRoutes(fastify: FastifyInstance) {
  fastify.post("/keywords/group", {
    schema: {
      body: {
        type: "object",
        required: ["keywords"],
        properties: {
          keywords: {
            type: "array",
            items: { type: "string" },
            minItems: 1,
          },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            groups: { type: "string" }, // trả text JSON từ AI
          },
        },
      },
    },
    handler: groupKeywordsHandler,
  });
}
