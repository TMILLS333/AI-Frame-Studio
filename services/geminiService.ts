/**
 * DEPLOYMENT NOTICE - DO NOT MODIFY API KEY PATTERN
 * 
 * This file supports TWO environments:
 * - AI Studio: Uses process.env.API_KEY (auto-provided by Google)
 * - Cloudflare Pages: Uses import.meta.env.VITE_GEMINI_API_KEY (from env vars)
 * 
 * The API key retrieval pattern MUST remain:
 *   const apiKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) || process.env.API_KEY;
 * 
 * Changing to ONLY process.env breaks Cloudflare deployment.
 * Changing to ONLY import.meta.env breaks AI Studio development.
 */

import { GoogleGenAI, Modality, Type } from '@google/genai';
import { Theme, Colors, TutorTone } from '../types';

export const CRITICAL_PRESERVE_PHOTO_RULE = `CRITICAL RULES:
1.  **Preserve the Photo:** Do NOT modify, alter, or draw over the existing central photo. The original photo must remain perfectly untouched.`;

export const EDITABLE_DEFAULT_FRAME_GENERATION_BASE_PROMPT = `You are an AI digital artist specializing in creating beautiful, bespoke photo frames.

I have provided a composite image with a central photo placed on a larger canvas. Your task is to design and draw a creative frame in the blank white area that surrounds the central photo.

The key is to create a frame that looks intentionally designed **for** the photo. The elements of the frame should gracefully touch and interact with the edges of the central photo, rather than looking like they are cut off by it. Imagine you are creating a real, physical frame that goes around the picture.

2.  **Seamless Integration:** The frame's design elements must not be abruptly cut off at the photo's edge. The design should naturally conclude or curve away as it meets the boundary of the photograph.
3.  **Complete the Frame:** Fill the entire blank white area from the edge of the photo to the outer edge of the canvas. Do not leave any empty margins.
4.  **Maintain Dimensions:** The final generated image you return must be a perfect 1024x1024 square.

The theme for the frame is:`;


const getPromptForTheme = (theme: Theme, editableBasePrompt: string, guardrails?: string): string => {
    // The final prompt is a combination of the critical rule, the user-editable base, the theme-specific style, and any final guardrails.
    let finalPrompt = `${CRITICAL_PRESERVE_PHOTO_RULE}\n\n${editableBasePrompt} ${theme.prompt}`;

    if (guardrails && guardrails.trim()) {
        finalPrompt += `\n\nADDITIONAL USER GUARDRAILS:\n${guardrails.trim()}`;
    }

    return finalPrompt;
};

export const generateFrame = async (
    base64Image: string,
    theme: Theme,
    editableBasePrompt: string,
    temperature: number = 0.4,
    topP: number = 0.8,
    topK: number = 40,
    guardrails?: string
): Promise<string> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API_KEY environment variable not set");
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = getPromptForTheme(theme, editableBasePrompt, guardrails);
    const imagePart = {
        inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image.split(',')[1],
        },
    };
    const textPart = {
        text: prompt,
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseModalities: [Modality.IMAGE],
                temperature: temperature,
                topP: topP,
                topK: topK,
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                return `data:image/png;base64,${base64ImageBytes}`;
            }
        }
        throw new Error("No image data found in Gemini response");
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("Failed to generate the image frame. Please try again.");
    }
};

const appCustomizationSchema = {
  type: Type.OBJECT,
  description: "A single theme object for the application's frame generation feature.",
  properties: {
    id: { type: Type.STRING, description: "A unique, URL-friendly ID for the theme (e.g., 'vintage-roses')." },
    name: { type: Type.STRING, description: "A short, catchy name for the theme (e.g., 'Vintage Roses')." },
    description: { type: Type.STRING, description: "A brief, one-sentence description of the theme." },
    iconName: { type: Type.STRING, description: "The name of an icon for the theme. Choose a valid name from the lucide-react library, e.g., 'Anchor', 'Award', 'Bike', 'BookOpen', 'Briefcase', 'Brush', 'Camera', 'Castle', 'Cat', 'Cherry', 'Cloud', 'Code', 'Compass', 'Cpu', 'Crown', 'Diamond', 'Feather', 'Flag', 'Flame', 'Flower', 'Gamepad2', 'Gem', 'Ghost', 'Gift', 'Globe', 'Grape', 'Heart', 'KeyRound', 'Leaf', 'Lightbulb', 'Map', 'Moon', 'Mountain', 'Music', 'Palette', 'Plane', 'Puzzle', 'Rocket', 'Shield', 'Ship', 'Sparkles', 'Star', 'Sun', 'Swords', 'TreePine', 'Trophy', 'Umbrella', 'Wand2', 'Watch', 'Wind'." },
    prompt: { type: Type.STRING, description: "A detailed prompt for an AI image generator to create a frame in this theme's style. Ensure elements subtly extend inward, partially overlapping the very edges of the central image." },
  },
  required: ["id", "name", "description", "iconName", "prompt"],
};

export const DEFAULT_APP_CUSTOMIZATION_SYSTEM_INSTRUCTION = `You are an AI assistant that creates a theme for a photo framing application. The user will describe a style. Your task is to generate a single, complete theme configuration based on their description. You must respond with a valid JSON object that adheres to the provided schema. The theme should be creative and consistent with the user's request. The 'prompt' you generate should be detailed and guide an image AI to create a beautiful frame. Ensure elements subtly extend inward, partially overlapping the very edges of the central image.`;


export const generateAppCustomization = async (userPrompt: string, systemInstruction: string = DEFAULT_APP_CUSTOMIZATION_SYSTEM_INSTRUCTION): Promise<Theme> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API_KEY environment variable not set");
    }
    const ai = new GoogleGenAI({ apiKey });

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: userPrompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: appCustomizationSchema,
            },
        });
        
        const jsonText = response.text.trim();
        const jsonMatch = jsonText.match(/```json\n([\s\S]*?)\n```/);
        const parsableText = jsonMatch ? jsonMatch[1] : jsonText;
        return JSON.parse(parsableText);

    } catch (error) {
        console.error("Error generating app customization:", error);
        throw new Error("Failed to generate app customization. The AI might be having trouble with the request.");
    }
};

export const askGeminiTutor = async (
    query: string,
    tone: TutorTone,
    appConfig: object,
    base64Image: string | null = null,
): Promise<string> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API_KEY environment variable not set");
    }
    const ai = new GoogleGenAI({ apiKey });

    const toneInstructions = {
        simple: "Explain your answer in simple, non-technical terms, using an analogy if possible. Be friendly and encouraging.",
        standard: "Provide a clear and concise explanation.",
        technical: "Provide a detailed, technical explanation suitable for a developer. You can mention underlying concepts and technologies.",
    };

    const systemInstruction = `You are "Frame Coach", a helpful and witty AI assistant embedded within a web application called 'Frame Studio'. Your personality is that of a creative art coach and prompt engineering expert.
    Your primary roles are:
    1.  **App Expert:** Answer user questions about this app ('Frame Studio'), its settings, features, and the AI/design concepts it demonstrates. The app allows users to upload a photo, generate a creative frame around it using AI, and customize the entire app's theme.
    2.  **Prompting Guru:** Help users write better, more effective prompts to generate beautiful and lush frame designs. If a user asks for help with a prompt, guide them with suggestions, ask clarifying questions about their desired style, and help them refine their ideas into a detailed prompt that the frame generation AI can understand.

    Do not answer questions unrelated to this application or prompt engineering for it. If asked an off-topic question, politely steer the conversation back to the app.

    Here is the app's current live configuration for your context:
    ${JSON.stringify(appConfig, null, 2)}`;

    const fullQuery = `${toneInstructions[tone]}\n\nUser Question: "${query}"`;
    
    const contents: any = { parts: [{ text: fullQuery }] };

    if (base64Image) {
        contents.parts.unshift({
            inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image.split(',')[1],
            },
        });
    }

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: contents,
            config: {
                systemInstruction,
            },
        });
        return response.text;
    } catch (error) {
        console.error("Error querying Gemini Tutor:", error);
        throw new Error("The Frame Coach seems to be on a coffee break. Please try again in a moment.");
    }
};