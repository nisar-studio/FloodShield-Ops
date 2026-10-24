const SCENARIO_MODES = new Set(['live', 'replay']);
const FACILITY_TYPES = new Set(['hospital', 'shelter']);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function validateScenario(scenario) {
  const errors = [];

  if (!isPlainObject(scenario)) {
    return { valid: false, errors: ['scenario must be an object'] };
  }

  if (!isNonEmptyString(scenario.scenarioId)) {
    errors.push('scenario.scenarioId must be a non-empty string');
  }

  if (!SCENARIO_MODES.has(scenario.mode)) {
    errors.push('scenario.mode must be "live" or "replay"');
  }

  if (!isNonEmptyString(scenario.areaName)) {
    errors.push('scenario.areaName must be a non-empty string');
  }

  if (!isPlainObject(scenario.bbox)) {
    errors.push('scenario.bbox must be an object');
  } else {
    const { south, north, west, east } = scenario.bbox;
    if (!isFiniteNumber(south) || south < -90 || south > 90) {
      errors.push('scenario.bbox.south must be a latitude');
    }
    if (!isFiniteNumber(north) || north < -90 || north > 90) {
      errors.push('scenario.bbox.north must be a latitude');
    }
    if (isFiniteNumber(south) && isFiniteNumber(north) && south >= north) {
      errors.push('scenario.bbox.south must be less than scenario.bbox.north');
    }
    if (!isFiniteNumber(west) || west < -180 || west > 180) {
      errors.push('scenario.bbox.west must be a longitude');
    }
    if (!isFiniteNumber(east) || east < -180 || east > 180) {
      errors.push('scenario.bbox.east must be a longitude');
    }
    if (isFiniteNumber(west) && isFiniteNumber(east) && west >= east) {
      errors.push('scenario.bbox.west must be less than scenario.bbox.east');
    }
  }

  if (!isPlainObject(scenario.rainfall)) {
    errors.push('scenario.rainfall must be an object');
  } else {
    const { totalMm, durationHours, hourlyMm } = scenario.rainfall;
    if (!isFiniteNumber(totalMm) || totalMm < 0) {
      errors.push('scenario.rainfall.totalMm must be a non-negative number');
    }
    if (!isFiniteNumber(durationHours) || durationHours <= 0) {
      errors.push('scenario.rainfall.durationHours must be greater than zero');
    }
    if (
      !Array.isArray(hourlyMm) ||
      hourlyMm.some((amount) => !isFiniteNumber(amount) || amount < 0)
    ) {
      errors.push('scenario.rainfall.hourlyMm must contain non-negative numbers');
    }
  }

  if (!isNonEmptyString(scenario.source)) {
    errors.push('scenario.source must be a non-empty string');
  }

  return { valid: errors.length === 0, errors };
}

function validateFacility(facility, index = 0) {
  const errors = [];
  const prefix = `facilities[${index}]`;

  if (!isPlainObject(facility)) {
    return { valid: false, errors: [`${prefix} must be an object`] };
  }
  if (!isNonEmptyString(facility.id)) errors.push(`${prefix}.id must be a non-empty string`);
  if (!FACILITY_TYPES.has(facility.type)) {
    errors.push(`${prefix}.type must be "hospital" or "shelter"`);
  }
  if (!isNonEmptyString(facility.name)) errors.push(`${prefix}.name must be a non-empty string`);
  if (!isFiniteNumber(facility.lat) || facility.lat < -90 || facility.lat > 90) {
    errors.push(`${prefix}.lat must be a latitude`);
  }
  if (!isFiniteNumber(facility.lng) || facility.lng < -180 || facility.lng > 180) {
    errors.push(`${prefix}.lng must be a longitude`);
  }
  if (!isNonEmptyString(facility.nodeId)) {
    errors.push(`${prefix}.nodeId must be a non-empty string`);
  }

  return { valid: errors.length === 0, errors };
}

function validateHotspot(hotspot, index = 0) {
  const errors = [];
  const prefix = `hotspots[${index}]`;

  if (!isPlainObject(hotspot)) {
    return { valid: false, errors: [`${prefix} must be an object`] };
  }
  if (!isNonEmptyString(hotspot.id)) errors.push(`${prefix}.id must be a non-empty string`);
  if (!isNonEmptyString(hotspot.name)) errors.push(`${prefix}.name must be a non-empty string`);
  if (!isFiniteNumber(hotspot.lat) || hotspot.lat < -90 || hotspot.lat > 90) {
    errors.push(`${prefix}.lat must be a latitude`);
  }
  if (!isFiniteNumber(hotspot.lng) || hotspot.lng < -180 || hotspot.lng > 180) {
    errors.push(`${prefix}.lng must be a longitude`);
  }
  if (!isFiniteNumber(hotspot.riskScore) || hotspot.riskScore < 0 || hotspot.riskScore > 1) {
    errors.push(`${prefix}.riskScore must be between 0 and 1`);
  }
  if (
    !Array.isArray(hotspot.reasons) ||
    hotspot.reasons.some((reason) => !isNonEmptyString(reason))
  ) {
    errors.push(`${prefix}.reasons must contain strings`);
  }
  if (
    !Array.isArray(hotspot.floodedEdgeIds) ||
    hotspot.floodedEdgeIds.some((edgeId) => !isNonEmptyString(edgeId))
  ) {
    errors.push(`${prefix}.floodedEdgeIds must contain strings`);
  }

  return { valid: errors.length === 0, errors };
}

function validateScenarioBundle(bundle) {
  const errors = [];

  if (!isPlainObject(bundle)) {
    return { valid: false, errors: ['scenario bundle must be an object'] };
  }

  const scenarioResult = validateScenario(bundle.scenario);
  errors.push(...scenarioResult.errors);

  if (!Array.isArray(bundle.facilities)) {
    errors.push('facilities must be an array');
  } else {
    const facilityIds = new Set();
    bundle.facilities.forEach((facility, index) => {
      const result = validateFacility(facility, index);
      errors.push(...result.errors);
      if (isNonEmptyString(facility?.id)) {
        if (facilityIds.has(facility.id)) errors.push(`duplicate facility id: ${facility.id}`);
        facilityIds.add(facility.id);
      }
    });
  }

  if (!Array.isArray(bundle.hotspots)) {
    errors.push('hotspots must be an array');
  } else {
    const hotspotIds = new Set();
    bundle.hotspots.forEach((hotspot, index) => {
      const result = validateHotspot(hotspot, index);
      errors.push(...result.errors);
      if (isNonEmptyString(hotspot?.id)) {
        if (hotspotIds.has(hotspot.id)) errors.push(`duplicate hotspot id: ${hotspot.id}`);
        hotspotIds.add(hotspot.id);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

module.exports = {
  validateScenario,
  validateFacility,
  validateHotspot,
  validateScenarioBundle,
};
