'use client';
import { useState, useEffect, useRef } from 'react';

export default function TempAssignment() {
    const [lines, setLines] = useState([]);
    const [cells, setCells] = useState([]);
    const [allocations, setAllocations] = useState([]);
    const [lineId, setLineId] = useState('');
    
    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [selectedMachine, setSelectedMachine] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: '' });

    const searchRef = useRef(null);

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
    };

    // 1. Fetch Lines
    useEffect(() => {
        fetch('/api/allocations?lines=true')
            .then(res => res.json())
            .then(data => { if (data.success) setLines(data.lines); })
            .catch(console.error);
    }, []);

    // 2. Fetch Cells & Allocations for Line
    useEffect(() => {
        if (lineId) {
            fetch(`/api/allocations?line_id=${lineId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setCells(data.cells);
                        setAllocations(data.allocations || []);
                    }
                })
                .catch(console.error);
        } else {
            setCells([]);
            setAllocations([]);
        }
    }, [lineId]);

    // 3. Autocomplete Search
    useEffect(() => {
        if (searchQuery.length >= 3) {
            setIsSearching(true);
            const timeoutId = setTimeout(() => {
                fetch(`/api/allocations?search_emp=${encodeURIComponent(searchQuery)}`)
                    .then(res => res.json())
                    .then(data => {
                        setSearchResults(data.success ? data.workers : []);
                        setIsSearching(false);
                    })
                    .catch(() => setIsSearching(false));
            }, 300);
            return () => clearTimeout(timeoutId);
        } else {
            setSearchResults([]);
        }
    }, [searchQuery]);

    const handleAssignClick = (machine) => {
        setSelectedMachine(machine);
        setSearchQuery('');
        setSearchResults([]);
        setShowModal(true);
    };

    const handleSelectWorker = async (worker) => {
        setSubmitting(true);
        try {
            const res = await fetch('/api/allocations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    line_id: lineId,
                    machine_id: selectedMachine.id,
                    employee_id: worker.employee_id,
                    worker_name: worker.name
                })
            });
            const result = await res.json();
            if (result.success) {
                showToast('Worker assigned successfully!');
                // Update local allocations state to reflect change instantly
                setAllocations([...allocations, {
                    id: result.id,
                    machine_id: selectedMachine.id,
                    employee_id: worker.employee_id,
                    worker_name: worker.name
                }]);
                setShowModal(false);
            } else {
                showToast(result.error || 'Failed to save', 'error');
            }
        } catch (error) {
            showToast('An error occurred', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRemoveAssignment = async (allocationId) => {
        try {
            const res = await fetch(`/api/allocations?id=${allocationId}`, {
                method: 'DELETE',
            });
            const result = await res.json();
            if (result.success) {
                showToast('Assignment removed successfully!', 'success');
                setAllocations(allocations.filter(a => a.id !== allocationId));
            } else {
                showToast(result.error || 'Failed to remove', 'error');
            }
        } catch (error) {
            showToast('An error occurred while removing', 'error');
        }
    };

    // Helper to get workers assigned to a specific machine
    const getAssignedWorkers = (machineId) => allocations.filter(a => a.machine_id === machineId);

    // Calculate totals for header
    const totalCapacity = cells.reduce((sum, c) => sum + (c.worker_capacity || 1), 0);
    const totalAssigned = allocations.length;
    const selectedLineName = lines.find(l => l.id === parseInt(lineId))?.name || '';

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#0f111a', color: '#e2e8f0', fontFamily: 'Inter, sans-serif' }}>
            {/* TOP BAR */}
            <div style={{ padding: '24px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>🔧 Temp Assignments</h1>
                    <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>Assign workers dynamically</p>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <label style={{ fontWeight: '600', color: '#cbd5e1' }}>Select Line:</label>
                    <select 
                        style={{ backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '8px', padding: '10px 16px', outline: 'none', minWidth: '200px', cursor: 'pointer' }}
                        value={lineId}
                        onChange={(e) => setLineId(e.target.value)}
                    >
                        <option value="">-- Choose Line --</option>
                        {lines.map(l => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* VISUAL LAYOUT */}
            <div style={{ padding: '32px 24px' }}>
                {!lineId ? (
                    <div style={{ textAlign: 'center', padding: '80px 20px', border: '1px dashed #334155', borderRadius: '16px', backgroundColor: '#131620' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏭</div>
                        <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#fff' }}>Please Select a Line</h3>
                        <p style={{ color: '#94a3b8', marginTop: '8px' }}>Select a line from the dropdown above to view its cell layout.</p>
                    </div>
                ) : cells.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>No machines found for this line.</div>
                ) : (
                    <div>
                        {/* Line Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #1e293b' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff', margin: 0, display: 'flex', alignItems: 'center' }}>
                                🏭 {selectedLineName}
                                <span style={{ color: '#ef4444', marginLeft: '12px', fontSize: '18px' }}>
                                    ({totalAssigned}/{totalCapacity})
                                </span>
                            </h2>
                            <span style={{ backgroundColor: '#1e3a8a', color: '#60a5fa', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                                {cells.length} MACHINES
                            </span>
                        </div>

                        {/* Cells Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                            {cells.map(machine => {
                                const capacity = machine.worker_capacity || 1;
                                const assigned = getAssignedWorkers(machine.id);
                                const emptySlots = Math.max(0, capacity - assigned.length);

                                return (
                                    <div key={machine.id} style={{ backgroundColor: '#131620', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                            <h3 style={{ fontWeight: 'bold', fontSize: '15px', color: '#fff', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{machine.name}</h3>
                                            <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>{selectedLineName}</span>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {/* Render filled slots */}
                                            {assigned.map((w, idx) => (
                                                <div key={`assigned-${w.id || idx}`} style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <div style={{ fontWeight: '600', fontSize: '14px', color: '#fff' }}>{w.worker_name}</div>
                                                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{w.employee_id}</div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <span style={{ color: '#10b981', fontSize: '12px', fontWeight: 'bold' }}>✓ Assigned</span>
                                                        <button 
                                                            onClick={() => handleRemoveAssignment(w.id)}
                                                            title="Unassign Worker"
                                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}
                                                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                                                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                        >
                                                            &times;
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Render empty slots */}
                                            {Array.from({ length: emptySlots }).map((_, idx) => (
                                                <button 
                                                    key={`empty-${machine.id}-${idx}`}
                                                    onClick={() => handleAssignClick(machine)}
                                                    style={{ 
                                                        width: '100%', 
                                                        backgroundColor: 'transparent', 
                                                        border: '1px dashed #334155', 
                                                        borderRadius: '8px', 
                                                        padding: '12px', 
                                                        color: '#94a3b8', 
                                                        fontSize: '13px', 
                                                        fontWeight: '600',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        textAlign: 'left'
                                                    }}
                                                    onMouseOver={(e) => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#cbd5e1'; }}
                                                    onMouseOut={(e) => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#94a3b8'; }}
                                                >
                                                    + Assign Worker
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* ASSIGNMENT MODAL */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                    <div style={{ backgroundColor: '#131620', border: '1px solid #1e293b', width: '90%', maxWidth: '450px', borderRadius: '16px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', margin: 0 }}>Assign to {selectedMachine?.name}</h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '24px', cursor: 'pointer', padding: 0 }}>&times;</button>
                        </div>
                        
                        <div style={{ position: 'relative' }} ref={searchRef}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px' }}>Search Worker ID (e.g. EX0...)</label>
                            <input 
                                type="text"
                                autoFocus
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value.toUpperCase().replace(/\s/g, ''))}
                                placeholder="Type 3 letters to search..."
                                style={{ width: '100%', backgroundColor: '#0f111a', border: '1px solid #334155', color: '#fff', padding: '12px 16px', borderRadius: '8px', outline: 'none', fontSize: '15px' }}
                                onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                                onBlur={(e) => e.target.style.borderColor = '#334155'}
                            />
                            
                            {/* SEARCH RESULTS */}
                            {searchResults.length > 0 && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', maxHeight: '200px', overflowY: 'auto', zIndex: 60, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}>
                                    {searchResults.map(worker => (
                                        <div 
                                            key={worker.employee_id}
                                            onClick={() => handleSelectWorker(worker)}
                                            style={{ padding: '12px 16px', borderBottom: '1px solid #334155', cursor: 'pointer', transition: 'background 0.2s' }}
                                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0f111a'}
                                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '14px' }}>{worker.name}</div>
                                            <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '2px' }}>{worker.employee_id}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {isSearching && (
                                <div style={{ position: 'absolute', right: '16px', top: '40px', color: '#6366f1', fontSize: '12px', fontWeight: 'bold' }}>Searching...</div>
                            )}

                            {searchQuery.length >= 3 && searchResults.length === 0 && !isSearching && (
                                <div style={{ marginTop: '12px', color: '#ef4444', fontSize: '13px' }}>No workers found matching "{searchQuery}"</div>
                            )}
                        </div>

                        {submitting && (
                            <div style={{ marginTop: '20px', textAlign: 'center', color: '#6366f1', fontWeight: 'bold' }}>Saving assignment...</div>
                        )}
                    </div>
                </div>
            )}

            {/* TOAST */}
            {toast.show && (
                <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', backgroundColor: toast.type === 'error' ? '#ef4444' : '#10b981', color: '#fff', padding: '12px 24px', borderRadius: '30px', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 100 }}>
                    {toast.message}
                </div>
            )}
        </div>
    );
}
