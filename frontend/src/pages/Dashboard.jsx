import { useEffect, useState } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { useSocket } from '../context/SocketContext';
import { Activity, CheckCircle, Clock, XCircle, AlertTriangle, Zap, Server, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [stats, setStats] = useState({
    queued: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    retrying: 0
  });
  const [recentJobs, setRecentJobs] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const token = useSelector(state => state.auth.accessToken);
  const socket = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    fetchJobs();
    fetchWorkers();
  }, [token]);

  useEffect(() => {
    if (socket) {
      const handleJobUpdate = () => {
        fetchJobs();
      };
      const handleWorkerUpdate = () => {
        fetchWorkers();
      };
      
      socket.on('job:created', handleJobUpdate);
      socket.on('job:started', handleJobUpdate);
      socket.on('job:completed', handleJobUpdate);
      socket.on('job:failed', handleJobUpdate);
      socket.on('job:retrying', handleJobUpdate);
      
      socket.on('worker:registered', handleWorkerUpdate);
      socket.on('worker:heartbeat', handleWorkerUpdate);
      socket.on('worker:offline', handleWorkerUpdate);

      return () => {
        socket.off('job:created', handleJobUpdate);
        socket.off('job:started', handleJobUpdate);
        socket.off('job:completed', handleJobUpdate);
        socket.off('job:failed', handleJobUpdate);
        socket.off('job:retrying', handleJobUpdate);
        socket.off('worker:registered', handleWorkerUpdate);
        socket.off('worker:heartbeat', handleWorkerUpdate);
        socket.off('worker:offline', handleWorkerUpdate);
      };
    }
  }, [socket]);

  const fetchJobs = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/jobs?limit=1000', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        const jobs = res.data.jobs;
        setStats({
          queued: jobs.filter(j => j.status === 'QUEUED').length,
          processing: jobs.filter(j => j.status === 'PROCESSING').length,
          completed: jobs.filter(j => j.status === 'COMPLETED').length,
          failed: jobs.filter(j => j.status === 'FAILED').length,
          retrying: jobs.filter(j => j.status === 'RETRYING').length,
        });
        // Get 5 most recent jobs (assuming returned sorted or we sort them)
        const sortedJobs = [...jobs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setRecentJobs(sortedJobs.slice(0, 5));
      }
    } catch (err) {
      console.error('Error fetching jobs for stats', err);
    }
  };

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
      // Might fail if not admin, ignore gracefully
    }
  };

  const handleQuickAction = async (intent) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    let type = 'CPU_INTENSIVE';
    let payload = {};
    let maxAttempts;

    if (intent === 'COMPLETED') {
      type = 'CPU_INTENSIVE';
      payload = { limit: 10000000 }; // Takes a couple of seconds so we see PROCESSING
    } else if (intent === 'RETRYING') {
      type = 'FILE_HASH';
      payload = { filePath: 'this-file-does-not-exist.txt', algorithm: 'sha256' }; // Will retry 3 times
    } else if (intent === 'FAILED') {
      type = 'FILE_HASH';
      payload = { filePath: 'this-file-does-not-exist.txt', algorithm: 'sha256' };
      maxAttempts = 1; // Fails immediately, no retries
    }

    try {
      await axios.post('http://localhost:5000/api/jobs', { type, priority: 'NORMAL', payload, maxAttempts }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchJobs();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
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

  const StatCard = ({ title, value, icon, color }) => (
    <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-center gap-4">
      <div className={`p-4 rounded-full ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <h3 className="text-3xl font-bold">{value}</h3>
      </div>
    </div>
  );

  const chartData = [
    { name: 'Queued', value: stats.queued, color: '#3b82f6' }, 
    { name: 'Processing', value: stats.processing, color: '#eab308' }, 
    { name: 'Completed', value: stats.completed, color: '#22c55e' }, 
    { name: 'Failed', value: stats.failed, color: '#ef4444' }, 
    { name: 'Retrying', value: stats.retrying, color: '#f97316' }, 
  ];
  
  const activeWorkersCount = workers.filter(w => w.status === 'IDLE' || w.status === 'BUSY').length;

  return (
    <div className="space-y-6 pb-10">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard title="Queued" value={stats.queued} icon={<Clock size={24} />} color="bg-blue-500/10 text-blue-500" />
        <StatCard title="Processing" value={stats.processing} icon={<Activity size={24} />} color="bg-yellow-500/10 text-yellow-500" />
        <StatCard title="Completed" value={stats.completed} icon={<CheckCircle size={24} />} color="bg-green-500/10 text-green-500" />
        <StatCard title="Failed" value={stats.failed} icon={<XCircle size={24} />} color="bg-red-500/10 text-red-500" />
        <StatCard title="Retrying" value={stats.retrying} icon={<AlertTriangle size={24} />} color="bg-orange-500/10 text-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-card p-6 rounded-xl border border-border shadow-sm flex flex-col">
          <h2 className="text-lg font-bold mb-4">Job Status Overview</h2>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                <XAxis dataKey="name" tick={{fill: 'currentColor', opacity: 0.7}} axisLine={false} tickLine={false} />
                <YAxis tick={{fill: 'currentColor', opacity: 0.7}} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{fill: 'var(--color-muted)', opacity: 0.4}}
                  contentStyle={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', borderRadius: '0.5rem', color: 'var(--color-foreground)' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Sidebar: Health & Actions */}
        <div className="space-y-6">
          
          {/* System Health */}
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Server size={20} className="text-primary" />
              System Health
            </h2>
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-primary/20 flex items-center justify-center">
                  <span className="text-2xl font-bold">{activeWorkersCount}</span>
                </div>
                {activeWorkersCount > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-green-500 border-2 border-card rounded-full animate-pulse"></span>
                )}
              </div>
              <div>
                <p className="font-semibold">Active Workers</p>
                <p className="text-sm text-muted-foreground">
                  {activeWorkersCount > 0 ? 'Workers are online and polling for jobs.' : 'No workers are currently online.'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Zap size={20} className="text-yellow-500" />
              Quick Actions
            </h2>
            <div className="space-y-3">
              <button 
                onClick={() => handleQuickAction('COMPLETED')}
                disabled={isSubmitting}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
              >
                <CheckCircle size={18} className="text-green-500" />
                <div>
                  <p className="font-medium text-sm">Simulate Completed</p>
                  <p className="text-xs text-muted-foreground">Trigger a fast job</p>
                </div>
              </button>
              
              <button 
                onClick={() => handleQuickAction('RETRYING')}
                disabled={isSubmitting}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
              >
                <AlertTriangle size={18} className="text-orange-500" />
                <div>
                  <p className="font-medium text-sm">Simulate Retrying</p>
                  <p className="text-xs text-muted-foreground">Trigger an error-prone job</p>
                </div>
              </button>

              <button 
                onClick={() => handleQuickAction('FAILED')}
                disabled={isSubmitting}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
              >
                <XCircle size={18} className="text-red-500" />
                <div>
                  <p className="font-medium text-sm">Simulate Failed</p>
                  <p className="text-xs text-muted-foreground">Trigger an unrecoverable job</p>
                </div>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Recent Jobs Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h2 className="text-lg font-bold">Recent Jobs</h2>
          <button 
            onClick={() => navigate('/jobs')}
            className="text-sm text-primary hover:underline"
          >
            View All
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">ID</th>
                <th className="p-4 font-semibold">Type</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentJobs.map(job => (
                <tr key={job._id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-sm font-mono text-muted-foreground truncate max-w-[120px]">{job._id}</td>
                  <td className="p-4 font-medium text-sm">{job.type}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide ${getStatusColor(job.status)}`}>
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
                </tr>
              ))}
              {recentJobs.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-muted-foreground">No recent jobs found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
