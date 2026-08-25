import { useEffect, useState } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { ShieldAlert, RefreshCcw } from 'lucide-react';

export default function DeadLetter() {
  const [jobs, setJobs] = useState([]);
  const token = useSelector(state => state.auth.accessToken);
  const user = useSelector(state => state.auth.user);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchDeadLetterJobs();
    }
  }, [token, user]);

  const fetchDeadLetterJobs = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/admin/dead-letter', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setJobs(res.data.deadLetterJobs);
      }
    } catch (err) {
      console.error('Error fetching dead letter jobs', err);
    }
  };

  const handleRetry = async (jobId) => {
    try {
      await axios.post(`http://localhost:5000/api/admin/dead-letter/${jobId}/retry`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDeadLetterJobs();
    } catch (err) {
      console.error('Error retrying job', err);
    }
  };

  if (user?.role !== 'ADMIN') return <div className="p-8">Unauthorized</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-2 text-destructive">
        <ShieldAlert size={32} />
        Dead Letter Queue
      </h1>
      <p className="text-muted-foreground">Jobs that have failed multiple times and exceeded max retries.</p>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted text-muted-foreground text-sm uppercase tracking-wider">
              <th className="p-4 font-semibold">ID</th>
              <th className="p-4 font-semibold">Type</th>
              <th className="p-4 font-semibold">Error Message</th>
              <th className="p-4 font-semibold">Failed At</th>
              <th className="p-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {jobs.map(job => (
              <tr key={job._id} className="hover:bg-muted/50 transition-colors">
                <td className="p-4 text-sm font-mono text-muted-foreground truncate max-w-[120px]">{job._id}</td>
                <td className="p-4 font-medium">{job.type}</td>
                <td className="p-4 text-sm text-destructive max-w-[300px] truncate">{job.error || 'Unknown error'}</td>
                <td className="p-4 text-sm text-muted-foreground">
                  {new Date(job.failedAt).toLocaleString()}
                </td>
                <td className="p-4">
                  <button 
                    onClick={() => handleRetry(job._id)} 
                    className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary hover:bg-primary/20 rounded font-medium transition-colors"
                  >
                    <RefreshCcw size={16} /> Retry
                  </button>
                </td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr>
                <td colSpan="5" className="p-8 text-center text-muted-foreground">No dead letter jobs found. Great!</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
