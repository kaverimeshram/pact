import { spawn } from 'child_process';
import path from 'path';
import {
  Counterparty,
  Commitment,
  Outcome,
  SibylEntity,
  SibylJournalEvent,
  SibylSearchResult
} from '../types';

interface BridgeResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

const BRIDGE_SCRIPT = path.join(process.cwd(), 'scripts', 'sibyl_bridge.py');

/**
 * Execute a command against the Sibyl Python Bridge
 */
export async function executeSibylBridge<T = any>(
  command: string,
  args: Record<string, any> = {}
): Promise<T> {
  return new Promise((resolve, reject) => {
    // Try uv run with sibyl-memory-cli first, fallback to direct python3
    const uvPath = process.env.UV_PATH || `${process.env.HOME}/.local/bin/uv`;
    const pythonExecutable = process.env.PYTHON_EXECUTABLE || 'python3';

    const child = spawn(
      /* turbopackIgnore: true */
      uvPath,
      ['run', '--with', 'sibyl-memory-cli[mcp]', BRIDGE_SCRIPT, command, JSON.stringify(args)],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          PATH: `${process.env.HOME}/.local/bin:/opt/homebrew/bin:/usr/local/bin:${process.env.PATH}`,
        },
      }
    );

    let stdoutData = '';
    let stderrData = '';

    child.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    child.on('error', (err) => {
      // Fallback to direct python3 if uv execution fails
      const fallbackChild = spawn(
        /* turbopackIgnore: true */
        pythonExecutable,
        [BRIDGE_SCRIPT, command, JSON.stringify(args)],
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            PATH: `${process.env.HOME}/.local/bin:/opt/homebrew/bin:/usr/local/bin:${process.env.PATH}`,
          },
        }
      );

      let fbStdout = '';
      let fbStderr = '';

      fallbackChild.stdout.on('data', (d) => {
        fbStdout += d.toString();
      });
      fallbackChild.stderr.on('data', (d) => {
        fbStderr += d.toString();
      });

      fallbackChild.on('close', (code) => {
        if (code !== 0) {
          return reject(
            new Error(`Sibyl bridge error (${code}): ${fbStderr || fbStdout || err.message}`)
          );
        }
        try {
          const parsed: BridgeResponse<T> = JSON.parse(fbStdout.trim());
          if (!parsed.success) {
            return reject(new Error(parsed.error || 'Unknown Sibyl error'));
          }
          resolve(parsed.data as T);
        } catch (e) {
          reject(new Error(`Failed to parse Sibyl output: ${fbStdout}`));
        }
      });
    });

    child.on('close', (code) => {
      if (code !== 0) {
        return reject(
          new Error(`Sibyl bridge execution failed (${code}): ${stderrData || stdoutData}`)
        );
      }
      try {
        const parsed: BridgeResponse<T> = JSON.parse(stdoutData.trim());
        if (!parsed.success) {
          return reject(new Error(parsed.error || 'Unknown Sibyl error'));
        }
        resolve(parsed.data as T);
      } catch (e) {
        reject(new Error(`Failed to parse Sibyl JSON output: ${stdoutData}`));
      }
    });
  });
}

/**
 * Check Sibyl status
 */
export async function getSibylStatus(): Promise<{
  status: string;
  db_path: string;
  exists: boolean;
  schema_version: number;
}> {
  return executeSibylBridge('status');
}

/**
 * Persist a Counterparty entity into Sibyl Memory
 */
export async function persistCounterparty(counterparty: Counterparty): Promise<SibylEntity<Counterparty>> {
  return executeSibylBridge('set_entity', {
    category: 'counterparties',
    name: counterparty.name,
    body: counterparty,
  });
}

/**
 * Recall a Counterparty from Sibyl Memory by name
 */
export async function recallCounterparty(name: string): Promise<Counterparty | null> {
  const res = await executeSibylBridge<{ found: boolean; entity?: SibylEntity<Counterparty> }>(
    'get_entity',
    {
      category: 'counterparties',
      name: name,
    }
  );

  if (res.found && res.entity) {
    return res.entity.body;
  }
  return null;
}

/**
 * Persist a Commitment entity into Sibyl Memory
 */
export async function persistCommitment(commitment: Commitment): Promise<SibylEntity<Commitment>> {
  const res = await executeSibylBridge<SibylEntity<Commitment>>('set_entity', {
    category: 'commitments',
    name: commitment.id,
    body: commitment,
  });

  // Also write a journal event for this commitment creation
  await recordSibylEvent({
    evaluated: {
      action: 'COMMITMENT_CREATED',
      commitmentId: commitment.id,
      counterparty: commitment.counterpartyName,
      task: commitment.task,
      budget: commitment.budget,
      expectedDeadlineHours: commitment.expectedDeadlineHours,
      expectedQuality: commitment.expectedQuality,
    },
    acted: {
      status: commitment.status,
      strategy: commitment.paymentStrategy,
      milestoneCount: commitment.milestones?.length || 0,
      txHash: commitment.txHash,
    },
    forward: {
      watchDeadline: `${commitment.expectedDeadlineHours}h from creation`,
    },
    extra: {
      category: 'commitments',
      name: commitment.id,
      counterpartyName: commitment.counterpartyName,
    },
  });

  return res;
}

/**
 * Persist an Outcome entity into Sibyl Memory and write a journal event
 */
export async function persistOutcome(outcome: Outcome): Promise<SibylEntity<Outcome>> {
  const res = await executeSibylBridge<SibylEntity<Outcome>>('set_entity', {
    category: 'outcomes',
    name: outcome.commitmentId,
    body: outcome,
  });

  // Write cold-tier journal event
  await recordSibylEvent({
    evaluated: {
      action: 'OUTCOME_RECORDED',
      commitmentId: outcome.commitmentId,
      counterpartyId: outcome.counterpartyId,
      counterpartyName: outcome.counterpartyName,
      actualHours: outcome.actualDeliveryHours,
      delayHours: outcome.delayHours,
      qualityScore: outcome.qualityScore,
      success: outcome.success,
      disputed: outcome.disputed,
      notes: outcome.notes,
    },
    acted: {
      outcomeRecorded: true,
      performanceDelta: outcome.delayHours > 0 ? `Late by ${outcome.delayHours}h` : 'On-time delivery',
      qualityAssessment: `${outcome.qualityScore}/10`,
      txHash: outcome.txHash,
    },
    forward: {
      reputationImpact: outcome.delayHours > 0 ? 'Decreases reliability & increases risk' : 'Increases reliability',
    },
    extra: {
      category: 'outcomes',
      name: outcome.commitmentId,
      counterpartyName: outcome.counterpartyName,
    },
  });

  return res;
}

/**
 * Record a journal event directly into Sibyl COLD-tier storage
 */
export async function recordSibylEvent(params: {
  evaluated?: Record<string, any>;
  acted?: Record<string, any>;
  forward?: Record<string, any>;
  extra?: Record<string, any>;
}): Promise<{ id: string }> {
  return executeSibylBridge('write_event', params);
}

/**
 * Read latest journal events from Sibyl
 */
export async function readJournalEvents(limit: number = 50): Promise<SibylJournalEvent[]> {
  return executeSibylBridge('read_events', { limit });
}

/**
 * Recall relevant history across entities & journal events using Sibyl FTS5 search
 */
export async function recallRelevantHistory(
  query: string
): Promise<{ verdict: string; hits: SibylSearchResult[] }> {
  return executeSibylBridge('search', { query });
}

/**
 * List all entities in a given category
 */
export async function listEntities<T = any>(category?: string): Promise<SibylEntity<T>[]> {
  return executeSibylBridge('list_entities', { category, limit: 100 });
}

/**
 * List all commitments from Sibyl Memory
 */
export async function listCommitments(): Promise<Commitment[]> {
  const entities = await listEntities<Commitment>('commitments');
  return entities.map((e) => e.body);
}

/**
 * List all outcomes from Sibyl Memory
 */
export async function listOutcomes(): Promise<Outcome[]> {
  const entities = await listEntities<Outcome>('outcomes');
  return entities.map((e) => e.body);
}

/**
 * List all counterparties from Sibyl Memory
 */
export async function listCounterparties(): Promise<Counterparty[]> {
  const entities = await listEntities<Counterparty>('counterparties');
  return entities.map((e) => e.body);
}

/**
 * Clear test data for clean slate / reset demo
 */
export async function clearMemoryStore(): Promise<{ cleared: boolean }> {
  return executeSibylBridge('clear_store');
}
