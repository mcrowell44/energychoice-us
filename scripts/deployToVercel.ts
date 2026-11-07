import fs from "node:fs";
import path from "node:path";
import * as esbuild from "esbuild";

const PROJECT_NAME = "energychoice-us";
const PRIMARY_DOMAIN = "energychoice.us";
const WWW_DOMAIN = "www.energychoice.us";
const API_BASE = "https://api.vercel.com";

function loadDotEnv(envPath: string): Record<string, string> {
  const vars: Record<string, string> = {};
  if (!fs.existsSync(envPath)) return vars;
  const lines = fs.readFileSync(envPath, "utf-8").split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    vars[key] = val;
  }
  return vars;
}

interface DeployFileEntry {
  file: string;
  data: string;
  encoding: "base64";
}

async function collectProjectFiles(rootDir: string): Promise<DeployFileEntry[]> {
  const entries: DeployFileEntry[] = [];
  const rootFiles = [
    "index.html",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "vite.config.ts",
    "vercel.json",
  ];

  for (const rel of rootFiles) {
    const full = path.join(rootDir, rel);
    if (fs.existsSync(full)) {
      entries.push({
        file: rel,
        data: fs.readFileSync(full).toString("base64"),
        encoding: "base64",
      });
    }
  }

  // Walk frontend src/ and static public/ files for Vite build
  for (const folderName of ["src", "public"]) {
    const targetDir = path.join(rootDir, folderName);
    if (fs.existsSync(targetDir)) {
      const stack = [targetDir];
      while (stack.length > 0) {
        const current = stack.pop()!;
        for (const item of fs.readdirSync(current, { withFileTypes: true })) {
          const fullPath = path.join(current, item.name);
          if (item.isDirectory()) {
            stack.push(fullPath);
          } else if (item.isFile()) {
            const relPosix = path
              .relative(rootDir, fullPath)
              .split(path.sep)
              .join("/");
            entries.push({
              file: relPosix,
              data: fs.readFileSync(fullPath).toString("base64"),
              encoding: "base64",
            });
          }
        }
      }
    }
  }

  // Pre-bundle api/*.ts into self-contained ESM api/*.js functions for Node 22 Fluid Compute
  const apiDir = path.join(rootDir, "api");
  if (fs.existsSync(apiDir)) {
    for (const item of fs.readdirSync(apiDir, { withFileTypes: true })) {
      if (item.isFile() && item.name.endsWith(".ts")) {
        const entryPoint = path.join(apiDir, item.name);
        const built = await esbuild.build({
          entryPoints: [entryPoint],
          bundle: true,
          platform: "node",
          format: "esm",
          target: "node20",
          write: false,
        });
        const jsCode = built.outputFiles[0].contents;
        const outName = `api/${item.name.replace(/\.ts$/, ".js")}`;
        entries.push({
          file: outName,
          data: Buffer.from(jsCode).toString("base64"),
          encoding: "base64",
        });
      }
    }
  }

  return entries;
}

async function vercelApi<T = Record<string, unknown>>(
  token: string,
  endpoint: string,
  options: RequestInit = {},
  teamId?: string | null
): Promise<{ status: number; ok: boolean; data: T }> {
  const url = new URL(`${API_BASE}${endpoint}`);
  if (teamId) {
    url.searchParams.set("teamId", teamId);
  }
  const res = await fetch(url.toString(), {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { status: res.status, ok: res.ok, data: data as T };
}

async function main() {
  const rootDir = process.cwd();
  const envVars = loadDotEnv(path.join(rootDir, ".env"));
  const homeEnvVars = loadDotEnv(
    path.join(process.env.USERPROFILE || process.env.HOME || "", ".env")
  );

  const token = (
    process.env.VERCEL_TOKEN ||
    envVars.VERCEL_TOKEN ||
    homeEnvVars.VERCEL_TOKEN ||
    ""
  ).trim();

  if (!token) {
    console.error(
      "Missing VERCEL_TOKEN. Add VERCEL_TOKEN to .env and re-run `npm run deploy`."
    );
    process.exit(1);
  }

  console.log("1. Verifying Vercel account & workspace scope...");
  const userRes = await vercelApi<{
    user?: { username?: string; email?: string; defaultTeamId?: string | null };
  }>(token, "/v2/user");

  if (!userRes.ok || !userRes.data.user) {
    console.error("Vercel authentication failed:", JSON.stringify(userRes.data));
    process.exit(1);
  }

  let teamId: string | null = userRes.data.user.defaultTeamId || null;
  if (!teamId) {
    const teamsRes = await vercelApi<{ teams?: Array<{ id: string; slug: string }> }>(
      token,
      "/v2/teams"
    );
    if (teamsRes.ok && teamsRes.data.teams && teamsRes.data.teams.length > 0) {
      teamId = teamsRes.data.teams[0].id;
    }
  }

  console.log(
    `   Authenticated as: ${userRes.data.user.username || userRes.data.user.email} ${teamId ? `(Team Scope: ${teamId})` : "(Personal Scope)"}`
  );

  console.log(`2. Ensuring Vercel project '${PROJECT_NAME}' exists...`);
  const existingProj = await vercelApi<{ id?: string; name?: string }>(
    token,
    `/v9/projects/${PROJECT_NAME}`,
    { method: "GET" },
    teamId
  );

  if (!existingProj.ok) {
    const createProj = await vercelApi<{ id?: string; name?: string }>(
      token,
      "/v10/projects",
      {
        method: "POST",
        body: JSON.stringify({
          name: PROJECT_NAME,
          framework: "vite",
          buildCommand: "npm run build",
          outputDirectory: "dist",
        }),
      },
      teamId
    );
    if (!createProj.ok) {
      console.error("Failed to create project:", JSON.stringify(createProj.data));
      process.exit(1);
    }
    console.log(`   Created project: ${PROJECT_NAME}`);
  } else {
    console.log(`   Found existing project: ${PROJECT_NAME}`);
  }

  console.log("3. Syncing production environment variables...");
  const desiredEnv: Array<{ key: string; value: string }> = [
    {
      key: "ADMIN_NOTIFICATION_EMAIL",
      value: envVars.ADMIN_NOTIFICATION_EMAIL || "energychoiceus@cdmweb.store",
    },
    {
      key: "VITE_ADMIN_EMAIL",
      value: envVars.VITE_ADMIN_EMAIL || "energychoiceus@cdmweb.store",
    },
    {
      key: "NEXT_PUBLIC_APP_URL",
      value: "https://energychoice.us",
    },
    {
      key: "VITE_APP_URL",
      value: "https://energychoice.us",
    },
  ];

  for (const optionalKey of [
    "GOOGLE_SHEETS_WEBHOOK_URL",
    "RESEND_API_KEY",
    "RESEND_FROM_EMAIL",
    "EXECUTION_WEBHOOK_URL",
    "LOE_WEBHOOK_URL",
  ]) {
    if (envVars[optionalKey]?.trim()) {
      desiredEnv.push({ key: optionalKey, value: envVars[optionalKey].trim() });
    }
  }

  for (const item of desiredEnv) {
    await vercelApi(
      token,
      `/v10/projects/${PROJECT_NAME}/env?upsert=true`,
      {
        method: "POST",
        body: JSON.stringify({
          key: item.key,
          value: item.value,
          type: "encrypted",
          target: ["production", "preview"],
        }),
      },
      teamId
    );
  }
  console.log(`   Synced ${desiredEnv.length} environment variables.`);

  console.log("4. Uploading source & deploying to Vercel Production...");
  const files = await collectProjectFiles(rootDir);
  console.log(`   Bundled ${files.length} source files (zero local disk bloat).`);

  const deployRes = await vercelApi<{
    id?: string;
    url?: string;
    readyState?: string;
    alias?: string[];
  }>(
    token,
    "/v13/deployments?skipAutoDetectionConfirmation=1",
    {
      method: "POST",
      body: JSON.stringify({
        name: PROJECT_NAME,
        target: "production",
        files,
        projectSettings: {
          framework: "vite",
          buildCommand: "npm run build",
          outputDirectory: "dist",
          installCommand: "npm install",
        },
      }),
    },
    teamId
  );

  if (!deployRes.ok || !deployRes.data.id) {
    console.error("Deployment creation failed:", JSON.stringify(deployRes.data));
    process.exit(1);
  }

  const deploymentId = deployRes.data.id;
  let readyState = deployRes.data.readyState || "QUEUED";
  let deploymentUrl = deployRes.data.url || "";

  console.log(`   Deployment ID: ${deploymentId} (Initial state: ${readyState})`);

  for (let attempt = 0; attempt < 45; attempt++) {
    if (readyState === "READY" || readyState === "ERROR" || readyState === "CANCELED") {
      break;
    }
    await new Promise((r) => setTimeout(r, 4000));
    const check = await vercelApi<{
      readyState?: string;
      url?: string;
      errorMessage?: string;
    }>(token, `/v13/deployments/${deploymentId}`, { method: "GET" }, teamId);
    readyState = check.data.readyState || readyState;
    deploymentUrl = check.data.url || deploymentUrl;
    console.log(`   Build status: ${readyState}...`);
    if (readyState === "ERROR") {
      console.error("Build error details:", JSON.stringify(check.data));
      process.exit(1);
    }
  }

  console.log(`\n✅ PRODUCTION DEPLOYMENT READY: https://${deploymentUrl}`);

  console.log(`\n5. Attaching custom domains (${PRIMARY_DOMAIN} & ${WWW_DOMAIN})...`);
  const addApex = await vercelApi<{
    name?: string;
    verified?: boolean;
    verification?: Array<{ type: string; domain: string; value: string }>;
    error?: { code?: string; message?: string };
  }>(
    token,
    `/v10/projects/${PROJECT_NAME}/domains`,
    {
      method: "POST",
      body: JSON.stringify({ name: PRIMARY_DOMAIN }),
    },
    teamId
  );

  const addWww = await vercelApi(
    token,
    `/v10/projects/${PROJECT_NAME}/domains`,
    {
      method: "POST",
      body: JSON.stringify({
        name: WWW_DOMAIN,
        redirect: PRIMARY_DOMAIN,
        redirectStatusCode: 308,
      }),
    },
    teamId
  );
  void addWww;

  const domainInfo = await vercelApi<{
    name?: string;
    verified?: boolean;
    verification?: Array<{ type: string; domain: string; value: string }>;
  }>(
    token,
    `/v9/projects/${PROJECT_NAME}/domains/${PRIMARY_DOMAIN}`,
    { method: "GET" },
    teamId
  );

  const domainConfig = await vercelApi<{
    recommendedIPv4?: Array<{ rank: number; value: string[] }>;
    recommendedCNAME?: Array<{ rank: number; value: string }>;
    misconfigured?: boolean;
  }>(token, `/v6/domains/${PRIMARY_DOMAIN}/config`, { method: "GET" }, teamId);

  const wwwConfig = await vercelApi<{
    recommendedCNAME?: Array<{ rank: number; value: string }>;
  }>(token, `/v6/domains/${WWW_DOMAIN}/config`, { method: "GET" }, teamId);

  const recommendedA =
    domainConfig.data.recommendedIPv4?.find((r) => r.rank === 1)?.value?.[0] ||
    "76.76.21.21";
  const recommendedCname =
    wwwConfig.data.recommendedCNAME?.find((r) => r.rank === 1)?.value ||
    domainConfig.data.recommendedCNAME?.find((r) => r.rank === 1)?.value ||
    "cname.vercel-dns.com";

  console.log("\n==============================================================");
  console.log("NETWORK SOLUTIONS DNS RECORDS TO ADD FOR energychoice.us");
  console.log("==============================================================");
  console.log(`1. Type: A     | Host: @ (None) | Points To: ${recommendedA}`);
  console.log(`2. Type: CNAME | Host: www      | Points To: ${recommendedCname}`);

  const verifications =
    domainInfo.data.verification || addApex.data.verification || [];
  if (verifications.length > 0) {
    for (const v of verifications) {
      console.log(
        `3. Type: ${v.type}   | Host: ${v.domain} | Value: ${v.value}`
      );
    }
  }
  console.log("==============================================================");
}

main().catch((err) => {
  console.error("Deployment script failed:", err);
  process.exit(1);
});

