'use client';
import { useState, useEffect } from 'react';

export default function AdminDashboard() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [layout, setLayout] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleLogin = (e) => {
        e.preventDefault();
        if (password === 'admin241') {
            setIsAuthenticated(true);
            fetchLayout();
        } else {
            setError('Incorrect password');
        }
    };

    const fetchLayout = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/layout');
            const data = await res.json();
            if (data.success) {
                setLayout(data.layout);
            } else {
                setError(data.error || 'Failed to fetch layout');
            }
        } catch (err) {
            setError('Network error');
        }
        setIsLoading(false);
    };

    const downloadCSV = () => {
        if (!layout.length) return;

        let csvContent = 'Line,Machine,Position,Worker Capacity,Assigned Worker,Employee ID\n';

        layout.forEach(line => {
            line.machines.forEach(machine => {
                // If there are no assignments for this machine, output an empty row
                if (machine.assigned.length === 0) {
                    csvContent += `"${line.name}","${machine.name}","${machine.position}","${machine.worker_capacity}","Unassigned",""\n`;
                } else {
                    machine.assigned.forEach(worker => {
                        csvContent += `"${line.name}","${machine.name}","${machine.position}","${machine.worker_capacity}","${worker.worker_name || 'Unknown'}","${worker.employee_id}"\n`;
                    });
                }
            });
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Daily_Assignments_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center">
                <div className="bg-[#1C212D] p-8 rounded-xl shadow-xl w-full max-w-md">
                    <h2 className="text-2xl font-bold mb-6 text-center text-[#E0E7FF]">Admin Login</h2>
                    <form onSubmit={handleLogin} className="flex flex-col gap-4">
                        <input
                            type="password"
                            placeholder="Enter Password"
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setError(null); }}
                            className="bg-[#0B0F19] border border-[#334155] rounded-lg p-3 text-white focus:outline-none focus:border-[#3B82F6]"
                            autoFocus
                        />
                        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                        <button 
                            type="submit" 
                            className="bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                        >
                            Unlock Dashboard
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0B0F19] text-white p-6 md:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-[#E0E7FF]">Complete Layout Dashboard</h1>
                        <p className="text-[#94A3B8] mt-1">Today's temporary assignments across all active lines</p>
                    </div>
                    
                    <div className="flex gap-4">
                        <button
                            onClick={fetchLayout}
                            className="px-4 py-2 bg-[#1C212D] hover:bg-[#334155] border border-[#334155] rounded-lg transition-colors flex items-center gap-2 text-sm"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                            Refresh
                        </button>
                        <button
                            onClick={downloadCSV}
                            className="px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white font-medium rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-[#10B981]/20"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            Download CSV
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#3B82F6]"></div>
                    </div>
                ) : error ? (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg">
                        {error}
                    </div>
                ) : layout.length === 0 ? (
                    <div className="bg-[#1C212D] border border-[#334155] text-center p-12 rounded-xl text-[#94A3B8]">
                        No active lines or machines found.
                    </div>
                ) : (
                    <div className="flex flex-col gap-8">
                        {layout.map(line => (
                            <div key={line.id} className="bg-[#1C212D] border border-[#334155] rounded-xl overflow-hidden shadow-lg">
                                <div className="bg-[#1E293B] px-6 py-4 border-b border-[#334155]">
                                    <h3 className="text-xl font-bold text-white">{line.name}</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-[#0F172A]/50 text-[#94A3B8] text-sm uppercase tracking-wider">
                                                <th className="px-6 py-3 font-medium">Machine / Cell</th>
                                                <th className="px-6 py-3 font-medium w-32 text-center">Capacity</th>
                                                <th className="px-6 py-3 font-medium">Assigned Worker(s)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#334155]">
                                            {line.machines.map(machine => (
                                                <tr key={machine.id} className="hover:bg-[#334155]/30 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-[#E0E7FF]">{machine.name}</div>
                                                        <div className="text-xs text-[#64748B] mt-1">Pos: {machine.position}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="inline-flex items-center justify-center bg-[#334155] text-[#CBD5E1] text-xs font-bold px-2.5 py-1 rounded-full">
                                                            {machine.assigned.length} / {machine.worker_capacity}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {machine.assigned.length > 0 ? (
                                                            <div className="flex flex-wrap gap-2">
                                                                {machine.assigned.map(worker => (
                                                                    <div key={worker.id} className="bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-[#60A5FA] px-3 py-1.5 rounded-lg text-sm flex flex-col">
                                                                        <span className="font-medium">{worker.worker_name || 'Unknown Worker'}</span>
                                                                        <span className="text-xs opacity-70">{worker.employee_id}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-[#64748B] italic text-sm">Unassigned</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
