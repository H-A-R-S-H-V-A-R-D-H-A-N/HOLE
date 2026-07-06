import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import '../styles/CommunityCounter.css';

const ABACUS_NAMESPACE = 'hole-workstation';
const ABACUS_KEY = 'total-users';
const LOCAL_FLAG = 'hole_user_counted';

export default function CommunityCounter() {
  const [totalUsers, setTotalUsers] = useState(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const registerAndFetch = async () => {
      try {
        const alreadyCounted = localStorage.getItem(LOCAL_FLAG);

        if (!alreadyCounted) {
          // First time user — increment the counter
          const res = await fetch(`https://abacus.jasoncameron.dev/hit/${ABACUS_NAMESPACE}/${ABACUS_KEY}`);
          if (!res.ok) throw new Error('Hit failed');
          const data = await res.json();
          setTotalUsers(data.value);
          localStorage.setItem(LOCAL_FLAG, 'true');
        } else {
          // Returning user — just read the current count
          const res = await fetch(`https://abacus.jasoncameron.dev/get/${ABACUS_NAMESPACE}/${ABACUS_KEY}`);
          if (!res.ok) throw new Error('Get failed');
          const data = await res.json();
          setTotalUsers(data.value);
        }
      } catch {
        setHasError(true);
      }
    };

    registerAndFetch();
  }, []);

  if (hasError || totalUsers === null) return null;

  // Format the number nicely
  const formatted = totalUsers >= 1000
    ? `${(totalUsers / 1000).toFixed(1)}K`
    : totalUsers.toLocaleString();

  return (
    <div className="community-counter" title="Total unique hackers using HOLE worldwide">
      <div className="community-counter-glow" />
      <div className="community-counter-inner">
        <div className="community-counter-ring">
          <Users size={14} />
        </div>
        <div className="community-counter-info">
          <span className="community-counter-value">{formatted}</span>
          <span className="community-counter-label">Hackers</span>
        </div>
      </div>
    </div>
  );
}
