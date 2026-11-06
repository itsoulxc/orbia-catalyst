import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowDown, ArrowUp, FileCode2, FolderOpen, GitBranch, GitCompare, Loader2, Search, RefreshCw, ShieldCheck } from 'lucide-react';

interface WorkspacePanelProps {
  projectPath: string;
}

interface WorkspaceFileResponse {
  file: string;
  size: number;
  content: string;
}

interface GitStatus {
  connected: boolean;
  branch?: string;
  remote?: string;
  dirty?: boolean;
  changes?: string[];
  message?: string;
}

export const WorkspacePanel: React.FC<WorkspacePanelProps> = ({ projectPath }) => {
  const [files, setFiles] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [git, setGit] = useState<GitStatus | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [branch, setBranch] = useState('');
  const [diff, setDiff] = useState('');
  const [showDiff, setShowDiff] = useState(false);

  const loadWorkspace = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`http://127.0.0.1:8008/api/projects/inspect?path=${encodeURIComponent(projectPath)}`);
      if (!response.ok) throw new Error('Local engine did not return a workspace inventory.');
      const data = await response.json();
      setFiles(Array.isArray(data.files) ? data.files : []);
      const gitResponse = await fetch(`http://127.0.0.1:8008/api/github/status?path=${encodeURIComponent(projectPath)}`);
      const gitData = await gitResponse.json();
      setGit(gitData);
      setBranch(gitData.branch || '');
      if (gitData.connected) {
        const branchResponse = await fetch(`http://127.0.0.1:8008/api/github/branches?path=${encodeURIComponent(projectPath)}`);
        const branchData = await branchResponse.json();
        setBranches(Array.isArray(branchData.branches) ? branchData.branches : []);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Workspace inventory unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadWorkspace(); }, [projectPath]);

  const visibleFiles = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized ? files.filter((file) => file.toLowerCase().includes(normalized)) : files;
  }, [files, query]);

  const openFile = async (file: string) => {
    setSelectedFile(file);
    setContent('');
    setError('');
    try {
      const response = await fetch(`http://127.0.0.1:8008/api/workspace/read?path=${encodeURIComponent(projectPath)}&file=${encodeURIComponent(file)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'File could not be read.');
      setContent((data as WorkspaceFileResponse).content);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'File preview unavailable.');
    }
  };

  const switchBranch = async () => {
    if (!branch || branch === git?.branch) return;
    const confirmed = window.confirm(`Switch the workspace to branch "${branch}"? Unsaved changes may prevent the switch.`);
    if (!confirmed) return;
    const response = await fetch('http://127.0.0.1:8008/api/github/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: projectPath, branch, confirm: true })
    });
    const data = await response.json();
    if (!response.ok || !data.ok) setError(data.output || data.detail || 'Branch switch failed.');
    else void loadWorkspace();
  };

  const loadDiff = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8008/api/workspace/diff?path=${encodeURIComponent(projectPath)}`);
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'Could not read Git diff.');
      setDiff(data.diff || 'No uncommitted changes.');
      setShowDiff(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Diff unavailable.');
    }
  };

  const syncGit = async (action: 'pull' | 'push') => {
    if (!window.confirm(`${action === 'pull' ? 'Pull from' : 'Push to'} the configured GitHub remote?`)) return;
    const response = await fetch('http://127.0.0.1:8008/api/github/sync', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: projectPath, action, confirm: true })
    });
    const data = await response.json();
    if (!response.ok || !data.ok) setError(data.output || data.detail || `Git ${action} failed.`);
    else void loadWorkspace();
  };

  return (
    <div className="workspace-panel panel-enter workspace-surface">
      <div className="workspace-panel-header">
        <div>
          <div className="workspace-eyebrow"><FolderOpen size={13} /> Workspace</div>
          <h2>Project workspace</h2>
          <p className="workspace-path">{projectPath}</p>
          <p className="workspace-description">Inspect the files Catalyst can ground its next coding response in. Changes still happen through chat.</p>
        </div>
        <button type="button" className="btn-secondary btn-sm" onClick={() => void loadWorkspace()} disabled={loading}>
          {loading ? <Loader2 size={13} className="spin" /> : <RefreshCw size={13} />}
          Refresh
        </button>
      </div>

      <div className="workspace-toolbar">
        <div className={`workspace-git-status ${git?.connected ? 'connected' : ''}`}>
          {git?.connected ? <ShieldCheck size={14} /> : <GitBranch size={14} />}
          <span>{git?.connected ? 'Git repository' : 'Git not connected'}</span>
          {git?.connected && <span className="workspace-git-branch">{git.branch}</span>}
          {git?.dirty && <span className="workspace-dirty">Uncommitted changes</span>}
        </div>
        {git?.connected && branches.length > 0 && (
          <div className="workspace-branch-control">
            <GitBranch size={13} />
            <select value={branch} onChange={(event) => setBranch(event.target.value)} aria-label="Git branch">
              {branches.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <button type="button" className="btn-secondary btn-xs" onClick={() => void switchBranch()} disabled={branch === git.branch}>Switch</button>
          </div>
        )}
        {git?.connected && <>
          <button type="button" className="btn-secondary btn-xs" onClick={() => void loadDiff()}><GitCompare size={12} /> View diff</button>
          <button type="button" className="btn-secondary btn-xs" onClick={() => void syncGit('pull')}><ArrowDown size={12} /> Pull</button>
          <button type="button" className="btn-secondary btn-xs" onClick={() => void syncGit('push')}><ArrowUp size={12} /> Push</button>
        </>}
      </div>

      {error && <div className="workspace-error"><AlertCircle size={15} /> {error}</div>}

      <div className="workspace-layout">
        <aside className="workspace-files">
          <div className="workspace-search"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter files..." /></div>
          <div className="workspace-file-count">{visibleFiles.length} visible files</div>
          <div className="workspace-file-list">
            {visibleFiles.map((file) => (
              <button type="button" key={file} className={`workspace-file ${selectedFile === file ? 'active' : ''}`} onClick={() => void openFile(file)}>
                <FileCode2 size={14} /> <span>{file}</span>
              </button>
            ))}
            {!loading && visibleFiles.length === 0 && <div className="workspace-empty">No matching files.</div>}
          </div>
        </aside>
        <section className="workspace-editor">
          {showDiff ? (
            <>
              <div className="workspace-editor-header"><GitCompare size={14} /><span>Uncommitted changes</span><button type="button" className="btn-secondary btn-xs" onClick={() => setShowDiff(false)}>Close</button></div>
              <pre className="workspace-code"><code>{diff}</code></pre>
            </>
          ) : selectedFile ? (
            <>
              <div className="workspace-editor-header"><FileCode2 size={14} /><span>{selectedFile}</span></div>
              <pre className="workspace-code"><code>{content || 'Loading file...'}</code></pre>
            </>
          ) : (
            <div className="workspace-empty workspace-empty-large"><FolderOpen size={24} /><span>Select a file to inspect it.</span><small>Use the chat to request changes; this view keeps the repository visible while you work.</small></div>
          )}
        </section>
      </div>
    </div>
  );
};
