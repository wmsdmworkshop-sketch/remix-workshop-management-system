import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'src/tests/workflow_profile_framework_task2_1.test.ts',
      'src/tests/workflow_capability_engine_task2_2.test.ts',
      'src/tests/vos_timeline_engine_task1_4.test.ts',
      'src/tests/vos_state_engine_task1_3.test.ts',
      'src/tests/vos_sprint1.test.ts',
      'src/tests/vos_service_layer_task1_2.test.ts',
      'src/tests/vos_audit_engine_task1_5.test.ts',
      'src/tests/operational_policy_engine_task2_3.test.ts',
      'src/tests/integration_layer_sprint_il001.test.ts',
      'src/tests/integration_gateway_sprint_int001.test.ts',
      'src/tests/integration_gateway_governance_task3.test.ts',
      'src/tests/executive-platform.test.ts',
      'src/tests/crm-platform.test.ts',
      'src/tests/breakdown_module_sprint2.test.ts',
      'src/tests/analytics-platform.test.ts',
      'src/tests/ai-platform.test.ts',
      'src/tests/ai-copilot.test.ts',
      'src/tests/role_ops_phase1_security.test.ts',
      'src/tests/role_ops_phase2_sa.test.ts',
      'src/tests/role_ops_phase3_pipeline.test.ts',
      'src/tests/role_ops_phase4_intake.test.ts',
      'src/tests/role_ops_phase5_floor.test.ts'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.spec.ts',
      'tests/**'
    ],
  },
});
