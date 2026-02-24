import assert from 'node:assert/strict';
import { parseVehicleInput, normalizeVehicles } from '@/lib/vehicleValidation';

function run() {
  const parsedF150 = parseVehicleInput('F-150');
  assert.equal(parsedF150.make, 'Ford');
  assert.equal(parsedF150.model, 'F-150');

  const parsedCrv = parseVehicleInput('crv');
  assert.equal(parsedCrv.make, 'Honda');
  assert.equal(parsedCrv.model, 'CR-V');

  const normalized = normalizeVehicles(['f150', 'CRV', 'Model 3']);
  assert.deepEqual(normalized.vehicles, ['F-150', 'CR-V', 'Model 3']);
  assert.equal(normalized.vehicleMake, 'Ford');

  console.log('Vehicle normalization tests passed');
}

run();

