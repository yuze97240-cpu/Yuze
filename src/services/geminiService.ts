/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";

const getApiKey = () => {
  const key = process.env.GEMINI_API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY;
  if (!key && typeof window !== 'undefined') {
    console.warn("GEMINI_API_KEY is missing. Please set it in your environment variables.");
  }
  return key || "";
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });


export async function analyzeThoughtAndRecommendPoetry(thought: string) {
  const result = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `请分析以下这段感悟，识别其中的情感和意象，并推荐3首最贴合的中国古典诗词或现代名诗。
    
    用户感悟：${thought}
    
    请严格按照以下JSON格式返回：
    {
      "sentiment": "情感关键词",
      "imagery": ["意象1", "意象2"],
      "recommendations": [
        {
          "poetryTitle": "诗名",
          "author": "作者",
          "dynasty": "朝代",
          "content": "诗词全文",
          "background": "创作背景或赏析",
          "matchReason": "推荐理由"
        }
      ]
    }`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          sentiment: { type: Type.STRING },
          imagery: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                poetryTitle: { type: Type.STRING },
                author: { type: Type.STRING },
                dynasty: { type: Type.STRING },
                content: { type: Type.STRING },
                background: { type: Type.STRING },
                matchReason: { type: Type.STRING }
              },
              required: ["poetryTitle", "author", "content", "background", "matchReason"]
            }
          }
        },
        required: ["sentiment", "imagery", "recommendations"]
      }
    }
  });

  return JSON.parse(result.text);
}
