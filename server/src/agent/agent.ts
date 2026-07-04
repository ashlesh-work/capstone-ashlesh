/**
 * Agent orchestrator (Phases 5–8): plan → tool → retrieve → answer, with
 * session memory, feedback-driven adaptation, and full tracing.
 *
 * Plan for every turn (recorded as spans):
 *   1. plan       — select a tool (routing logic is inspectable).
 *   2. tool       — run escalation/checklist tools; failed calls fall back
 *                   to kb_search (loop-guarded by TOOL_MAX_ITERATIONS).
 *   3. retrieval  — RAG plan: retrieval + grounding + citations.
 *   4. llm        — completion with memory + adaptation applied.
 */
import type { ChatMessage, Citation } from '@access508/core';
import type { RagEngine } from '../rag/index.js';
import type { LLMAdapter } from '../adapters/index.js';
import { config } from '../config.js';
import { ActiveTrace } from '../lib/tracing.js';
import { getSession, remember, type SessionState } from '../lib/session.js';
import { selectTool, runTool, type ToolName } from './tools.js';

export interface AgentInput {
  question: string;
  lang?: 'en' | 'es';
  userId: string;
  sessionId: string;
}

export interface AgentResult {
  mode: 'grounded' | 'fallback' | 'refuse' | 'tool' | 'escalated';
  answer: string;
  citations: Citation[];
  traceId: string;
}

/** Inject short-term memory and adaptation flags into the LLM messages. */
function shapeMessages(messages: ChatMessage[], session: SessionState): ChatMessage[] {
  const [system, ...rest] = messages;
  const sys: ChatMessage = { ...system };
  if (session.flags.concise) {
    sys.content += ' IMPORTANT: The user prefers brevity — answer in at most 3 sentences.';
  }
  // Last N exchanges give multi-turn continuity (Phase 6).
  const history: ChatMessage[] = session.history.slice(-config.memoryTurns * 2).map((t) => ({
    role: t.role,
    content: t.content.slice(0, 600)
  }));
  return [sys, ...history, ...rest];
}

export async function runAgentTurn(input: AgentInput, rag: RagEngine, llm: LLMAdapter): Promise<AgentResult> {
  const { question, lang, userId, sessionId } = input;
  const trace = new ActiveTrace({ userId, sessionId, route: '/api/chat', question, lang });
  const session = getSession(userId, sessionId);

  try {
    // 1. Plan: tool selection.
    const endPlan = trace.begin('plan');
    let { tool, reason } = selectTool(question);
    endPlan({ tool, reason, flags: { ...session.flags }, historyTurns: session.history.length });

    // 2. Tool execution with loop guard + failure safeguard.
    let iterations = 0;
    while (tool !== 'kb_search' && iterations < config.toolMaxIterations) {
      iterations++;
      const endTool = trace.begin('tool');
      const topicMatch = question.toLowerCase().match(/checklist(?:\s+for)?\s+([a-z\s]+)/);
      const result = runTool(tool as ToolName, {
        topic: topicMatch?.[1]?.trim() ?? question,
        reason
      });
      endTool({ tool, ok: result.ok }, result.error);

      if (result.ok) {
        const mode = tool === 'escalate_to_human' ? 'escalated' : 'tool';
        remember(session, question, result.output);
        trace.end({ mode, answerPreview: result.output });
        return { mode, answer: result.output, citations: [], traceId: trace.trace.id };
      }
      // Safeguard: incorrect/failed tool call → fall back to retrieval.
      tool = 'kb_search';
      reason = 'fallback after failed tool call';
    }

    // 3. Retrieval + grounding. Short follow-ups borrow context from memory.
    let retrievalQuery = question;
    const lastUser = [...session.history].reverse().find((t) => t.role === 'user');
    if (question.split(/\s+/).length <= 3 && lastUser) {
      retrievalQuery = `${lastUser.content} ${question}`;
    }
    const endRetrieval = trace.begin('retrieval');
    const plan = await rag.plan(retrievalQuery, lang);
    endRetrieval({
      mode: plan.mode,
      topScore: Number(plan.audit.topScore.toFixed(3)),
      reason: plan.audit.reason,
      citations: plan.citations.map((c) => c.docId),
      augmented: retrievalQuery !== question
    });

    // Adaptation (Phase 7): "not cited" feedback disables the fallback path.
    if (plan.mode === 'fallback' && session.flags.groundedOnly) {
      const answer =
        'Per your feedback, I only answer from cited knowledge-base sources, and I could not find one for this. ' +
        'Please consult ada.gov, section508.gov, or the W3C WCAG guidelines, or ask me to escalate to a human specialist.';
      remember(session, question, answer);
      trace.end({ mode: 'refuse', answerPreview: answer });
      return { mode: 'refuse', answer, citations: [], traceId: trace.trace.id };
    }

    if (plan.mode === 'refuse') {
      const answer = plan.directMessage ?? '';
      trace.end({ mode: 'refuse', answerPreview: answer });
      return { mode: 'refuse', answer, citations: [], traceId: trace.trace.id };
    }

    // 4. LLM completion with memory + adaptation.
    const endLlm = trace.begin('llm');
    let answer: string;
    try {
      answer = await llm.complete(shapeMessages(plan.messages!, session));
      endLlm({ model: config.openai.llmModel, concise: session.flags.concise });
    } catch (e) {
      endLlm(undefined, (e as Error).message);
      throw e;
    }

    remember(session, question, answer);
    trace.end({ mode: plan.mode, answerPreview: answer });
    return { mode: plan.mode, answer, citations: plan.citations, traceId: trace.trace.id };
  } catch (e) {
    // Graceful failure (Phase 8): trace the error, return a safe message.
    trace.end({ mode: 'error', error: (e as Error).message });
    return {
      mode: 'refuse',
      answer: 'Something went wrong while answering. Please try again, or ask to be connected with a human specialist.',
      citations: [],
      traceId: trace.trace.id
    };
  }
}
