import { pool as db } from "../src/db/index.ts";
async function check() {
  // Check password_plain usage
  const [pwPlain] = await db.query("SELECT COUNT(*) as cnt FROM users WHERE password_plain IS NOT NULL AND password_plain != ''") as any[];
  console.log(`\nUSERS WITH password_plain populated: ${pwPlain[0].cnt}`);
  
  const [total] = await db.query("SELECT COUNT(*) as cnt FROM users") as any[];
  console.log(`Total users: ${total[0].cnt}`);
  
  // Check bcrypt hashes
  const [hashed] = await db.query("SELECT COUNT(*) as cnt FROM users WHERE password_hash LIKE '\$2%'") as any[];
  console.log(`Users with bcrypt hash: ${hashed[0].cnt}`);
  
  // Sample users (masked)
  const [sample] = await db.query("SELECT user_id, full_name, username, role, LEFT(password_hash,10) as pw_hash_prefix, is_active, CASE WHEN password_plain IS NOT NULL AND password_plain != '' THEN 'YES' ELSE 'NO' END as has_plain FROM users ORDER BY created_at DESC LIMIT 10") as any[];
  console.log("\nUSER SAMPLE:");
  sample.forEach((u: any) => console.log(`  ${u.full_name} | ${u.role} | pw_hash=${u.pw_hash_prefix}... | plain_stored=${u.has_plain} | active=${u.is_active}`));

  // Email field
  const [schema] = await db.query("DESCRIBE users") as any[];
  const emailField = (schema as any[]).find(c => c.Field.toLowerCase().includes("email") || c.Field === "username");
  console.log(`\nEmail/login field: ${emailField?.Field} (${emailField?.Type})`);

  // role_permissions actual schema
  const [rpSchema] = await db.query("DESCRIBE role_permissions") as any[];
  console.log("\nrole_permissions SCHEMA:");
  rpSchema.forEach((c: any) => console.log(`  ${c.Field} | ${c.Type}`));

  const [rpSample] = await db.query("SELECT * FROM role_permissions LIMIT 5") as any[];
  console.log("\nrole_permissions SAMPLE:");
  rpSample.forEach((r: any) => console.log(`  ${JSON.stringify(r)}`));

  // Workshops schema
  const [wsSchema] = await db.query("DESCRIBE workshops") as any[];
  console.log("\nworkshops SCHEMA:");
  wsSchema.forEach((c: any) => console.log(`  ${c.Field} | ${c.Type}`));
  
  const [ws] = await db.query("SELECT * FROM workshops") as any[];
  console.log(`workshops rows: ${ws.length}`);

  // DMS import batches schema
  const [dmsSchema] = await db.query("DESCRIBE dms_import_batches") as any[];
  console.log("\ndms_import_batches SCHEMA:");
  dmsSchema.forEach((c: any) => console.log(`  ${c.Field} | ${c.Type}`));

  process.exit(0);
}
check().catch(e => { console.error(e.message); process.exit(1); });
