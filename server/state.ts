import { syncLoad, syncSave } from "../src/db/sync.ts";

export let cachedDB: any = null;

export async function loadState() {
  cachedDB = await syncLoad();
  return cachedDB;
}

export async function saveState() {
  if (cachedDB) {
    await syncSave(cachedDB);
  }
}

export function getState() {
  return cachedDB;
}

export function setState(newState: any) {
  cachedDB = newState;
}
