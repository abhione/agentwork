/**
 * Local mapping of Box Claws box IDs → AgentWork talent profiles.
 * Stored in localStorage so /team can show which "freelancer" runs each box.
 */

const KEY = "agentwork:hires";

export interface HireRecord {
  boxId: string;
  talentId: string;
  hiredAt: string;
}

export function getHires(): HireRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function recordHire(boxId: string, talentId: string) {
  const hires = getHires().filter((h) => h.boxId !== boxId);
  hires.push({ boxId, talentId, hiredAt: new Date().toISOString() });
  localStorage.setItem(KEY, JSON.stringify(hires));
}

export function getHire(boxId: string): HireRecord | undefined {
  return getHires().find((h) => h.boxId === boxId);
}

export function removeHire(boxId: string) {
  localStorage.setItem(KEY, JSON.stringify(getHires().filter((h) => h.boxId !== boxId)));
}
