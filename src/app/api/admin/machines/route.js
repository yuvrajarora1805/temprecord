import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const machinesFilePath = path.join(process.cwd(), 'src', 'data', 'machines.json');

export async function POST(request) {
    try {
        const body = await request.json();
        const { name, line_id, position, worker_capacity } = body;

        if (!name || !line_id) {
            return NextResponse.json({ success: false, error: 'Machine name and Line ID are required' }, { status: 400 });
        }

        // Read existing file
        let machinesData = { data: [] };
        try {
            const fileContent = await fs.readFile(machinesFilePath, 'utf8');
            machinesData = JSON.parse(fileContent);
        } catch (e) {
            // File might not exist
        }

        // Add new machine
        const newId = machinesData.data.length > 0 ? Math.max(...machinesData.data.map(m => m.id)) + 1 : 1;
        const newMachine = {
            id: newId,
            line_id: parseInt(line_id),
            name: name,
            position: position ? parseInt(position) : (machinesData.data.filter(m => m.line_id === parseInt(line_id)).length + 1),
            worker_capacity: worker_capacity ? parseInt(worker_capacity) : 1,
            is_active: 1
        };

        machinesData.data.push(newMachine);

        // Write back
        await fs.writeFile(machinesFilePath, JSON.stringify(machinesData, null, 2), 'utf8');

        return NextResponse.json({ success: true, machine: newMachine });
    } catch (error) {
        console.error('Add Machine API Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
