

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import type { Point } from 'react-easy-crop';
import { Step, Theme, Area, Colors, TutorTone, TutorMessage } from './types';
import { getCroppedImg, addMarginToImage } from './utils/imageUtils';
import { generateFrame, generateAppCustomization, DEFAULT_APP_CUSTOMIZATION_SYSTEM_INSTRUCTION, askGeminiTutor, CRITICAL_PRESERVE_PHOTO_RULE, EDITABLE_DEFAULT_FRAME_GENERATION_BASE_PROMPT } from './services/geminiService';
// FIX: Renamed `Type` to `TypeIcon` to prevent naming conflicts with `@google/genai`'s `Type` enum.
import {
    UploadCloud, Sparkles, ArrowLeft, Download, RotateCw, Settings, ChevronDown, Type as TypeIcon, Wand2, Wrench,
    Anchor, Award, Bike, BookOpen, Briefcase, Brush, Camera, Castle, Cat, Cherry, Cloud, Compass,
    Cpu, Crown, Diamond, Feather, Flag, Flame, Flower, Gamepad2, Gem, Ghost, Gift, Globe, Grape, Heart,
    KeyRound, Leaf, Lightbulb, Map, Moon, Mountain, Music, Palette, Plane, Puzzle, Rocket, Shield, Ship,
    Star, Sun, Swords, TreePine, Trophy, Umbrella, Watch, Wind, Medal, Info, X, Bot, Send, Paperclip
} from 'lucide-react';

const DEFAULT_THEMES: Theme[] = [
  {
    id: 'floral-motif',
    name: 'Floral Motif',
    description: 'A lush, realistic frame of densely packed flowers and leaves.',
    iconName: 'Flower',
    prompt: `Create a dense, realistic, and lush frame composed of a variety of blooming flowers (like peonies, roses, and hydrangeas) and rich green leaves. The flowers should be tightly packed, creating a full, textured border. Use a soft, natural color palette with pinks, creams, and deep greens. The lighting should be soft and diffused, as if in a garden on a slightly overcast day. The style should be photorealistic and highly detailed. Ensure elements subtly extend inward, partially overlapping the very edges of the central image.`
  },
];

const iconComponents: { [key: string]: React.FC<any> } = {
    Anchor, Award, Bike, BookOpen, Briefcase, Brush, Camera, Castle, Cat, Cherry, Cloud, Compass,
    Cpu, Crown, Diamond, Feather, Flag, Flame, Flower, Gamepad2, Gem, Ghost, Gift, Globe, Grape, Heart,
    KeyRound, Leaf, Lightbulb, Map, Moon, Mountain, Music, Palette, Plane, Puzzle, Rocket, Shield, Ship,
    Sparkles, Star, Sun, Swords, TreePine, Trophy, Umbrella, Wand2, Watch, Wind, Medal, Wrench, Info
};

const DEFAULT_COLORS: Colors = {
    backgroundStart: '#0f0c29',
    backgroundEnd: '#24243e',
    primary: '#facc15',
    secondary: '#DB2777',
    text: '#FFFFFF',
    textSecondary: '#D1D5DB',
};

interface Toast {
    id: number;
    message: string;
}

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
            setMessages([{ sender: 'ai', text: "Greetings! I'm the Frame Coach. Ask me anything about the app's settings, or let's work together to brainstorm and refine the perfect prompt for a lush, beautiful frame!" }]);
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
    setColors: (colors: Colors) => void;
    temperature: number;
    setTemperature: (temp: number) => void;
    topP: number;
    setTopP: (p: number) => void;
    topK: number;
    setTopK: (k: number) => void;
    framePromptGuardrails: string;
    setFramePromptGuardrails: (g: string) => void;
    editableBasePrompt: string;
    setEditableBasePrompt: (p: string) => void;
    handleResetSettings: () => void;
    onAiThemeGenerated: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
    isOpen,
    onClose,
    colors,
    editableThemes,
    setEditableThemes,
    setColors,
    temperature,
    setTemperature,
    topP,
    setTopP,
    topK,
    setTopK,
    framePromptGuardrails,
    setFramePromptGuardrails,
    editableBasePrompt,
    setEditableBasePrompt,
    handleResetSettings,
    onAiThemeGenerated
}) => {
    const [settingsView, setSettingsView] = useState<'picker' | 'ai' | 'manual'>('picker');
    const [activeAccordion, setActiveAccordion] = useState<string | null>(null);
    const [aiCustomizationPrompt, setAiCustomizationPrompt] = useState<string>('');
    const [isCustomizing, setIsCustomizing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setSettingsView('picker');
        }
    }, [isOpen]);

    const handleGenerateCustomization = async () => {
        if (!aiCustomizationPrompt.trim()) return;
        setIsCustomizing(true);
        setError(null);
        try {
            const newTheme = await generateAppCustomization(aiCustomizationPrompt);
            if (newTheme && newTheme.id) {
                setEditableThemes([newTheme]);
                setAiCustomizationPrompt('');
                onAiThemeGenerated();
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

    const renderAiView = () => (
        <>
            <button onClick={() => setSettingsView('picker')} className="absolute top-4 left-4 p-2 rounded-full hover:bg-white/10 transition-colors z-10">
                <ArrowLeft className="w-6 h-6" style={{ color: 'var(--color-text-secondary)' }}/>
            </button>
            <h2 className="text-xl font-bold mb-4 text-center" style={{ color: 'var(--color-primary)' }}>Customize with AI</h2>
            <div className="bg-black/20 p-4 rounded-lg space-y-4">
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Describe a new frame style. The AI will generate a new theme for you to use.</p>
                <textarea
                    value={aiCustomizationPrompt}
                    onChange={(e) => setAiCustomizationPrompt(e.target.value)}
                    placeholder="e.g., 'a frame made of vintage film strips' or 'a vibrant watercolor splash effect'"
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
      const finalPromptPreview = `${CRITICAL_PRESERVE_PHOTO_RULE.trim()}\n\n${editableBasePrompt.trim()} ${editableThemes[0]?.prompt || '[Theme prompt will appear here]'}\n\n${framePromptGuardrails.trim() ? `ADDITIONAL USER GUARDRAILS:\n${framePromptGuardrails.trim()}` : ''}`;

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
                                                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>AI Prompt</label>
                                                <textarea rows={4} value={theme.prompt} onChange={(e) => handleThemeUpdate(index, 'prompt', e.target.value)} className="w-full p-2 bg-gray-800 border border-white/20 rounded-md" style={{ color: 'var(--color-text)'}} />
                                            </div>
                                        </div>
                                    );
                                })()}
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
                            className={`overflow-hidden transition-all duration-500 ease-in-out ${activeAccordion === 'advanced-ai' ? 'max-h-[2000px]' : 'max-h-0'}`}
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
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Base Prompt Rule (Read-only)</label>
                                            <pre className="w-full p-2 bg-gray-900 border border-white/20 rounded-md text-xs whitespace-pre-wrap font-mono" style={{ color: 'var(--color-text-secondary)'}}>{CRITICAL_PRESERVE_PHOTO_RULE.trim()}</pre>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Base Prompt Body (Editable)</label>
                                            <textarea
                                                value={editableBasePrompt}
                                                onChange={(e) => setEditableBasePrompt(e.target.value)}
                                                rows={12}
                                                className="w-full p-3 bg-gray-800 border border-white/20 rounded-lg text-white placeholder-gray-500 font-mono text-xs"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Add Your Guardrails</label>
                                            <textarea
                                                value={framePromptGuardrails}
                                                onChange={(e) => setFramePromptGuardrails(e.target.value)}
                                                placeholder="e.g., 'Make the frame thinner, occupying only 10% of the border.' or 'The frame must be extra wide and ornate.'"
                                                rows={3}
                                                className="w-full p-3 bg-gray-800 border border-white/20 rounded-lg text-white placeholder-gray-500"
                                            />
                                        </div>
                                        <div className="pt-4 mt-4 border-t border-white/10">
                                            <h4 className="text-md font-bold mb-2" style={{ color: 'var(--color-text)' }}>
                                                Final Prompt Preview
                                            </h4>
                                            <p className="text-xs mb-2" style={{color: 'var(--color-text-secondary)'}}>This is the complete prompt that will be sent to the AI, combining the rule, base, theme, and your guardrails.</p>
                                            <pre className="w-full p-2 bg-gray-900 border border-white/20 rounded-md text-xs whitespace-pre-wrap font-mono" style={{ color: 'var(--color-text-secondary)'}}>
                                                {finalPromptPreview.trim()}
                                            </pre>
                                        </div>
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
  const [finalImage, setFinalImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // App-wide configuration state
  const [editableThemes, setEditableThemes] = useState<Theme[]>(DEFAULT_THEMES);
  const [temperature, setTemperature] = useState<number>(0.4);
  const [topP, setTopP] = useState<number>(0.8);
  const [topK, setTopK] = useState<number>(40);
  const [colors, setColors] = useState<Colors>(DEFAULT_COLORS);
  const [framePromptGuardrails, setFramePromptGuardrails] = useState<string>('');
  const [editableBasePrompt, setEditableBasePrompt] = useState<string>(EDITABLE_DEFAULT_FRAME_GENERATION_BASE_PROMPT);
  
  // UI State for panels
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [isTutorOpen, setIsTutorOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000); // Toast disappears after 3 seconds
  };

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
      @keyframes toast-in-out {
        0% { transform: translateY(100%); opacity: 0; }
        15% { transform: translateY(0); opacity: 1; }
        85% { transform: translateY(0); opacity: 1; }
        100% { transform: translateY(100%); opacity: 0; }
      }
      .toast-notification {
        animation: toast-in-out 3s ease-in-out forwards;
      }
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
      const generatedImg = await generateFrame(marginedImage, theme, editableBasePrompt, temperature, topP, topK, framePromptGuardrails);
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
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };
  
  const handleResetSettings = () => {
      setEditableThemes(DEFAULT_THEMES);
      setColors(DEFAULT_COLORS);
      setTemperature(0.4);
      setTopP(0.8);
      setTopK(40);
      setFramePromptGuardrails('');
      setEditableBasePrompt(EDITABLE_DEFAULT_FRAME_GENERATION_BASE_PROMPT);
  };

  const handleRestartWithImage = () => {
    setStep('upload');
    setCroppedImage(null);
    setSelectedTheme(null);
    setFinalImage(null);
    setIsLoading(false);
    setError(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleSettingsClose = () => {
    setIsSettingsPanelOpen(false);
    if (uploadedImage) {
      handleRestartWithImage();
    }
  };

  const handleAiThemeGenerated = () => {
    addToast("New theme ready!");
    handleSettingsClose();
  };

  const renderContent = () => {
    switch (step) {
      case 'upload':
        return (
          <div className="w-full">
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
        const theme = editableThemes[0];
        if (!theme) {
            // Fallback in case themes are empty for some reason
            setError("No theme is available. Please reset settings.");
            setStep('upload');
            return null;
        }
        return (
            <div className="w-full">
                <div className="flex items-center justify-between mb-6">
                    <button onClick={() => setStep('upload')} className="p-2 rounded-full hover:bg-white/10">
                        <ArrowLeft className="w-6 h-6" style={{ color: 'var(--color-text)' }}/>
                    </button>
                    <h2 className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>My Theme</h2>
                    <div className="w-10 h-10" /> {/* Spacer for centering */}
                </div>
                <div className="flex justify-center">
                    <div key={theme.id} className="bg-black/20 rounded-lg p-4 text-center w-full max-w-xs">
                        <div className="w-full h-32 flex items-center justify-center rounded-lg bg-black/20 mb-3">
                            {React.createElement(iconComponents[theme.iconName] || Sparkles, { className: 'w-16 h-16', style: { color: 'var(--color-primary)' } })}
                        </div>
                        <h3 className="font-bold mt-2" style={{ color: 'var(--color-text)' }}>{theme.name}</h3>
                        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{theme.description}</p>
                    </div>
                </div>
                
                <button
                    onClick={() => handleThemeSelect(theme)}
                    style={{ backgroundColor: 'var(--color-secondary)' }}
                    className="w-full mt-6 text-white font-bold py-3 px-4 rounded-lg hover:brightness-110 transition-all duration-300 flex items-center justify-center gap-2"
                >
                    Continue
                    <Sparkles className="w-5 h-5" />
                </button>

                {error && <p className="text-red-400 text-center mt-4">{error}</p>}
            </div>
        );

      case 'generating':
        return (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2" style={{ borderColor: 'var(--color-primary)' }}></div>
            <p className="mt-4 text-lg" style={{ color: 'var(--color-text)' }}>Building your frame...</p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>The AI is painting your vision...</p>
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
            </div>
            <div className="w-full mt-6 p-4 bg-black/20 rounded-lg text-center border border-white/10">
                <p className="font-bold" style={{ color: 'var(--color-text)' }}>Ready to edit ✨</p>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Change the app's style or edit manually. Try the practice mode!
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
            onClose={handleSettingsClose}
            colors={colors}
            editableThemes={editableThemes}
            setEditableThemes={setEditableThemes}
            setColors={setColors}
            temperature={temperature}
            setTemperature={setTemperature}
            topP={topP}
            setTopP={setTopP}
            topK={topK}
            setTopK={setTopK}
            framePromptGuardrails={framePromptGuardrails}
            setFramePromptGuardrails={setFramePromptGuardrails}
            editableBasePrompt={editableBasePrompt}
            setEditableBasePrompt={setEditableBasePrompt}
            handleResetSettings={handleResetSettings}
            onAiThemeGenerated={handleAiThemeGenerated}
        />
        <div className="fixed bottom-4 right-4 z-[100] space-y-2">
            {toasts.map(toast => (
                <div key={toast.id} className="toast-notification bg-green-500 text-white font-bold py-2 px-4 rounded-lg shadow-lg">
                    {toast.message}
                </div>
            ))}
        </div>
        <div className={`relative min-h-screen transition-all duration-500 ease-in-out ${isTutorOpen ? 'pr-[400px]' : isSettingsPanelOpen ? 'pr-[500px]' : 'pr-0'}`}>
            <div className="flex flex-col items-center p-4 pt-20">
                <header className="w-full flex justify-between items-center px-6 pt-4 transition-all duration-500 max-w-xl">
                    <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--color-primary)' }}>AI Frame Studio</h1>
                    <div className={`relative flex items-center justify-center transition-opacity duration-300 ${isSettingsPanelOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                        <svg 
                            className="absolute w-32 h-32" 
                            viewBox="0 0 100 100" 
                            style={{ animation: 'spin-text 20s linear infinite', color: 'var(--color-primary)' }}
                        >
                            <path id="circlePath" fill="none" d="M 50, 56 m -38, 0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0"></path>
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
                <main className="w-full bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 md:p-8 mt-16 transition-all duration-500 max-w-xl">
                    <div className="w-full">
                        {renderContent()}
                    </div>
                </main>
                <footer className="text-center mt-6 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    <p>Crafted with Gemini. Your vision, framed.</p>
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
