import { useState, useEffect } from 'react';
import FileRow from './FileRow.jsx';
import { api } from '../api.jsx';

export default function ProjectList({ folders, openFolder, onFolderClick }) {
  const [files, setFiles] = useState([]);

  useEffect(() => {
    if (!openFolder) {
      setFiles([]);
      return;
    }
    api.getFiles(openFolder.path).then(res => setFiles(res.data));
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
            </div>

            {isOpen && files.map(file => (
              <FileRow key={file.path} file={file} />
            ))}

          </div>
        );
      })}
    </div>
  );
}