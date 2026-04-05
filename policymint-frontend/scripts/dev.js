const { execSync, spawn } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");

try {
  execSync("lsof -i :3000 -sTCP:LISTEN", { stdio: "ignore" });
  console.warn(
    "\n\x1b[33m⚠\x1b[0m Port \x1b[1m3000\x1b[0m is already in use. Opening \x1b[1mlocalhost:3000\x1b[0m may hit a different process (wrong page or 404).\n" +
      "  → Open the \x1b[36mLocal:\x1b[0m URL printed below, or free port 3000:\n" +
      "    \x1b[90mlsof -ti :3000 | xargs kill -9\x1b[0m\n"
  );
} catch {
  /* Exit 1 = nothing listening; ENOENT = no lsof (e.g. Windows) — both OK */
}

const child = spawn("npx", ["next", "dev"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
