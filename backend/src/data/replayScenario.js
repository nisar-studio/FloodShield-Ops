const { validateScenarioBundle } = require('../contracts/validation');

const replayScenarioBundle = {
  scenario: {
    scenarioId: 'blr-2022-09-replay',
    mode: 'replay',
    areaName: 'Bengaluru - Mahadevapura corridor',
    bbox: {
      south: 12.9,
      north: 12.99,
      west: 77.65,
      east: 77.76,
    },
    rainfall: {
      totalMm: 125,
      durationHours: 6,
      hourlyMm: [5, 10, 20, 35, 35, 20],
    },
    source:
      'Replay fixture derived from the existing frontend demo data; historical rainfall measurements are not independently verified in this backend work unit.',
  },
  facilities: [
    {
      id: 'fac_001',
      type: 'hospital',
      name: 'Sakra World Hospital',
      lat: 12.9255,
      lng: 77.6845,
      nodeId: 'node_004',
    },
    {
      id: 'fac_002',
      type: 'hospital',
      name: 'Manipal Hospital Varthur Road',
      lat: 12.9572,
      lng: 77.7391,
      nodeId: 'node_006',
    },
    {
      id: 'fac_003',
      type: 'hospital',
      name: "Rainbow Children's Hospital Marathahalli",
      lat: 12.9497,
      lng: 77.7011,
      nodeId: 'node_003',
    },
    {
      id: 'fac_004',
      type: 'shelter',
      name: 'Mahadevapura Community Center Shelter',
      lat: 12.9868,
      lng: 77.6972,
      nodeId: 'node_005',
    },
    {
      id: 'fac_005',
      type: 'shelter',
      name: 'Bellandur Relief Staging Post',
      lat: 12.9351,
      lng: 77.671,
      nodeId: 'node_002',
    },
    {
      id: 'fac_006',
      type: 'shelter',
      name: 'Marathahalli Sports Complex Relief Camp',
      lat: 12.955,
      lng: 77.708,
      nodeId: 'node_004',
    },
  ],
  hotspots: [
    {
      id: 'hs_001',
      name: 'Outer Ring Road EcoSpace Underpass',
      lat: 12.926,
      lng: 77.683,
      riskScore: 0.92,
      reasons: [
        'Low elevation underpass sump',
        'Bellandur lake overflow channel surge',
        'Peak replay rainfall exceeds 35mm/h',
      ],
      floodedEdgeIds: ['edge_002', 'edge_003'],
    },
    {
      id: 'hs_002',
      name: 'Rainbow Drive / Sarjapur Road Junction',
      lat: 12.911,
      lng: 77.6795,
      riskScore: 0.85,
      reasons: [
        'Natural watershed depression bowl',
        'Culvert cross-section capacity deficit',
        'Replay fixture inundation threshold',
      ],
      floodedEdgeIds: ['edge_004'],
    },
    {
      id: 'hs_003',
      name: 'Marathahalli Bridge ORR Merge',
      lat: 12.9525,
      lng: 77.7015,
      riskScore: 0.78,
      reasons: ['Major storm drain backflow', 'Western flyover ramp runoff ponding'],
      floodedEdgeIds: ['edge_006', 'edge_008'],
    },
    {
      id: 'hs_004',
      name: 'Panathur Railway Subway & Varthur Link',
      lat: 12.9412,
      lng: 77.712,
      riskScore: 0.74,
      reasons: ['Railway underpass low point', 'Varthur lake secondary drain bottleneck'],
      floodedEdgeIds: ['edge_005'],
    },
  ],
};

const validation = validateScenarioBundle(replayScenarioBundle);
if (!validation.valid) {
  throw new Error(`Invalid replay scenario fixture: ${validation.errors.join('; ')}`);
}

module.exports = { replayScenarioBundle };
