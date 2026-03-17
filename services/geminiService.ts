
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  private static getAI() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  static async generateBrandingImage(prompt: string, aspectRatio: string, imageSize: "1K" | "2K" | "4K") {
    // Note: Per requirements, gemini-3-pro-image-preview is used for high-quality images
    const ai = this.getAI();
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any,
            imageSize: imageSize as any
          }
        },
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      throw new Error("No se pudo generar la imagen");
    } catch (error: any) {
      if (error.message?.includes("Requested entity was not found")) {
        // This usually means key selection state is stale
        throw new Error("AUTH_KEY_EXPIRED");
      }
      throw error;
    }
  }
}
