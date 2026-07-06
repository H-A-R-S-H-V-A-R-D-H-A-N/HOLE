import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ArrowUpCircle, X, GitBranch, Copy } from 'lucide-react';
import '../styles/UpdateChecker.css';

const REPO_OWNER = 'H-A-R-S-H-V-A-R-D-H-A-N';
const REPO_NAME = 'HOLE';
const CHECK_INTERVAL = 30 * 60 * 1000; // Check every 30 minutes
const DISMISSED_KEY = 'hole_update_dismissed_sha';

export default function UpdateChecker() {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [checking, setChecking] = useState(false);

  const checkForUpdates = useCallback(async () => {
    try {
      setChecking(true);

      // Get current local commit SHA
      let localSha = null;
      if (window.electronAPI?.getGitSha) {
        localSha = await window.electronAPI.getGitSha();
      }

      // Fetch latest commit from GitHub
      const res = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits/main`,
        { headers: { 'Accept': 'application/vnd.github.v3+json' } }
      );
      if (!res.ok) return;
      const data = await res.json();

      const remoteSha = data.sha;
      const commitMessage = data.commit?.message?.split('\n')[0] || 'New update available';
      const commitDate = data.commit?.committer?.date;

      // If we have a local SHA, compare directly
      if (localSha && localSha.trim() === remoteSha) {
        setUpdateInfo(null);
        return;
      }



      // There's an update!
      setUpdateInfo({
        sha: remoteSha,
        shortSha: remoteSha.substring(0, 7),
        message: commitMessage,
        date: commitDate ? new Date(commitDate) : new Date(),
      });
      setDismissed(false);
    } catch {
      // Silently fail — no internet or rate limited
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    // Check on mount (with a small delay so the app loads first)
    const initialTimer = setTimeout(checkForUpdates, 3000);

    // Then check periodically
    const interval = setInterval(checkForUpdates, CHECK_INTERVAL);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [checkForUpdates]);

  const handleDismiss = () => {
    setDismissed(true);
  };

  const handleUpdate = () => {
    // Open the GitHub repo page in system browser
    const url = `https://github.com/${REPO_OWNER}/${REPO_NAME}`;
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  // Nothing to show
  if (!updateInfo || dismissed) return null;

  const timeAgo = getTimeAgo(updateInfo.date);

  return (
    <div className="update-checker-toast">
      <div className="update-checker-glow" />
      <div className="update-checker-inner">
        <div className="update-checker-icon">
          <ArrowUpCircle size={20} />
        </div>
        <div className="update-checker-content">
          <div className="update-checker-title">Update Available</div>
          <div className="update-checker-message">Please update this app</div>
          <div className="update-checker-command" onClick={() => {
            navigator.clipboard.writeText("git pull origin main");
          }} title="Click to copy">
            <code>git pull origin main</code>
            <Copy size={10} style={{ marginLeft: '6px', opacity: 0.6 }} />
          </div>
        </div>
        <div className="update-checker-actions">
          <button className="update-checker-btn dismiss" onClick={handleDismiss} title="Dismiss this update">
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}
