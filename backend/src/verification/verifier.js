const {
  validatePlan,
  validateScenarioBundle,
  validateSimulationResult,
} = require('../contracts/validation');

const SCORE_TOLERANCE = 1e-9;

function scoresMatch(actual, expected) {
  return Math.abs(actual - expected) <= SCORE_TOLERANCE;
}

function createVerifier({ enabled = false } = {}) {
  return {
    verify({ plan, simulation, scenarioBundle } = {}) {
      if (!enabled) {
        return {
          verified: false,
          code: 'verifier_unavailable',
          errors: ['Verification is disabled.'],
        };
      }

      const errors = [];
      const planValidation = validatePlan(plan);
      const simulationValidation = validateSimulationResult(simulation);
      errors.push(...planValidation.errors, ...simulationValidation.errors);

      if (scenarioBundle === undefined) {
        errors.push('scenarioBundle is required for verification');
      } else {
        const scenarioValidation = validateScenarioBundle(scenarioBundle);
        errors.push(...scenarioValidation.errors);

        if (
          planValidation.valid &&
          scenarioValidation.valid &&
          plan.scenarioId !== scenarioBundle.scenario.scenarioId
        ) {
          errors.push('plan.scenarioId must match scenarioBundle.scenario.scenarioId');
        }

        if (simulationValidation.valid && scenarioValidation.valid) {
          const expectedFacilityIds = new Set(scenarioBundle.facilities.map((facility) => facility.id));
          const actualFacilityIds = new Set(
            simulation.perFacility.map((facility) => facility.facilityId),
          );

          for (const facilityId of actualFacilityIds) {
            if (!expectedFacilityIds.has(facilityId)) {
              errors.push(`simulation.perFacility contains an unknown facilityId: ${facilityId}`);
            }
          }
          for (const facilityId of expectedFacilityIds) {
            if (!actualFacilityIds.has(facilityId)) {
              errors.push(`simulation.perFacility is missing facilityId: ${facilityId}`);
            }
          }

          if (
            simulation.perFacility.length === expectedFacilityIds.size
            && actualFacilityIds.size === expectedFacilityIds.size
            && [...expectedFacilityIds].every((facilityId) => actualFacilityIds.has(facilityId))
          ) {
            const expectedBaselineScore = simulation.perFacility.filter(
              (facility) => facility.reachableBefore,
            ).length / expectedFacilityIds.size;
            const expectedPlanScore = simulation.perFacility.filter(
              (facility) => facility.reachableAfter,
            ).length / expectedFacilityIds.size;

            if (!scoresMatch(simulation.baselineScore, expectedBaselineScore)) {
              errors.push(
                `simulation.baselineScore must match perFacility reachability (${expectedBaselineScore})`,
              );
            }
            if (!scoresMatch(simulation.planScore, expectedPlanScore)) {
              errors.push(
                `simulation.planScore must match perFacility reachability (${expectedPlanScore})`,
              );
            }
          }
        }
      }

      if (planValidation.valid && simulationValidation.valid) {
        if (simulation.planId !== plan.planId) {
          errors.push('simulation.planId must match plan.planId');
        }
        if (plan.status !== 'proposed') {
          errors.push('plan.status must be proposed before verification');
        }
      }

      return errors.length === 0
        ? { verified: true, code: 'verified', errors: [] }
        : { verified: false, code: 'verification_failed', errors };
    },
  };
}

module.exports = { createVerifier };
