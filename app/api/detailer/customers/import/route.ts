import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { detailerAuthOptions } from '@/app/api/auth-detailer/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { normalizeToE164 } from '@/lib/phone';
import { upsertCustomerSnapshot, getCustomerSnapshot } from '@/lib/customerSnapshot';

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
    
    // Find column indices — new template format
    const phoneIndex = headers.findIndex(h => h.includes('phone'));
    const nameIndex = headers.findIndex(h => h.includes('name') && !h.includes('phone'));
    const emailIndex = headers.findIndex(h => h.includes('email'));

    // Split address columns (new format)
    const address1Index = headers.findIndex(h => h === 'address 1' || h === 'address1');
    const address2Index = headers.findIndex(h => h === 'address 2' || h === 'address2');
    const cityIndex = headers.findIndex(h => h === 'city');
    const stateIndex = headers.findIndex(h => h === 'state' && !h.includes('valid'));
    const zipIndex = headers.findIndex(h => h.includes('zip'));
    // Legacy single address column (backward compat)
    const legacyAddressIndex = address1Index === -1 ? headers.findIndex(h => h === 'address') : -1;

    // Vehicles (new combined column) + legacy separate columns
    const vehiclesIndex = headers.findIndex(h => h === 'vehicles');
    const legacyVehicleIndex = vehiclesIndex === -1 ? headers.findIndex(h => h === 'vehicle' || h.includes('vehicle')) : -1;
    const legacyVehicleYearIndex = vehiclesIndex === -1 ? headers.findIndex(h => h.includes('vehicle') && h.includes('year')) : -1;
    const legacyVehicleMakeIndex = vehiclesIndex === -1 ? headers.findIndex(h => h.includes('vehicle') && h.includes('make')) : -1;
    const legacyVehicleModelIndex = vehiclesIndex === -1 ? headers.findIndex(h => h.includes('vehicle') && h.includes('model')) : -1;

    const servicesIndex = headers.findIndex(h => h.includes('service'));
    const customerTypeIndex = headers.findIndex(h => h.includes('customer') && h.includes('type'));
    const firstVisitIndex = headers.findIndex(h => h.includes('first') && h.includes('visit'));
    const lastVisitIndex = headers.findIndex(h => h.includes('last') && h.includes('visit'));
    const visitsIndex = headers.findIndex(h => h === 'visits');
    const lifetimeValueIndex = headers.findIndex(h => h.includes('lifetime') && h.includes('value'));
    const locationIndex = headers.findIndex(h => h === 'location');
    const locationTypeIndex = headers.findIndex(h => h.includes('location') && h.includes('type'));
    const technicianIndex = headers.findIndex(h => h.includes('technician'));
    const notesIndex = headers.findIndex(h => h.includes('note'));
    const petsIndex = headers.findIndex(h => h === 'pets');
    const kidsIndex = headers.findIndex(h => h === 'kids');
    const stateValidIndex = headers.findIndex(h => h.includes('state') && h.includes('valid'));

    if (phoneIndex === -1) {
      return NextResponse.json({ error: 'Phone column not found. Please ensure your file has a "Phone" column.' }, { status: 400 });
    }

    const totalRows = rows.length - 1; // exclude header
    const results = {
      success: 0,
      errors: [] as Array<{ row: number; error: string }>
    };

    // Check if client wants streaming progress
    const wantsStream = request.headers.get('accept') === 'text/event-stream';

    // For streaming, set up an encoder and a writable controller
    let streamController: ReadableStreamDefaultController | null = null;
    const encoder = new TextEncoder();

    function sendProgress(current: number) {
      if (streamController) {
        try {
          const data = JSON.stringify({
            type: 'progress',
            current,
            total: totalRows,
            success: results.success,
            errorCount: results.errors.length,
          });
          streamController.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch { /* stream may have been closed */ }
      }
    }

    function sendComplete() {
      if (streamController) {
        try {
          const data = JSON.stringify({
            type: 'complete',
            success: results.success,
            errors: results.errors,
          });
          streamController.enqueue(encoder.encode(`data: ${data}\n\n`));
          streamController.close();
        } catch { /* stream may have been closed */ }
      }
    }

    // Helper: parse a vehicle string like "2020 Toyota Camry" or "Toyota Camry 2020"
    function parseVehicleString(v: string): { vehicle: string; year?: number; make?: string; model?: string } {
      const trimmed = v.trim();
      if (!trimmed) return { vehicle: '' };

      // Try "Year Make Model" pattern
      const ymm = trimmed.match(/^((?:19|20)\d{2})\s+([A-Za-z][A-Za-z\-]+)\s+(.+)$/);
      if (ymm) {
        return { vehicle: trimmed, year: parseInt(ymm[1], 10), make: ymm[2], model: ymm[3] };
      }

      // Try "Make Model Year" pattern
      const mmy = trimmed.match(/^([A-Za-z][A-Za-z\-]+)\s+(.+?)\s+((?:19|20)\d{2})$/);
      if (mmy) {
        return { vehicle: trimmed, year: parseInt(mmy[3], 10), make: mmy[1], model: mmy[2] };
      }

      // Try "Make Model" pattern (no year)
      const mm = trimmed.match(/^([A-Za-z][A-Za-z\-]+)\s+(.+)$/);
      if (mm) {
        return { vehicle: trimmed, make: mm[1], model: mm[2] };
      }

      return { vehicle: trimmed };
    }

    // Helper: parse lifetime value from "$1,272.00" format
    function parseLifetimeValue(val: string): number | undefined {
      if (!val) return undefined;
      const cleaned = val.replace(/[$,\s]/g, '');
      const num = parseFloat(cleaned);
      return Number.isFinite(num) ? num : undefined;
    }

    // Helper: build concatenated address from split columns
    function buildAddress(row: string[]): string | undefined {
      if (address1Index >= 0) {
        const addr1 = row[address1Index]?.trim() || '';
        const addr2 = address2Index >= 0 ? row[address2Index]?.trim() || '' : '';
        const city = cityIndex >= 0 ? row[cityIndex]?.trim() || '' : '';
        const state = stateIndex >= 0 ? row[stateIndex]?.trim() || '' : '';
        const rawZip = zipIndex >= 0 ? row[zipIndex]?.trim() || '' : '';
        const zip = rawZip && /^\d{1,4}$/.test(rawZip) ? rawZip.padStart(5, '0') : rawZip;

        if (!addr1 && !city && !state && !zip) return undefined;

        // Build street line: "123 Main St, Apt 4" or just "123 Main St"
        const streetParts = [addr1, addr2].filter(Boolean);
        const street = streetParts.join(', ');

        // Build city/state/zip: "Boston, MA 02101"
        const stateZip = [state, zip].filter(Boolean).join(' ');
        const cityStateParts = [city, stateZip].filter(Boolean);
        const cityState = cityStateParts.join(', ');

        return [street, cityState].filter(Boolean).join(', ') || undefined;
      }

      // Legacy single address column
      if (legacyAddressIndex >= 0) {
        return row[legacyAddressIndex]?.trim() || undefined;
      }

      return undefined;
    }

    // Core row-processing logic (used by both streaming and non-streaming paths)
    async function processRows() {
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 1;
        const currentIndex = i; // 1-based progress (row 1 of N)

        try {
          const phone = row[phoneIndex]?.trim();
          if (!phone) {
            results.errors.push({ row: rowNumber, error: 'Phone number is required' });
            if (currentIndex % 10 === 0 || currentIndex === totalRows) sendProgress(currentIndex);
            continue;
          }

          const normalizedPhone = normalizeToE164(phone) || phone;

          const name = nameIndex >= 0 ? row[nameIndex]?.trim() : undefined;
          const email = emailIndex >= 0 ? row[emailIndex]?.trim() : undefined;
          const address = buildAddress(row);
          const locationType = (locationIndex >= 0 ? row[locationIndex]?.trim() : undefined)
            || (locationTypeIndex >= 0 ? row[locationTypeIndex]?.trim() : undefined);
          const customerType = customerTypeIndex >= 0 ? row[customerTypeIndex]?.trim() : undefined;

          let vehicle: string | undefined;
          let vehicleYear: number | undefined;
          let vehicleMake: string | undefined;
          let vehicleModel: string | undefined;
          let vehiclesArray: string[] = [];

          if (vehiclesIndex >= 0) {
            const vehiclesStr = row[vehiclesIndex]?.trim() || '';
            if (vehiclesStr) {
              vehiclesArray = vehiclesStr.split(/[;]/).map(s => s.trim()).filter(Boolean);
              if (vehiclesArray.length > 0) {
                const parsed = parseVehicleString(vehiclesArray[0]);
                vehicle = parsed.vehicle || undefined;
                vehicleYear = parsed.year;
                vehicleMake = parsed.make;
                vehicleModel = parsed.model;
              }
            }
          } else if (legacyVehicleIndex >= 0) {
            vehicle = row[legacyVehicleIndex]?.trim() || undefined;
            vehicleYear = legacyVehicleYearIndex >= 0 ? (row[legacyVehicleYearIndex]?.trim() ? parseInt(row[legacyVehicleYearIndex].trim()) : undefined) : undefined;
            vehicleMake = legacyVehicleMakeIndex >= 0 ? row[legacyVehicleMakeIndex]?.trim() || undefined : undefined;
            vehicleModel = legacyVehicleModelIndex >= 0 ? row[legacyVehicleModelIndex]?.trim() || undefined : undefined;
            if (vehicle) vehiclesArray = [vehicle];
          }

          const servicesStr = servicesIndex >= 0 ? row[servicesIndex]?.trim() : undefined;
          let services: string[] | null = null;
          if (servicesStr) {
            services = servicesStr.split(/[;,]/).map(s => s.trim()).filter(Boolean);
          }

          const notes = notesIndex >= 0 ? row[notesIndex]?.trim() : undefined;
          const firstVisitStr = firstVisitIndex >= 0 ? row[firstVisitIndex]?.trim() : undefined;
          const lastVisitStr = lastVisitIndex >= 0 ? row[lastVisitIndex]?.trim() : undefined;
          const visitsStr = visitsIndex >= 0 ? row[visitsIndex]?.trim() : undefined;
          const lifetimeValueStr = lifetimeValueIndex >= 0 ? row[lifetimeValueIndex]?.trim() : undefined;
          const technician = technicianIndex >= 0 ? row[technicianIndex]?.trim() : undefined;
          const pets = petsIndex >= 0 ? row[petsIndex]?.trim() : undefined;
          const kids = kidsIndex >= 0 ? row[kidsIndex]?.trim() : undefined;
          const stateValidStr = stateValidIndex >= 0 ? row[stateValidIndex]?.trim() : undefined;

          const snapshotData: Record<string, unknown> = {};
          if (notes) snapshotData.notes = notes;
          if (vehiclesArray.length > 0) snapshotData.vehicles = vehiclesArray;
          if (firstVisitStr) snapshotData.importedFirstVisit = firstVisitStr;
          if (lastVisitStr) snapshotData.importedLastVisit = lastVisitStr;
          if (visitsStr) {
            const visitsNum = parseInt(visitsStr, 10);
            if (Number.isFinite(visitsNum)) snapshotData.importedVisitCount = visitsNum;
          }
          if (lifetimeValueStr) {
            const ltv = parseLifetimeValue(lifetimeValueStr);
            if (ltv !== undefined) snapshotData.importedLifetimeValue = ltv;
          }
          if (technician) snapshotData.technician = technician;
          if (pets) snapshotData.pets = pets;
          if (kids) snapshotData.kids = kids;
          if (stateValidStr) {
            snapshotData.stateValid = stateValidStr.toUpperCase() === 'TRUE';
          }

          // Merge data with existing snapshot to avoid overwriting previously imported fields
          let mergedData: Record<string, unknown> | null = Object.keys(snapshotData).length > 0 ? snapshotData : null;

          if (mergedData) {
            const existing = await getCustomerSnapshot(detailerId, normalizedPhone);
            if (existing?.data && typeof existing.data === 'object') {
              const existingData = existing.data as Record<string, unknown>;

              if (existingData.importedFirstVisit && mergedData.importedFirstVisit) {
                const existDate = new Date(existingData.importedFirstVisit as string);
                const newDate = new Date(mergedData.importedFirstVisit as string);
                if (!isNaN(existDate.getTime()) && !isNaN(newDate.getTime())) {
                  mergedData.importedFirstVisit = existDate < newDate
                    ? existingData.importedFirstVisit : mergedData.importedFirstVisit;
                }
              }
              if (existingData.importedLastVisit && mergedData.importedLastVisit) {
                const existDate = new Date(existingData.importedLastVisit as string);
                const newDate = new Date(mergedData.importedLastVisit as string);
                if (!isNaN(existDate.getTime()) && !isNaN(newDate.getTime())) {
                  mergedData.importedLastVisit = existDate > newDate
                    ? existingData.importedLastVisit : mergedData.importedLastVisit;
                }
              }
              if (existingData.importedVisitCount && mergedData.importedVisitCount) {
                const existCount = Number(existingData.importedVisitCount);
                const newCount = Number(mergedData.importedVisitCount);
                if (Number.isFinite(existCount) && Number.isFinite(newCount)) {
                  mergedData.importedVisitCount = Math.max(existCount, newCount);
                }
              }

              if (existingData.vehicles && mergedData.vehicles) {
                const existVehicles = Array.isArray(existingData.vehicles) ? existingData.vehicles : [];
                const newVehicles = Array.isArray(mergedData.vehicles) ? mergedData.vehicles : [];
                const combined = [...new Set([...existVehicles, ...newVehicles])];
                mergedData.vehicles = combined;
              }

              mergedData = { ...existingData, ...mergedData };
            }
          }

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
            data: mergedData
          });

          results.success++;
        } catch (error: any) {
          results.errors.push({
            row: rowNumber,
            error: error.message || 'Unknown error processing row'
          });
        }

        // Send progress every 10 rows or on the last row
        if (currentIndex % 10 === 0 || currentIndex === totalRows) {
          sendProgress(currentIndex);
        }
      }
    }

    if (wantsStream) {
      const stream = new ReadableStream({
        async start(controller) {
          streamController = controller;
          try {
            // Send initial event with total count
            const initData = JSON.stringify({ type: 'init', total: totalRows });
            controller.enqueue(encoder.encode(`data: ${initData}\n\n`));

            await processRows();
            sendComplete();
          } catch (err: any) {
            try {
              const errData = JSON.stringify({ type: 'error', error: err.message || 'Import failed' });
              controller.enqueue(encoder.encode(`data: ${errData}\n\n`));
              controller.close();
            } catch { /* stream closed */ }
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Non-streaming fallback (original behavior)
    await processRows();
    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Error importing customers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import customers' },
      { status: 500 }
    );
  }
}

