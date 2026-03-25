import { useState, useEffect } from 'react';
import { api } from '../../api/api.ts';
import type { ShareLink } from '../../types.js';

interface Props {
    filePath: string;
    fileName: string;
    isFolder?: boolean;  // optional — defaults to false
}

interface ShareHeaderProps {
    isFolder: boolean,
    fileName: string
}

export default function ShareModal({ filePath, fileName, isFolder = false }: Props) {
    const [shares, setShares] = useState<ShareLink[]>([]);
    const [creating, setCreating] = useState<boolean>(false);
    const [copied, setCopied] = useState<string | null>(null);
    const [error, setError] = useState<any>(null);
    const [hideDownload, setHideDownload] = useState<boolean>(false);

    const ocsPath = filePath.startsWith('/') ? filePath : `/${filePath}`;

    useEffect(() => {
        console.log('[ShareModal] loading shares for path:', ocsPath);

        api.getShares().then(res => {
            console.log('[ShareModal] all shares:', res.data);
            const fileShares = res.data.filter(s => s.path === ocsPath);
            console.log('[ShareModal] filtered shares for this item:', fileShares);
            setShares(fileShares);
        }).catch(err => {
            console.error('[ShareModal] getShares error:', err);
            setError('could not load shares');
        });
    }, [filePath]);

    const handleCreate = async () => {
        setCreating(true);
        setError(null);

        // if (ocsPath.includes('..') || !ocsPath.startsWith('/theVault')) {
        //     setError('invalid share path');
        //     return;
        // }

        try {
            const res = await api.createShare(ocsPath, hideDownload);
            console.log('[ShareModal] created share:', res.data);

            setShares(prev => [...prev, res.data]);
        } catch (err: any) {
            console.error('[ShareModal] createShare error:', err);
            setError(err.message);
        } finally {
            setCreating(false);
        }
    };

    const handleRevoke = async (id: string) => {
        try {
            await api.deleteShare(id);
            setShares(prev => prev.filter(s => s.id !== id));
        } catch (err: any) {
            console.error('[ShareModal] deleteShare error:', err);
            setError(err.message);
        }
    };

    const handleCopy = (url: string) => {
        navigator.clipboard.writeText(url);
        setCopied(url);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <div className="share-panel">
            <ShareHeader fileName={fileName} isFolder={isFolder} />

            {error && <p className="share-error">{error}</p>}

            {/* Hide download toggle */}
            <div className="share-row">
                <label className="share-lbl share-toggle-label">
                    <input
                        type="checkbox"
                        checked={hideDownload}
                        onChange={() => setHideDownload(prev => !prev)}
                    />
                    hide download on share page
                </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    className="abtn primary"
                    onClick={handleCreate}
                    disabled={creating}
                >
                    {creating ? 'creating...' : 'create link'}
                </button>
            </div>

            {shares.length > 0 && (
                <>
                    <hr className="divider" />
                    <span className="share-lbl">active links</span>
                    <div>
                        {shares.map(share => (
                            <div key={share.id} className="share-item">
                                <div style={{display: 'flex', width: '100%'}}>
                                <button className="share-link abtn" onClick={() => handleCopy(share.url)}>
                                    {copied === share.url ? 'copied' : 'copy'}
                                </button>
                                <textarea
                                    className="si-url"
                                    readOnly
                                    disabled
                                    rows={1}
                                    cols={20}
                                >
                                    {share.url}
                                </textarea>
                                </div>
                                <button className="si-revoke" onClick={() => handleRevoke(share.id)}>
                                    revoke
                                </button>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function ShareHeader({ isFolder, fileName }: ShareHeaderProps) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            paddingBottom: '12px',
            borderBottom: '1px solid var(--border)',
            marginBottom: '2px',
        }}>
            <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                {isFolder ? 'sharing folder' : 'sharing file'}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text)' }}>{fileName}</span>
        </div>
    );
}