import { useState, useEffect } from 'react';
import FileRow from './FileRow.jsx';
import ShareModal from './ShareModal.jsx';
import { api } from '../api.js';
import type { VaultFile, MetadataMap } from '../types';

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
    const fetchMetadataInBatches = async (files : VaultFile[], batchSize = 5) => {
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

            <div
              className="project-row"
              onClick={() => onFolderClick(isOpen ? null : folder)}
            >
              <span className="proj-arrow" style={{
                display: 'inline-block',
                transform: isOpen ? 'rotate(90deg)' : 'none',
                transition: 'transform 0.15s',
              }}>
                ▶
              </span>
              <span className="proj-name">{folder.name}</span>
              <span className="proj-date">
                {new Date(folder.modified * 1000).toLocaleDateString()}
              </span>
              <div className="proj-actions" onClick={e => e.stopPropagation()}>
                <button
                  className={shareFolder?.path === folder.path ? 'fbtn on' : 'fbtn'}
                  onClick={() =>
                    setShareFolder(prev =>
                      prev?.path === folder.path ? null : folder
                    )
                  }
                >
                  {shareFolder?.path === folder.path ? 'close' : 'share'}
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