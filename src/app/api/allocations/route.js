import { workermanagePool, tempassignmentsPool } from '@/lib/db';
import { NextResponse } from 'next/server';
import linesData from '@/data/lines.json';
import machinesData from '@/data/machines.json';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const getLines = searchParams.get('lines');
    const lineIdForCells = searchParams.get('line_id');
    const searchEmp = searchParams.get('search_emp');

    try {
        if (getLines) {
            // Serve the lines from the provided JSON file, filtering for active ones
            const activeLines = linesData.data.filter(l => l.is_active === 1);
            return NextResponse.json({ success: true, lines: activeLines });
        }

        if (lineIdForCells) {
            // Serve the machines from the static JSON file
            const lineIdNum = parseInt(lineIdForCells);
            const machines = machinesData.data
                .filter(m => m.line_id === lineIdNum && m.is_active === 1)
                .sort((a, b) => a.position - b.position);

            // Fetch temporary allocations from temp DB
            const allocationDate = searchParams.get('date');
            const tempConn = await tempassignmentsPool.getConnection();
            let allocations = [];
            try {
                let query = 'SELECT id, machine_id, employee_id, worker_name FROM temp_allocations WHERE line_id = ? AND allocation_date = CURDATE()';
                let queryParams = [lineIdForCells];
                
                if (allocationDate) {
                    query = 'SELECT id, machine_id, employee_id, worker_name FROM temp_allocations WHERE line_id = ? AND allocation_date = ?';
                    queryParams.push(allocationDate);
                }

                const [rows] = await tempConn.query(query, queryParams);
                allocations = rows;
            } finally {
                tempConn.release();
            }

            return NextResponse.json({ success: true, cells: machines, allocations });
        }

        if (searchEmp) {
            const connection = await workermanagePool.getConnection();
            try {
                // Auto-complete search (LIMIT 10 to not overwhelm UI)
                const [rows] = await connection.query(
                    'SELECT employee_id, name FROM workers WHERE employee_id LIKE ? AND is_active = 1 LIMIT 10',
                    [`${searchEmp}%`]
                );
                return NextResponse.json({ success: true, workers: rows });
            } finally {
                connection.release();
            }
        }

        return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { line_id, machine_id, employee_id, worker_name, date } = body;

        if (!line_id || !machine_id || !employee_id) {
            return NextResponse.json({ success: false, error: 'Line, Cell, and Employee ID are required' }, { status: 400 });
        }

        const connection = await tempassignmentsPool.getConnection();
        try {
            const allocationDate = date || new Date().toISOString().split('T')[0];
            const [result] = await connection.query(
                'INSERT INTO temp_allocations (line_id, machine_id, employee_id, worker_name, allocation_date) VALUES (?, ?, ?, ?, ?)',
                [line_id, machine_id, employee_id, worker_name || null, allocationDate]
            );

            return NextResponse.json({ success: true, message: 'Temporary allocation recorded successfully!', id: result.insertId });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error saving temp allocation:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, error: 'Allocation ID is required' }, { status: 400 });
        }

        const connection = await tempassignmentsPool.getConnection();
        try {
            await connection.query('DELETE FROM temp_allocations WHERE id = ?', [id]);
            return NextResponse.json({ success: true, message: 'Assignment removed successfully!' });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error deleting temp allocation:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
