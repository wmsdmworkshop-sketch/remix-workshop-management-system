import { up } from '../src/db/migrations/create_gate_out_tables';
import { pool } from '../src/db/index';

async function main() {
  await up();
  console.log("Migration executed");
  process.exit(0);
}

main().catch(console.error);
