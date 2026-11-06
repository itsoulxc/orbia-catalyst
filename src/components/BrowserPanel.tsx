import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Copy, ExternalLink, Globe2, Plus, RefreshCw, ShieldCheck, X, ZoomIn, ZoomOut } from 'lucide-react';

interface BrowserTab {
  id: string;
  title: string;
  url: string;
  history: string[];
  historyIndex: number;
}

const HOME_URL = 'https://www.google.com';

function normalizeUrl(input: string): string {
  const value = input.trim();
  if (!value) return HOME_URL;
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(value)) return value;
  if (/^(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i.test(value)) return `http://${value}`;
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(value)) return `https://${value}`;
  return `https://www.google.com/search?q=${encodeURIComponent(value)}`;
}

export const BrowserPanel: React.FC<{ requestedUrl?: string; isOpen: boolean; onClose: () => void }> = ({ requestedUrl, isOpen, onClose }) => {
  const [tabs, setTabs] = useState<BrowserTab[]>([{ id: 'tab-1', title: 'New tab', url: HOME_URL, history: [HOME_URL], historyIndex: 0 }]);
  const [activeId, setActiveId] = useState('tab-1');
  const [address, setAddress] = useState(HOME_URL);
  const [reloadKey, setReloadKey] = useState(0);
  const [zoom, setZoom] = useState(100);
  const activeTab = tabs.find((tab) => tab.id === activeId) || tabs[0];

  const navigate = (value = address) => {
    const url = normalizeUrl(value);
    setAddress(url);
    setTabs((current) => current.map((tab) => {
      if (tab.id !== activeId) return tab;
      const history = [...tab.history.slice(0, tab.historyIndex + 1), url];
      return { ...tab, url, title: new URL(url).hostname, history, historyIndex: history.length - 1 };
    }));
  };

  const newTab = () => {
    const id = `tab-${Date.now()}`;
    setTabs((current) => [...current, { id, title: 'New tab', url: HOME_URL, history: [HOME_URL], historyIndex: 0 }]);
    setActiveId(id);
    setAddress(HOME_URL);
  };

  const closeTab = (id: string) => {
    if (tabs.length === 1) return;
    const next = tabs.filter((tab) => tab.id !== id);
    const nextActive = id === activeId ? next[Math.max(0, tabs.findIndex((tab) => tab.id === id) - 1)] : activeTab;
    setTabs(next);
    setActiveId(nextActive.id);
    setAddress(nextActive.url);
  };

  const selectTab = (tab: BrowserTab) => {
    setActiveId(tab.id);
    setAddress(tab.url);
  };

  const stepHistory = (direction: -1 | 1) => {
    const tab = tabs.find((item) => item.id === activeId);
    if (!tab) return;
    const index = Math.max(0, Math.min(tab.history.length - 1, tab.historyIndex + direction));
    if (index === tab.historyIndex) return;
    const url = tab.history[index];
    setTabs((current) => current.map((item) => item.id === activeId ? { ...item, url, title: new URL(url).hostname, historyIndex: index } : item));
    setAddress(url);
  };

  const tabIndex = useMemo(() => tabs.findIndex((tab) => tab.id === activeId), [tabs, activeId]);

  useEffect(() => {
    if (requestedUrl && requestedUrl !== activeTab.url) navigate(requestedUrl);
  }, [requestedUrl]);

  const copyAddress = async () => {
    await navigator.clipboard.writeText(activeTab.url);
  };

  if (!isOpen) return null;

  return (
    <aside className="browser-drawer panel-enter">
      <div className="browser-drawer-head"><div><span className="browser-drawer-kicker"><Globe2 size={12} /> CATALYST BROWSER</span><strong>Browse beside your work</strong></div><button type="button" className="icon-btn-sm" onClick={onClose} title="Close browser"><X size={15} /></button></div>
      <div className="browser-panel">
      <div className="browser-tab-strip">
        {tabs.map((tab) => (
          <button type="button" key={tab.id} className={`browser-tab ${tab.id === activeId ? 'active' : ''}`} onClick={() => selectTab(tab)}>
            <Globe2 size={12} /><span>{tab.title}</span>
            {tabs.length > 1 && <X size={12} onClick={(event) => { event.stopPropagation(); closeTab(tab.id); }} />}
          </button>
        ))}
        <button type="button" className="browser-new-tab" onClick={newTab} title="New browser tab"><Plus size={14} /></button>
      </div>
      <div className="browser-toolbar">
        <div className="browser-nav-actions">
          <button type="button" className="icon-btn-sm" onClick={() => stepHistory(-1)} disabled={activeTab.historyIndex === 0} title="Back"><ArrowLeft size={14} /></button>
          <button type="button" className="icon-btn-sm" onClick={() => stepHistory(1)} disabled={activeTab.historyIndex >= activeTab.history.length - 1} title="Forward"><ArrowRight size={14} /></button>
          <button type="button" className="icon-btn-sm" onClick={() => setReloadKey((value) => value + 1)} title="Reload"><RefreshCw size={14} /></button>
        </div>
        <form className="browser-address" onSubmit={(event) => { event.preventDefault(); navigate(); }}>
          <ShieldCheck size={13} className="browser-secure-icon" />
          <input value={address} onChange={(event) => setAddress(event.target.value)} aria-label="Browser address" spellCheck={false} />
        </form>
        <span className="browser-tab-counter">{tabIndex + 1} / {tabs.length}</span>
        <button type="button" className="icon-btn-sm" onClick={() => setZoom((value) => Math.max(60, value - 10))} title="Zoom out"><ZoomOut size={14} /></button>
        <span className="browser-zoom-label">{zoom}%</span>
        <button type="button" className="icon-btn-sm" onClick={() => setZoom((value) => Math.min(160, value + 10))} title="Zoom in"><ZoomIn size={14} /></button>
        <button type="button" className="icon-btn-sm" onClick={() => void copyAddress()} title="Copy address"><Copy size={14} /></button>
        <button type="button" className="icon-btn-sm" onClick={() => window.open(activeTab.url, '_blank', 'noopener,noreferrer')} title="Open in system browser"><ExternalLink size={14} /></button>
      </div>
      <div className="browser-frame-wrap">
        <iframe key={`${activeTab.id}-${reloadKey}`} title={`Catalyst Browser: ${activeTab.title}`} src={activeTab.url} className="browser-frame" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left', width: `${10000 / zoom}%`, height: `${10000 / zoom}%` }} />
      </div>
      <div className="browser-statusbar"><Globe2 size={12} /> <span>In-app browser</span><span className="browser-status-note">Some sites may block embedded viewing; use the address bar or open the link externally.</span></div>
      </div>
    </aside>
  );
};
