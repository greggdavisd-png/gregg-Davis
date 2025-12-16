import { GoogleGenAI, Type, Modality } from "@google/genai";
import { QuizQuestion, ReadingChallenge, VideoSearchResult, SpellingChallenge, MathQuestion } from "../types";

// NOTE: In a real app, never expose API keys on the client side.
const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

export const generateUnlockQuiz = async (topic: string = "general science"): Promise<QuizQuestion | null> => {
  if (!apiKey) {
    console.warn("No API Key provided for Gemini.");
    return null;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a fun, multiple-choice trivia question for a 10-12 year old child. 
      Topic: ${topic}. 
      Return JSON with fields: question (string), options (array of 4 strings), correctAnswerIndex (number 0-3), explanation (string).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            correctAnswerIndex: { type: Type.INTEGER },
            explanation: { type: Type.STRING }
          },
          required: ["question", "options", "correctAnswerIndex", "explanation"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as QuizQuestion;

  } catch (error) {
    console.error("Gemini Quiz Generation Failed:", error);
    return null;
  }
};

export const generateGeneralKnowledgeQuiz = async (age: number, count: number = 20): Promise<QuizQuestion[] | null> => {
  if (!apiKey) return null;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate ${count} distinct, fun, multiple-choice trivia questions suitable for a ${age} year old child.
      Topics can include science, history, geography, space, and nature.
      Return a JSON array of objects with fields: question (string), options (array of 4 strings), correctAnswerIndex (number 0-3), explanation (string).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              correctAnswerIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING }
            },
            required: ["question", "options", "correctAnswerIndex", "explanation"]
          }
        }
      }
    });
    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as QuizQuestion[];
  } catch (error) {
    console.error("General Knowledge Gen Failed", error);
    return null;
  }
};

export const generateMathQuiz = async (age: number, count: number = 20): Promise<QuizQuestion[] | null> => {
  if (!apiKey) return null;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate ${count} distinct multiple-choice math word problems or equations suitable for a ${age} year old child.
      Ensure the difficulty is appropriate.
      Return a JSON array of objects with fields: question (string), options (array of 4 strings), correctAnswerIndex (number 0-3), explanation (string).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              correctAnswerIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING }
            },
            required: ["question", "options", "correctAnswerIndex", "explanation"]
          }
        }
      }
    });
    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as QuizQuestion[];
  } catch (error) {
    console.error("Math Quiz Gen Failed", error);
    return null;
  }
};

export const generateReadingChallenge = async (age: number): Promise<ReadingChallenge[] | null> => {
  if (!apiKey) return null;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate 40 distinct, short reading comprehension tasks suitable for a ${age} year old child.
      Each task must have a title, a short text (appropriate for age ${age}), and one multiple-choice question about it.
      Return a JSON array of objects.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              story: { type: Type.STRING },
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswerIndex: { type: Type.INTEGER }
            },
            required: ["title", "story", "question", "options", "correctAnswerIndex"]
          }
        }
      }
    });
    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as ReadingChallenge[];
  } catch (error) {
    console.error("Reading Gen Failed", error);
    return null;
  }
};

export const generateSpellingChallenge = async (age: number): Promise<SpellingChallenge[] | null> => {
  if (!apiKey) return null;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate 40 distinct spelling words suitable for a ${age} year old child.
      Return a JSON array of objects with fields: word (string), hint (string - definition), contextSentence (string - using the word).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              hint: { type: Type.STRING },
              contextSentence: { type: Type.STRING }
            },
            required: ["word", "hint", "contextSentence"]
          }
        }
      }
    });
    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as SpellingChallenge[];
  } catch (error) {
    console.error("Spelling Gen Failed", error);
    return null;
  }
};

export const generateMathChallenge = async (age: number): Promise<MathQuestion[] | null> => {
  if (!apiKey) return null;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate 40 different math problems suitable for a ${age} year old child.
      Ensure the difficulty matches the age (e.g. simple addition for young kids, algebra for teens).
      The answer must be a number.
      Return a JSON array of objects with fields: question (string), answer (number).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              answer: { type: Type.NUMBER }
            },
            required: ["question", "answer"]
          }
        }
      }
    });
    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as MathQuestion[];
  } catch (error) {
    console.error("Math Gen Failed", error);
    return null;
  }
};

export const getGeminiTTS = async (text: string): Promise<string | null> => {
  if (!apiKey) return null;
  try {
    // Using flash-preview-tts for speech generation
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
    console.error("TTS Failed", error);
    return null;
  }
};

export const searchEducationalVideos = async (query: string): Promise<VideoSearchResult[] | null> => {
  if (!apiKey) return null;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are a strict educational video filter for children. Analyze the search query: '${query}'.
      1. If the query is related to inappropriate content, pure entertainment (gaming, popular cartoons, memes, skibidi toilet, brainrot), unsafe topics, OR MALWARE/HACKS (viruses, free robux, aimbots, cracks, download hacks), return NULL (empty list).
      2. If the query is educational (science, history, math, nature, geography, diy, art, space), generate 4 fictional but realistic video entries.
      
      Return JSON with an array of objects: { title, channel, duration, thumbnailColor (hex code string) }.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              channel: { type: Type.STRING },
              duration: { type: Type.STRING },
              thumbnailColor: { type: Type.STRING }
            },
            required: ["title", "channel", "duration", "thumbnailColor"]
          }
        }
      }
    });
    
    const text = response.text;
    if (!text) return null; 
    const res = JSON.parse(text) as VideoSearchResult[];
    return res.length > 0 ? res : null;
  } catch (error) {
    console.error("Video Search Failed", error);
    return null;
  }
};

export const analyzeHomework = async (base64Image: string, age: number): Promise<string> => {
  if (!apiKey) return "I need an internet connection to help with homework.";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image,
            },
          },
          {
            text: `You are a helpful and encouraging tutor for a ${age} year old child. 
            Analyze the image which contains a homework problem.
            1. Identify the problem.
            2. Explain the solution step-by-step in a simple way suitable for a ${age} year old.
            3. Do not just give the answer immediately; guide them through the logic.
            4. Keep it concise but friendly.`,
          },
        ],
      },
    });

    return response.text || "I couldn't read the homework. Try taking a clearer picture.";
  } catch (error) {
    console.error("Homework Analysis Failed", error);
    return "Sorry, I had trouble analyzing that. Please try again.";
  }
};