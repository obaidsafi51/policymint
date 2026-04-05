import { spawn, type ChildProcess } from 'node:child_process';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

const CLI_TIMEOUT_MS = 15_000;

export interface KrakenCliResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
}

export interface KrakenPaperBalanceResult extends KrakenCliResult {
  parsed: unknown | null;
}

export class KrakenAdapter {
  private readonly activeProcesses = new Set<ChildProcess>();

  getKrakenCliPath(): string {
    return env.KRAKEN_CLI_PATH;
  }

  async paperInit(): Promise<KrakenCliResult> {
    return this.run(['paper', 'init', '--balance', '10000', '--currency', 'USD']);
  }

  async paperBuy(pair: string, volume: number): Promise<KrakenCliResult> {
    return this.run(['paper', 'buy', pair, this.formatVolume(volume)]);
  }

  async paperSell(pair: string, volume: number): Promise<KrakenCliResult> {
    return this.run(['paper', 'sell', pair, this.formatVolume(volume)]);
  }

  async paperBalance(): Promise<KrakenPaperBalanceResult> {
    const result = await this.run(['paper', 'balance'], true, true);
    if (!result.success) {
      return { ...result, parsed: null };
    }

    try {
      return {
        ...result,
        parsed: JSON.parse(result.stdout),
      };
    } catch {
      return {
        ...result,
        parsed: null,
      };
    }
  }

  cleanup(): void {
    for (const processHandle of this.activeProcesses) {
      try {
        processHandle.kill('SIGTERM');
      } catch (error) {
        logger.warn({ err: error }, 'Failed to terminate Kraken CLI process during cleanup');
      }
    }

    this.activeProcesses.clear();
  }

  private formatVolume(volume: number): string {
    const floored = Math.floor(volume * 1_000_000) / 1_000_000;
    return floored.toFixed(6);
  }

  private run(args: string[], requiresAuth = false, jsonOutput = false): Promise<KrakenCliResult> {
    const commandArgs = jsonOutput ? ['-o', 'json', ...args] : args;

    if (requiresAuth && (!env.KRAKEN_API_KEY || !env.KRAKEN_API_SECRET)) {
      logger.warn('Kraken auth credentials are not configured; authenticated command may fail');
    }

    return new Promise<KrakenCliResult>((resolve) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let settled = false;

      const finalize = (result: KrakenCliResult) => {
        if (settled) {
          return;
        }

        settled = true;
        resolve(result);
      };

      let child: ChildProcess;

      try {
        child = spawn(this.getKrakenCliPath(), commandArgs, {
          env: process.env,
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: CLI_TIMEOUT_MS,
        });
      } catch (error) {
        finalize({
          success: false,
          stdout,
          stderr: error instanceof Error ? error.message : String(error),
          exitCode: null,
          timedOut: false,
        });
        return;
      }

      this.activeProcesses.add(child);

      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        try {
          child.kill('SIGTERM');
        } catch (error) {
          stderr = `${stderr}${stderr ? '\n' : ''}${String(error)}`;
        }
      }, CLI_TIMEOUT_MS);

      child.stdout?.on('data', (chunk: Buffer | string) => {
        stdout += chunk.toString();
      });

      child.stderr?.on('data', (chunk: Buffer | string) => {
        stderr += chunk.toString();
      });

      child.on('error', (error) => {
        clearTimeout(timeoutHandle);
        this.activeProcesses.delete(child);
        finalize({
          success: false,
          stdout,
          stderr: `${stderr}${stderr ? '\n' : ''}${error.message}`,
          exitCode: null,
          timedOut,
        });
      });

      child.on('close', (code) => {
        clearTimeout(timeoutHandle);
        this.activeProcesses.delete(child);

        const exitCode = typeof code === 'number' ? code : null;
        finalize({
          success: !timedOut && exitCode === 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode,
          timedOut,
        });
      });
    });
  }
}
