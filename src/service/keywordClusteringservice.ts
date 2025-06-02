// src/services/keywordClustering/keywordClusteringService.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

// API key nên được load từ .env
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function groupKeywordsWithAI(keywords: string[]): Promise<string> {
  const prompt = `
As an SEO expert, please analyze the semantics and intent of the following list of keywords.
Your task is to group them into meaningful clusters to create optimized articles targeting each group.
For each group, return a clear JSON object with:

1. The shortest possible and relevant title for the article based on the keyword group

2. A list of the associated keywords

Format your response strictly as JSON:
{
  "group1": {
    "title": "Article title for group 1",
    "keywords": ["keyword 1", "keyword 2"]
  },
  "group2": {
    "title": "Article title for group 2",
    "keywords": ["keyword 3", "keyword 4"]
  }
}
Here are the keywords to group: ${keywords.join(", ")}`;

  const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });

  const result = await model.generateContent([prompt]);
  const response = await result.response;
  const text = await response.text();

  return text;
}
