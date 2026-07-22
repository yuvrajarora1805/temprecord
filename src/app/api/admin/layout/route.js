import { tempassignmentsPool } from '@/lib/db';
import { NextResponse } from 'next/server';
import linesData from '@/data/lines.json';
import machinesData from '@/data/machines.json';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const dateParam = searchParams.get('date');
        
        // 1. Fetch active lines
        const activeLines = linesData.data.filter(l => l.is_active === 1);
        
        // 2. Fetch active machines
        const activeMachines = machinesData.data.filter(m => m.is_active === 1);
        
        // 3. Fetch allocations for the specified date, or today
        const tempConn = await tempassignmentsPool.getConnection();
        let allocations = [];
        try {
            let query = 'SELECT id, line_id, machine_id, employee_id, worker_name FROM temp_allocations WHERE allocation_date = CURDATE()';
            let queryParams = [];
            
            if (dateParam) {
                query = 'SELECT id, line_id, machine_id, employee_id, worker_name FROM temp_allocations WHERE allocation_date = ?';
                queryParams.push(dateParam);
            }
            
            const [rows] = await tempConn.query(query, queryParams);
            allocations = rows;
        } finally {
            tempConn.release();
        }
        
        // 4. Build layout structure
        const layout = activeLines.map(line => {
            const lineMachines = activeMachines
                .filter(m => m.line_id === line.id)
                .sort((a, b) => a.position - b.position)
                .map(machine => {
                    const machineAllocations = allocations.filter(a => a.machine_id === machine.id);
                    return {
                        ...machine,
                        assigned: machineAllocations.map(a => ({
                            id: a.id,
                            employee_id: a.employee_id,
                            worker_name: a.worker_name
                        }))
                    };
                });
                
            return {
                ...line,
                machines: lineMachines
            };
        });
        
        return NextResponse.json({ success: true, layout });
    } catch (error) {
        console.error('Admin Layout API Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
