import { normalizePurposeConfig, normalizePurposeState, ensurePurposeSchedule, evaluatePurposeTick, markPurposeDelivered, applyPurposeOutcome, collectMaterials, deriveDrives, formGoalHypotheses, minePurposeSeeds, selectPurpose, isDuplicateText, analyzePersona } from '../src/purpose-engine.js';

export function purposeConfig(c) { return normalizePurposeConfig({ enabled: c.purposeEnabled, gapMinMs: c.purposeGapMin * 60000, gapMaxMs: c.purposeGapMax * 60000, initialDelayMinMs: c.purposeGapMin * 60000, dailyMax: c.purposeDailyMax, idleThresholdMs: c.purposeIdleMin * 60000, quietStart: c.quietStart, quietEnd: c.quietEnd }, { ownerQQ: c.ownerQQ }); }
export class Purpose {
  constructor(getConfig, memory, data) { this.getConfig = getConfig; this.memory = memory; this.data = data; this.state = normalizePurposeState(data.purpose); }
  evaluate(env, now = Date.now(), mutate = true) { const state = mutate ? this.state : structuredClone(this.state); const config = purposeConfig(this.getConfig()); ensurePurposeSchedule(state, { config, now }); return evaluatePurposeTick({ now, state, config, env }); }
  plan(now = Date.now(), mutate = true) {
    const c = this.getConfig(); const state = mutate ? this.state : structuredClone(this.state); const config = purposeConfig(c);
    const key = `private:${c.ownerQQ}`;
    const conversations = [{ key, recentMessages: (this.data.channels[key]?.messages || []).map(m => ({ text: m.text, at: m.at, isSelf: m.self, isOwner: !m.self && m.user === c.ownerQQ })) }];
    const memoryRecords = c.autoMemory && c.ownerQQ ? (this.memory.card(key)?.records || []).filter(r => r.clarity !== 'forgotten') : [];
    const { items: materials } = collectMaterials({ now, config, ownerUin: c.ownerQQ, conversations, memoryRecords });
    const lastMasterAt = this.data.lastOwnerAt || 0;
    const persona = analyzePersona(c.persona);
    const evolved = deriveDrives({ materials, now, drives: state.drives, drivesAt: state.drivesAt, lastMasterAt, personaBias: persona.bias });
    const drives = evolved.drives;
    const goals = formGoalHypotheses({ materials, now, goals: state.goals, observations: state.observations, drives, lastMasterAt, persona, config });
    state.drives = drives; state.drivesAt = evolved.drivesAt; state.goals = goals.goals; state.observations = goals.observations;
    const seeds = minePurposeSeeds({ materials, now, config, drives, history: state.history, lastMasterAt });
    const planned = selectPurpose({ seeds, goals: Array.isArray(goals) ? goals : goals.goals || [], pending: state.pending, history: state.history, config, drives, now, lastMasterAt });
    state.lastMaterialCount = materials.length; state.lastCandidateCount = planned.candidates.length;
    return { ...planned, materialCount: materials.length };
  }
  begin(planned, now = Date.now()) { markPurposeDelivered(this.state, { now, planned }); }
  finish(outcome, planned, text = '', now = Date.now()) { applyPurposeOutcome(this.state, { now, config: purposeConfig(this.getConfig()), outcome, planned, text }); }
  duplicate(text) { return isDuplicateText(text, this.state.history); }
}
