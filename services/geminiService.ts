import { GoogleGenAI, Modality, Type } from '@google/genai';
import { Theme, Colors, TutorTone } from '../types';

export const DEFAULT_FRAME_GENERATION_BASE_PROMPT = `
You are an AI inpainting specialist. I have provided an image that contains a central photo surrounded by a blank white area.
Your task is to fill *only the blank white area* with a beautiful, creative frame based on the provided theme.
CRITICAL: Do NOT modify, alter, edit, or touch the existing photo in the center. The original photo must be perfectly preserved.
The theme for the frame is:`;

const getPromptForTheme = (theme: Theme, customPrompt?: string, guardrails?: string): string => {
    let finalPrompt = `${DEFAULT_FRAME_GENERATION_BASE_PROMPT} ${theme.prompt}`;

    if (customPrompt && customPrompt.trim()) {
        finalPrompt += `\n\nAdditionally, incorporate the following user-specified creative detail: "${customPrompt.trim()}".`;
    }

    if (guardrails && guardrails.trim()) {
        finalPrompt += `\n\nADDITIONAL USER GUARDRAILS:\n${guardrails.trim()}`;
    }

    return finalPrompt;
};

export const generateFrame = async (
    base64Image: string,
    theme: Theme,
    customPrompt?: string,
    temperature: number = 0.8,
    topP: number = 0.8,
    topK: number = 40,
    guardrails?: string,
): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = getPromptForTheme(theme, customPrompt, guardrails);
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
  properties: {
    themes: {
      type: Type.ARRAY,
      description: "An array of exactly 3 theme objects for the application.",
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "A unique, URL-friendly ID for the theme (e.g., 'vintage-roses')." },
          name: { type: Type.STRING, description: "A short, catchy name for the theme (e.g., 'Vintage Roses')." },
          description: { type: Type.STRING, description: "A brief, one-sentence description of the theme." },
          iconName: { type: Type.STRING, description: "The name of an icon for the theme. Choose a valid name from the lucide-react library, e.g., 'Anchor', 'Award', 'Bike', 'BookOpen', 'Briefcase', 'Brush', 'Camera', 'Castle', 'Cat', 'Cherry', 'Cloud', 'Code', 'Compass', 'Cpu', 'Crown', 'Diamond', 'Feather', 'Flag', 'Flame', 'Flower', 'Gamepad2', 'Gem', 'Ghost', 'Gift', 'Globe', 'Grape', 'Heart', 'KeyRound', 'Leaf', 'Lightbulb', 'Map', 'Moon', 'Mountain', 'Music', 'Palette', 'Plane', 'Puzzle', 'Rocket', 'Shield', 'Ship', 'Sparkles', 'Star', 'Sun', 'Swords', 'TreePine', 'Trophy', 'Umbrella', 'Wand2', 'Watch', 'Wind'." },
          prompt: { type: Type.STRING, description: "A detailed prompt for an AI image generator to create a frame in this theme's style." },
        },
        required: ["id", "name", "description", "iconName", "prompt"],
      },
    },
    ui: {
      type: Type.OBJECT,
      description: "An object containing the text for the app's user interface, matching the overall theme.",
      properties: {
        title: { type: Type.STRING, description: "The main title of the application." },
        footer: { type: Type.STRING, description: "The footer text for the application." },
        loadingTitle: { type: Type.STRING, description: "The title text to show while the AI is generating an image." },
        loadingSubtitle: { type: Type.STRING, description: "The subtitle text to show while generating." },
      },
      required: ["title", "footer", "loadingTitle", "loadingSubtitle"],
    },
    colors: {
      type: Type.OBJECT,
      description: "An object containing the color palette for the app's UI, matching the overall theme. All colors must be valid hex codes (e.g., '#RRGGBB').",
      properties: {
        backgroundStart: { type: Type.STRING, description: "The starting color for the animated background gradient (hex)." },
        backgroundEnd: { type: Type.STRING, description: "The ending color for the animated background gradient (hex)." },
        primary: { type: Type.STRING, description: "The primary accent color for titles and important elements (hex)." },
        secondary: { type: Type.STRING, description: "The secondary accent color for buttons (hex)." },
        text: { type: Type.STRING, description: "The main text color, ensuring good contrast with the background (hex)." },
        textSecondary: { type: Type.STRING, description: "The secondary, more subtle text color for descriptions (hex)." },
      },
      required: ["backgroundStart", "backgroundEnd", "primary", "secondary", "text", "textSecondary"],
    },
  },
  required: ["themes", "ui", "colors"],
};

export const DEFAULT_APP_CUSTOMIZATION_SYSTEM_INSTRUCTION = `You are an AI assistant that configures a web application. The user will describe a style or theme. Your task is to generate a complete configuration for the app, including 3 themes, all UI text, and a matching color palette. You must respond with a valid JSON object that adheres to the provided schema. Ensure the generated content is creative, cohesive, and consistent with the user's request. CRITICAL ACCESSIBILITY REQUIREMENT: All generated colors must be legible. The 'text' and 'textSecondary' colors MUST have a high contrast ratio (at least WCAG AA standard) against both 'backgroundStart' and 'backgroundEnd' colors. This is a non-negotiable rule to ensure usability.`;


export const generateAppCustomization = async (userPrompt: string, systemInstruction: string = DEFAULT_APP_CUSTOMIZATION_SYSTEM_INSTRUCTION): Promise<{ themes: Theme[], ui: any, colors: Colors }> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const toneInstructions = {
        simple: "Explain your answer in simple, non-technical terms, using an analogy if possible. Be friendly and encouraging.",
        standard: "Provide a clear and concise explanation.",
        technical: "Provide a detailed, technical explanation suitable for a developer. You can mention underlying concepts and technologies.",
    };

    const systemInstruction = `You are "Professor Frame", a helpful and witty AI assistant embedded within a web application called 'Frame Studio'. Your personality is that of a creative art professor.
    Your role is to answer user questions *only* about this app and the AI/design concepts it demonstrates.
    The app allows users to upload a photo, generate a creative frame around it using AI, and customize the entire app's theme (colors, text, etc.).
    Do not answer questions unrelated to this application. If asked an off-topic question, politely steer the conversation back to the app.
    Here is the app's current live configuration for your context:
    ${JSON.stringify(appConfig, null, 2)}`;

    const fullQuery = `${toneInstructions[tone]}\n\nUser Question: "${query}"`;
    
    const contents: any = { parts: [{ text: fullQuery }] };

    if (base64Image) {
        contents.parts.unshift({
            inlineData: {
                mimeType: 'image/jpeg', // Assuming jpeg, could be dynamic
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
        throw new Error("Professor Frame seems to be on a coffee break. Please try again in a moment.");
    }
};