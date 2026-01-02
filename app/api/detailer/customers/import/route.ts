import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { detailerAuthOptions } from '@/app/api/auth-detailer/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { normalizeToE164 } from '@/lib/phone';
import { upsertCustomerSnapshot } from '@/lib/customerSnapshot';

// Simple CSV parser
function parseCSV(csvText: string): string[][] {
  const lines: string[] = [];
  let currentLine: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentLine.push(currentField.trim());
      currentField = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (currentField || currentLine.length > 0) {
        currentLine.push(currentField.trim());
        currentField = '';
        lines.push(currentLine);
        currentLine = [];
      }
      if (char === '\r' && nextChar === '\n') {
        i++; // Skip \n after \r
      }
    } else {
      currentField += char;
    }
  }

  // Add last field and line
  if (currentField || currentLine.length > 0) {
    currentLine.push(currentField.trim());
    lines.push(currentLine);
  }

  return lines;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(detailerAuthOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const detailerId = session.user.id;
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Read file content
    const fileContent = await file.text();
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    let rows: string[][] = [];

    if (fileExtension === 'csv') {
      rows = parseCSV(fileContent);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // For Excel files, we'll need to use a library
      // For now, return an error suggesting CSV
      return NextResponse.json(
        { error: 'Excel files (.xlsx, .xls) are not yet supported. Please convert to CSV format.' },
        { status: 400 }
      );
    } else {
      return NextResponse.json({ error: 'Unsupported file format' }, { status: 400 });
    }

    if (rows.length < 2) {
      return NextResponse.json({ error: 'File must contain at least a header row and one data row' }, { status: 400 });
    }

    // Parse header row
    const headers = rows[0].map(h => h.trim().toLowerCase());
    
    // Find column indices
    const phoneIndex = headers.findIndex(h => h.includes('phone'));
    const nameIndex = headers.findIndex(h => h.includes('name') && !h.includes('phone'));
    const emailIndex = headers.findIndex(h => h.includes('email'));
    const addressIndex = headers.findIndex(h => h.includes('address'));
    const locationTypeIndex = headers.findIndex(h => h.includes('location') && h.includes('type'));
    const customerTypeIndex = headers.findIndex(h => h.includes('customer') && h.includes('type'));
    const vehicleIndex = headers.findIndex(h => h === 'vehicle' || h.includes('vehicle'));
    const vehicleYearIndex = headers.findIndex(h => h.includes('vehicle') && h.includes('year'));
    const vehicleMakeIndex = headers.findIndex(h => h.includes('vehicle') && h.includes('make'));
    const vehicleModelIndex = headers.findIndex(h => h.includes('vehicle') && h.includes('model'));
    const servicesIndex = headers.findIndex(h => h.includes('service'));
    const notesIndex = headers.findIndex(h => h.includes('note'));

    if (phoneIndex === -1) {
      return NextResponse.json({ error: 'Phone column not found. Please ensure your file has a "Phone" column.' }, { status: 400 });
    }

    const results = {
      success: 0,
      errors: [] as Array<{ row: number; error: string }>
    };

    // Process each row (skip header)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 1; // 1-indexed for user display

      try {
        // Get phone (required)
        const phone = row[phoneIndex]?.trim();
        if (!phone) {
          results.errors.push({ row: rowNumber, error: 'Phone number is required' });
          continue;
        }

        // Normalize phone number
        const normalizedPhone = normalizeToE164(phone) || phone;

        // Get other fields
        const name = nameIndex >= 0 ? row[nameIndex]?.trim() : undefined;
        const email = emailIndex >= 0 ? row[emailIndex]?.trim() : undefined;
        const address = addressIndex >= 0 ? row[addressIndex]?.trim() : undefined;
        const locationType = locationTypeIndex >= 0 ? row[locationTypeIndex]?.trim() : undefined;
        const customerType = customerTypeIndex >= 0 ? row[customerTypeIndex]?.trim() : undefined;
        const vehicle = vehicleIndex >= 0 ? row[vehicleIndex]?.trim() : undefined;
        const vehicleYear = vehicleYearIndex >= 0 ? (row[vehicleYearIndex]?.trim() ? parseInt(row[vehicleYearIndex].trim()) : undefined) : undefined;
        const vehicleMake = vehicleMakeIndex >= 0 ? row[vehicleMakeIndex]?.trim() : undefined;
        const vehicleModel = vehicleModelIndex >= 0 ? row[vehicleModelIndex]?.trim() : undefined;
        const servicesStr = servicesIndex >= 0 ? row[servicesIndex]?.trim() : undefined;
        const notes = notesIndex >= 0 ? row[notesIndex]?.trim() : undefined;

        // Parse services (can be semicolon or comma separated)
        let services: string[] | null = null;
        if (servicesStr) {
          services = servicesStr.split(/[;,]/).map(s => s.trim()).filter(Boolean);
        }

        // Prepare data object for notes
        let snapshotData: any = {};
        if (notes) {
          snapshotData.notes = notes;
        }

        // Upsert customer snapshot
        await upsertCustomerSnapshot(detailerId, normalizedPhone, {
          customerName: name || null,
          customerEmail: email || null,
          address: address || null,
          locationType: locationType || null,
          customerType: customerType || null,
          vehicle: vehicle || null,
          vehicleYear: vehicleYear || null,
          vehicleMake: vehicleMake || null,
          vehicleModel: vehicleModel || null,
          services: services || null,
          data: Object.keys(snapshotData).length > 0 ? snapshotData : null
        });

        results.success++;
      } catch (error: any) {
        results.errors.push({
          row: rowNumber,
          error: error.message || 'Unknown error processing row'
        });
      }
    }

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Error importing customers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import customers' },
      { status: 500 }
    );
  }
}

