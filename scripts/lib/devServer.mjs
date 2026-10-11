// Starts a private Vite dev server on a free port for a Playwright script and hands back a stop().
import { spawn, execSync } from 'node:child_process';
import { createServer } from 'node:net';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

// Ask the OS for a free port instead of guessing one: parallel worktrees would collide on a fixed port.
function freePort() {
    return new Promise((ok, fail) => {
        const s = createServer();
        s.once('error', fail);
        s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => ok(port)); });
    });
}

export async function startDevServer({ timeoutMs = 60_000 } = {}) {
    const port = await freePort();
    // Vite's own entry run by this node: no shell between us and the pid we have to kill.
    const viteBin = join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
    const child = spawn(process.execPath, [viteBin, '--port', String(port), '--strictPort'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    const log = [];
    child.stdout.on('data', d => log.push(String(d)));
    child.stderr.on('data', d => log.push(String(d)));
    let stopped = false;
    const stop = () => {
        if (stopped) return;
        stopped = true;
        try {
            if (process.platform === 'win32') execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: 'ignore' });
            else child.kill('SIGKILL');
        } catch { /* already gone */ }
    };
    process.on('exit', stop);
    process.on('SIGINT', () => { stop(); process.exit(130); });

    const url = `http://localhost:${port}`;
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try { if ((await fetch(`${url}/`)).status === 200) return { url, stop }; } catch { /* not up yet */ }
        await new Promise(r => setTimeout(r, 300));
    }
    stop();
    throw new Error(`dev server did not answer on ${url} within ${timeoutMs / 1000}s:\n${log.join('')}`);
}
