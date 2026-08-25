import { useEffect, useState } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { Server, Activity, CheckCircle, XCircle } from 'lucide-react';

export default function Workers() {
  const [workers, setWorkers] = useState([]);
  const token = useSelector(state => state.auth.accessToken);
  const user = useSelector(state => state.auth.user);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchWorkers();
      const interval = setInterval(fetchWorkers, 5000); // Poll every 5 seconds for worker updates
      return () => clearInterval(interval);
    }
  }, [token, user]);

  const fetchWorkers = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/admin/workers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setWorkers(res.data.workers);
      }
    } catch (err) {
      console.error('Error fetching workers', err);
    }
  };

  if (user?.role !== 'ADMIN') return <div className="p-8">Unauthorized</div>;

  const getStatusColor = (status) => {
    switch (status) {
      case 'IDLE': return 'text-blue-500 bg-blue-500/10';
      case 'BUSY': return 'text-yellow-500 bg-yellow-500/10';
      case 'OFFLINE': return 'text-gray-500 bg-gray-500/10';
      case 'ERROR': return 'text-red-500 bg-red-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <Server size={32} />
        Worker Node Management
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workers.map(worker => (
          <div key={worker._id} className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold font-mono text-primary flex items-center gap-2">
                <Activity size={20} className={worker.status === 'BUSY' ? 'animate-pulse text-yellow-500' : 'text-primary'} />
                {worker.workerId}
              </h2>
              <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${getStatusColor(worker.status)}`}>
                {worker.status}
              </span>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Jobs</span>
                <span className="font-medium">{worker.jobsProcessed}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1"><CheckCircle size={14} className="text-green-500"/> Success</span>
                <span className="font-medium text-green-500">{worker.successfulJobs}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1"><XCircle size={14} className="text-red-500"/> Failed</span>
                <span className="font-medium text-red-500">{worker.failedJobs}</span>
              </div>
            </div>

            {worker.status === 'BUSY' && worker.currentJobId && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-semibold mb-1">Current Job:</p>
                <p className="font-mono text-xs text-muted-foreground truncate">{worker.currentJobId._id}</p>
                <p className="text-xs font-medium mt-1">Type: {worker.currentJobId.type}</p>
              </div>
            )}
          </div>
        ))}
        {workers.length === 0 && <p className="text-muted-foreground">No workers found.</p>}
      </div>
    </div>
  );
}
