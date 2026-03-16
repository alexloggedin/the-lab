import { useState, useEffect } from 'react';
import ProjectList from './components/ProjectList.jsx';
import { api } from './api.jsx';

export default function App() {
  const [folders, setFolders] = useState([]);
  const [openFolder, setOpenFolder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.initLab()
      .then(() => api.getFiles('theLAB'))
      .then(res => setFolders(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="app-container" style={{ color: 'var(--muted)' }}>loading...</div>;
  }

  return (
    <div className="app-container">
      <div className="topbar">
        <span className="wordmark">theLAB</span>
      </div>
      <ProjectList
        folders={folders}
        openFolder={openFolder}
        onFolderClick={setOpenFolder}
      />
    </div>
  );
}