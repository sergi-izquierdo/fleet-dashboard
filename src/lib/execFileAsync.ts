import { execFile as execFileCb } from "child_process";
import { promisify } from "util";

const execFilePromise = promisify(execFileCb);

export async function execFileAsync(
  file: string,
  args: string[]
): Promise<{ stdout: string; stderr: string }> {
  return execFilePromise(file, args);
}
