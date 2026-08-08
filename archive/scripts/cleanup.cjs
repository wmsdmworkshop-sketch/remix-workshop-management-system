const fs = require('fs');
const path = require('path');

// Target directories
const dirs = ['scripts', 'test-infra', 'maintenance', 'review'];
dirs.forEach(d => {
    if (!fs.existsSync(d)) {
        fs.mkdirSync(d);
        console.log('Created directory: ' + d);
    }
});

const files = fs.readdirSync('scratch').filter(f => !fs.statSync('scratch/' + f).isDirectory());

let moved = 0;
let deleted = 0;
let toReview = 0;

files.forEach(f => {
  let action = '';
  let target = '';

  if (/^(sync_now|api_server|simulate_load|generate_checklist|performance_benchmark|generate_role_directories|generate_training_spreadsheets|uptime_sim|apply-design-system|deployment_gate|cert_auth_apis|cert_users_security|test_all_robust|test_robust|test_production_uat|rc1_simulation|sprint3_full_regression|task.*_regression|task.*_check)\.(ts|cjs|js)$/.test(f)) {
    action = 'MOVE'; target = 'scripts';
  }
  else if (/^(run_isolated|smoke_test|stress_test|db_stress_test|ass2a_.*|run_.*_uat|live_.*)\.(ts|cjs|js)$/.test(f)) {
    action = 'MOVE'; target = 'test-infra';
  }
  else if (/^(migrate_.*|.*migration.*|.*importer.*|.*load_csv.*|import_.*|replace_.*|execute_.*sql)\.(ts|cjs|js)$/.test(f) && !f.includes('try_load')) {
    action = 'MOVE'; target = 'maintenance';
  }
  else if (/^(patch_.*|cr001_.*|apply_.*|append_.*|clean_.*|clear_.*|drop_.*|fix_.*|restore_.*|resolve_.*|remove_.*|alter_.*|create_.*)\.(ts|cjs|js)$/.test(f) && !f.includes('diagnostic') && !f.includes('audit')) {
    action = 'DELETE';
  }
  else if (/^(audit_.*|check_.*|debug_.*|find_.*|inspect_.*|search_.*|test_.*|verify_.*|view_.*|capture_.*|query_.*|dump_.*|print_.*|parse_.*|trace_.*|login_test|task1_password_audit|sync_passwords|try_load_data|forensic_db|get_row_counts|compare_databases|count_gcp_db|count_rows|count_active_jobs|fetch_gcp_active|fetch_gcp_api|cert_db_audit|cert_db_audit2|cert_live_verification|cert_users_schema|describe_service_invoices|list_users|name_based_reconciliation|sla_schema|sprint3_1_rollback|task1_6_migrate_and_validate|verify-breakdowns-rc2|backup_employees|finalize_employee_master_drop|get_service_profiles|build_audit_md|generate_audit_report|certify_railway_dump|run_cloudrun_smoke_tests|run_rbac_verif|run_api_verif_v2|run_certified_etl|run_negative_tests|run_pilot_hypercare|run_rc2_audit)\.(ts|cjs|js|ps1)$/.test(f)) {
    action = 'DELETE';
  }
  else if (/\.(json|md|txt)$/.test(f)) {
    action = 'DELETE';
  }
  else if (f === 'run_all_tests.js') {
    action = 'MOVE'; target = 'test-infra';
  }
  else {
    action = 'MOVE'; target = 'review';
  }

  const src = path.join('scratch', f);
  
  if (action === 'MOVE') {
    const dst = path.join(target, f);
    fs.renameSync(src, dst);
    if (target === 'review') {
      toReview++;
      console.log('Moved to review: ' + f);
    }
    else moved++;
  } else if (action === 'DELETE') {
    fs.unlinkSync(src);
    deleted++;
  }
});

console.log('Moves: ' + moved);
console.log('Deletions: ' + deleted);
console.log('To Review: ' + toReview);
