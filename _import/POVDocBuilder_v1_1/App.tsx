import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  ContentItem, 
  CategoryType, 
  POVInfo,
  DocumentConfig,
  CustomPort,
  SuccessCriteria
} from './types';
import { 
  CATEGORIES, 
  CATEGORY_ICONS,
  SUCCESS_CRITERIA_OPTIONS,
  BRAND_LOGO_URL
} from './constants';
import { formatContent } from './services/formatter';

const STORAGE_KEY_LIB = 'cribl_library_v6';
const STORAGE_KEY_SESSION = 'cribl_session_v6';

const EMPTY_POV_INFO: POVInfo = {
  customerName: '',
  rsmName: '',
  rsmEmail: '',
  seName: '',
  seEmail: '',
  customerExecSponsor: '',
  customerExecSponsorEmail: '',
  customerTechLead: '',
  customerTechLeadEmail: '',
  kickoffDate: '',
  logo: null,
  brandLogo: null
};

const HELP_TEXT = `Formatting Tips:
• Use **text** for bold
• Use *text* for italics
• Use \`code\` for pointer code
• Use CODE: or \`\`\` for blocks
• Use - [ ] for checkboxes
• Use - text for bullets
• Use two spaces before - text for sub-bullets
• Tables: TABLE: followed by CSV rows`;

const FormField = ({ label, children, required, help, onHelpClick }: { label: string, children?: React.ReactNode, required?: boolean, help?: string, onHelpClick?: () => void }) => (
  <div className="flex flex-col gap-1.5 w-full">
    <div className="flex items-center gap-2 px-1">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
        {label} {required && <span className="text-orange-500">*</span>}
      </label>
      {help && (
        <button 
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onHelpClick?.();
          }}
          className="p-0.5 text-slate-400 hover:text-[#2596be] transition-colors focus:outline-none cursor-pointer"
          title={help}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
          </svg>
        </button>
      )}
    </div>
    {children}
  </div>
);

const SectionHeader = ({ title }: { title: string }) => (
  <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] border-b border-[#2596be] pb-2 mt-4 mb-2 first:mt-0">
    {title}
  </h4>
);

const formatDateForDoc = (dateStr: string) => {
  if (!dateStr) return 'TBD';
  const [year, month, day] = dateStr.split('-');
  return (year && month && day) ? `${month}-${day}-${year}` : dateStr;
};

const getTimestamp = () => {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  return `${date}_${time}`;
};

const App: React.FC = () => {
  const [allContent, setAllContent] = useState<Record<string, ContentItem>>({});
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [povInfo, setPovInfo] = useState<POVInfo>({ ...EMPTY_POV_INFO });
  const [architectureImage, setArchitectureImage] = useState<string | null>(null);
  const [architectureChecked, setArchitectureChecked] = useState<boolean>(false);
  const [customPorts, setCustomPorts] = useState<CustomPort[]>([]);
  const [sessionCriteria, setSessionCriteria] = useState<SuccessCriteria[]>([]);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [isInitialized, setIsInitialized] = useState(false);
  
  const [activeModal, setActiveModal] = useState<'content' | 'pov-info' | 'custom-port' | 'criteria' | 'delete-snippet' | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [pendingDeleteKey, setPendingDeleteKey] = useState<string | null>(null);
  const [editingPortIndex, setEditingPortIndex] = useState<number | null>(null);
  const [editingCriteriaIndex, setEditingCriteriaIndex] = useState<number | null>(null);
  const [tempContent, setTempContent] = useState<Partial<ContentItem>>({});
  const [tempPort, setTempPort] = useState<Partial<CustomPort>>({ protocol: 'TCP' });
  const [tempCriteria, setTempCriteria] = useState<Partial<SuccessCriteria>>({ criteria: SUCCESS_CRITERIA_OPTIONS[0], completed: false });
  const [saveIndicator, setSaveIndicator] = useState<string | null>(null);
  const [showContentHelp, setShowContentHelp] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const configInputRef = useRef<HTMLInputElement>(null);

  // Auto-load default brand logo if not set
  useEffect(() => {
    if (povInfo.brandLogo) return;
    const fetchLogo = async () => {
      try {
        const response = await fetch(BRAND_LOGO_URL);
        if (!response.ok) return;
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setPovInfo(prev => ({ ...prev, brandLogo: reader.result as string }));
          }
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        console.debug("Default brand logo file not found, skipping auto-load.");
      }
    };
    fetchLogo();
  }, [povInfo.brandLogo]);

  const normalizeCategory = useCallback((cat: string): CategoryType => {
    if (!cat) return 'ENVIRONMENT';
    const c = cat.toUpperCase().trim();
    if (CATEGORIES.includes(c as any)) return c as CategoryType;
    return 'ENVIRONMENT';
  }, []);

  const triggerIndicator = useCallback((msg: string) => {
    setSaveIndicator(msg);
    setTimeout(() => setSaveIndicator(null), 3000);
  }, []);

  useEffect(() => {
    const savedLib = localStorage.getItem(STORAGE_KEY_LIB);
    if (savedLib) {
      try { 
        setAllContent(JSON.parse(savedLib)); 
      } catch (e) { console.error("Lib load fail", e); }
    }
    const savedSession = localStorage.getItem(STORAGE_KEY_SESSION);
    if (savedSession) {
      try {
        const sess = JSON.parse(savedSession);
        if (sess.checkedItems) setCheckedItems(sess.checkedItems);
        if (sess.povInfo) setPovInfo({ ...EMPTY_POV_INFO, ...sess.povInfo });
        if (sess.sessionCustomPorts) setCustomPorts(sess.sessionCustomPorts);
        if (sess.sessionSuccessCriteria) setSessionCriteria(sess.sessionSuccessCriteria);
        setArchitectureChecked(!!sess.architectureChecked);
        if (sess.architectureImage) setArchitectureImage(sess.architectureImage);
      } catch (e) { console.error("Session load fail", e); }
    }
    setIsInitialized(true);
  }, [normalizeCategory]);

  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem(STORAGE_KEY_LIB, JSON.stringify(allContent));
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify({ 
      checkedItems, povInfo, architectureChecked, architectureImage,
      sessionCustomPorts: customPorts, sessionSuccessCriteria: sessionCriteria
    }));
  }, [allContent, checkedItems, povInfo, architectureChecked, architectureImage, customPorts, sessionCriteria, isInitialized]);

  const handleResetSession = () => {
    setCheckedItems([]);
    setPovInfo({ ...EMPTY_POV_INFO });
    setArchitectureImage(null);
    setArchitectureChecked(false);
    setCustomPorts([]);
    setSessionCriteria([]);
    setShowResetConfirm(false);
    triggerIndicator("Document Reset");
  };

  const saveLibraryItem = () => {
    if (!tempContent.label || !tempContent.title) return;
    const key = editingKey || `item_${Date.now()}`;
    const normalized = { ...tempContent, category: tempContent.category || 'ENVIRONMENT' } as ContentItem;
    setAllContent(prev => ({ ...prev, [key]: normalized }));
    setEditingKey(null);
    setActiveModal(null);
    triggerIndicator("Snippet Saved");
  };

  const deleteLibraryItem = (key: string) => {
    setPendingDeleteKey(key);
    setActiveModal('delete-snippet');
  };

  const confirmDeleteSnippet = () => {
    if (pendingDeleteKey) {
      const key = pendingDeleteKey;
      setAllContent(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
      setCheckedItems(prev => prev.filter(k => k !== key));
      triggerIndicator("Snippet Removed");
    }
    setActiveModal(null);
    setPendingDeleteKey(null);
  };

  const handleExportLibrary = () => {
    const blob = new Blob([JSON.stringify(allContent, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cribl_library_${getTimestamp()}.json`;
    link.click();
    triggerIndicator("Library Exported");
  };

  const handleSaveConfig = () => {
    const config = { checkedItems, povInfo, architectureImage, architectureChecked, sessionCustomPorts: customPorts, sessionSuccessCriteria: sessionCriteria };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pov_config_${povInfo.customerName || 'untitled'}_${getTimestamp()}.json`;
    link.click();
    triggerIndicator("Config Saved");
  };

  const handleExportWord = () => {
    const contentElement = document.getElementById('preview-content');
    if (!contentElement) return;

    // Clone the preview content to manipulate images before exporting
    const clone = contentElement.cloneNode(true) as HTMLElement;
    
    // Find all images in the clone and set explicit width/height attributes for Word
    const images = clone.querySelectorAll('img');
    images.forEach(img => {
      // Find the original image in the DOM to get its computed dimensions
      // Images in preview-content have specific IDs or roles, but we match by index as they are in same order
      const originalImages = contentElement.querySelectorAll('img');
      const index = Array.from(images).indexOf(img);
      const originalImg = originalImages[index] as HTMLImageElement;

      if (originalImg) {
        // Use natural dimensions if available, otherwise client dimensions
        const w = originalImg.clientWidth || originalImg.naturalWidth;
        const h = originalImg.clientHeight || originalImg.naturalHeight;

        if (w > 0) {
          // Limit maximum width for standard Word margins (approx 550px is safe)
          const MAX_WORD_WIDTH = 550;
          let finalW = w;
          let finalH = h;
          
          if (w > MAX_WORD_WIDTH) {
            finalW = MAX_WORD_WIDTH;
            finalH = (h * MAX_WORD_WIDTH) / w;
          }
          
          // Set attributes that Word reads reliably
          img.setAttribute('width', Math.round(finalW).toString());
          img.setAttribute('height', Math.round(finalH).toString());
          
          // Apply styles for double compatibility
          img.style.width = `${Math.round(finalW)}px`;
          img.style.height = `${Math.round(finalH)}px`;
          img.style.maxWidth = '100%';
        }
      }
    });

    const content = clone.innerHTML;
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><style>body { font-family: 'Segoe UI', Arial, sans-serif; } table { border-collapse: collapse; width: 100%; } th, td { border: 1pt solid #cbd5e1; padding: 5pt; } img { display: inline-block; }</style></head><body>${content}</body></html>`;
    const blob = new Blob(['\ufeff', header], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const customer = povInfo.customerName ? povInfo.customerName.replace(/[^a-z0-9]/gi, '_').toUpperCase() : 'CRIBL';
    link.download = `${customer}_POV_OVERVIEW_${getTimestamp()}.doc`;
    link.click();
  };

  const sortedContentKeys = useMemo(() => {
    const ENV_ORDER = [
      "Request Cribl.Cloud Org",
      "Invite Cribl SE to Cribl.Cloud Org",
      "Hybrid Worker Node (Linux)",
      "Edge Node (Linux)",
      "Edge Node (Windows)"
    ];

    const PORTS_ORDER = [
      "Hybrid Worker Node",
      "Edge Node"
    ];

    return Object.keys(allContent).sort((a, b) => {
      const itemA = allContent[a];
      const itemB = allContent[b];

      if (itemA.category === 'ENVIRONMENT' && itemB.category === 'ENVIRONMENT') {
        const indexA = ENV_ORDER.indexOf(itemA.label);
        const indexB = ENV_ORDER.indexOf(itemB.label);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
      }

      if (itemA.category === 'REQUIRED PORTS' && itemB.category === 'REQUIRED PORTS') {
        const indexA = PORTS_ORDER.indexOf(itemA.label);
        const indexB = PORTS_ORDER.indexOf(itemB.label);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
      }

      return (itemA?.label || '').localeCompare(itemB?.label || '', undefined, { sensitivity: 'base', numeric: true });
    });
  }, [allContent]);

  const mergedPorts = useMemo(() => {
    const libRows: any[] = [];
    checkedItems.filter(k => allContent[k]?.category === 'REQUIRED PORTS').forEach(key => {
      const item = allContent[key];
      if (!item) return;
      const lines = item.content.split('\n');
      lines.forEach(line => {
        const cells = line.split(',').map(c => c.trim());
        if (cells.length >= 3 && !cells[0].toLowerCase().includes('source')) {
          libRows.push({ source: cells[0], destination: cells[1], port: cells[2], purpose: cells[3] || '', protocol: '' });
        }
      });
    });
    return [...libRows, ...customPorts];
  }, [checkedItems, allContent, customPorts]);

  const categoryHeaderStyle: React.CSSProperties = { 
    fontSize: '18pt', 
    fontWeight: 900, 
    color: '#2596be', 
    margin: '18pt 0 12pt 0', 
    borderBottom: '2pt solid #2596be', 
    paddingBottom: '4pt', 
    textTransform: 'uppercase' 
  };
  
  const subHeaderStyle: React.CSSProperties = { 
    fontSize: '14pt', 
    fontWeight: 900, 
    color: '#0f172a', 
    margin: '24pt 0 12pt 0', 
    borderBottom: '1pt solid #2596be', 
    paddingBottom: '4pt' 
  };

  return (
    <div className="flex h-screen overflow-hidden text-slate-900 bg-white">
      <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={(e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const imported = JSON.parse(ev.target?.result as string);
            setAllContent(prev => ({ ...prev, ...imported }));
            triggerIndicator("Library Merged");
          } catch (err) { alert("Invalid JSON file."); }
        };
        reader.readAsText(file);
        e.target.value = '';
      }} />
      <input type="file" ref={configInputRef} className="hidden" accept=".json" onChange={(e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const config = JSON.parse(ev.target?.result as string);
            if (config.checkedItems) setCheckedItems(config.checkedItems);
            if (config.povInfo) setPovInfo({ ...EMPTY_POV_INFO, ...config.povInfo });
            if (config.sessionCustomPorts) setCustomPorts(config.sessionCustomPorts);
            if (config.sessionSuccessCriteria) setSessionCriteria(config.sessionSuccessCriteria);
            setArchitectureChecked(!!config.architectureChecked);
            if (config.architectureImage) setArchitectureImage(config.architectureImage);
            triggerIndicator("Config Loaded");
          } catch (err) { alert("Invalid Config file."); }
        };
        reader.readAsText(file);
        e.target.value = '';
      }} />

      <aside className="w-[475px] bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 shadow-inner">
        <div className="p-6 bg-white border-b border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <img src={povInfo.brandLogo || BRAND_LOGO_URL} alt="Cribl Logo" className="h-8 w-auto object-contain" />
              <h1 className="text-base font-black tracking-tight leading-none">POV Document Builder</h1>
            </div>
            <div className="flex gap-1 relative">
              <button onClick={() => { setEditingKey(null); setTempContent({ category: 'ENVIRONMENT' }); setActiveModal('content'); }} className="p-1.5 border rounded-md hover:text-[#2596be] transition cursor-pointer" title="Add Content"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg></button>
              <button onClick={() => fileInputRef.current?.click()} className="p-1.5 border rounded-md hover:text-blue-600 transition cursor-pointer" title="Import Library"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 15V3m-4 4l4-4 4 4"/></svg></button>
              <button onClick={handleExportLibrary} className="p-1.5 border rounded-md hover:text-green-600 transition cursor-pointer" title="Export Library"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 3v12m-4-4l4 4 4-4"/></svg></button>
              <button onClick={() => setShowResetConfirm(!showResetConfirm)} className={`p-1.5 border rounded-md transition cursor-pointer ${showResetConfirm ? 'bg-red-50 text-red-600 border-red-200' : 'hover:text-red-600'}`} title="Reset Session"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6"/></svg></button>
            </div>
          </div>
          <button onClick={() => setActiveModal('pov-info')} className="w-full group bg-slate-50 border border-slate-200 rounded-xl p-4 hover:border-[#2596be] hover:bg-white transition-all text-left shadow-sm">
            <span className="text-[10px] font-black text-[#2596be] uppercase tracking-[0.2em] mb-1 block">POV Details</span>
            <span className="text-sm font-bold text-slate-700 truncate block">{povInfo.customerName || 'Configure POV Details...'}</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
          {CATEGORIES.map(category => (
            <div key={category} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div onClick={() => setCollapsedCategories(prev => ({...prev, [category]: !prev[category]}))} className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 transition group select-none">
                <div className="flex items-center gap-3">
                  <div className="text-slate-400 group-hover:text-[#2596be] transition-colors">{CATEGORY_ICONS[category]}</div>
                  <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">{category}</span>
                </div>
                <svg className={`w-4 h-4 text-slate-300 transition-transform ${collapsedCategories[category] ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"/></svg>
              </div>
              {!collapsedCategories[category] && (
                <div className="px-4 pb-4 space-y-2 border-t border-slate-50 pt-3">
                  {category === 'ENVIRONMENT' && (
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 mb-2 space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" checked={architectureChecked} onChange={(e) => setArchitectureChecked(e.target.checked)} className="w-4 h-4 rounded text-[#2596be] border-slate-300" />
                        <span className="text-[11px] font-bold text-slate-600 group-hover:text-slate-900 transition-colors">POV Architecture</span>
                      </label>
                      <label className="block w-full text-center px-3 py-2 border border-dashed border-slate-300 rounded-md text-[9px] font-black uppercase text-slate-500 hover:bg-white hover:border-[#2596be] hover:text-[#2596be] cursor-pointer transition-all">
                        {architectureImage ? 'Update Image' : 'Upload Image'}
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const r = new FileReader();
                            r.onload = (ev) => { setArchitectureImage(ev.target?.result as string); setArchitectureChecked(true); };
                            r.readAsDataURL(file);
                          }
                        }} />
                      </label>
                    </div>
                  )}
                  {category === 'REQUIRED PORTS' && (
                    <>
                      <button onClick={() => { setEditingPortIndex(null); setTempPort({ protocol: 'TCP' }); setActiveModal('custom-port'); }} className="w-full py-2 bg-slate-100 border border-slate-200 rounded-lg text-[9px] font-black uppercase text-slate-600 mb-2 hover:bg-slate-200 transition-colors">Add Custom Port</button>
                      {customPorts.length > 0 && (
                        <div className="mt-2 space-y-1.5 pb-2">
                          {customPorts.map((port, idx) => (
                            <div key={idx} className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-100 rounded-md group">
                              <div className="text-[10px] font-bold text-slate-600 truncate flex-1 pr-2">
                                <span className="text-slate-400 font-medium">{port.source}</span>
                                <span className="mx-1 text-[#2596be] font-black">→</span>
                                <span className="text-[#2596be] font-black">{port.protocol} {port.port}</span>
                                <span className="mx-1 text-[#2596be] font-black">→</span>
                                <span className="text-slate-400 font-medium">{port.destination}</span>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                <button 
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingPortIndex(idx);
                                    setTempPort({ ...port });
                                    setActiveModal('custom-port');
                                  }}
                                  className="p-0.5 text-slate-300 hover:text-[#2596be] transition-colors cursor-pointer"
                                  title="Edit Port"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                                </button>
                                <button 
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCustomPorts(prev => prev.filter((_, i) => i !== idx));
                                  }}
                                  className="p-0.5 text-slate-300 hover:text-red-500 transition-colors cursor-pointer"
                                  title="Delete Port"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  {category === 'SUCCESS CRITERIA' && (
                    <button onClick={() => { setEditingCriteriaIndex(null); setTempCriteria({ criteria: SUCCESS_CRITERIA_OPTIONS[0], completed: false, details: '' }); setActiveModal('criteria'); }} className="w-full py-2 bg-slate-100 border border-slate-200 rounded-lg text-[9px] font-black uppercase text-slate-600 mb-2 hover:bg-slate-200 transition-colors">Add Success Criteria</button>
                  )}
                  
                  {category !== 'SUCCESS CRITERIA' && sortedContentKeys.filter(k => allContent[k]?.category === category).map(key => (
                    <div key={key} className="flex items-center gap-3 group py-1 hover:bg-slate-50/50 rounded transition-colors">
                      <input type="checkbox" checked={checkedItems.includes(key)} onChange={() => setCheckedItems(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])} className="w-4 h-4 rounded text-[#2596be] border-slate-300 cursor-pointer" />
                      <span className="text-xs font-medium text-slate-600 flex-1 truncate">{allContent[key]?.label}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setEditingKey(key); setTempContent({ ...allContent[key] }); setActiveModal('content'); }} 
                          className="p-1 hover:text-[#2596be] text-slate-400 cursor-pointer transition-colors"
                          title="Edit Content"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); deleteLibraryItem(key); }} 
                          className="p-1 hover:text-red-600 text-slate-400 cursor-pointer transition-colors"
                          title="Delete Snippet"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6"/></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {category === 'SUCCESS CRITERIA' && sessionCriteria.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 py-1.5 group bg-slate-50 rounded-md px-2 border border-slate-100">
                      <div className="w-4 h-4 flex items-center justify-center text-[#2596be]"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg></div>
                      <span className="text-xs font-bold text-slate-600 flex-1 truncate">{c.criteria}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          type="button" 
                          onClick={() => {
                            setEditingCriteriaIndex(i);
                            setTempCriteria({ ...c });
                            setActiveModal('criteria');
                          }} 
                          className="p-1 hover:text-[#2596be] text-slate-400 transition-all cursor-pointer"
                          title="Edit Criteria"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setSessionCriteria(prev => prev.filter((_, idx) => idx !== i))} 
                          className="p-1 hover:text-red-600 text-slate-400 transition-all cursor-pointer"
                          title="Delete Criteria"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-slate-100 overflow-hidden relative">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">DOCUMENT PREVIEW</h2>
            {saveIndicator && <div className="px-2 py-0.5 bg-teal-50 text-[#2596be] text-[9px] font-black rounded uppercase">{saveIndicator}</div>}
          </div>
          <div className="flex gap-2">
            <button onClick={() => configInputRef.current?.click()} className="p-2 border rounded-lg hover:bg-slate-50" title="Load Session"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
            <button onClick={handleSaveConfig} className="p-2 border rounded-lg hover:bg-slate-50" title="Save Session"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
            <button onClick={handleExportWord} className="px-6 py-2 bg-slate-900 text-white text-[10px] font-black uppercase rounded-lg hover:bg-[#2596be] transition-all">EXPORT TO WORD</button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar flex flex-col items-center">
          <div id="preview-content" className="word-page bg-white w-full max-w-[850px] min-h-[1056px] p-20 border border-slate-200 relative mb-12 shadow-2xl">
            <div className="space-y-12">
              <div style={{ borderBottom: '3.5pt solid #1e293b', paddingBottom: '16pt', marginBottom: '32pt' }}>
                <table width="100%" border={0} cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse', border: 'none', width: '100%', tableLayout: 'auto' }}>
                  <tbody>
                    <tr>
                      <td align="left" valign="middle" style={{ border: 'none', padding: 0 }}>
                        <div style={{ fontSize: '32pt', fontWeight: 900, color: '#000000', margin: 0, textTransform: 'uppercase', lineHeight: '1.2' }}>
                          {povInfo.customerName || 'CUSTOMER'}
                        </div>
                      </td>
                      <td align="right" valign="middle" rowSpan={2} style={{ border: 'none', padding: 0, minWidth: '150px', textAlign: 'center' }}>
                        {povInfo.logo && (
                          <p style={{ margin: '0 0 8pt 0', padding: 0, textAlign: 'center' }}>
                            <img 
                              src={povInfo.logo} 
                              alt="Customer Logo" 
                              style={{ height: '72px', maxWidth: '300px', objectFit: 'contain', display: 'inline-block' }} 
                              height="72"
                            />
                          </p>
                        )}
                        {(povInfo.brandLogo || BRAND_LOGO_URL) && (
                          <p style={{ margin: 0, padding: 0, textAlign: 'center' }}>
                            <img 
                              src={povInfo.brandLogo || BRAND_LOGO_URL} 
                              alt="Brand Logo" 
                              style={{ height: '24px', objectFit: 'contain', display: 'inline-block' }} 
                              height="24"
                            />
                          </p>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td align="left" valign="top" style={{ border: 'none', padding: '2pt 0 0 0' }}>
                        <div style={{ fontSize: '11pt', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: '1.2' }}>
                          PROOF OF VALUE ENGAGEMENT DOCUMENT
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="space-y-6">
                <h2 style={{ fontSize: '18pt', fontWeight: 900, color: '#2596be', margin: '18pt 0 12pt 0', borderBottom: '2pt solid #2596be', paddingBottom: '4pt', textTransform: 'uppercase' }}>POV Details</h2>
                <table style={{ width: '100%', border: '1pt solid #cbd5e1', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '50%', padding: '15pt', verticalAlign: 'top', border: '1pt solid #cbd5e1' }}>
                        <p style={{ fontSize: '10pt', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '8pt', letterSpacing: '0.05em' }}>CRIBL TEAM</p>
                        <p style={{ fontSize: '10pt', margin: '4pt 0' }}><strong>RSM:</strong> {povInfo.rsmName || '-'}</p>
                        <p style={{ fontSize: '9pt', color: '#64748b', margin: '0 0 8pt 0' }}>{povInfo.rsmEmail || ''}</p>
                        <p style={{ fontSize: '10pt', margin: '4pt 0' }}><strong>Solution Engineer:</strong> {povInfo.seName || '-'}</p>
                        <p style={{ fontSize: '9pt', color: '#64748b', margin: '0' }}>{povInfo.seEmail || ''}</p>
                      </td>
                      <td style={{ width: '50%', padding: '15pt', verticalAlign: 'top', border: '1pt solid #cbd5e1' }}>
                        <p style={{ fontSize: '10pt', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '8pt', letterSpacing: '0.05em' }}>CUSTOMER TEAM</p>
                        <p style={{ fontSize: '10pt', margin: '4pt 0' }}><strong>Executive Sponsor:</strong> {povInfo.customerExecSponsor || '-'}</p>
                        <p style={{ fontSize: '9pt', color: '#64748b', margin: '0 0 8pt 0' }}>{povInfo.customerExecSponsorEmail || ''}</p>
                        <p style={{ fontSize: '10pt', margin: '4pt 0' }}><strong>Technical Lead:</strong> {povInfo.customerTechLead || '-'}</p>
                        <p style={{ fontSize: '9pt', color: '#64748b', margin: '0' }}>{povInfo.customerTechLeadEmail || ''}</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p style={{ fontSize: '10pt', color: '#1e293b', marginTop: '12pt' }}><strong>Kickoff Date:</strong> {formatDateForDoc(povInfo.kickoffDate)}</p>
              </div>

              {CATEGORIES.filter(c => c !== 'SUCCESS CRITERIA' && c !== 'REQUIRED PORTS').map(cat => {
                const items = checkedItems.filter(k => allContent[k]?.category === cat);
                const isEnv = cat === 'ENVIRONMENT';
                const hasPorts = isEnv && mergedPorts.length > 0;
                
                if (items.length === 0 && !hasPorts && !(cat === 'ENVIRONMENT' && architectureChecked)) return null;
                
                return (
                  <div key={cat} className="space-y-8 break-inside-avoid">
                    <h2 style={categoryHeaderStyle}>{cat}</h2>
                    {isEnv && architectureChecked && architectureImage && (
                      <div className="space-y-6">
                        <h3 style={subHeaderStyle}>POV Architecture</h3>
                        <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
                          <img 
                            src={architectureImage} 
                            alt="POV Architecture" 
                            style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain', display: 'inline-block' }} 
                          />
                        </div>
                      </div>
                    )}
                    
                    {isEnv && mergedPorts.length > 0 && (
                      <div className="space-y-4 pt-4">
                        <h3 style={subHeaderStyle}>Required Ports</h3>
                        <table style={{ width: '100%', border: '1pt solid #cbd5e1', borderCollapse: 'collapse' }}>
                          <thead style={{ backgroundColor: '#0f172a' }}>
                            <tr>
                              <th style={{ color: '#fff', padding: '10pt', fontSize: '9pt', textAlign: 'left' }}>Source</th>
                              <th style={{ color: '#fff', padding: '10pt', fontSize: '9pt', textAlign: 'left' }}>Destination</th>
                              <th style={{ color: '#fff', padding: '10pt', fontSize: '9pt', textAlign: 'left' }}>Port</th>
                              <th style={{ color: '#fff', padding: '10pt', fontSize: '9pt', textAlign: 'left' }}>Purpose</th>
                            </tr>
                          </thead>
                          <tbody>
                            {mergedPorts.map((p, i) => (
                              <tr key={i}>
                                <td style={{ border: '1pt solid #cbd5e1', padding: '8pt', fontSize: '9pt' }}>{p.source}</td>
                                <td style={{ border: '1pt solid #cbd5e1', padding: '8pt', fontSize: '9pt' }}>{p.destination}</td>
                                <td style={{ border: '1pt solid #cbd5e1', padding: '8pt', fontSize: '9pt' }}>{p.protocol ? `${p.protocol} ` : ''}{p.port}</td>
                                <td style={{ border: '1pt solid #cbd5e1', padding: '8pt', fontSize: '9pt' }}>{p.purpose}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {items.map(k => (
                      <div key={k} className="space-y-4">
                        <h3 style={subHeaderStyle}>{allContent[k].title}</h3>
                        <div dangerouslySetInnerHTML={{ __html: formatContent(allContent[k].content) }} />
                      </div>
                    ))}
                  </div>
                );
              })}

              {sessionCriteria.length > 0 && (
                <div className="space-y-8 break-inside-avoid">
                  <h2 style={categoryHeaderStyle}>SUCCESS CRITERIA</h2>
                  <table style={{ width: '100%', border: '1pt solid #cbd5e1', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#0f172a' }}>
                      <tr>
                        <th style={{ color: '#fff', padding: '10pt', fontSize: '9pt', textAlign: 'left', width: '30%' }}>Success Criteria</th>
                        <th style={{ color: '#fff', padding: '10pt', fontSize: '9pt', textAlign: 'left', width: '60%' }}>Details</th>
                        <th style={{ color: '#fff', padding: '10pt', fontSize: '9pt', textAlign: 'center', width: '10%' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessionCriteria.map((c, i) => (
                        <tr key={i}>
                          <td style={{ border: '1pt solid #cbd5e1', padding: '10pt', fontSize: '9pt', fontWeight: 'bold' }}>{c.criteria}</td>
                          <td style={{ border: '1pt solid #cbd5e1', padding: '10pt', fontSize: '9pt' }}>{c.details}</td>
                          <td style={{ border: '1pt solid #cbd5e1', padding: '10pt', textAlign: 'center', fontSize: '12pt' }}>{c.completed ? '☑' : '☐'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {activeModal === 'content' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setActiveModal(null); setShowContentHelp(false); }}>
          <div className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-slate-200 relative" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b bg-slate-50 flex justify-between items-center"><h3 className="font-black uppercase text-slate-900">{editingKey ? 'Edit Content' : 'Add Content'}</h3><button onClick={() => { setActiveModal(null); setShowContentHelp(false); }} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">✕</button></div>
            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <FormField label="Category" required>
                <select className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 font-bold uppercase text-xs" value={tempContent.category} onChange={e => setTempContent({...tempContent, category: e.target.value as CategoryType})}>
                  {CATEGORIES.filter(cat => cat !== 'SUCCESS CRITERIA').map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </FormField>
              <FormField label="Checkbox Label" required><input type="text" className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50" value={tempContent.label || ''} onChange={e => setTempContent({...tempContent, label: e.target.value})} /></FormField>
              <FormField label="Document Title" required><input type="text" className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 font-black" value={tempContent.title || ''} onChange={e => setTempContent({...tempContent, title: e.target.value})} /></FormField>
              <FormField label="Content" help="Format Guide" onHelpClick={() => setShowContentHelp(!showContentHelp)}><textarea rows={6} className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 font-mono text-sm outline-none resize-none focus:ring-2 focus:ring-[#2596be]" value={tempContent.content || ''} onChange={e => setTempContent({...tempContent, content: e.target.value})} /></FormField>
            </div>
            <div className="p-8 bg-slate-50 border-t"><button onClick={saveLibraryItem} className="w-full py-4 bg-[#2596be] text-white font-black uppercase tracking-widest rounded-xl hover:bg-[#1a7696] shadow-lg transition-all active:scale-95">{editingKey ? 'Update Content' : 'Save Content'}</button></div>
            
            {showContentHelp && (
              <div className="absolute inset-0 z-[110] bg-white flex flex-col">
                <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
                  <h4 className="font-black uppercase text-[#2596be] tracking-widest">Formatting Guide</h4>
                </div>
                <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                  <pre className="text-sm font-medium text-slate-700 whitespace-pre-wrap font-sans academic-relaxed">
                    {HELP_TEXT}
                  </pre>
                </div>
                <div className="p-8 bg-slate-50 border-t">
                  <button onClick={() => setShowContentHelp(false)} className="w-full py-4 bg-slate-900 text-white font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 shadow-lg transition-all">Back to Editor</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeModal === 'pov-info' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setActiveModal(null); }}>
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] p-10 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-8"><div><h3 className="text-3xl font-black uppercase text-slate-900">POV Details</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Document Settings</p></div><button onClick={() => setActiveModal(null)} className="p-3 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-400">✕</button></div>
            <div className="space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Customer Name"><input type="text" className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 font-bold" value={povInfo.customerName} onChange={e => setPovInfo({...povInfo, customerName: e.target.value})} /></FormField>
                <FormField label="Start Date"><input type="date" className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50" value={povInfo.kickoffDate} onChange={e => setPovInfo({...povInfo, kickoffDate: e.target.value})} /></FormField>
              </div>
              
              <SectionHeader title="Branding" />
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-full h-24 bg-white border border-slate-200 rounded-xl flex items-center justify-center overflow-hidden shadow-sm">
                    {povInfo.logo ? (
                      <img src={povInfo.logo} className="max-w-[80%] max-h-[80%] object-contain" alt="Customer Preview" />
                    ) : (
                      <div className="text-[9px] text-slate-300 font-bold uppercase">Customer Logo</div>
                    )}
                  </div>
                  <FormField label="Customer Logo">
                    <label className="block w-full text-center px-4 py-3 bg-white border border-dashed border-slate-300 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:border-[#2596be] hover:text-[#2596be] cursor-pointer transition-all shadow-sm">
                      {povInfo.logo ? 'Change' : 'Upload'}
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const r = new FileReader();
                          r.onload = (ev) => { setPovInfo({...povInfo, logo: ev.target?.result as string}); };
                          r.readAsDataURL(file);
                        }
                      }} />
                    </label>
                  </FormField>
                  {povInfo.logo && <button onClick={() => setPovInfo({...povInfo, logo: null})} className="text-[9px] font-bold text-red-500 uppercase hover:underline text-center">Remove</button>}
                </div>

                <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-full h-24 bg-white border border-slate-200 rounded-xl flex items-center justify-center overflow-hidden shadow-sm">
                    {povInfo.brandLogo ? (
                      <img src={povInfo.brandLogo} className="max-w-[80%] max-h-[80%] object-contain" alt="Brand Preview" />
                    ) : (
                      <div className="text-[9px] text-slate-300 font-bold uppercase">Brand Logo</div>
                    )}
                  </div>
                  <FormField label="Brand Logo">
                    <label className="block w-full text-center px-4 py-3 bg-white border border-dashed border-slate-300 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:border-[#2596be] hover:text-[#2596be] cursor-pointer transition-all shadow-sm">
                      {povInfo.brandLogo ? 'Change' : 'Upload'}
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const r = new FileReader();
                          r.onload = (ev) => { setPovInfo({...povInfo, brandLogo: ev.target?.result as string}); };
                          r.readAsDataURL(file);
                        }
                      }} />
                    </label>
                  </FormField>
                  {povInfo.brandLogo && <button onClick={() => setPovInfo({...povInfo, brandLogo: null})} className="text-[9px] font-bold text-red-500 uppercase hover:underline text-center">Remove</button>}
                </div>
              </div>

              <SectionHeader title="Cribl Team" />
              <div className="grid grid-cols-2 gap-4">
                <FormField label="RSM Name"><input type="text" className="w-full p-4 border rounded-xl" value={povInfo.rsmName} onChange={e => setPovInfo({...povInfo, rsmName: e.target.value})} /></FormField>
                <FormField label="RSM Email"><input type="email" className="w-full p-4 border rounded-xl" value={povInfo.rsmEmail} onChange={e => setPovInfo({...povInfo, rsmEmail: e.target.value})} /></FormField>
                <FormField label="SE Name"><input type="text" className="w-full p-4 border rounded-xl" value={povInfo.seName} onChange={e => setPovInfo({...povInfo, seName: e.target.value})} /></FormField>
                <FormField label="SE Email"><input type="email" className="w-full p-4 border rounded-xl" value={povInfo.seEmail} onChange={e => setPovInfo({...povInfo, seEmail: e.target.value})} /></FormField>
              </div>

              <SectionHeader title="Customer Team" />
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Executive Sponsor Name"><input type="text" className="w-full p-4 border rounded-xl" value={povInfo.customerExecSponsor} onChange={e => setPovInfo({...povInfo, customerExecSponsor: e.target.value})} /></FormField>
                <FormField label="Executive Sponsor Email"><input type="email" className="w-full p-4 border rounded-xl" value={povInfo.customerExecSponsorEmail} onChange={e => setPovInfo({...povInfo, customerExecSponsorEmail: e.target.value})} /></FormField>
                <FormField label="Technical Lead Name"><input type="text" className="w-full p-4 border rounded-xl" value={povInfo.customerTechLead} onChange={e => setPovInfo({...povInfo, customerTechLead: e.target.value})} /></FormField>
                <FormField label="Technical Lead Email"><input type="email" className="w-full p-4 border rounded-xl" value={povInfo.customerTechLeadEmail} onChange={e => setPovInfo({...povInfo, customerTechLeadEmail: e.target.value})} /></FormField>
              </div>
            </div>
            <button onClick={() => setActiveModal(null)} className="w-full py-6 bg-[#2596be] text-white font-black uppercase tracking-widest rounded-3xl mt-8 shadow-xl hover:bg-[#1a7696] transition-all active:scale-[0.98]">Save Details</button>
          </div>
        </div>
      )}

      {activeModal === 'criteria' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setActiveModal(null); setEditingCriteriaIndex(null); }}>
          <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-slate-200" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b bg-slate-50 flex justify-between items-center"><h3 className="font-black uppercase text-slate-900">{editingCriteriaIndex !== null ? 'EDIT SUCCESS CRITERIA' : 'ADD SUCCESS CRITERIA'}</h3><button onClick={() => { setActiveModal(null); setEditingCriteriaIndex(null); }} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">✕</button></div>
            <div className="p-8 space-y-4">
              <FormField label="Success Criteria">
                <div className="w-[70%]">
                  <select className="w-full p-3 border rounded-xl font-bold bg-white" value={tempCriteria.criteria} onChange={e => setTempCriteria({...tempCriteria, criteria: e.target.value})}>
                    {SUCCESS_CRITERIA_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
                  </select>
                </div>
              </FormField>
              <FormField label="Details"><textarea rows={4} className="w-full p-3 border rounded-xl bg-slate-50 resize-none outline-none focus:ring-2 focus:ring-[#2596be]" value={tempCriteria.details || ''} onChange={e => setTempCriteria({...tempCriteria, details: e.target.value})} /></FormField>
              <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-50 rounded-lg transition-colors"><input type="checkbox" checked={tempCriteria.completed} onChange={e => setTempCriteria({...tempCriteria, completed: e.target.checked})} className="w-5 h-5 rounded text-[#2596be]" /><span className="text-xs font-bold uppercase text-slate-500">Mark as Completed</span></label>
            </div>
            <div className="p-8 bg-slate-50 border-t">
              <button 
                onClick={() => { 
                  if (editingCriteriaIndex !== null) {
                    setSessionCriteria(prev => prev.map((c, i) => i === editingCriteriaIndex ? (tempCriteria as SuccessCriteria) : c));
                  } else {
                    setSessionCriteria([...sessionCriteria, tempCriteria as SuccessCriteria]); 
                  }
                  setTempCriteria({ criteria: SUCCESS_CRITERIA_OPTIONS[0], completed: false, details: '' }); 
                  setEditingCriteriaIndex(null);
                  setActiveModal(null); 
                }} 
                className="w-full py-4 bg-[#2596be] text-white font-black uppercase rounded-xl hover:bg-[#1a7696] transition-all active:scale-95 shadow-lg"
              >
                {editingCriteriaIndex !== null ? 'Update Success Criteria' : 'Add Success Criteria'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'custom-port' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setActiveModal(null); setEditingPortIndex(null); }}>
          <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-slate-200" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b bg-slate-50 flex justify-between items-center"><h3 className="font-black uppercase text-slate-900">{editingPortIndex !== null ? 'EDIT CUSTOM PORT' : 'ADD CUSTOM PORT'}</h3><button onClick={() => { setActiveModal(null); setEditingPortIndex(null); }} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">✕</button></div>
            <div className="p-8 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Source" required><input type="text" className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50" value={tempPort.source || ''} placeholder="e.g. Edge Node" onChange={e => setTempPort({...tempPort, source: e.target.value})} /></FormField>
                <FormField label="Destination" required><input type="text" className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50" value={tempPort.destination || ''} placeholder="e.g. Cribl Stream" onChange={e => setTempPort({...tempPort, destination: e.target.value})} /></FormField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Protocol" required>
                  <select 
                    className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 font-bold" 
                    value={tempPort.protocol} 
                    onChange={e => setTempPort({...tempPort, protocol: e.target.value})}
                  >
                    <option value="TCP">TCP</option>
                    <option value="UDP">UDP</option>
                    <option value="HTTP">HTTP</option>
                    <option value="HTTPS">HTTPS</option>
                  </select>
                </FormField>
                <FormField label="Port Number" required>
                  <input 
                    type="text" 
                    className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50" 
                    value={tempPort.port || ''} 
                    placeholder="e.g. 6514" 
                    onChange={e => setTempPort({...tempPort, port: e.target.value})} 
                  />
                </FormField>
              </div>
              <FormField label="Purpose"><input type="text" className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50" value={tempPort.purpose || ''} placeholder="e.g. Syslog Over TLS" onChange={e => setTempPort({...tempPort, purpose: e.target.value})} /></FormField>
            </div>
            <div className="p-8 bg-slate-50 border-t">
              <button 
                onClick={() => { 
                  if (!tempPort.source || !tempPort.destination || !tempPort.port) {
                    alert("Source, Destination, and Port are required.");
                    return;
                  }
                  if (editingPortIndex !== null) {
                    setCustomPorts(prev => prev.map((p, i) => i === editingPortIndex ? (tempPort as CustomPort) : p));
                  } else {
                    setCustomPorts([...customPorts, { ...tempPort } as CustomPort]); 
                  }
                  setTempPort({ protocol: 'TCP' }); 
                  setEditingPortIndex(null);
                  setActiveModal(null); 
                }} 
                className="w-full py-4 bg-[#2596be] text-white font-black uppercase rounded-xl hover:bg-[#1a7696] transition-all active:scale-95 shadow-lg"
              >
                {editingPortIndex !== null ? 'Update Port Requirement' : 'Add Port Requirement'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showResetConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm" onClick={() => setShowResetConfirm(false)}>
          <div className="bg-white p-8 rounded-[2rem] shadow-2xl border border-red-100 max-w-xs w-full text-center" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <h4 className="font-black text-slate-900 uppercase mb-2">Clear Document?</h4>
            <p className="text-xs text-slate-500 mb-6">This will reset all current session data including customer info and checkboxes.</p>
            <div className="flex gap-2">
              <button onClick={handleResetSession} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-all">RESET</button>
              <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all">CANCEL</button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'delete-snippet' && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => { setActiveModal(null); setPendingDeleteKey(null); }}>
          <div className="bg-white p-8 rounded-[2rem] shadow-2xl border border-red-100 max-w-xs w-full text-center" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <h4 className="font-black text-slate-900 uppercase mb-2">Delete Content?</h4>
            <p className="text-xs text-slate-500 mb-6">Are you sure you want to remove this content from your library? This action cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={confirmDeleteSnippet} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-all">DELETE</button>
              <button onClick={() => { setActiveModal(null); setPendingDeleteKey(null); }} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all">CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;