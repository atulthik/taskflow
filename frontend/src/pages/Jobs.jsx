import { useEffect, useState } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { useSocket } from '../context/SocketContext';
import { Plus, Play, Trash2, XCircle, RefreshCw } from 'lucide-react';

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const token = useSelector(state => state.auth.accessToken);
  const socket = useSocket();

  useEffect(() => {
    fetchJobs();
  }, [token]);

  useEffect(() => {
    if (socket) {
      const handleJobUpdate = () => {
        fetchJobs();
      };
      
      socket.on('job:created', handleJobUpdate);
      socket.on('job:started', handleJobUpdate);
      socket.on('job:completed', handleJobUpdate);
      socket.on('job:failed', handleJobUpdate);
      socket.on('job:retrying', handleJobUpdate);
      socket.on('job:cancelled', handleJobUpdate);

      return () => {
        socket.off('job:created', handleJobUpdate);
        socket.off('job:started', handleJobUpdate);
        socket.off('job:completed', handleJobUpdate);
        socket.off('job:failed', handleJobUpdate);
        socket.off('job:retrying', handleJobUpdate);
        socket.off('job:cancelled', handleJobUpdate);
      };
    }
  }, [socket]);

  const fetchJobs = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/jobs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setJobs(res.data.jobs);
      }
    } catch (err) {
      console.error('Error fetching jobs', err);
    }
  };

  const handleCancelJob = async (jobId) => {
    try {
      await axios.post(`http://localhost:5000/api/jobs/${jobId}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchJobs();
    } catch (err) {
      console.error('Error cancelling job', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'QUEUED': return 'bg-blue-500/10 text-blue-500';
      case 'PROCESSING': return 'bg-yellow-500/10 text-yellow-500';
      case 'COMPLETED': return 'bg-green-500/10 text-green-500';
      case 'FAILED': return 'bg-red-500/10 text-red-500';
      case 'RETRYING': return 'bg-orange-500/10 text-orange-500';
      case 'CANCELLED': return 'bg-gray-500/10 text-gray-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Jobs</h1>
        <button 
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
        >
          {isCreating ? <XCircle size={20} /> : <Plus size={20} />}
          {isCreating ? 'Cancel Creation' : 'Create Job'}
        </button>
      </div>

      {isCreating && (
        <CreateJobForm token={token} onCreated={() => { setIsCreating(false); fetchJobs(); }} />
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted text-muted-foreground text-sm uppercase tracking-wider">
              <th className="p-4 font-semibold">ID</th>
              <th className="p-4 font-semibold">Type</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold">Progress</th>
              <th className="p-4 font-semibold">Priority</th>
              <th className="p-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {jobs.map(job => (
              <tr key={job._id} className="hover:bg-muted/50 transition-colors">
                <td className="p-4 text-sm font-mono text-muted-foreground truncate max-w-[120px]">{job._id}</td>
                <td className="p-4 font-medium">{job.type}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${getStatusColor(job.status)}`}>
                    {job.status}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2 w-32">
                    <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-300" style={{ width: `${job.progress}%` }}></div>
                    </div>
                    <span className="text-xs text-muted-foreground">{job.progress}%</span>
                  </div>
                </td>
                <td className="p-4 text-sm">{['LOW', 'NORMAL', 'HIGH', 'CRITICAL'][Math.floor(job.priority/10)-1] || job.priority}</td>
                <td className="p-4 flex gap-2">
                  {['QUEUED', 'RETRYING'].includes(job.status) && (
                    <button onClick={() => handleCancelJob(job._id)} className="p-2 text-destructive hover:bg-destructive/10 rounded">
                      <XCircle size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr>
                <td colSpan="6" className="p-8 text-center text-muted-foreground">No jobs found. Create one to get started.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CreateJobForm({ token, onCreated }) {
  const [type, setType] = useState('CPU_INTENSIVE');
  const [priority, setPriority] = useState('NORMAL');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    let payload = {};
    if (type === 'CPU_INTENSIVE') payload = { limit: 500000 };
    if (type === 'FILE_HASH') payload = { filePath: 'test.txt', algorithm: 'sha256' }; // Dummy for UI
    if (type === 'CSV_PROCESSING') payload = { filePath: 'test.csv' };

    try {
      await axios.post('http://localhost:5000/api/jobs', { type, priority, payload }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onCreated();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card p-6 rounded-xl border border-border flex flex-col gap-4">
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Job Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-4 py-2 bg-input border border-border rounded focus:outline-none">
            <option value="CPU_INTENSIVE">CPU Intensive (Primes)</option>
            <option value="CSV_PROCESSING">CSV Processing (Mock)</option>
            <option value="FILE_HASH">File Hashing</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full px-4 py-2 bg-input border border-border rounded focus:outline-none">
            <option value="LOW">Low</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
      </div>
      <button type="submit" className="w-fit px-6 py-2 bg-primary text-primary-foreground font-semibold rounded hover:opacity-90">
        Submit Job
      </button>
    </form>
  );
}
