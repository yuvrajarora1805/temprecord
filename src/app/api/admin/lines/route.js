import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const linesFilePath = path.join(process.cwd(), 'src', 'data', 'lines.json');

export async function POST(request) {
    try {
        const body = await request.json();
        const { name } = body;

        if (!name) {
            return NextResponse.json({ success: false, error: 'Line name is required' }, { status: 400 });
        }

        // Read existing file
        let linesData = { data: [] };
        try {
            const fileContent = await fs.readFile(linesFilePath, 'utf8');
            linesData = JSON.parse(fileContent);
        } catch (e) {
            // File might not exist
        }

        // Add new line
        const newId = linesData.data.length > 0 ? Math.max(...linesData.data.map(l => l.id)) + 1 : 1;
        const newLine = {
            id: newId,
            name: name,
            is_active: 1
        };

        linesData.data.push(newLine);

        // Write back
        await fs.writeFile(linesFilePath, JSON.stringify(linesData, null, 2), 'utf8');

        return NextResponse.json({ success: true, line: newLine });
    } catch (error) {
        console.error('Add Line API Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
