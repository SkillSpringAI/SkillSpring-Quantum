const { spawn } = require("node:child_process");

function runCommand(command, args, options = {}) {
  return new Promise((resolve) => {
    const shell = options.shell ?? (process.platform === "win32");

    console.log("[runCommand]", {
      command,
      args,
      cwd: options.cwd || process.cwd(),
      shell
    });

    const child = spawn(command, args, {
      cwd: options.cwd || process.cwd(),
      shell,
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", (error) => {
      resolve({
        ok: false,
        code: -1,
        stdout,
        stderr: stderr + error.message
      });
    });

    child.on("close", (code) => {
      resolve({
        ok: code === 0,
        code,
        stdout,
        stderr
      });
    });
  });
}

module.exports = { runCommand };
