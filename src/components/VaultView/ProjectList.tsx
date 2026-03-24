import { useState, useEffect } from 'react';
import FileRow from './FileRow.tsx';
import ShareModal from './ShareModal.tsx';
import { api } from '../../api/api.ts';
import type { VaultFile, MetadataMap } from '../../types.ts';

interface Props {
  folders: VaultFile[];
  openFolder: VaultFile | null;
  onFolderClick: (folder: VaultFile | null) => void;
}

export default function ProjectList({ folders, openFolder, onFolderClick }: Props) {
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [metadata, setMetadata] = useState<MetadataMap>({});
  const [shareFolder, setShareFolder] = useState<VaultFile | null>(null);

  useEffect(() => {
    if (!openFolder) {
      setFiles([]);
      setMetadata({});
      return;
    }

    let cancelled = false;

    // TODO: Implement Metadata calls
    const fetchMetadataInBatches = async (files: VaultFile[], batchSize = 5) => {
      for (let i = 0; i < files.length; i += batchSize) {
        if (cancelled) return;
        const batch = files.slice(i, i + batchSize);
        const entries = await Promise.all(
          batch.map(f =>
            api.getMetadata(f.path).then(r => [f.path, r.data])
          )
        );
        if (cancelled) return;
        setMetadata(prev => ({
          ...prev,
          ...Object.fromEntries(entries),
        }));
      }
    };

    console.log(openFolder.path)

    api.getFiles(openFolder.path).then(async res => {
      if (cancelled) return;
      const audioFiles = res.data;
      setFiles(audioFiles);
    });

    return () => { cancelled = true; };
  }, [openFolder]);

  if (!folders.length) {
    return <p className="muted">no projects yet.</p>;
  }

  return (
    <div>
      <div className="section-label">projects</div>

      {folders.map(folder => {
        const isOpen = openFolder?.path === folder.path;

        return (
          <div key={folder.path}>

            {/* Pack card row */}
            <div
              className="pack-card"
              onClick={() => onFolderClick(isOpen ? null : folder)}
            >
              {/* Folder art placeholder — same concept as track art */}
              <div className="pack-art">🎶</div>

              <div className="pack-info">
                <span className="pack-name">{folder.name}</span>
                <span className="pack-meta">
                  {new Date(folder.modified * 1000).toLocaleDateString()}
                  {isOpen && files.length > 0 && ` · ${files.length} files`}
                </span>
              </div>

              <div className="pack-actions" onClick={e => e.stopPropagation()}>
                {/* Arrow indicates expand state */}
                <span style={{
                  display: 'inline-block',
                  transform: isOpen ? 'rotate(90deg)' : 'none',
                  transition: 'transform 0.15s',
                  color: 'var(--muted)',
                  fontSize: '11px',
                }}>
                  ▶
                </span>
                <button
                  className={shareFolder?.path === folder.path ? 'fbtn on' : 'fbtn'}
                  onClick={() =>
                    setShareFolder(prev =>
                      prev?.path === folder.path ? null : folder
                    )
                  }
                >
                  share
                </button>
              </div>
            </div>

            {shareFolder?.path === folder.path && (
              <ShareModal
                filePath={folder.path}
                fileName={folder.name}
                isFolder={true}
              />
            )}

            {isOpen && files.map(file => (
              <FileRow
                key={file.path}
                file={file}
                meta={metadata[file.path] ?? null}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}