import { spawn } from "node:child_process";
import process from "node:process";

const groups = [
  "itinerary",
  "confirmed-itinerary",
  "hotels",
  "vendors",
  "drivers-vehicles",
  "hotspots",
  "activities",
  "locations",
  "guides",
  "staff-agents",
  "business-rules",
  "ui-ux",
];

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const runGroup = (group) =>
  new Promise((resolve, reject) => {
    const args = ["run", `e2e:group:${group}`];
    const command = process.platform === "win32" ? "cmd.exe" : npmCommand;
    const commandArgs = process.platform === "win32"
      ? ["/d", "/s", "/c", [npmCommand, ...args].join(" ")]
      : args;
    const child = spawn(command, commandArgs, {
      stdio: "inherit",
      env: process.env,
      windowsHide: true,
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal || code !== 0) {
        reject(new Error(`Playwright group ${group} failed`));
        return;
      }
      resolve();
    });
  });

for (const group of groups) {
  await runGroup(group);
}
