import React, { useState, useCallback, useRef, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import type { Point } from 'react-easy-crop';
import { Step, Theme, Area, Colors, TutorTone, TutorMessage } from './types';
import { getCroppedImg, addMarginToImage } from './utils/imageUtils';
import { generateFrame, generateAppCustomization, DEFAULT_APP_CUSTOMIZATION_SYSTEM_INSTRUCTION, DEFAULT_FRAME_GENERATION_BASE_PROMPT, askGeminiTutor } from './services/geminiService';
// FIX: Renamed `Type` to `TypeIcon` to prevent naming conflicts with `@google/genai`'s `Type` enum.
import {
    UploadCloud, Sparkles, ArrowLeft, Download, RotateCw, Settings, ChevronDown, Type as TypeIcon, Wand2, Wrench,
    Anchor, Award, Bike, BookOpen, Briefcase, Brush, Camera, Castle, Cat, Cherry, Cloud, Code, Compass,
    Cpu, Crown, Diamond, Feather, Flag, Flame, Flower, Gamepad2, Gem, Ghost, Gift, Globe, Grape, Heart,
    KeyRound, Leaf, Lightbulb, Map, Moon, Mountain, Music, Palette, Plane, Puzzle, Rocket, Shield, Ship,
    Star, Sun, Swords, TreePine, Trophy, Umbrella, Watch, Wind, Medal, Info, X, Copy, Bot, Send, Paperclip
} from 'lucide-react';

const DEFAULT_THEMES: Theme[] = [
  {
    id: 'starlight-studio',
    name: 'Starlight Studio',
    description: 'A celestial theme with glowing neon and deep space vibes.',
    iconName: 'Sparkles',
    prompt: `Create a frame with a dark, deep space background, filled with swirling nebulae in shades of dark blue and purple. Add glowing, futuristic neon accents in vibrant yellow and magenta, forming abstract geometric patterns or light trails around the photo. The overall feeling should be futuristic, cosmic, and vibrant.`
  },
];

const iconComponents: { [key: string]: React.FC<any> } = {
    Anchor, Award, Bike, BookOpen, Briefcase, Brush, Camera, Castle, Cat, Cherry, Cloud, Code, Compass,
    Cpu, Crown, Diamond, Feather, Flag, Flame, Flower, Gamepad2, Gem, Ghost, Gift, Globe, Grape, Heart,
    KeyRound, Leaf, Lightbulb, Map, Moon, Mountain, Music, Palette, Plane, Puzzle, Rocket, Shield, Ship,
    Sparkles, Star, Sun, Swords, TreePine, Trophy, Umbrella, Wand2, Watch, Wind, Medal, Wrench, Info
};
const availableIcons = Object.keys(iconComponents).sort();

const DEFAULT_UI_TEXTS = {
    title: 'AI Frame Studio',
    footer: 'Crafted with Gemini. Your vision, framed.',
    loadingTitle: 'Building your frame...',
    loadingSubtitle: 'The AI is painting your vision...',
};

const DEFAULT_COLORS: Colors = {
    backgroundStart: '#0f0c29',
    backgroundEnd: '#24243e',
    primary: '#facc15',
    secondary: '#DB2777',
    text: '#FFFFFF',
    textSecondary: '#D1D5DB',
};

// --- Helper function for syntax highlighting ---
const syntaxHighlight = (jsonString: string) => {
  if (!jsonString) return '';
  let json = jsonString.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // This regex matches any quoted string, and uses a replacer function to check if it's a key (followed by a colon).
  return json.replace(/"((?:\\.|[^"\\])*)"(\s*:)?/g, (match, stringContent, isKey) => {
      const cls = isKey ? 'json-key' : 'json-string';
      const value = `"${stringContent}"`;
      // If it's a key, we add the colon back, outside the span, to prevent it from being part of the key's content.
      return `<span class="${cls}">${value}</span>` + (isKey ? ':' : '');
    })
    .replace(/\b(true|false)\b/g, '<span class="json-boolean">$1</span>')
    // A more specific regex for numbers to avoid matching them inside strings.
    .replace(/(:\s*|\s*,\s*|\s*\[\s*)(\d+\.?\d*)\b/g, (match, prefix, number) => `${prefix}<span class="json-number">${number}</span>`)
    .replace(/\b(null)\b/g, '<span class="json-null">$1</span>');
};

const GeminiTutor: React.FC<{ appConfig: object, colors: Colors, isOpen: boolean, onToggle: () => void }> = ({ appConfig, colors, isOpen, onToggle }) => {
    const [messages, setMessages] = useState<TutorMessage[]>([]);
    const [query, setQuery] = useState('');
    const [tone, setTone] = useState<TutorTone>('standard');
    const [isLoading, setIsLoading] = useState(false);
    const [imageToSend, setImageToSend] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([{ sender: 'ai', text: "Greetings! I'm the Frame Coach, your guide to this studio. Ask me anything about the app, its features, or the AI concepts at play. You can even upload an image!" }]);
        }
    }, [isOpen, messages.length]);

    useEffect(scrollToBottom, [messages]);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setImageToSend(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleSend = async () => {
        if (!query.trim() && !imageToSend) return;
        const userMessage: TutorMessage = { sender: 'user', text: query, imageUrl: imageToSend || undefined };
        setMessages(prev => [...prev, userMessage]);
        setQuery('');
        setImageToSend(null);
        setIsLoading(true);

        try {
            const aiResponse = await askGeminiTutor(query, tone, appConfig, imageToSend);
            setMessages(prev => [...prev, { sender: 'ai', text: aiResponse }]);
        } catch (error: any) {
            setMessages(prev => [...prev, { sender: 'ai', text: `Oops! ${error.message}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`fixed top-0 right-0 h-full bg-gray-900 border-l border-white/20 shadow-2xl z-50 flex flex-col transition-transform duration-500 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`} style={{ width: '400px', maxWidth: '90vw' }}>
            <header className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <Brush className="w-6 h-6" style={{ color: colors.primary }}/>
                    <h2 className="text-lg font-bold" style={{ color: colors.primary }}>Frame Coach</h2>
                </div>
                <button onClick={onToggle} className="p-2 rounded-full hover:bg-white/10">
                    <X className="w-6 h-6" style={{ color: colors.textSecondary }} />
                </button>
            </header>

            <div className="flex-grow p-4 overflow-y-auto space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                        {msg.sender === 'ai' && <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: colors.primary }}><Brush className="w-5 h-5 text-black" /></div>}
                        <div className={`max-w-xs md:max-w-md p-3 rounded-lg ${msg.sender === 'ai' ? 'bg-black/20 text-left' : 'bg-pink-700 text-white text-right'}`}>
                            {msg.imageUrl && <img src={msg.imageUrl} alt="User upload" className="rounded-lg mb-2 max-w-full h-auto" />}
                            <p className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                     <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: colors.primary }}><Brush className="w-5 h-5 text-black" /></div>
                        <div className="max-w-xs md:max-w-md p-3 rounded-lg bg-black/20">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <footer className="p-4 border-t border-white/10 flex-shrink-0 bg-gray-900/50">
                 {imageToSend && (
                    <div className="mb-2 p-2 bg-black/20 rounded-lg relative">
                        <img src={imageToSend} alt="Preview" className="w-20 h-20 object-cover rounded-md"/>
                        <button onClick={() => setImageToSend(null)} className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5">
                            <X className="w-4 h-4 text-white"/>
                        </button>
                    </div>
                )}
                <div className="mb-3">
                    <label className="text-xs font-bold mb-2 block" style={{ color: colors.textSecondary }}>Explanation Style</label>
                    <div className="flex gap-2">
                        {(['simple', 'standard', 'technical'] as TutorTone[]).map((t) => (
                            <button key={t} onClick={() => setTone(t)} className={`flex-1 text-xs font-bold py-2 px-3 rounded-md transition-colors ${tone === t ? 'text-black' : 'bg-black/20 hover:bg-white/10'}`} style={{ backgroundColor: tone === t ? colors.primary : undefined }}>
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="p-3 rounded-lg transition-colors bg-gray-800 hover:bg-gray-700" disabled={isLoading}>
                        <Paperclip className="w-5 h-5" style={{color: colors.textSecondary}} />
                    </button>
                    <textarea
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        placeholder="e.g., What is 'Temperature'?"
                        rows={1}
                        className="flex-grow p-2 bg-gray-800 border border-white/20 rounded-lg resize-none"
                        disabled={isLoading}
                    />
                    <button onClick={handleSend} disabled={isLoading || (!query.trim() && !imageToSend)} className="p-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: colors.secondary }}>
                        <Send className="w-5 h-5 text-white" />
                    </button>
                </div>
            </footer>
        </div>
    );
};

interface SettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    colors: Colors;
    editableThemes: Theme[];
    setEditableThemes: (themes: Theme[]) => void;
    uiTexts: typeof DEFAULT_UI_TEXTS;
    setUiTexts: (texts: any) => void;
    setColors: (colors: Colors) => void;
    temperature: number;
    setTemperature: (temp: number) => void;
    topP: number;
    setTopP: (p: number) => void;
    topK: number;
    setTopK: (k: number) => void;
    framePromptGuardrails: string;
    setFramePromptGuardrails: (g: string) => void;
    handleResetSettings: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
    isOpen,
    onClose,
    colors,
    editableThemes,
    setEditableThemes,
    uiTexts,
    setUiTexts,
    setColors,
    temperature,
    setTemperature,
    topP,
    setTopP,
    topK,
    setTopK,
    framePromptGuardrails,
    setFramePromptGuardrails,
    handleResetSettings
}) => {
    const [settingsView, setSettingsView] = useState<'picker' | 'ai' | 'manual' | 'ai_success'>('picker');
    const [activeAccordion, setActiveAccordion] = useState<string | null>(null);
    const [aiCustomizationPrompt, setAiCustomizationPrompt] = useState<string>('');
    const [isCustomizing, setIsCustomizing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [iconSearchQuery, setIconSearchQuery] = useState('');

    useEffect(() => {
        if (isOpen) {
            // Reset to picker view when opened, unless coming from AI success
            if (settingsView !== 'ai_success') {
                setSettingsView('picker');
            }
        }
    }, [isOpen]);

    const handleGenerateCustomization = async () => {
        if (!aiCustomizationPrompt.trim()) return;
        setIsCustomizing(true);
        setError(null);
        try {
            const result = await generateAppCustomization(aiCustomizationPrompt);
            if (result.themes && result.ui && result.colors) {
                setEditableThemes(result.themes);
                setUiTexts(result.ui);
                setColors(result.colors);
                setAiCustomizationPrompt('');
                setSettingsView('ai_success');
            } else {
                throw new Error("Invalid response structure from AI.");
            }
        } catch (e: any) {
            setError(e.message || "Failed to customize app.");
        } finally {
            setIsCustomizing(false);
        }
    };
    
    const handleThemeUpdate = (index: number, field: keyof Theme, value: string) => {
        const updatedThemes = [...editableThemes];
        updatedThemes[index] = { ...updatedThemes[index], [field]: value };
        setEditableThemes(updatedThemes);
    };

    const handleUiTextUpdate = (field: keyof typeof uiTexts, value: string) => {
        setUiTexts((prev: any) => ({...prev, [field]: value}));
    };

    const renderPickerView = () => (
        <>
            <h2 className="text-2xl font-bold mb-2 text-center" style={{ color: 'var(--color-primary)' }}>App Settings & Practice Mode</h2>
            <p className="text-center mb-8" style={{ color: 'var(--color-text-secondary)' }}>Pick your path to customize the experience.</p>
            <div className="flex flex-col gap-4">
                <button 
                    onClick={() => setSettingsView('ai')} 
                    className="flex-1 p-6 bg-black/20 rounded-lg text-left hover:bg-white/10 transition-all border border-transparent hover:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                    <Wand2 className="w-8 h-8 mb-2" style={{ color: 'var(--color-primary)' }} />
                    <h3 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Customize with AI</h3>
                    <p className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>Describe a new style and let the AI re-theme the entire app.</p>
                </button>
                <button 
                    onClick={() => setSettingsView('manual')} 
                    className="flex-1 p-6 bg-black/20 rounded-lg text-left hover:bg-white/10 transition-all border border-transparent hover:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                    <Wrench className="w-8 h-8 mb-2" style={{ color: 'var(--color-secondary)' }} />
                    <h3 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Practice with Manual Edits</h3>
                    <p className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>Dive in and edit themes, UI text, and AI settings yourself.</p>
                </button>
            </div>
        </>
    );

    const renderAiSuccessView = () => (
        <div className="text-center">
            <Sparkles className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--color-primary)' }} />
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-primary)' }}>Style Generated!</h2>
            <p className="text-lg mb-6" style={{ color: 'var(--color-text-secondary)' }}>"Now live with your new style... give it a try!"</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button onClick={() => setSettingsView('manual')} className="bg-gray-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-700 transition-all">
                    See the Edits
                </button>
                <button onClick={onClose} style={{ backgroundColor: 'var(--color-secondary)' }} className="text-white font-bold py-2 px-6 rounded-lg hover:brightness-110 transition-all">
                    Close & Explore
                </button>
            </div>
        </div>
    );

    const renderAiView = () => (
        <>
            <button onClick={() => setSettingsView('picker')} className="absolute top-4 left-4 p-2 rounded-full hover:bg-white/10 transition-colors z-10">
                <ArrowLeft className="w-6 h-6" style={{ color: 'var(--color-text-secondary)' }}/>
            </button>
            <h2 className="text-xl font-bold mb-4 text-center" style={{ color: 'var(--color-primary)' }}>Customize with AI</h2>
            <div className="bg-black/20 p-4 rounded-lg space-y-4">
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Describe a new style for the app. The AI will generate new themes and UI text to match.</p>
                <textarea
                    value={aiCustomizationPrompt}
                    onChange={(e) => setAiCustomizationPrompt(e.target.value)}
                    placeholder="e.g., 'a serene Japanese zen garden theme' or 'a vibrant 80s synthwave style'"
                    rows={3}
                    className="w-full p-3 bg-gray-800 border border-white/20 rounded-lg text-white placeholder-gray-500"
                    disabled={isCustomizing}
                />
                <button 
                    onClick={handleGenerateCustomization}
                    disabled={isCustomizing || !aiCustomizationPrompt.trim()}
                    className="w-full flex items-center justify-center gap-2 text-black font-bold py-2 px-4 rounded-lg hover:brightness-110 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed"
                    style={{ backgroundColor: isCustomizing ? 'var(--color-text-secondary)' : 'var(--color-primary)'}}
                >
                    {isCustomizing ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                            Generating...
                        </>
                    ) : (
                        <>
                            <Wand2 className="w-5 h-5" />
                            Generate Customization
                        </>
                    )}
                </button>
                {error && <p className="text-red-400 text-center text-sm mt-2">{error}</p>}
            </div>
        </>
    );
    
    const renderManualView = () => {
      const filteredIcons = iconSearchQuery 
        ? availableIcons.filter(iconName =>
            iconName.toLowerCase().includes(iconSearchQuery.toLowerCase())
          )
        : [];

      return (
        <div>
            <div className="flex justify-between items-center mb-6">
                 <button onClick={() => setSettingsView('picker')} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                    <ArrowLeft className="w-6 h-6" style={{ color: 'var(--color-text-secondary)' }}/>
                </button>
                <h2 className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>Practice Mode</h2>
                <div className="w-6 h-6"></div>
            </div>
            
            <div className="w-full">
                <div className="space-y-4">
                    {/* Accordions Container */}
                    <div className="bg-black/20 rounded-lg overflow-hidden transition-all duration-300">
                        <button
                            onClick={() => setActiveAccordion(activeAccordion === 'themes' ? null : 'themes')}
                            className="w-full flex justify-between items-center p-4 text-left hover:bg-white/5 transition-colors"
                            aria-expanded={activeAccordion === 'themes'}
                            aria-controls="themes-editor"
                        >
                            <div className="flex items-center gap-4">
                                <Palette className="w-8 h-8 flex-shrink-0" style={{ color: 'var(--color-primary)' }}/>
                                <span className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>Edit My Theme</span>
                            </div>
                            <ChevronDown className={`w-6 h-6 transition-transform duration-300 ${activeAccordion === 'themes' ? 'rotate-180' : ''}`} style={{ color: 'var(--color-text-secondary)' }} />
                        </button>
                        <div
                            id="themes-editor"
                            className={`overflow-hidden transition-all duration-500 ease-in-out ${activeAccordion === 'themes' ? 'max-h-[1000px]' : 'max-h-0'}`}
                        >
                           <div className="p-4 border-t border-white/10 space-y-4 bg-black/10">
                                {(() => {
                                    const theme = editableThemes[0];
                                    const index = 0;
                                    if (!theme) return null;
                                    return (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Theme Name</label>
                                                <input type="text" value={theme.name} onChange={(e) => handleThemeUpdate(index, 'name', e.target.value)} className="w-full p-2 bg-gray-800 border border-white/20 rounded-md" style={{ color: 'var(--color-text)'}} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Description</label>
                                                <input type="text" value={theme.description} onChange={(e) => handleThemeUpdate(index, 'description', e.target.value)} className="w-full p-2 bg-gray-800 border border-white/20 rounded-md" style={{ color: 'var(--color-text)'}} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>AI Prompt</label>
                                                <textarea rows={4} value={theme.prompt} onChange={(e) => handleThemeUpdate(index, 'prompt', e.target.value)} className="w-full p-2 bg-gray-800 border border-white/20 rounded-md" style={{ color: 'var(--color-text)'}} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Theme Icon: {theme.iconName}</label>
                                                <input
                                                    type="text"
                                                    placeholder="Search for an icon by name..."
                                                    value={iconSearchQuery}
                                                    onChange={(e) => setIconSearchQuery(e.target.value)}
                                                    className="w-full p-2 bg-gray-800 border border-white/20 rounded-md mb-2" style={{ color: 'var(--color-text)'}}
                                                />
                                                {iconSearchQuery && (
                                                    <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2 mt-2 h-32 overflow-y-auto pr-2">
                                                        {filteredIcons.length > 0 ? (
                                                            filteredIcons.map(iconName => (
                                                                <button
                                                                    key={iconName}
                                                                    onClick={() => {
                                                                        handleThemeUpdate(index, 'iconName', iconName);
                                                                        setIconSearchQuery('');
                                                                    }}
                                                                    className="p-2 rounded-md flex items-center justify-center bg-gray-800 hover:bg-gray-700 transition-all focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                                                    aria-label={`Select ${iconName} icon`}
                                                                >
                                                                    {React.createElement(iconComponents[iconName], { style: { color: colors.textSecondary, width: '24px', height: '24px' } })}
                                                                </button>
                                                            ))
                                                        ) : (
                                                            <p className="col-span-full text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>No icons found.</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                    <div className="bg-black/20 rounded-lg overflow-hidden transition-all duration-300">
                        <button
                            onClick={() => setActiveAccordion(activeAccordion === 'ui-text' ? null : 'ui-text')}
                            className="w-full flex justify-between items-center p-4 text-left hover:bg-white/5 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <TypeIcon className="w-8 h-8 flex-shrink-0" style={{ color: 'var(--color-primary)' }}/>
                                <span className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>Edit UI Titles & Text</span>
                            </div>
                            <ChevronDown className={`w-6 h-6 transition-transform duration-300 ${activeAccordion === 'ui-text' ? 'rotate-180' : ''}`} style={{ color: 'var(--color-text-secondary)' }} />
                        </button>
                        <div
                            className={`overflow-hidden transition-all duration-500 ease-in-out ${activeAccordion === 'ui-text' ? 'max-h-[500px]' : 'max-h-0'}`}
                        >
                            <div className="p-4 border-t border-white/10 space-y-3 bg-black/10">
                                <div>
                                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>App Title</label>
                                    <input type="text" value={uiTexts.title} onChange={(e) => handleUiTextUpdate('title', e.target.value)} className="w-full p-2 bg-gray-800 border border-white/20 rounded-md" style={{ color: 'var(--color-text)'}}/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Footer Text</label>
                                    <input type="text" value={uiTexts.footer} onChange={(e) => handleUiTextUpdate('footer', e.target.value)} className="w-full p-2 bg-gray-800 border border-white/20 rounded-md" style={{ color: 'var(--color-text)'}}/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Loading Title</label>
                                    <input type="text" value={uiTexts.loadingTitle} onChange={(e) => handleUiTextUpdate('loadingTitle', e.target.value)} className="w-full p-2 bg-gray-800 border border-white/20 rounded-md" style={{ color: 'var(--color-text)'}}/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Loading Subtitle</label>
                                    <input type="text" value={uiTexts.loadingSubtitle} onChange={(e) => handleUiTextUpdate('loadingSubtitle', e.target.value)} className="w-full p-2 bg-gray-800 border border-white/20 rounded-md" style={{ color: 'var(--color-text)'}}/>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-black/20 rounded-lg overflow-hidden transition-all duration-300">
                        <button
                            onClick={() => setActiveAccordion(activeAccordion === 'advanced-ai' ? null : 'advanced-ai')}
                            className="w-full flex justify-between items-center p-4 text-left hover:bg-white/5 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <Sparkles className="w-8 h-8 flex-shrink-0" style={{ color: 'var(--color-primary)' }}/>
                                <span className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>Advanced AI & Prompting</span>
                            </div>
                            <ChevronDown className={`w-6 h-6 transition-transform duration-300 ${activeAccordion === 'advanced-ai' ? 'rotate-180' : ''}`} style={{ color: 'var(--color-text-secondary)' }} />
                        </button>
                        <div
                            className={`overflow-hidden transition-all duration-500 ease-in-out ${activeAccordion === 'advanced-ai' ? 'max-h-[1200px]' : 'max-h-0'}`}
                        >
                            <div className="p-4 border-t border-white/10 space-y-6 bg-black/10">
                                <div>
                                    <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text)' }}>
                                        Frame AI Creativity
                                    </h3>
                                    <div>
                                        <label htmlFor="temperature" className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>Temperature</label>
                                        <p className="text-xs mb-2" style={{color: 'var(--color-text-secondary)'}}>Lower values (e.g., 0.2) are more predictable. Higher values (e.g., 0.9) encourage more creative, unexpected results.</p>
                                        <div className="flex items-center gap-4">
                                            <input id="temperature" type="range" min="0" max="1" step="0.1" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} className="w-full" />
                                            <span className="font-mono text-lg bg-white/10 px-3 py-1 rounded-md" style={{ color: 'var(--color-text)' }}>{temperature.toFixed(1)}</span>
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <label htmlFor="topP" className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>Top-P</label>
                                        <p className="text-xs mb-2" style={{color: 'var(--color-text-secondary)'}}>Controls result diversity. A lower value (e.g., 0.1) restricts the AI to the most likely options. A higher value (e.g., 0.95) allows for a wider, more creative range.</p>
                                        <div className="flex items-center gap-4">
                                            <input id="topP" type="range" min="0" max="1" step="0.05" value={topP} onChange={(e) => setTopP(parseFloat(e.target.value))} className="w-full" />
                                            <span className="font-mono text-lg bg-white/10 px-3 py-1 rounded-md" style={{ color: 'var(--color-text)' }}>{topP.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <label htmlFor="topK" className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>Top-K</label>
                                        <p className="text-xs mb-2" style={{color: 'var(--color-text-secondary)'}}>Limits the AI's choices to the top 'K' most probable options. A small K (e.g., 10) makes it safer, while a large K (e.g., 100) allows for more variety.</p>
                                        <div className="flex items-center gap-4">
                                            <input id="topK" type="range" min="1" max="100" step="1" value={topK} onChange={(e) => setTopK(parseInt(e.target.value, 10))} className="w-full" />
                                            <span className="font-mono text-lg bg-white/10 px-3 py-1 rounded-md" style={{ color: 'var(--color-text)' }}>{topK}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-white/10">
                                    <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text)' }}>
                                        Prompt Practice (Advanced)
                                    </h3>
                                    <div className="space-y-3">
                                        <label className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Base Frame Prompt (Read-only)</label>
                                        <pre className="w-full p-2 bg-gray-800 border border-white/20 rounded-md text-xs whitespace-pre-wrap font-mono" style={{ color: 'var(--color-text)'}}>{DEFAULT_FRAME_GENERATION_BASE_PROMPT.trim()}</pre>
                                        <label className="block text-sm font-medium mt-2" style={{ color: 'var(--color-text-secondary)' }}>Add Your Guardrails</label>
                                        <textarea
                                            value={framePromptGuardrails}
                                            onChange={(e) => setFramePromptGuardrails(e.target.value)}
                                            placeholder="e.g., 'Make the frame thinner, occupying only 10% of the border.' or 'The frame must be extra wide and ornate.'"
                                            rows={3}
                                            className="w-full p-3 bg-gray-800 border border-white/20 rounded-lg text-white placeholder-gray-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      );
    };

    return (
        <div className={`fixed top-0 right-0 h-full bg-gray-900 border-l border-white/20 shadow-2xl z-50 flex flex-col transition-transform duration-500 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`} style={{ width: '500px', maxWidth: '90vw' }}>
            <header className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <Settings className="w-6 h-6" style={{ color: colors.primary }}/>
                    <h2 className="text-lg font-bold" style={{ color: colors.primary }}>Settings</h2>
                </div>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10">
                    <X className="w-6 h-6" style={{ color: colors.textSecondary }} />
                </button>
            </header>
            <div className="flex-grow overflow-y-auto">
                <div className="p-6">
                    {(() => {
                        switch (settingsView) {
                            case 'picker': return renderPickerView();
                            case 'ai': return renderAiView();
                            case 'ai_success': return renderAiSuccessView();
                            case 'manual': return renderManualView();
                        }
                    })()}
                </div>
            </div>
             <footer className="p-4 border-t border-white/10 flex-shrink-0 bg-gray-900/50 flex justify-between items-center">
                 <button onClick={handleResetSettings} className="bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 transition-all text-sm">
                    Reset to Defaults
                </button>
                <button onClick={onClose} style={{ backgroundColor: 'var(--color-secondary)' }} className="text-white font-bold py-2 px-4 rounded-lg hover:brightness-110 transition-all text-sm">
                    Save & Close
                </button>
            </footer>
        </div>
    );
};


const App: React.FC = () => {
  const [step, setStep] = useState<Step>('upload');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [finalImage, setFinalImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // App-wide configuration state
  const [editableThemes, setEditableThemes] = useState<Theme[]>(DEFAULT_THEMES);
  const [temperature, setTemperature] = useState<number>(0.8);
  const [topP, setTopP] = useState<number>(0.8);
  const [topK, setTopK] = useState<number>(40);
  const [uiTexts, setUiTexts] = useState(DEFAULT_UI_TEXTS);
  const [colors, setColors] = useState<Colors>(DEFAULT_COLORS);
  const [framePromptGuardrails, setFramePromptGuardrails] = useState<string>('');
  
  // UI State for panels
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [showCodePreview, setShowCodePreview] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isTutorOpen, setIsTutorOpen] = useState(false);

  useEffect(() => {
    // Dynamic Theming Effect
    const body = document.body;
    let styleEl = document.getElementById('dynamic-styles');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'dynamic-styles';
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `
      @keyframes gradient-animation {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      @keyframes spin-text {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
      }
      .json-key { color: ${colors.primary}; }
      .json-string { color: #A5B4FC; } /* A soft indigo for strings */
      .json-number { color: ${colors.secondary}; }
      .json-boolean { color: ${colors.secondary}; }
      .json-null { color: #9CA3AF; } /* Gray */
    `;
    
    body.style.background = `linear-gradient(-45deg, ${colors.backgroundStart}, ${colors.backgroundEnd}, ${colors.backgroundStart}, ${colors.backgroundEnd})`;
    body.style.backgroundSize = '400% 400%';
    body.style.animation = 'gradient-animation 15s ease infinite';
    body.style.color = colors.text;
    
    const root = document.documentElement;
    root.style.setProperty('--color-primary', colors.primary);
    root.style.setProperty('--color-secondary', colors.secondary);
    root.style.setProperty('--color-text', colors.text);
    root.style.setProperty('--color-text-secondary', colors.textSecondary);
  }, [colors]);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setUploadedImage(reader.result as string);
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleNextToTheme = async () => {
    if (uploadedImage && croppedAreaPixels) {
      try {
        const cropped = await getCroppedImg(uploadedImage, croppedAreaPixels);
        setCroppedImage(cropped);
        setStep('theme');
      } catch (e) {
        console.error(e);
        setError('Could not process the image. Please try another one.');
      }
    }
  };

  const handleThemeSelect = async (theme: Theme) => {
    setSelectedTheme(theme);
    setStep('generating');
    setIsLoading(true);
    setError(null);

    if (!croppedImage) {
      setError("Cropped image is not available.");
      setStep('upload');
      return;
    }

    try {
      const marginedImage = await addMarginToImage(croppedImage);
      if (!marginedImage) {
          throw new Error("Could not prepare image for framing.");
      }
      const generatedImg = await generateFrame(marginedImage, theme, customPrompt, temperature, topP, topK, framePromptGuardrails);
      setFinalImage(generatedImg);
      setStep('result');
    } catch (e: any) {
      setError(e.message || 'An unknown error occurred.');
      setStep('theme');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setUploadedImage(null);
    setCroppedImage(null);
    setSelectedTheme(null);
    setFinalImage(null);
    setIsLoading(false);
    setError(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCustomPrompt('');
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };
  
  const handleResetSettings = () => {
      setEditableThemes(DEFAULT_THEMES);
      setUiTexts(DEFAULT_UI_TEXTS);
      setColors(DEFAULT_COLORS);
      setTemperature(0.8);
      setTopP(0.8);
      setTopK(40);
      setFramePromptGuardrails('');
  };

    const renderConfigurationPreview = () => {
        const currentConfig = {
            themes: editableThemes,
            ui: uiTexts,
            aiConfig: {
                temperature,
                topP,
                topK,
                framePromptGuardrails
            }
        };
        const configString = JSON.stringify(currentConfig, null, 2);

        const handleCopy = () => {
            navigator.clipboard.writeText(configString).then(() => {
                setCopySuccess(true);
                setTimeout(() => setCopySuccess(false), 2000);
            });
        };

        return (
            <div className="sticky top-0 pt-1 h-full">
                <div className="bg-black/20 rounded-lg overflow-hidden h-full flex flex-col">
                    <div className="flex justify-between items-center p-4 border-b border-white/10 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <Code className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-primary)' }}/>
                            <h3 className="font-bold text-base" style={{ color: 'var(--color-text)' }}>Live Configuration</h3>
                        </div>
                        <button
                            onClick={handleCopy}
                            className="p-2 rounded-md hover:bg-white/20 transition-colors text-xs flex items-center gap-1.5"
                            style={{ color: 'var(--color-text-secondary)'}}
                        >
                            {copySuccess ? (
                                <>
                                    <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)'}} /> Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="w-3.5 h-3.5" /> Copy Code
                                </>
                            )}
                        </button>
                    </div>
                    <div className="p-4 bg-black/10 flex-grow overflow-y-auto">
                        <pre className="text-xs font-mono w-full h-full pr-2">
                            <code dangerouslySetInnerHTML={{ __html: syntaxHighlight(configString) }} />
                        </pre>
                    </div>
                </div>
            </div>
        );
    };

  const renderContent = () => {
    switch (step) {
      case 'upload':
        return (
          <div className="w-full">
            <h2 className="text-2xl font-bold text-center" style={{ color: 'var(--color-primary)' }}>Welcome to {uiTexts.title}</h2>
            <p className="text-center mb-6" style={{ color: 'var(--color-text-secondary)' }}>Upload a photo to see how it works.</p>
            {!uploadedImage ? (
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-64 border-2 border-dashed border-gray-400 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-yellow-300 hover:bg-white/5 transition-colors"
                >
                    <UploadCloud className="w-12 h-12 text-gray-400" />
                    <p className="mt-2" style={{ color: 'var(--color-text-secondary)' }}>Click to upload an image</p>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                    />
                </div>
            ) : (
                <div className="relative w-full h-80 bg-black rounded-lg overflow-hidden">
                    <Cropper
                        image={uploadedImage}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropComplete}
                    />
                </div>
            )}
            {uploadedImage && (
                <div className="mt-4 flex flex-col items-center">
                    <label htmlFor="zoom" className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>Zoom</label>
                    <input
                        id="zoom"
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        aria-labelledby="Zoom"
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        className="w-1/2"
                    />
                    <button
                        onClick={handleNextToTheme}
                        style={{ backgroundColor: 'var(--color-secondary)' }}
                        className="w-full mt-6 text-white font-bold py-3 px-4 rounded-lg hover:brightness-110 transition-all duration-300 flex items-center justify-center gap-2"
                    >
                        Crop & Select Theme
                        <Sparkles className="w-5 h-5" />
                    </button>
                </div>
            )}
            {error && <p className="text-red-400 text-center mt-4">{error}</p>}
          </div>
        );
      
      case 'theme':
        return (
            <div className="w-full">
                <div className="flex items-center mb-6">
                    <button onClick={() => setStep('upload')} className="p-2 rounded-full hover:bg-white/10">
                        <ArrowLeft className="w-6 h-6" style={{ color: 'var(--color-text)' }}/>
                    </button>
                    <h2 className="text-2xl font-bold mx-auto" style={{ color: 'var(--color-primary)' }}>Choose a Theme</h2>
                </div>
                <div className="flex justify-center">
                    {editableThemes.map((theme) => (
                        <div key={theme.id} onClick={() => handleThemeSelect(theme)} className="cursor-pointer group bg-black/20 rounded-lg p-4 text-center transition-colors hover:bg-white/10 w-full max-w-xs">
                            <div className="w-full h-32 flex items-center justify-center rounded-lg bg-black/20 mb-3">
                                {React.createElement(iconComponents[theme.iconName] || Sparkles, { className: 'w-16 h-16 transform group-hover:scale-110 transition-transform duration-300', style: { color: 'var(--color-primary)' } })}
                            </div>
                            <h3 className="font-bold mt-2" style={{ color: 'var(--color-text)' }}>{theme.name}</h3>
                            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{theme.description}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-8">
                    <label htmlFor="custom-prompt" className="block text-lg font-bold mb-2" style={{ color: 'var(--color-primary)' }}>
                        Add Creative Details <span className="font-normal text-base" style={{ color: 'var(--color-text-secondary)' }}>(Optional)</span>
                    </label>
                    <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>Add your own touch to the theme. The AI will try to incorporate it into the frame.</p>
                    <textarea
                        id="custom-prompt"
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="e.g., 'include some hummingbirds' or 'make it look like it's carved from wood'"
                        rows={3}
                        className="w-full p-3 bg-black/20 border border-white/20 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-colors text-white placeholder-gray-500"
                    />
                </div>

                {error && <p className="text-red-400 text-center mt-4">{error}</p>}
            </div>
        );

      case 'generating':
        return (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2" style={{ borderColor: 'var(--color-primary)' }}></div>
            <p className="mt-4 text-lg" style={{ color: 'var(--color-text)' }}>{uiTexts.loadingTitle}</p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{uiTexts.loadingSubtitle}</p>
          </div>
        );

      case 'result':
        return (
          <div className="w-full flex flex-col items-center">
            <h2 className="text-3xl font-bold text-center mb-4" style={{ color: 'var(--color-primary)' }}>Your Creation is Ready!</h2>
            {finalImage && <img src={finalImage} alt="Generated frame" className="rounded-lg w-full max-w-md shadow-lg shadow-black/50" />}
            <div className="w-full mt-6 space-y-3">
              <a
                href={finalImage || ''}
                download="frame-studio.png"
                style={{ backgroundColor: 'var(--color-secondary)' }}
                className="w-full text-white font-bold py-3 px-4 rounded-lg hover:brightness-110 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download
              </a>
              <button
                onClick={handleReset}
                className="w-full bg-gray-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-700 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <RotateCw className="w-5 h-5" />
                Create Another
              </button>
              <p className="text-xs text-center pt-2" style={{ color: 'var(--color-text-secondary)' }}>On iOS? Long-press the image and select "Save to Photos".</p>
            </div>
            <div className="w-full mt-6 p-4 bg-black/20 rounded-lg text-center border border-white/10">
                <p className="font-bold" style={{ color: 'var(--color-text)' }}>Enjoy your creation! ✨</p>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Want to change the app's style? Try the practice mode!
                </p>
                <button 
                    onClick={() => {
                        setIsSettingsPanelOpen(true);
                        setIsTutorOpen(false);
                    }}
                    className="mt-3 font-bold py-2 px-4 rounded-lg hover:bg-white/10 transition-all"
                    style={{ color: 'var(--color-primary)' }}
                >
                    Customize the App
                </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };
  
  const currentAppConfig = {
      themes: editableThemes,
      ui: uiTexts,
      aiConfig: {
          temperature,
          topP,
          topK,
          framePromptGuardrails
      }
  };

  return (
    <div className="min-h-screen w-full font-sans transition-colors duration-1000">
        <SettingsPanel
            isOpen={isSettingsPanelOpen}
            onClose={() => setIsSettingsPanelOpen(false)}
            colors={colors}
            editableThemes={editableThemes}
            setEditableThemes={setEditableThemes}
            uiTexts={uiTexts}
            setUiTexts={setUiTexts}
            setColors={setColors}
            temperature={temperature}
            setTemperature={setTemperature}
            topP={topP}
            setTopP={setTopP}
            topK={topK}
            setTopK={setTopK}
            framePromptGuardrails={framePromptGuardrails}
            setFramePromptGuardrails={setFramePromptGuardrails}
            handleResetSettings={handleResetSettings}
        />
        <div className={`relative min-h-screen transition-all duration-500 ease-in-out ${isTutorOpen ? 'pr-[400px]' : isSettingsPanelOpen ? 'pr-[500px]' : 'pr-0'}`}>
            <div className="flex flex-col items-center justify-center p-4">
                <header className={`w-full flex justify-between items-center px-6 pt-4 transition-all duration-500 ${showCodePreview ? 'max-w-5xl' : 'max-w-xl'}`}>
                    <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--color-primary)' }}>{uiTexts.title}</h1>
                    <div className={`relative flex items-center justify-center transition-opacity duration-300 ${isSettingsPanelOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                        <svg 
                            className="absolute w-32 h-32" 
                            viewBox="0 0 100 100" 
                            style={{ animation: 'spin-text 20s linear infinite', color: 'var(--color-primary)' }}
                        >
                            <path id="circlePath" fill="none" d="M 50, 50 m -38, 0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0"></path>
                            <text fill="currentColor" fontSize="11" fontWeight="bold">
                                <textPath href="#circlePath">
                                    Customize me
                                </textPath>
                            </text>
                        </svg>
                        <button 
                            onClick={() => {
                                setIsSettingsPanelOpen(true);
                                setIsTutorOpen(false);
                            }}
                            className="p-2 rounded-full hover:bg-white/10 transition-colors relative z-10"
                            aria-label="Open settings"
                        >
                            <Settings className="w-6 h-6" style={{ color: 'var(--color-text)' }} />
                        </button>
                    </div>
                </header>
                <main className={`w-full bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 md:p-8 mt-16 transition-all duration-500 ${showCodePreview ? 'max-w-5xl' : 'max-w-xl'}`}>
                    <div className="flex gap-8">
                        <div className={`transition-all duration-300 ${showCodePreview ? 'w-3/5' : 'w-full'}`}>
                            {renderContent()}
                        </div>
                        {showCodePreview && (
                            <div className="w-2/5">
                                {renderConfigurationPreview()}
                            </div>
                        )}
                    </div>
                    <div className="mt-6 pt-6 border-t border-white/10 text-center">
                        <button
                            onClick={() => setShowCodePreview(!showCodePreview)}
                            className="flex items-center gap-2 text-sm p-2 rounded-md hover:bg-white/10 transition-colors mx-auto"
                            style={{ color: 'var(--color-text-secondary)' }}
                            aria-label={showCodePreview ? 'Hide code preview' : 'Show code preview'}
                        >
                            <Code className="w-4 h-4" />
                            {showCodePreview ? 'Hide Live Code' : 'Show Live Code'}
                        </button>
                    </div>
                </main>
                <footer className="text-center mt-6 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    <p>{uiTexts.footer}</p>
                </footer>
            </div>
             <button
                onClick={() => {
                    setIsTutorOpen(true);
                    setIsSettingsPanelOpen(false);
                }}
                className="fixed bottom-6 right-6 z-40 bg-gray-800/80 backdrop-blur-md border border-white/10 text-white px-4 py-2 rounded-full shadow-lg flex items-center justify-center gap-2 transition-transform hover:scale-105"
                style={{ color: colors.text }}
                aria-label="Ask Frame Coach"
            >
                <span className="text-lg">👋</span> Ask Frame Coach
            </button>
        </div>
      <GeminiTutor appConfig={currentAppConfig} colors={colors} isOpen={isTutorOpen} onToggle={() => setIsTutorOpen(!isTutorOpen)} />
    </div>
  );
};

export default App;
