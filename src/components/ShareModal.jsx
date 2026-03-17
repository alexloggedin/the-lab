import { useState, useEffect } from 'react';
import { api } from '../api.jsx';

export default function ShareModal({ filePath, fileName, isFolder = false }) {
    const [shares, setShares] = useState([]);
    const [creating, setCreating] = useState(false);
    const [copied, setCopied] = useState(null);
    const [form, setForm] = useState({
        password: '',
        expiryDate: '',
        hideDownload: false,
        allowUpload: false, 
    });

    useEffect(() => {
        api.getShares().then(res => {
            console.log("Raw response", res)
            console.log(filePath)
            const fileShares = res.data.filter(s => s.path === 'files/'+filePath);
            console.log("fileShare List: ", fileShares);
            setShares(fileShares);
        });
    }, [filePath]);

    const handleFormChange = (field, value) =>
        setForm(prev => ({ ...prev, [field]: value }));

    const handleCreate = async () => {
        setCreating(true);
        const res = await api.createShare({
            path: filePath,
            password: form.password,
            expiryDate: form.expiryDate,
            hideDownload: form.hideDownload,
            permissions: 1,  
        });
        console.log(fileName, filePath);
        setShares(prev => [...prev, res.data]);
        setForm({ password: '', expiryDate: '', hideDownload: true, allowUpload: false });
        setCreating(false);
    };

    const handleRevoke = async (id) => {
        await api.deleteShare(id);
        setShares(prev => prev.filter(s => s.id !== id));
    };

    const handleCopy = (url) => {
        navigator.clipboard.writeText(url);
        setCopied(url);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <div className="share-panel">
            <ShareHeader
                fileName={fileName}
                isFolder={isFolder}
            />
            <div className="share-field">
                <span className="share-lbl">expires</span>
                <input
                    type="date"
                    className="share-input"
                    value={form.expiryDate}
                    onChange={e => handleFormChange('expiryDate', e.target.value)}
                />
            </div>
            <div className="share-field">
                <span className="share-lbl">password (optional)</span>
                <input
                    type="password"
                    className="share-input"
                    placeholder="leave blank for no password"
                    value={form.password}
                    onChange={e => handleFormChange('password', e.target.value)}
                />
            </div>

            <div className="share-row">
                <label className="share-lbl">
                    <input
                        type="checkbox"
                        checked={form.hideDownload}
                        onChange={() => handleFormChange('hideDownload', !form.hideDownload)}
                    />
                    hide download
                </label>

            </div>

            {isFolder && (
                <div className="share-row">
                    <span className="share-lbl">allow collaborators to upload</span>
                    <div
                        className={form.allowUpload ? 'toggle on' : 'toggle'}
                        onClick={() => handleFormChange('allowUpload', !form.allowUpload)}
                    >
                        <div className="toggle-knob" />
                    </div>
                </div>
            )}

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
                                <span className="si-url">{share.url}</span>
                                {share.expiry && (
                                    <span className="si-meta">
                                        expires {new Date(share.expiry).toLocaleDateString()}
                                    </span>
                                )}
                                {share.hasPassword && <span className="si-meta">password</span>}
                                <button className="abtn" onClick={() => handleCopy(share.url)}>
                                    {copied === share.url ? 'copied' : 'copy'}
                                </button>
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

function ShareHeader({ isFolder, fileName }) {
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
            <span style={{ fontSize: '12px', color: 'var(--text)' }}>
                {fileName}
            </span>
        </div>
    )
}