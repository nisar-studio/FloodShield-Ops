const SCENARIO_MODES = new Set(['live', 'replay']);
const FACILITY_TYPES = new Set(['hospital', 'shelter']);
const ACTION_TYPES = new Set([
  'road_closure',
  'diversion',
  'pump_prepositioning',
  'ambulance_staging',
]);
const PLAN_STATUSES = new Set([
  'proposed',
  'verified',
  'rejected',
  'approved',
  'executed_sandbox',
]);
const SCENARIO_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function hasOnlyKeys(value, allowedKeys, prefix, errors) {
  if (!isPlainObject(value)) return;

  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      errors.push(`${prefix}.${key} is not allowed`);
    }
  }
}

function validateStringArray(value, prefix, errors) {
  if (!Array.isArray(value) || value.some((item) => !isNonEmptyString(item))) {
    errors.push(`${prefix} must contain strings`);
    return false;
  }

  return true;
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

function validateAction(action, index = 0) {
  const errors = [];
  const prefix = `actions[${index}]`;
  const targetPrefix = `${prefix}.target`;

  if (!isPlainObject(action)) {
    return { valid: false, errors: [`${prefix} must be an object`] };
  }

  hasOnlyKeys(
    action,
    new Set(['actionId', 'type', 'target', 'rationale', 'evidence', 'confidence']),
    prefix,
    errors,
  );

  if (!isNonEmptyString(action.actionId)) {
    errors.push(`${prefix}.actionId must be a non-empty string`);
  }
  if (!ACTION_TYPES.has(action.type)) {
    errors.push(`${prefix}.type is unsupported`);
  }

  if (!isPlainObject(action.target)) {
    errors.push(`${targetPrefix} must be an object`);
  } else {
    hasOnlyKeys(action.target, new Set(['edgeIds', 'label']), targetPrefix, errors);
    if (
      !Array.isArray(action.target.edgeIds) ||
      action.target.edgeIds.length === 0 ||
      action.target.edgeIds.some((edgeId) => !isNonEmptyString(edgeId))
    ) {
      errors.push(`${targetPrefix}.edgeIds must contain at least one string`);
    }
    if (!isNonEmptyString(action.target.label)) {
      errors.push(`${targetPrefix}.label must be a non-empty string`);
    }
  }

  if (!isNonEmptyString(action.rationale)) {
    errors.push(`${prefix}.rationale must be a non-empty string`);
  }
  validateStringArray(action.evidence, `${prefix}.evidence`, errors);
  if (!isFiniteNumber(action.confidence) || action.confidence < 0 || action.confidence > 1) {
    errors.push(`${prefix}.confidence must be between 0 and 1`);
  }

  return { valid: errors.length === 0, errors };
}

function validatePlan(plan) {
  const errors = [];

  if (!isPlainObject(plan)) {
    return { valid: false, errors: ['plan must be an object'] };
  }

  hasOnlyKeys(
    plan,
    new Set(['planId', 'scenarioId', 'iteration', 'actions', 'status']),
    'plan',
    errors,
  );

  if (!isNonEmptyString(plan.planId)) {
    errors.push('plan.planId must be a non-empty string');
  }
  if (!isNonEmptyString(plan.scenarioId) || !SCENARIO_ID_PATTERN.test(plan.scenarioId || '')) {
    errors.push('plan.scenarioId must be a valid scenario identifier');
  }
  if (!Number.isInteger(plan.iteration) || plan.iteration < 1 || plan.iteration > 3) {
    errors.push('plan.iteration must be an integer from 1 to 3');
  }
  if (!Array.isArray(plan.actions)) {
    errors.push('plan.actions must be an array');
  } else {
    plan.actions.forEach((action, index) => {
      errors.push(...validateAction(action, index).errors);
    });
  }
  if (!PLAN_STATUSES.has(plan.status)) {
    errors.push('plan.status is unsupported');
  }

  return { valid: errors.length === 0, errors };
}

function validateMinutes(value, prefix, reachable, errors) {
  if (reachable) {
    if (!isFiniteNumber(value) || value < 0) {
      errors.push(`${prefix} must be a non-negative number when reachable`);
    }
  } else if (value !== null) {
    errors.push(`${prefix} must be null when unreachable`);
  }
}

function validateSimulationResult(simulation) {
  const errors = [];

  if (!isPlainObject(simulation)) {
    return { valid: false, errors: ['simulation must be an object'] };
  }

  hasOnlyKeys(
    simulation,
    new Set([
      'planId',
      'baselineScore',
      'planScore',
      'threshold',
      'passed',
      'perFacility',
      'floodedEdgeIds',
    ]),
    'simulation',
    errors,
  );

  if (!isNonEmptyString(simulation.planId)) {
    errors.push('simulation.planId must be a non-empty string');
  }
  for (const field of ['baselineScore', 'planScore', 'threshold']) {
    if (!isFiniteNumber(simulation[field]) || simulation[field] < 0 || simulation[field] > 1) {
      errors.push(`simulation.${field} must be between 0 and 1`);
    }
  }
  if (typeof simulation.passed !== 'boolean') {
    errors.push('simulation.passed must be a boolean');
  } else if (
    isFiniteNumber(simulation.planScore) &&
    isFiniteNumber(simulation.threshold) &&
    simulation.passed !== (simulation.planScore >= simulation.threshold)
  ) {
    errors.push('simulation.passed must match planScore >= threshold');
  }

  if (!Array.isArray(simulation.perFacility)) {
    errors.push('simulation.perFacility must be an array');
  } else {
    const facilityIds = new Set();
    simulation.perFacility.forEach((facility, index) => {
      const prefix = `simulation.perFacility[${index}]`;
      if (!isPlainObject(facility)) {
        errors.push(`${prefix} must be an object`);
        return;
      }
      hasOnlyKeys(
        facility,
        new Set([
          'facilityId',
          'reachableBefore',
          'reachableAfter',
          'minutesBefore',
          'minutesAfter',
        ]),
        prefix,
        errors,
      );
      if (!isNonEmptyString(facility.facilityId)) {
        errors.push(`${prefix}.facilityId must be a non-empty string`);
      } else if (facilityIds.has(facility.facilityId)) {
        errors.push(`duplicate simulation facility id: ${facility.facilityId}`);
      } else {
        facilityIds.add(facility.facilityId);
      }
      if (typeof facility.reachableBefore !== 'boolean') {
        errors.push(`${prefix}.reachableBefore must be a boolean`);
      }
      if (typeof facility.reachableAfter !== 'boolean') {
        errors.push(`${prefix}.reachableAfter must be a boolean`);
      }
      if (typeof facility.reachableBefore === 'boolean') {
        validateMinutes(facility.minutesBefore, `${prefix}.minutesBefore`, facility.reachableBefore, errors);
      }
      if (typeof facility.reachableAfter === 'boolean') {
        validateMinutes(facility.minutesAfter, `${prefix}.minutesAfter`, facility.reachableAfter, errors);
      }
    });
  }

  if (!validateStringArray(simulation.floodedEdgeIds, 'simulation.floodedEdgeIds', errors)) {
    // The shared helper records the precise field error.
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
  validateAction,
  validatePlan,
  validateSimulationResult,
  validateScenarioBundle,
};
