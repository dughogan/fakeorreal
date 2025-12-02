
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Upload, Save, Trash2, Download, FileUp, Check, AlertCircle, Lock, Edit2, X, TestTube, Zap, Flame, Gift } from 'lucide-react';
import { MediaItem, GameDebugConfig } from '../types';
import { CustomContentManager, fileToBase64 } from '../utils/db';
import { MediaDisplay } from './MediaDisplay';
import { GAME_DATA } from '../constants';
import { motion } from 'framer-motion';

interface AdminScreenProps {
  onBack: () => void;
  onTestGame: (config: GameDebugConfig, duration?: number) => void;
}

// Reusable Tech Button
const ClipButton = ({ 
    onClick, 
    children, 
    className = "",
    variant = 'cyan',
    type = "button",
    active = false,
    disabled = false
  }: { 
    onClick?: (e: any) => void; 
    children?: React.ReactNode; 
    className?: string; 
    variant?: 'cyan' | 'gold' | 'red' | 'blue'; 
    type?: "button" | "submit";
    active?: boolean;
    disabled?: boolean;
  }) => {
    const clipPath = "polygon(8px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 8px)";
    const colors = {
      cyan: { bg: '#1dbbe5', text: 'text-brand-cyan' },
      gold: { bg: '#f0c33b', text: 'text-brand-gold' },
      red:  { bg: '#9a281e', text: 'text-brand-red' },
      blue: { bg: '#245397', text: 'text-white' }, // Blue variant typically uses white text
    };
    const theme = colors[variant] || colors.cyan;
    const baseBg = theme.bg;
  
    return (
      <motion.button
        type={type}
        whileHover={!disabled ? { scale: 1.02 } : {}}
        whileTap={!disabled ? { scale: 0.98 } : {}}
        onClick={onClick}
        disabled={disabled}
        className={`relative group font-bold uppercase tracking-wide py-3 px-6 flex items-center justify-center ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      >
        {/* Border / Fill Layer */}
        <div className="absolute inset-0 transition-colors duration-300" style={{ backgroundColor: baseBg, clipPath }} />
        
        {/* Hover/Active Fill Layer Logic */}
        <div className={`absolute inset-[2px] bg-brand-navy flex items-center justify-center transition-opacity duration-300 ${active ? 'opacity-0' : 'group-hover:opacity-0'}`} style={{ clipPath }} />
        
        {/* Text */}
        <div className={`relative z-10 flex items-center justify-center gap-2 transition-colors duration-300 ${active ? 'text-brand-navy' : `${theme.text} group-hover:text-brand-navy`}`}>
            {children}
        </div>
      </motion.button>
    );
};

// Specific small button for Radio inputs or Tabs
const SmallClipButton = ({ active, onClick, children, variant = 'cyan', className="" }: any) => (
    <ClipButton active={active} onClick={onClick} variant={variant} className={`text-sm py-2 px-4 ${className}`}>
        {children}
    </ClipButton>
);


export const AdminScreen: React.FC<AdminScreenProps> = ({ onBack, onTestGame }) => {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState(false);

  const [activeTab, setActiveTab] = useState<'editor' | 'manage' | 'system'>('editor');
  const [customItems, setCustomItems] = useState<MediaItem[]>([]);
  const [allItems, setAllItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  // We need to track the existing URL if editing and no new file is uploaded
  const [existingUrl, setExistingUrl] = useState<string>(''); 
  
  const [formData, setFormData] = useState<Partial<MediaItem>>({
    isReal: true,
    type: 'image',
    category: 'General',
    tips: [],
    explanation: '',
    shortTip: '',
    aiModel: '',
    title: ''
  });
  const [tipsInput, setTipsInput] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      loadItems();
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'gorams!') {
      setIsAuthenticated(true);
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  const loadItems = async () => {
    try {
      const all = await CustomContentManager.getAllItems();
      setAllItems(all);
      // Filter distinct custom items for internal tracking if needed
      setCustomItems(all.filter(i => i.isCustom));
    } catch (err) {
      console.error("Failed to load items", err);
      setAllItems(GAME_DATA);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // Create local preview
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(objectUrl);
      
      // Auto-detect type
      const type = selectedFile.type.startsWith('video') ? 'video' : 'image';
      setFormData(prev => ({ ...prev, type }));
    }
  };

  const handleEdit = (item: MediaItem) => {
    setEditingId(item.id);
    setFormData({
      title: item.title,
      isReal: item.isReal,
      type: item.type,
      category: item.category,
      explanation: item.explanation,
      shortTip: item.shortTip || '',
      aiModel: item.aiModel || '',
    });
    setTipsInput(item.tips.join(', '));
    setPreviewUrl(item.url);
    setExistingUrl(item.url);
    setFile(null); 
    
    setActiveTab('editor');
    setStatusMsg(null);
    
    const container = document.querySelector('.overflow-y-auto');
    if (container) container.scrollTop = 0;
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFile(null);
    setPreviewUrl('');
    setExistingUrl('');
    setFormData({ isReal: true, type: 'image', category: 'General', explanation: '', shortTip: '', title: '', aiModel: '' });
    setTipsInput('');
    setStatusMsg(null);
  };

  const handleSave = async () => {
    if ((!file && !existingUrl) || !formData.title || !formData.explanation) {
      setStatusMsg({ type: 'error', text: 'Please fill in all required fields.' });
      return;
    }

    setIsLoading(true);
    try {
      let finalUrl = existingUrl;
      if (file) {
        finalUrl = await fileToBase64(file);
      }

      const idToUse = editingId || crypto.randomUUID();

      const newItem: MediaItem = {
        id: idToUse,
        url: finalUrl,
        title: formData.title || 'Untitled',
        type: formData.type as 'image' | 'video',
        isReal: formData.isReal || false,
        category: formData.category || 'General',
        explanation: formData.explanation || '',
        aiModel: formData.aiModel,
        shortTip: formData.shortTip,
        tips: tipsInput.split(',').map(t => t.trim()).filter(t => t.length > 0),
        isCustom: true 
      };

      await CustomContentManager.saveItem(newItem);
      setStatusMsg({ type: 'success', text: editingId ? 'Item updated successfully!' : 'Content saved successfully!' });
      
      handleCancelEdit();
      loadItems();

    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Failed to save content. File might be too large.' });
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      await CustomContentManager.deleteItem(id);
      loadItems();
    }
  };

  const handleExport = async () => {
    setIsLoading(true);
    try {
      await CustomContentManager.exportGamePack();
      setStatusMsg({ type: 'success', text: 'Game Pack (.zip) exported successfully!' });
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: 'Export failed. Check console.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsLoading(true);
      try {
        const file = e.target.files[0];
        if (!file.name.endsWith('.zip')) {
            throw new Error("Please upload a .zip file");
        }
        const count = await CustomContentManager.importGamePack(file);
        setStatusMsg({ type: 'success', text: `Successfully imported ${count} items!` });
        loadItems();
      } catch (err) {
        setStatusMsg({ type: 'error', text: 'Import failed.' });
      } finally {
        setIsLoading(false);
      }
    }
  };

  // --- LOGIN SCREEN ---
  if (!isAuthenticated) {
    return (
      <div className="h-full bg-brand-navy flex flex-col items-center justify-center text-white p-6">
        <div 
            className="w-full max-w-md bg-brand-blue p-8 shadow-2xl border border-white/10"
            style={{ clipPath: "polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)" }}
        >
          <div className="flex justify-center mb-6">
            <div 
                className="p-4 bg-white/10 rounded-full"
            >
              <Lock className="w-8 h-8 text-brand-gold" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center mb-6">Admin Access</h2>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <Input 
                value={password}
                onChange={setPassword}
                placeholder="Enter Password"
                type="password"
                autoFocus
              />
            </div>
            
            {authError && (
              <div 
                className="flex items-center gap-2 text-brand-red bg-brand-red/10 p-3 text-sm"
                style={{ clipPath: "polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)" }}
              >
                <AlertCircle className="w-4 h-4" />
                <span>Incorrect password</span>
              </div>
            )}

            <ClipButton type="submit" variant="gold" className="w-full">
              Unlock Dashboard
            </ClipButton>
            
            <button 
              type="button"
              onClick={onBack}
              className="w-full py-2 text-brand-cyan hover:text-white transition-colors text-sm mt-2"
            >
              Cancel and Return Home
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- MAIN DASHBOARD ---
  return (
    <div className="h-full bg-brand-navy flex flex-col text-white overflow-hidden">
      {/* Header */}
      <div className="bg-brand-blue p-4 shadow-md flex items-center justify-between shrink-0 z-20 relative">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack} 
            className="p-2 hover:bg-white/10 rounded-full"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        </div>
        <div className="flex gap-2">
          <SmallClipButton active={activeTab === 'editor'} onClick={() => setActiveTab('editor')}>
            {editingId ? 'Editor (Edit)' : 'Editor'}
          </SmallClipButton>
          <SmallClipButton active={activeTab === 'manage'} onClick={() => { handleCancelEdit(); setActiveTab('manage'); }}>
            Manage ({allItems.length})
          </SmallClipButton>
          <SmallClipButton active={activeTab === 'system'} onClick={() => { handleCancelEdit(); setActiveTab('system'); }}>
            System
          </SmallClipButton>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="max-w-6xl mx-auto">
          
          {statusMsg && (
            <div 
                className={`mb-4 p-4 flex items-center gap-3 ${statusMsg.type === 'success' ? 'bg-green-500/20 text-green-200' : 'bg-red-500/20 text-red-200'}`}
                style={{ clipPath: "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)" }}
            >
              {statusMsg.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              {statusMsg.text}
              <button onClick={() => setStatusMsg(null)} className="ml-auto hover:opacity-70"><X className="w-4 h-4" /></button>
            </div>
          )}

          {/* EDITOR TAB */}
          {activeTab === 'editor' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div 
                    className="p-8 border-2 border-dashed border-brand-cyan/30 bg-white/5 hover:bg-white/10 transition-colors text-center relative group min-h-[300px] flex flex-col items-center justify-center overflow-hidden"
                    style={{ clipPath: "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)" }}
                >
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                    onChange={handleFileSelect} 
                    accept="image/*,video/*"
                  />
                  {previewUrl ? (
                    <div className="absolute inset-0 w-full h-full">
                      {formData.type === 'video' ? (
                        <video src={previewUrl} className="w-full h-full object-contain" autoPlay loop />
                      ) : (
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                      )}
                      <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                         <span className="bg-black/50 text-white px-3 py-1 rounded-full text-xs backdrop-blur-md">Click to change media</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 pointer-events-none">
                      <Upload className="w-12 h-12 text-brand-cyan mx-auto mb-2" />
                      <p className="text-brand-cyan font-medium">Click or Drag media here</p>
                      <p className="text-sm text-gray-400">Supports Images & Videos</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <ClipButton 
                        variant={formData.isReal ? 'cyan' : 'blue'} 
                        active={formData.isReal === true}
                        onClick={() => setFormData({ ...formData, isReal: true })}
                        className="w-full"
                    >
                        Real Media
                    </ClipButton>
                  </div>
                  <div className="flex-1">
                    <ClipButton 
                        variant={formData.isReal ? 'blue' : 'red'} 
                        active={formData.isReal === false}
                        onClick={() => setFormData({ ...formData, isReal: false })}
                        className="w-full"
                    >
                        AI Generated
                    </ClipButton>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-bold text-white">{editingId ? 'Edit Content' : 'Add New Content'}</h3>
                    {editingId && (
                        <button onClick={handleCancelEdit} className="text-sm text-brand-cyan hover:text-white">Cancel Edit</button>
                    )}
                </div>

                <Input 
                  label="Title" 
                  value={formData.title || ''} 
                  onChange={v => setFormData({...formData, title: v})} 
                />
                <Input 
                  label="Category (e.g. 'Unnatural Physics')" 
                  value={formData.category || ''} 
                  onChange={v => setFormData({...formData, category: v})} 
                />
                <Input 
                  label="Short Tip (e.g. 'Look at the fingers')" 
                  value={formData.shortTip || ''} 
                  onChange={v => setFormData({...formData, shortTip: v})} 
                  placeholder="Brief micro-learning hint shown instantly"
                />
                {!formData.isReal && (
                  <Input 
                    label="AI Model (Optional)" 
                    value={formData.aiModel || ''} 
                    onChange={v => setFormData({...formData, aiModel: v})} 
                    placeholder="e.g. Midjourney v6"
                  />
                )}
                <div>
                  <label className="block text-sm font-medium text-brand-cyan mb-1">Explanation</label>
                  <textarea 
                    className="w-full bg-black/20 border border-white/10 p-3 text-white focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan outline-none min-h-[100px]"
                    style={{ clipPath: "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)" }}
                    value={formData.explanation}
                    onChange={e => setFormData({...formData, explanation: e.target.value})}
                  />
                </div>
                <Input 
                  label="Detection Tips (Comma separated)" 
                  value={tipsInput} 
                  onChange={v => setTipsInput(v)} 
                  placeholder="Check shadows, Look at hands..."
                />
                
                <ClipButton onClick={handleSave} variant="gold" disabled={isLoading} className="w-full">
                   {isLoading ? 'Saving...' : <><Save className="w-5 h-5" /> {editingId ? 'Update Item' : 'Save to Library'}</>}
                </ClipButton>
              </div>
            </div>
          )}

          {/* MANAGE TAB */}
          {activeTab === 'manage' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {allItems.map(item => (
                <div 
                    key={item.id} 
                    className="relative group aspect-square bg-white/5 overflow-hidden border border-white/10 hover:border-brand-gold/50 hover:shadow-[0_0_15px_rgba(240,195,59,0.2)] transition-all"
                    style={{ clipPath: "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)" }}
                >
                  
                  {/* Media Background */}
                  <div className="absolute inset-0">
                    <MediaDisplay item={item} autoPlay={false} objectFit="cover" className="w-full h-full" />
                  </div>

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/90 via-brand-navy/20 to-transparent opacity-80" />

                  {/* Top Left Badge */}
                  <div className="absolute top-2 left-2 z-10">
                     {item.isCustom ? (
                        <span 
                            className="bg-brand-gold text-brand-navy text-[10px] font-bold px-2 py-1 shadow-sm border border-brand-navy/20"
                            style={{ clipPath: "polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)" }}
                        >
                            CUSTOM
                        </span>
                     ) : (
                        <span 
                            className="bg-brand-blue text-white text-[10px] font-bold px-2 py-1 shadow-sm flex items-center gap-1 border border-white/20"
                            style={{ clipPath: "polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)" }}
                        >
                            <Lock className="w-3 h-3" /> BUILT-IN
                        </span>
                     )}
                  </div>

                  {/* Content Overlay (Bottom) */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
                    <p className="font-bold text-sm text-white truncate mb-1.5 drop-shadow-md leading-tight" title={item.title}>{item.title}</p>
                    <div className="flex justify-between items-center">
                      <span 
                        className={`text-[10px] px-2 py-0.5 font-bold uppercase shadow-sm backdrop-blur-md ${item.isReal ? 'bg-brand-cyan/90 text-brand-navy' : 'bg-brand-red/90 text-white'}`}
                        style={{ clipPath: "polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)" }}
                      >
                        {item.isReal ? 'Real' : 'AI'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Edit Actions Overlay (Hover) */}
                  <div className="absolute inset-0 bg-brand-navy/80 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-3 z-20 transform scale-95 group-hover:scale-100">
                         <button 
                            onClick={() => handleEdit(item)}
                            className="p-2.5 bg-brand-cyan text-brand-navy hover:scale-110 hover:bg-white transition-all shadow-lg rounded-full"
                            title="Edit Item"
                         >
                             <Edit2 className="w-5 h-5" />
                         </button>
                         {item.isCustom && (
                            <button 
                                onClick={() => handleDelete(item.id)}
                                className="p-2.5 bg-brand-red text-white hover:scale-110 hover:bg-white hover:text-brand-red transition-all shadow-lg rounded-full"
                                title="Delete Item"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                         )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SYSTEM TAB */}
          {activeTab === 'system' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div 
                    className="bg-white/5 border border-white/10 p-6"
                    style={{ clipPath: "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)" }}
                >
                  <div 
                    className="w-12 h-12 bg-brand-cyan/20 flex items-center justify-center text-brand-cyan mb-4 rounded-full"
                  >
                    <Download className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Export Game Pack</h3>
                  <p className="text-gray-400 mb-6 text-sm">
                    This creates a <strong>.zip</strong> file containing all content.
                    <br/><br/>
                    <strong>Install Locally:</strong> Unzip this to your project root. It will create the 'media' folder and 'game_data.json' needed for a permanent install.
                  </p>
                  <ClipButton onClick={handleExport} disabled={isLoading} variant="cyan" className="w-full">
                    {isLoading ? 'Exporting...' : 'Download Full Pack (.zip)'}
                  </ClipButton>
                </div>

                <div 
                    className="bg-white/5 border border-white/10 p-6"
                    style={{ clipPath: "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)" }}
                >
                  <div 
                    className="w-12 h-12 bg-brand-gold/20 flex items-center justify-center text-brand-gold mb-4 rounded-full"
                  >
                    <FileUp className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Import Game Pack</h3>
                  <p className="text-gray-400 mb-6 text-sm">
                    Upload a <strong>.zip</strong> Game Pack file to add it to the browser database immediately.
                  </p>
                  <label className="block w-full">
                     <div className="hidden">
                        <input type="file" accept=".zip" onChange={handleImport} disabled={isLoading} />
                     </div>
                     <ClipButton onClick={() => document.querySelector<HTMLInputElement>('input[type="file"][accept=".zip"]')?.click()} disabled={isLoading} variant="gold" className="w-full">
                         <Upload className="w-5 h-5" />
                         {isLoading ? 'Importing...' : 'Select .zip File'}
                     </ClipButton>
                  </label>
                </div>
              </div>

              {/* DEVELOPER TOOLS SECTION */}
              <div 
                className="bg-brand-blue/20 border border-brand-cyan/30 p-6 relative overflow-hidden"
                style={{ clipPath: "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)" }}
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-cyan via-brand-gold to-brand-red opacity-50" />
                <div className="flex items-center gap-3 mb-6">
                    <div 
                        className="w-12 h-12 bg-brand-navy flex items-center justify-center border border-brand-cyan/50 rounded-full"
                    >
                        <TestTube className="w-6 h-6 text-brand-cyan" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">Developer Tools</h3>
                        <p className="text-brand-cyan/70 text-sm">Test game mechanics and overrides</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <ClipButton onClick={() => onTestGame({ initialStreak: 3 })} variant="cyan">
                        <Zap className="w-5 h-5" /> Streak 3
                    </ClipButton>

                    <ClipButton onClick={() => onTestGame({ initialStreak: 5 })} variant="gold">
                        <Flame className="w-5 h-5" /> Streak 5
                    </ClipButton>

                    <ClipButton onClick={() => onTestGame({ initialStreak: 7, forceBonusRound: true }, 5)} variant="red">
                        <Gift className="w-5 h-5" /> Bonus Round
                    </ClipButton>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper Components
const Input: React.FC<{ 
  label?: string; 
  value: string; 
  onChange: (v: string) => void; 
  placeholder?: string;
  type?: string;
  autoFocus?: boolean;
}> = ({ label, value, onChange, placeholder, type = "text", autoFocus = false }) => {
  const [focused, setFocused] = useState(false);
  const clipPath = "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)";

  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-brand-cyan mb-1">{label}</label>}
      <div className="relative h-14 group">
        {/* Border / Focus Ring */}
        <div 
          className={`absolute inset-0 transition-colors duration-300 ${focused ? 'bg-brand-gold' : 'bg-brand-cyan/30'}`}
          style={{ clipPath }}
        />
        {/* Inner Background */}
        <div 
          className="absolute inset-[2px] bg-black/40"
          style={{ clipPath }}
        />
        <input 
          type={type}
          className="absolute inset-0 w-full h-full bg-transparent px-4 text-white outline-none placeholder-brand-cyan/50 font-medium"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoFocus={autoFocus}
        />
      </div>
    </div>
  );
};
