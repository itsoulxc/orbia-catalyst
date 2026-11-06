import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Sparkles,
  RotateCcw,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Cpu
} from 'lucide-react';
import type { SideChatMessage, CatalystModelInfo } from '../types/catalyst';
import { chatService } from '../services/chatService';
import { MarkdownCodeRenderer } from './MarkdownCodeRenderer';
import { orderModelsForPicker } from '../services/storageService';

interface SideChatProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  models: CatalystModelInfo[];
  onOpenLink?: (url: string) => void;
}

export const SideChat: React.FC<SideChatProps> = ({
  isOpen,
  onClose,
  projectName,
  models
  , onOpenLink
}) => {
  const [messages, setMessages] = useState<SideChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string>(
    models.find((m) => m.id === 'spark-2.0')?.id || models[0]?.id || 'spark-2.0'
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const orderedModels = orderModelsForPicker(models);

  const scrollRef = useRef<HTMLDivElement>(null);
  const activeModel = models.find((m) => m.id === selectedModelId) || models[0];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  if (!isOpen) return null;

  const handleSend = async (overrideText?: string) => {
    const textToSend = (overrideText ?? input).trim();
    if (!textToSend || isTyping) return;

    if (!overrideText) setInput('');

    const userMsg: SideChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: 'Just now'
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    const tempAssistantId = `asst-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempAssistantId,
        role: 'assistant',
        content: '',
        timestamp: 'Streaming...'
      }
    ]);

    await chatService.sendSideChatMessage(
      textToSend,
      selectedModelId,
      messages,
      (partial) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempAssistantId ? { ...m, content: partial } : m))
        );
      }
    );

    setMessages((prev) =>
      prev.map((m) => (m.id === tempAssistantId ? { ...m, timestamp: 'Just now' } : m))
    );
    setIsTyping(false);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <aside className={`side-chat-drawer ${isExpanded ? 'expanded' : ''}`}>
      {/* Header */}
      <div className="side-chat-header">
        <div className="side-chat-header-left">
          <div className="side-chat-model-selector-wrap">
            <button
              type="button"
              className="side-chat-model-badge"
              onClick={() => setShowModelPicker(!showModelPicker)}
            >
              <Cpu size={12} className="text-amber" />
              <span>{activeModel.shortName}</span>
              <ChevronDown size={11} />
            </button>

            {showModelPicker && (
              <div className="dropdown-menu down side-model-dropdown">
                {orderedModels.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`dropdown-item ${m.id === selectedModelId ? 'selected' : ''}`}
                    disabled={m.downloadStatus !== 'ready'}
                    onClick={() => {
                      setSelectedModelId(m.id);
                      setShowModelPicker(false);
                    }}
                  >
                    <span>{m.name}</span>
                    {m.id === selectedModelId && <span className="text-amber">&#10003;</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="side-chat-proj-tag">
            {projectName || 'Workspace'}
          </span>
        </div>

        <div className="side-chat-actions">
          <button
            type="button"
            className="icon-btn-sm"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse width' : 'Expand width'}
          >
            {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
          <button
            type="button"
            className="icon-btn-sm"
            onClick={() => setMessages([])}
            title="Clear side chat"
          >
            <RotateCcw size={13} />
          </button>
          <button
            type="button"
            className="icon-btn-sm"
            onClick={onClose}
            title="Close side chat"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Quick Prompts Strip */}
      <div className="side-chat-quick-strip">
        <button
          type="button"
          className="quick-chip"
          onClick={() => handleSend('Suggest 3 innovative game mechanics for an indie project')}
        >
          <Sparkles size={11} /> Game Mechanics
        </button>
        <button
          type="button"
          className="quick-chip"
          onClick={() => handleSend('Create a complete playable HTML5 canvas game prototype')}
        >
          <Sparkles size={11} /> Canvas Prototype
        </button>
        <button
          type="button"
          className="quick-chip"
          onClick={() => handleSend('Write an optimal 2D AABB spatial partition in JavaScript')}
        >
          <Sparkles size={11} /> Fast AABB
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="side-chat-messages">
        {messages.length === 0 ? (
          <div className="side-chat-empty">
            <Sparkles size={20} className="text-amber" />
            <p>
              Side Chat powered by <strong>{activeModel.name}</strong> with full multi-turn conversation memory.
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`ag-turn ${m.role} side-turn`}>
              {m.role === 'user' ? (
                <div className="ag-user-bubble side-user-bubble">{m.content}</div>
              ) : (
                <div className="ag-assistant-block side-assistant-block">
                  <div className="ag-worked-header">
                    <span className="ag-worked-label">
                      <span>{activeModel.shortName}</span>
                      <ChevronRight size={11} />
                    </span>
                  </div>

                  <MarkdownCodeRenderer content={m.content || '...'} onOpenLink={onOpenLink} />

                  <div className="ag-turn-footer">
                    <span className="ag-turn-time">{m.timestamp}</span>
                    {m.content && (
                      <button
                        type="button"
                        className="ag-footer-icon-btn"
                        onClick={() => handleCopy(m.id, m.content)}
                        title="Copy answer"
                      >
                        {copiedId === m.id ? (
                          <Check size={12} className="text-emerald" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {isTyping && (
          <div className="ag-turn assistant side-turn">
            <div className="ag-worked-header">
              <span className="ag-worked-label">
                <span className="pulse-dot active" />
                <span>Thinking...</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input Composer */}
      <div className="side-chat-composer">
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={`Ask ${activeModel.shortName} for game ideas, code, syntax...`}
          className="side-chat-input"
          spellCheck={false}
        />
        <button
          type="button"
          className="side-chat-send"
          onClick={() => handleSend()}
          disabled={!input.trim() || isTyping}
        >
          <Send size={13} />
        </button>
      </div>
    </aside>
  );
};
