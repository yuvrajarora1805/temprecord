import { tempassignmentsPool } from '@/lib/db';
import { NextResponse } from 'next/server';
import linesData from '@/data/lines.json';
import machinesData from '@/data/machines.json';

export async function GET() {
    try {
        const activeLines = linesData.data.filter(l => l.is_active === 1);
        const activeMachines = machinesData.data.filter(m => m.is_active === 1);

        const connection = await tempassignmentsPool.getConnection();
        let allocations = [];
        try {
            const [rows] = await connection.query(
                'SELECT id, line_id, machine_id, employee_id, worker_name FROM temp_allocations WHERE DATE(created_at) = CURDATE()'
            );
            allocations = rows;
        } finally {
            connection.release();
        }

        // Combine the data
        const layout = activeLines.map(line => {
            const lineMachines = activeMachines
                .filter(m => m.line_id === line.id)
                .sort((a, b) => a.position - b.position)
                .map(machine => {
                    const assignedWorkers = allocations.filter(a => a.machine_id === machine.id);
                    return {
                        ...machine,
                        assigned: assignedWorkers
                    };
                });
            return {
                ...line,
                machines: lineMachines
            };
        });

        // Filter out lines that have no active machines
        const filteredLayout = layout.filter(line => line.machines.length > 0);

        return NextResponse.json({ success: true, layout: filteredLayout });
    } catch (error) {
        console.error('Admin Layout API Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
