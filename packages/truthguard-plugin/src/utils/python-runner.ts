import { spawn } from "child_process";
import path from "path";

export interface PythonScriptResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  stderr?: string;
}

/**
 * Execute Python ML script and parse JSON output
 */
export async function runPythonScript<T = unknown>(
  scriptPath: string,
  args: string[] = [],
  input?: Record<string, unknown>,
): Promise<PythonScriptResult<T>> {
  return new Promise((resolve) => {
    const pythonPath = process.env.PYTHON_PATH || "python3";
    const fullScriptPath = path.join(__dirname, "../../python/scripts", scriptPath);

    const pythonProcess = spawn(pythonPath, [fullScriptPath, ...args]);

    let stdout = "";
    let stderr = "";

    // Send input data if provided
    if (input) {
      pythonProcess.stdin.write(JSON.stringify(input));
      pythonProcess.stdin.end();
    }

    pythonProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        resolve({
          success: false,
          error: `Python script exited with code ${code}`,
          stderr: stderr.trim(),
        });
        return;
      }

      try {
        const data = JSON.parse(stdout.trim()) as T;
        resolve({
          success: true,
          data,
          stderr: stderr.trim() || undefined,
        });
      } catch (error) {
        resolve({
          success: false,
          error: `Failed to parse Python output: ${(error as Error).message}`,
          stderr: stderr.trim(),
        });
      }
    });

    pythonProcess.on("error", (error) => {
      resolve({
        success: false,
        error: `Failed to spawn Python process: ${error.message}`,
      });
    });
  });
}
