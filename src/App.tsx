/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Type, Sparkles, RefreshCw, Trash2, Play, Pause, Settings2, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import html2canvas from 'html2canvas';
import * as htmlToImage from 'html-to-image';
import gifshot from 'gifshot';

type AnimationType = 'float' | 'pulse' | 'typewriter' | 'slide' | 'glitch';

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [text, setText] = useState<string>('Hello World');
  const [animation, setAnimation] = useState<AnimationType>('float');
  const [fontSize, setFontSize] = useState<number>(48);
  const [textColor, setTextColor] = useState<string>('#ffffff');
  const [fontFamily, setFontFamily] = useState<string>('font-sans');
  const [animationSpeed, setAnimationSpeed] = useState<number>(1);
  const [exportDuration, setExportDuration] = useState<number>(2);
  const [isExportingStatic, setIsExportingStatic] = useState(false);
  const [isExportingDynamic, setIsExportingDynamic] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        setImage(readerEvent.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const animations = {
    float: {
      animate: {
        y: [0, -20, 0],
        transition: { duration: 3 / animationSpeed, repeat: Infinity, ease: "easeInOut" }
      }
    },
    pulse: {
      animate: {
        scale: [1, 1.1, 1],
        opacity: [0.8, 1, 0.8],
        transition: { duration: 2 / animationSpeed, repeat: Infinity, ease: "easeInOut" }
      }
    },
    typewriter: {
      initial: { width: 0 },
      animate: { 
        width: "100%",
        transition: { duration: 2 / animationSpeed, repeat: Infinity, repeatDelay: 1 / animationSpeed, ease: "linear" }
      }
    },
    slide: {
      initial: { x: -100, opacity: 0 },
      animate: { 
        x: 0, 
        opacity: 1,
        transition: { duration: 1 / animationSpeed, repeat: Infinity, repeatDelay: 2 / animationSpeed }
      }
    },
    glitch: {
      animate: {
        x: [0, -2, 2, -1, 1, 0],
        y: [0, 1, -1, 2, -2, 0],
        filter: [
          'none',
          'hue-rotate(90deg) blur(1px)',
          'hue-rotate(-90deg) blur(0px)',
          'none'
        ],
        transition: { duration: 0.2 / animationSpeed, repeat: Infinity, repeatDelay: 1 / animationSpeed }
      }
    }
  };

  const handleSaveStatic = async () => {
    if (!containerRef.current || !image) return;
    setIsExportingStatic(true);
    
    try {
      const canvas = await html2canvas(containerRef.current, {
        useCORS: true,
        backgroundColor: null,
        scale: 2,
        onclone: (clonedDoc) => {
          // html2canvas doesn't support oklch colors used by Tailwind v4.
          // We need to find and replace them in the cloned document.
          const elements = clonedDoc.getElementsByTagName('*');
          for (let i = 0; i < elements.length; i++) {
            const el = elements[i] as HTMLElement;
            const style = window.getComputedStyle(el);
            
            // Check common color properties
            const colorProps = ['color', 'backgroundColor', 'borderColor', 'outlineColor'];
            colorProps.forEach(prop => {
              const value = (el.style as any)[prop] || style.getPropertyValue(prop);
              if (value && value.includes('oklch')) {
                // Fallback to a safe color if oklch is detected
                // Since we can't easily convert oklch to rgb in JS without a library,
                // we'll set it to a sensible default or transparent if it's a background
                if (prop === 'backgroundColor') {
                  (el.style as any)[prop] = 'rgba(0,0,0,0)';
                } else {
                  (el.style as any)[prop] = '#ffffff';
                }
              }
            });
          }
        }
      });
      
      const link = document.createElement('a');
      link.download = 'static-overlay.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error("Failed to save static image", err);
      alert("Failed to save static image. Please try again.");
    } finally {
      setIsExportingStatic(false);
    }
  };

  const handleSaveDynamic = async () => {
    if (!containerRef.current || !image) return;
    setIsExportingDynamic(true);
    setExportProgress(0);
    
    try {
      const frames: string[] = [];
      const duration = exportDuration * 1000;
      const fps = 10;
      const totalFrames = (duration / 1000) * fps;
      const interval = 1000 / fps;

      // Ensure animation is playing
      setIsPlaying(true);

      for (let i = 0; i < totalFrames; i++) {
        const dataUrl = await htmlToImage.toPng(containerRef.current, {
          pixelRatio: 1,
        });
        frames.push(dataUrl);
        setExportProgress(Math.round(((i + 1) / totalFrames) * 50));
        await new Promise(resolve => setTimeout(resolve, interval));
      }

      setExportProgress(60);

      gifshot.createGIF({
        images: frames,
        gifWidth: containerRef.current.offsetWidth,
        gifHeight: containerRef.current.offsetHeight,
        interval: 1 / fps,
        numFrames: totalFrames,
        frameDuration: 1,
        sampleInterval: 10,
      }, (obj: any) => {
        if (!obj.error) {
          setExportProgress(100);
          const link = document.createElement('a');
          link.download = 'dynamic-text.gif';
          link.href = obj.image;
          link.click();
          setIsExportingDynamic(false);
        } else {
          setIsExportingDynamic(false);
          alert("GIF generation failed: " + obj.errorMsg);
        }
      });
    } catch (err) {
      console.error("Failed to save dynamic image", err);
      alert("Failed to save dynamic image. Capturing DOM animations is resource intensive. Please try again.");
      setIsExportingDynamic(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30">
      <header className="p-6 border-b border-white/5 flex justify-between items-center glass sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Type className="text-zinc-950 w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">AnimText</h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Dynamic Overlay</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            title={isPlaying ? "Pause Animation" : "Play Animation"}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          
          <div className="flex items-center gap-2">
            <button
              disabled={!image || isExportingStatic || isExportingDynamic}
              onClick={handleSaveStatic}
              className="btn-secondary flex items-center gap-2 py-2 text-xs"
            >
              {isExportingStatic ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
              保存静态图
            </button>
            <button
              disabled={!image || isExportingDynamic || isExportingStatic}
              onClick={handleSaveDynamic}
              className="btn-primary flex items-center gap-2 py-2 text-xs relative overflow-hidden"
            >
              {isExportingDynamic ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin z-10" />
                  <span className="z-10">{exportProgress}%</span>
                  <div 
                    className="absolute inset-0 bg-emerald-600/50 transition-all duration-300" 
                    style={{ width: `${exportProgress}%` }}
                  />
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3" />
                  保存动态图
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Controls */}
        <div className="lg:col-span-4 space-y-6">
          <section className="glass p-6 rounded-3xl space-y-6">
            <div className="flex items-center gap-2 text-emerald-500 mb-2">
              <Settings2 className="w-4 h-4" />
              <h2 className="text-sm font-bold uppercase tracking-wider">Editor</h2>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-zinc-500 font-bold uppercase">Overlay Text</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors resize-none h-24"
                placeholder="Enter your message..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-zinc-500 font-bold uppercase">Animation Style</label>
              <div className="grid grid-cols-2 gap-2">
                {(['float', 'pulse', 'typewriter', 'slide', 'glitch'] as AnimationType[]).map((anim) => (
                  <button
                    key={anim}
                    onClick={() => setAnimation(anim)}
                    className={`px-4 py-2 rounded-xl text-xs font-medium transition-all border ${
                      animation === anim 
                        ? 'bg-emerald-500 text-zinc-950 border-emerald-500' 
                        : 'bg-zinc-900 text-zinc-400 border-white/5 hover:border-white/20'
                    }`}
                  >
                    {anim.charAt(0).toUpperCase() + anim.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-zinc-500 font-bold uppercase">Font Family</label>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-xs focus:outline-none focus:border-emerald-500/50 transition-colors appearance-none"
              >
                <option value="font-sans">Inter (Sans)</option>
                <option value="font-serif">Playfair (Serif)</option>
                <option value="font-display">Space Grotesk (Display)</option>
                <option value="font-mono">JetBrains Mono (Mono)</option>
                <option value="font-bebas">Bebas Neue (Bold)</option>
              </select>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-xs text-zinc-500 font-bold uppercase">Animation Speed</label>
                <span className="text-xs font-mono text-emerald-500">{animationSpeed}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={animationSpeed}
                onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-xs text-zinc-500 font-bold uppercase">Export Duration (GIF)</label>
                <span className="text-xs font-mono text-emerald-500">{exportDuration}s</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="0.5"
                value={exportDuration}
                onChange={(e) => setExportDuration(parseFloat(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-xs text-zinc-500 font-bold uppercase">Font Size</label>
                <span className="text-xs font-mono text-emerald-500">{fontSize}px</span>
              </div>
              <input
                type="range"
                min="12"
                max="120"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-zinc-500 font-bold uppercase">Text Color</label>
              <div className="flex gap-2">
                {['#ffffff', '#fbbf24', '#34d399', '#60a5fa', '#f87171', '#a78bfa'].map((color) => (
                  <button
                    key={color}
                    onClick={() => setTextColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                      textColor === color ? 'border-emerald-500 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
                <input 
                  type="color" 
                  value={textColor} 
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-8 h-8 rounded-full overflow-hidden border-none bg-transparent cursor-pointer"
                />
              </div>
            </div>
          </section>

          {!image && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-6 border-2 border-dashed border-white/10 rounded-3xl text-center space-y-4"
            >
              <p className="text-sm text-zinc-500">No image selected</p>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary w-full text-xs"
              >
                Upload Background
              </button>
            </motion.div>
          )}
        </div>

        {/* Right: Preview */}
        <div className="lg:col-span-8">
          <div 
            ref={containerRef}
            className="relative w-full aspect-video glass rounded-[2rem] overflow-hidden shadow-2xl group"
          >
            {image ? (
              <>
                <img 
                  src={image} 
                  alt="Background" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 flex items-center justify-center p-12 pointer-events-none">
                  <motion.div
                    key={`${animation}-${isPlaying}-${fontFamily}`}
                    initial={animations[animation].initial || {}}
                    animate={isPlaying ? animations[animation].animate : {}}
                    className={`text-center overflow-hidden ${fontFamily}`}
                    style={{ 
                      fontSize: `${fontSize}px`, 
                      color: textColor,
                      fontWeight: 800,
                      lineHeight: 1.1,
                      textShadow: '0 4px 12px rgba(0,0,0,0.5)'
                    }}
                  >
                    {text}
                  </motion.div>
                </div>
                
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => setImage(null)}
                    className="p-3 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl backdrop-blur-md transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-all group"
              >
                <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Upload className="text-zinc-500 w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold">Upload Background</h3>
                <p className="text-zinc-500 mt-2">Drag and drop or click to browse</p>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              className="hidden" 
              accept="image/*"
            />
          </div>

          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="glass p-4 rounded-2xl text-center">
              <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Resolution</p>
              <p className="text-sm font-mono">1920 × 1080</p>
            </div>
            <div className="glass p-4 rounded-2xl text-center">
              <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Format</p>
              <p className="text-sm font-mono">MP4 / GIF</p>
            </div>
            <div className="glass p-4 rounded-2xl text-center">
              <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">FPS</p>
              <p className="text-sm font-mono">60</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="p-12 text-center text-zinc-600 text-xs border-t border-white/5 mt-12">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="w-3 h-3" />
          <span className="uppercase tracking-widest font-bold">AnimText Studio</span>
        </div>
        <p>© 2026 Designed for high-performance visual storytelling.</p>
      </footer>
    </div>
  );
}
