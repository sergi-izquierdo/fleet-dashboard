import { exec as execCb } from "child_process";
import { promisify } from "util";

const execPromise = promisify(execCb);

export async function execAsync(
  command: string
): Promise<{ stdout: string; stderr: string }> {
  return execPromise(command);
}
