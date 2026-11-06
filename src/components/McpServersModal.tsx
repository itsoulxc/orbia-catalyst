import React, { useState } from 'react';
import {
  X,
  Server,
  Plus,
  Radio,
  Terminal,
  ShieldCheck
} from 'lucide-react';
import type { McpServerConfig } from '../types/catalyst';

interface McpServersModalProps {
  isOpen: boolean;
  onClose: () => void;
  servers: McpServerConfig[];
  onToggleServer: (id: string) => void;
  onAddServer: (server: Omit<McpServerConfig, 'id' | 'status' | 'toolsCount'>) => void;
}

export const McpServersModal: React.FC<McpServersModalProps> = ({
  isOpen,
  onClose,
  servers,
  onToggleServer,
  onAddServer
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [transport, setTransport] = useState<'stdio' | 'sse'>('stdio');
  const [commandOrUrl, setCommandOrUrl] = useState('');

  if (!isOpen) return null;

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !commandOrUrl.trim()) return;

    onAddServer({
      name: name.trim(),
      transport,
      commandOrUrl: commandOrUrl.trim(),
      enabled: true
    });

    setIsAdding(false);
    setName('');
    setCommandOrUrl('');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="mcp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mcp-modal-header">
          <div className="mcp-modal-title-group">
            <Server size={18} className="text-amber" />
            <div>
              <h2 className="mcp-modal-title">Model Context Protocol (MCP)</h2>
              <p className="mcp-modal-subtitle">
                Connect external toolchains, DirectStorage bridges, and game engines into Catalyst
              </p>
            </div>
          </div>

          <div className="mcp-modal-header-actions">
            {!isAdding && (
              <button
                className="btn-primary btn-sm"
                onClick={() => setIsAdding(true)}
              >
                <Plus size={13} />
                <span>Add MCP Server</span>
              </button>
            )}
            <button className="icon-btn" onClick={onClose} title="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        {isAdding ? (
          <form className="mcp-add-form" onSubmit={handleAddSubmit}>
            <div className="form-section-title">
              <Plus size={14} className="text-amber" />
              <span>Register MCP Tool Provider</span>
            </div>

            <div className="form-row">
              <div className="form-group flex-1">
                <label>Server Name</label>
                <input
                  type="text"
                  placeholder="e.g. Unreal Engine 5 Bridge"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input"
                  required
                  autoFocus
                />
              </div>
              <div className="form-group flex-1">
                <label>Transport Protocol</label>
                <select
                  className="form-select"
                  value={transport}
                  onChange={(e) => setTransport(e.target.value as any)}
                >
                  <option value="stdio">Local Process (stdio)</option>
                  <option value="sse">Network SSE (Server-Sent Events)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Execution Command or SSE URL</label>
              <input
                type="text"
                placeholder={
                  transport === 'stdio'
                    ? 'e.g. node ./mcp/unreal-bridge.js or python server.py'
                    : 'http://localhost:8000/sse'
                }
                value={commandOrUrl}
                onChange={(e) => setCommandOrUrl(e.target.value)}
                className="form-input mono"
                required
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsAdding(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Connect Server
              </button>
            </div>
          </form>
        ) : (
          <div className="mcp-servers-list">
            {servers.map((srv) => (
              <div
                key={srv.id}
                className={`mcp-server-card ${srv.enabled ? 'enabled' : 'disabled'}`}
              >
                <div className="mcp-server-top">
                  <div className="mcp-server-name-group">
                    <span className="mcp-server-name">{srv.name}</span>
                    <span className="mcp-transport-tag">
                      <Terminal size={10} /> {srv.transport.toUpperCase()}
                    </span>
                  </div>

                  <div className="mcp-server-status-pill">
                    <Radio
                      size={11}
                      className={srv.status === 'connected' ? 'text-emerald' : 'text-muted'}
                    />
                    <span className="mcp-status-text">
                      {srv.status === 'connected' ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                </div>

                <div className="mcp-command-box mono">{srv.commandOrUrl}</div>

                <div className="mcp-server-footer">
                  <span className="mcp-tools-count">
                    <ShieldCheck size={12} className="text-amber" />
                    <span>{srv.toolsCount} Tools Exposed</span>
                  </span>

                  <button
                    className={`mcp-toggle-btn ${srv.enabled ? 'on' : 'off'}`}
                    onClick={() => onToggleServer(srv.id)}
                  >
                    {srv.enabled ? 'Active' : 'Muted'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
