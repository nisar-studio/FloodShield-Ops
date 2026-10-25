const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const {
  validateAction,
  validatePlan,
  validateSimulationResult,
} = require('../src/contracts/validation');
const { replayScenarioBundle } = require('../src/data/replayScenario');
const { createRunStore } = require('../src/runs/runStore');
const { createVerifier } = require('../src/verification/verifier');

const validAction = {
  actionId: 'act_001',
  type: 'road_closure',
  target: { edgeIds: ['edge_123'], label: 'Test road' },
  rationale: 'Protect access to a critical facility.',
  evidence: ['hotspot hs_001', 'rainfall forecast'],
  confidence: 0.7,
};

const validPlan = {
  planId: 'plan_001',
  scenarioId: 'blr-2022-09-replay',
  iteration: 1,
  actions: [validAction],
  status: 'proposed',
};

const validSimulation = {
  planId: 'plan_001',
  baselineScore: 0.4,
  planScore: 0.85,
  threshold: 0.8,
  passed: true,
  perFacility: [
    {
      facilityId: 'fac_001',
      reachableBefore: false,
      reachableAfter: true,
      minutesBefore: null,
      minutesAfter: 18,
    },
  ],
  floodedEdgeIds: ['edge_123'],
};

describe('contract validators', () => {
  it('rejects missing required fields for Action, Plan, and SimulationResult', () => {
    assert.equal(validateAction({}).valid, false);
    assert.equal(validatePlan({}).valid, false);
    assert.equal(validateSimulationResult({}).valid, false);
  });

  it('accepts a valid Action and rejects unsupported or unexpected fields', () => {
    assert.equal(validateAction(validAction).valid, true);

    const invalid = {
      ...validAction,
      type: 'reopen_road',
      confidence: 2,
      extra: true,
    };
    const result = validateAction(invalid);

    assert.equal(result.valid, false);
    assert.ok(result.errors.includes('actions[0].type is unsupported'));
    assert.ok(result.errors.includes('actions[0].confidence must be between 0 and 1'));
    assert.ok(result.errors.includes('actions[0].extra is not allowed'));

    const emptyEvidenceResult = validateAction({ ...validAction, evidence: [] });
    assert.equal(emptyEvidenceResult.valid, false);
    assert.ok(emptyEvidenceResult.errors.includes('actions[0].evidence must contain at least 1 string'));
  });

  it('accepts a valid Plan and enforces the iteration limit and action validation', () => {
    assert.equal(validatePlan(validPlan).valid, true);

    const invalid = {
      ...validPlan,
      iteration: 4,
      actions: [{ ...validAction, target: { edgeIds: [], label: '' } }],
    };
    const result = validatePlan(invalid);

    assert.equal(result.valid, false);
    assert.ok(result.errors.includes('plan.iteration must be an integer from 1 to 3'));
    assert.ok(result.errors.includes('actions[0].target.edgeIds must contain at least one string'));
    assert.ok(result.errors.includes('actions[0].target.label must be a non-empty string'));

    const emptyPlanResult = validatePlan({ ...validPlan, actions: [] });
    assert.equal(emptyPlanResult.valid, false);
    assert.ok(emptyPlanResult.errors.includes('plan.actions must contain at least one action'));
  });

  it('accepts a valid SimulationResult and rejects inconsistent or malformed values', () => {
    assert.equal(validateSimulationResult(validSimulation).valid, true);

    const invalid = {
      ...validSimulation,
      planScore: 0.7,
      passed: true,
      perFacility: [
        {
          ...validSimulation.perFacility[0],
          reachableBefore: true,
          minutesBefore: null,
          extra: true,
        },
      ],
    };
    const result = validateSimulationResult(invalid);

    assert.equal(result.valid, false);
    assert.ok(result.errors.includes('simulation.passed must match planScore >= threshold'));
    assert.ok(result.errors.includes('simulation.perFacility[0].extra is not allowed'));
    assert.ok(result.errors.includes('simulation.perFacility[0].minutesBefore must be a non-negative number when reachable'));
  });

  it('rejects invalid score ranges and unreachable facilities with travel times', () => {
    const result = validateSimulationResult({
      ...validSimulation,
      baselineScore: -0.1,
      threshold: 1.1,
      perFacility: [
        {
          ...validSimulation.perFacility[0],
          reachableAfter: false,
          minutesAfter: 18,
        },
      ],
    });

    assert.equal(result.valid, false);
    assert.ok(result.errors.includes('simulation.baselineScore must be between 0 and 1'));
    assert.ok(result.errors.includes('simulation.threshold must be between 0 and 1'));
    assert.ok(result.errors.includes('simulation.perFacility[0].minutesAfter must be null when unreachable'));
  });
});

describe('verification service', () => {
  it('fails closed when the default verifier is disabled', () => {
    const result = createVerifier().verify({
      plan: validPlan,
      simulation: validSimulation,
      scenarioBundle: replayScenarioBundle,
    });

    assert.deepEqual(result, {
      verified: false,
      code: 'verifier_unavailable',
      errors: ['Verification is disabled.'],
    });
  });

  it('does not change a queued run when verification is unavailable', () => {
    const runStore = createRunStore();
    const run = runStore.createRun('blr-2022-09-replay');

    createVerifier().verify({
      plan: validPlan,
      simulation: validSimulation,
      scenarioBundle: replayScenarioBundle,
    });

    const unchanged = runStore.getRun(run.runId);
    assert.equal(unchanged.status, 'queued');
    assert.equal(unchanged.plan, null);
    assert.equal(unchanged.simulation, null);
    assert.equal(unchanged.steps.find((step) => step.name === 'APPROVE').status, 'disabled');
    assert.equal(unchanged.steps.find((step) => step.name === 'SANDBOX').status, 'disabled');
  });

  it('does not change a queued run after failed verification', () => {
    const runStore = createRunStore();
    const run = runStore.createRun('blr-2022-09-replay');

    const result = createVerifier({ enabled: true }).verify({
      plan: validPlan,
      simulation: { ...validSimulation, planId: 'plan_other' },
      scenarioBundle: replayScenarioBundle,
    });

    assert.equal(result.verified, false);
    const unchanged = runStore.getRun(run.runId);
    assert.equal(unchanged.status, 'queued');
    assert.equal(unchanged.plan, null);
    assert.equal(unchanged.simulation, null);
    assert.equal(unchanged.steps.find((step) => step.name === 'APPROVE').status, 'disabled');
    assert.equal(unchanged.steps.find((step) => step.name === 'SANDBOX').status, 'disabled');
  });

  it('rejects malformed results, mismatched plan IDs, and unknown facilities', () => {
    const verifier = createVerifier({ enabled: true });
    const result = verifier.verify({
      plan: validPlan,
      simulation: {
        ...validSimulation,
        planId: 'plan_other',
        perFacility: replayScenarioBundle.facilities.map((facility, index) => ({
          ...validSimulation.perFacility[0],
          facilityId: index === 0 ? 'fac_unknown' : facility.id,
        })),
      },
      scenarioBundle: replayScenarioBundle,
    });

    assert.equal(result.verified, false);
    assert.equal(result.code, 'verification_failed');
    assert.ok(result.errors.includes('simulation.planId must match plan.planId'));
    assert.ok(result.errors.includes('simulation.perFacility contains an unknown facilityId: fac_unknown'));
    assert.ok(result.errors.includes('simulation.perFacility is missing facilityId: fac_001'));
  });

  it('rejects verification without a scenario bundle', () => {
    const result = createVerifier({ enabled: true }).verify({
      plan: validPlan,
      simulation: validSimulation,
    });

    assert.equal(result.verified, false);
    assert.ok(result.errors.includes('scenarioBundle is required for verification'));
  });

  it('rejects a plan whose scenario identifier differs from the supplied scenario', () => {
    const result = createVerifier({ enabled: true }).verify({
      plan: { ...validPlan, scenarioId: 'other-scenario' },
      simulation: validSimulation,
      scenarioBundle: replayScenarioBundle,
    });

    assert.equal(result.verified, false);
    assert.ok(result.errors.includes('plan.scenarioId must match scenarioBundle.scenario.scenarioId'));
  });

  it('accepts only a valid proposed plan and complete matching simulation result', () => {
    const simulation = {
      ...validSimulation,
      baselineScore: 5 / 6,
      planScore: 1,
      perFacility: replayScenarioBundle.facilities.map((facility) => ({
        facilityId: facility.id,
        reachableBefore: facility.id !== 'fac_003',
        reachableAfter: true,
        minutesBefore: facility.id === 'fac_003' ? null : 15,
        minutesAfter: 15,
      })),
    };
    const result = createVerifier({ enabled: true }).verify({
      plan: validPlan,
      simulation,
      scenarioBundle: replayScenarioBundle,
    });

    assert.deepEqual(result, { verified: true, code: 'verified', errors: [] });
  });

  it('rejects simulator scores that contradict per-facility reachability', () => {
    const simulation = {
      ...validSimulation,
      baselineScore: 1,
      planScore: 1,
      perFacility: replayScenarioBundle.facilities.map((facility) => ({
        facilityId: facility.id,
        reachableBefore: false,
        reachableAfter: false,
        minutesBefore: null,
        minutesAfter: null,
      })),
    };
    const result = createVerifier({ enabled: true }).verify({
      plan: validPlan,
      simulation,
      scenarioBundle: replayScenarioBundle,
    });

    assert.equal(result.verified, false);
    assert.ok(result.errors.some((error) => error.startsWith('simulation.baselineScore must match')));
    assert.ok(result.errors.some((error) => error.startsWith('simulation.planScore must match')));
  });
});
