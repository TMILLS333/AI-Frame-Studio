


import React, { useState, useCallback, useRef, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import type { Point } from 'react-easy-crop';
import { Step, Theme, Area, Colors } from './types';
import { getCroppedImg, addMarginToImage } from './utils/imageUtils';
import { generateFrame, generateAppCustomization, DEFAULT_APP_CUSTOMIZATION_SYSTEM_INSTRUCTION, DEFAULT_FRAME_GENERATION_BASE_PROMPT } from './services/geminiService';
// FIX: Renamed `Type` to `TypeIcon` to prevent naming conflicts with `@google/genai`'s `Type` enum.
import {
    UploadCloud, Sparkles, ArrowLeft, Download, RotateCw, Settings, ChevronDown, Type as TypeIcon, Wand2, Wrench,
    Anchor, Award, Bike, BookOpen, Briefcase, Brush, Camera, Castle, Cat, Cherry, Cloud, Code, Compass,
    Cpu, Crown, Diamond, Feather, Flag, Flame, Flower, Gamepad2, Gem, Ghost, Gift, Globe, Grape, Heart,
    KeyRound, Leaf, Lightbulb, Map, Moon, Mountain, Music, Palette, Plane, Puzzle, Rocket, Shield, Ship,
    Star, Sun, Swords, TreePine, Trophy, Umbrella, Watch, Wind, Medal, Info, X
} from 'lucide-react';

const DEFAULT_THEMES: Theme[] = [
  {
    id: 'classic-elegance',
    name: 'Classic Elegance',
    description: 'An ornate and sophisticated golden frame.',
    iconName: 'Medal',
    prompt: `'Classic Elegance'. Create a sophisticated, ornate frame with intricate baroque details and a polished gold finish. The frame's thickness must be uniform and symmetrical on all four sides. AVOID an overly thick or bulky design; the frame should complement, not overpower, the central photo.`
  },
  {
    id: 'modern-lines',
    name: 'Modern Lines',
    description: 'A clean, minimalist frame with sharp geometry.',
    iconName: 'Wrench',
    prompt: `'Modern Lines'. Generate a sleek, minimalist frame composed of clean, sharp geometric lines and a monochrome color palette (matte black, brushed metal). The design must be perfectly symmetrical. AVOID any organic, curved, or ornate elements.`
  },
  {
    id: 'cosmic-watercolor',
    name: 'Cosmic Watercolor',
    description: 'A vibrant, abstract wash of cosmic colors.',
    iconName: 'Wand2',
    prompt: `'Cosmic Watercolor'. Create a vibrant, abstract frame that looks like a watercolor galaxy (deep blues, purples, pinks, with white ink splatters for stars). The frame should have soft, blended edges that seamlessly transition into the central photo area. AVOID hard, geometric borders.`
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
    title: 'Frame Studio',
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

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [settingsView, setSettingsView] = useState<'picker' | 'ai' | 'manual' | 'ai_success'>('picker');
  const [editableThemes, setEditableThemes] = useState<Theme[]>(DEFAULT_THEMES);
  const [temperature, setTemperature] = useState<number>(0.8);
  const [topP, setTopP] = useState<number>(0.8);
  const [topK, setTopK] = useState<number>(40);
  const [activeAccordion, setActiveAccordion] = useState<string | null>(null);
  const [uiTexts, setUiTexts] = useState(DEFAULT_UI_TEXTS);
  const [colors, setColors] = useState<Colors>(DEFAULT_COLORS);
  const [aiCustomizationPrompt, setAiCustomizationPrompt] = useState<string>('');
  const [isCustomizing, setIsCustomizing] = useState<boolean>(false);
  const [iconSearchQuery, setIconSearchQuery] = useState('');
  const [framePromptGuardrails, setFramePromptGuardrails] = useState<string>('');

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
  
  const handleThemeUpdate = (index: number, field: keyof Theme, value: string) => {
    const updatedThemes = [...editableThemes];
    updatedThemes[index] = { ...updatedThemes[index], [field]: value };
    setEditableThemes(updatedThemes);
  };

  const handleUiTextUpdate = (field: keyof typeof uiTexts, value: string) => {
    setUiTexts(prev => ({...prev, [field]: value}));
  };

  const handleResetSettings = () => {
      setEditableThemes(DEFAULT_THEMES);
      setUiTexts(DEFAULT_UI_TEXTS);
      setColors(DEFAULT_COLORS);
      setTemperature(0.8);
      setTopP(0.8);
      setTopK(40);
      setAiCustomizationPrompt('');
      setFramePromptGuardrails('');
  };

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

  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
    setTimeout(() => {
        setSettingsView('picker');
        setError(null); 
    }, 300);
  };

  const renderSettingsModal = () => {
    const renderPickerView = () => (
        <>
            <h2 className="text-2xl font-bold mb-2 text-center" style={{ color: 'var(--color-primary)' }}>App Settings & Practice Mode</h2>
            <p className="text-center mb-8" style={{ color: 'var(--color-text-secondary)' }}>Pick your path to customize the experience.</p>
            <div className="flex flex-col md:flex-row gap-4">
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
                <button onClick={handleCloseSettings} style={{ backgroundColor: 'var(--color-secondary)' }} className="text-white font-bold py-2 px-6 rounded-lg hover:brightness-110 transition-all">
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
        <>
            <h2 className="text-xl font-bold mb-4 text-center" style={{ color: 'var(--color-primary)' }}>Practice Mode</h2>
            
            <div className="space-y-2">
                <div className="bg-black/20 rounded-lg overflow-hidden transition-all duration-300">
                   <button
                       onClick={() => setActiveAccordion(activeAccordion === 'themes' ? null : 'themes')}
                       className="w-full flex justify-between items-center p-4 text-left hover:bg-white/5 transition-colors"
                       aria-expanded={activeAccordion === 'themes' || activeAccordion?.startsWith('theme-')}
                       aria-controls="themes-editor"
                   >
                       <div className="flex items-center gap-4">
                            <Palette className="w-8 h-8 flex-shrink-0" style={{ color: 'var(--color-primary)' }}/>
                            <span className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>Edit Themes</span>
                       </div>
                       <ChevronDown className={`w-6 h-6 transition-transform duration-300 ${activeAccordion === 'themes' || activeAccordion?.startsWith('theme-') ? 'rotate-180' : ''}`} style={{ color: 'var(--color-text-secondary)' }} />
                   </button>
                    <div
                        id="themes-editor"
                        className={`overflow-hidden transition-all duration-500 ease-in-out ${activeAccordion === 'themes' || activeAccordion?.startsWith('theme-') ? 'max-h-[1000px]' : 'max-h-0'}`}
                    >
                        <div className="p-4 border-t border-white/10 space-y-4 bg-black/10">
                        {editableThemes.map((theme, index) => (
                            <div key={theme.id} className="bg-black/20 rounded-lg overflow-hidden transition-all duration-300">
                               <button
                                   onClick={() => {
                                       const newAccordion = activeAccordion === `theme-${index}` ? 'themes' : `theme-${index}`;
                                       setActiveAccordion(newAccordion);
                                       setIconSearchQuery('');
                                   }}
                                   className="w-full flex justify-between items-center p-4 text-left hover:bg-white/5 transition-colors"
                                   aria-expanded={activeAccordion === `theme-${index}`}
                                   aria-controls={`theme-editor-${index}`}
                               >
                                   <div className="flex items-center gap-4">
                                       <div className="w-12 h-10 flex items-center justify-center bg-gray-800 rounded-md flex-shrink-0">
                                           {React.createElement(iconComponents[theme.iconName] || Sparkles, { style: { color: 'var(--color-primary)', width: '24px', height: '24px' } })}
                                       </div>
                                       <span className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>{theme.name}</span>
                                   </div>
                                   <ChevronDown className={`w-6 h-6 transition-transform duration-300 ${activeAccordion === `theme-${index}` ? 'rotate-180' : ''}`} style={{ color: 'var(--color-text-secondary)' }} />
                               </button>
                                <div
                                    id={`theme-editor-${index}`}
                                    className={`overflow-hidden transition-all duration-500 ease-in-out ${activeAccordion === `theme-${index}` ? 'max-h-[600px]' : 'max-h-0'}`}
                                >
                                    <div className="p-4 border-t border-white/10 space-y-4 bg-black/10">
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
                                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Theme Icon</label>
                                            <input
                                              type="text"
                                              placeholder="Search for an icon by name..."
                                              value={iconSearchQuery}
                                              onChange={(e) => setIconSearchQuery(e.target.value)}
                                              className="w-full p-2 bg-gray-800 border border-white/20 rounded-md mb-2" style={{ color: 'var(--color-text)'}}
                                            />
                                            {iconSearchQuery && (
                                              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2 mt-2 h-32 overflow-y-auto pr-2">
                                                  {filteredIcons.length > 0 ? (
                                                      filteredIcons.map(iconName => (
                                                          <button
                                                              key={iconName}
                                                              onClick={() => {
                                                                  handleThemeUpdate(index, 'iconName', iconName);
                                                                  setActiveAccordion('themes'); // Go back to parent accordion
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
                                </div>
                            </div>
                        ))}
                        </div>
                    </div>
                </div>
            </div>
             <div className="mt-4">
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
            </div>
             <div className="mt-4">
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
            <div className="mt-6 flex justify-between items-center gap-4">
                <button onClick={handleResetSettings} className="bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 transition-all">
                    Reset to Defaults
                </button>
                <button onClick={handleCloseSettings} style={{ backgroundColor: 'var(--color-secondary)' }} className="text-white font-bold py-2 px-4 rounded-lg hover:brightness-110 transition-all">
                    Save
                </button>
            </div>
        </>
      );
    }


    return (
        <div 
            className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${isSettingsOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={handleCloseSettings}
        >
            <div 
                className="bg-gray-900 border border-white/20 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative"
                onClick={(e) => e.stopPropagation()}
            >
                <button 
                  onClick={handleCloseSettings}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors z-10"
                  aria-label="Close settings"
                >
                    <X className="w-6 h-6" style={{ color: 'var(--color-text-secondary)' }}/>
                </button>

                {(() => {
                    switch (settingsView) {
                        case 'picker':
                            return renderPickerView();
                        case 'ai':
                            return renderAiView();
                        case 'ai_success':
                            return renderAiSuccessView();
                        case 'manual':
                            return renderManualView();
                    }
                })()}
            </div>
        </div>
    );
  };


  const renderContent = () => {
    switch (step) {
      case 'upload':
        return (
          <div className="w-full">
            <h2 className="text-2xl font-bold text-center" style={{ color: 'var(--color-primary)' }}>Welcome to Frame Studio</h2>
            <p className="text-center mb-6" style={{ color: 'var(--color-text-secondary)' }}>Upload a photo to start creating.</p>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {editableThemes.map((theme) => (
                        <div key={theme.id} onClick={() => handleThemeSelect(theme)} className="cursor-pointer group bg-black/20 rounded-lg p-4 text-center transition-colors hover:bg-white/10">
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
                        setIsSettingsOpen(true);
                        setSettingsView('manual');
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

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 font-sans transition-colors duration-1000">
      {renderSettingsModal()}
      <header className="w-full max-w-xl flex justify-between items-center px-6 pt-4">
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--color-primary)' }}>{uiTexts.title}</h1>
        <div className={`relative flex items-center justify-center transition-opacity duration-300 ${isSettingsOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
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
                  setIsSettingsOpen(true);
                  setSettingsView('picker');
                }}
                className="p-2 rounded-full hover:bg-white/10 transition-colors relative z-10"
                aria-label="Open settings"
            >
                <Settings className="w-6 h-6" style={{ color: 'var(--color-text)' }} />
            </button>
        </div>
      </header>
      <main className="w-full max-w-xl bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 md:p-8 mt-16">
        {renderContent()}
      </main>
      <footer className="text-center mt-6 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        <p>{uiTexts.footer}</p>
      </footer>
    </div>
  );
};

export default App;