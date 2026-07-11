import { syncLoad } from '../src/db/sync.ts';

async function test() {
  console.log('Calling syncLoad()...');
  try {
    const data = await syncLoad();
    console.log('syncLoad completed successfully. Keys:');
    console.log(Object.keys(data));
    console.log('Employees loaded:', data.employees.length);
  } catch (e) {
    console.error('syncLoad failed:', e);
  }
}

test();
