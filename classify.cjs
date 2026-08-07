const fs = require('fs');

const files = fs.readdirSync('scratch').filter(f => !fs.statSync('scratch/' + f).isDirectory());
let md = '# Scratch Directory Inventory\n\n| File | Category | Action | Reason |\n|---|---|---|---|\n';

let counts = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0 };

files.forEach(f => {
  let cat = 'G. Unknown';
  let action = 'KEEP';
  let reason = 'Unknown utility';
  
  if (/^(sync_now|api_server|simulate_load|generate_checklist|performance_benchmark|generate_role_directories|generate_training_spreadsheets|uptime_sim|apply-design-system|deployment_gate|cert_auth_apis|cert_users_security|test_all_robust|test_robust|test_production_uat|rc1_simulation|sprint3_full_regression|task.*_regression|task.*_check)\.(ts|cjs|js)$/.test(f)) {
    cat = 'A. Reusable Engineering Utility'; action = 'MOVE (scripts/)'; reason = 'Core engineering tool'; counts.A++;
  }
  else if (/^(run_isolated|smoke_test|stress_test|db_stress_test|ass2a_.*|run_.*_uat|live_.*)\.(ts|cjs|js)$/.test(f)) {
    cat = 'B. Reusable Test Infrastructure'; action = 'MOVE (test-infra/)'; reason = 'Test suite component'; counts.B++;
  }
  else if (/^(migrate_.*|.*migration.*|.*importer.*|.*load_csv.*|import_.*|replace_.*|execute_.*sql)\.(ts|cjs|js)$/.test(f) && !f.includes('try_load')) {
    cat = 'C. Migration Utility'; action = 'MOVE (maintenance/)'; reason = 'Data migration/ETL script'; counts.C++;
  }
  else if (/^(patch_.*|cr001_.*|apply_.*|append_.*|clean_.*|clear_.*|drop_.*|fix_.*|restore_.*|resolve_.*|remove_.*|alter_.*|create_.*)\.(ts|cjs|js)$/.test(f) && !f.includes('diagnostic') && !f.includes('audit')) {
    cat = 'D. One-Time Patch Script'; action = 'DELETE'; reason = 'One-off execution logic'; counts.D++;
  }
  else if (/^(audit_.*|check_.*|debug_.*|find_.*|inspect_.*|search_.*|test_.*|verify_.*|view_.*|capture_.*|query_.*|dump_.*|print_.*|parse_.*|trace_.*|login_test|task1_password_audit|sync_passwords|try_load_data|forensic_db|get_row_counts|compare_databases|count_gcp_db|count_rows|count_active_jobs|fetch_gcp_active|fetch_gcp_api|cert_db_audit|cert_db_audit2|cert_live_verification|cert_users_schema|describe_service_invoices|list_users|name_based_reconciliation|sla_schema|sprint3_1_rollback|task1_6_migrate_and_validate|verify-breakdowns-rc2|backup_employees|finalize_employee_master_drop|get_service_profiles|build_audit_md|generate_audit_report|certify_railway_dump|run_cloudrun_smoke_tests|run_rbac_verif|run_api_verif_v2|run_certified_etl|run_negative_tests|run_pilot_hypercare|run_rc2_audit)\.(ts|cjs|js|ps1)$/.test(f)) {
    cat = 'E. Debug Utility'; action = 'DELETE'; reason = 'Temporary debugging/verification tool'; counts.E++;
  }
  else if (/\.(json|md|txt)$/.test(f)) {
    cat = 'F. Generated Output'; action = 'DELETE'; reason = 'Automatically generated artifact'; counts.F++;
  }
  else if (f === 'run_all_tests.js') {
    cat = 'B. Reusable Test Infrastructure'; action = 'MOVE (test-infra/)'; reason = 'Test suite component'; counts.B++;
  }
  else {
    counts.G++;
  }

  md += '| ' + f + ' | ' + cat + ' | ' + action + ' | ' + reason + ' |\n';
});

md += '\n\n### Summary\n- A: ' + counts.A + '\n- B: ' + counts.B + '\n- C: ' + counts.C + '\n- D: ' + counts.D + '\n- E: ' + counts.E + '\n- F: ' + counts.F + '\n- G: ' + counts.G + '\n';

fs.writeFileSync('C:/Users/arhaa/.gemini/antigravity-ide/brain/25289127-3c16-4096-9561-18b8a49f284e/AIVAAHAN_RC1_SCRATCH_INVENTORY.md', md);
console.log('Summary:', counts);
