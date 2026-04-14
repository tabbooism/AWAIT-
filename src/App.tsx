/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Terminal, 
  ShieldAlert, 
  Search, 
  Zap, 
  FileCode, 
  Database, 
  Activity, 
  RefreshCw,
  Lock,
  Unlock,
  AlertTriangle,
  ChevronRight,
  Download
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Log {
  id: number;
  message: string;
}

interface Loot {
  vulnerabilities: string[];
  credentials: {
    grafana?: { user: string; pass: string; source: string }[];
    db?: { user: string; pass: string; status: string };
  };
  contractFindings: {
    file: string;
    vulnerability: string;
    guarded: boolean;
    risk: string;
  }[];
  reconData: {
    subdomains: { domain: string; ip: string }[];
    openPorts: { port: number; service: string; banner: string }[];
    techStack: Record<string, string>;
    emails?: string[];
    gravatarHashes?: { user: string; hash: string }[];
  };
  weaponization: {
    scripts: { name: string; type: string; target: string }[];
    phishing: { subject: string; template: string } | null;
  };
  exploitation: {
    exfiltratedData: { source: string; count: number; sample: any }[];
    wsLogs: string[];
  };
  installation: {
    backdoors: { type: string; path: string; status: string }[];
  };
  c2: {
    channels: { type: string; id: string; status: string }[];
  };
  objectives: {
    fundsExtracted: number;
    dbDumpSize: string;
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [logs, setLogs] = useState<string[]>([]);
  const [loot, setLoot] = useState<Loot | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [reconConfig, setReconConfig] = useState({
    targets: "runehall.com, rh420.xyz",
    depth: 1,
    dataPoints: ["subdomains", "ports", "tech", "emails", "gravatar"]
  });
  const [isTerminalOpen, setIsTerminalOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ phase: string; label: string } | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/logs");
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setLogs(data);
      setErrorStatus(null);
    } catch (e) {
      setErrorStatus("Connection Lost");
    }
  };

  const fetchLoot = async () => {
    try {
      const res = await fetch("/api/loot");
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setLoot(data);
    } catch (e) {
      // Silently fail loot fetch if connection is down
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      fetchLogs();
      fetchLoot();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const runPhase = async (phase: string) => {
    // Phases that require confirmation
    const sensitivePhases = ["phase4", "phase7", "resilience-test", "vuln-scan", "grafana-scan", "redis-rce"];
    if (sensitivePhases.includes(phase) && !confirmAction) {
      const labels: Record<string, string> = {
        "phase4": "Execute Exploitation Payloads",
        "phase7": "Finalize Actions on Objectives (Exfiltration)",
        "resilience-test": "Run Advanced Resilience Test",
        "vuln-scan": "Initiate Vulnerability Scan",
        "grafana-scan": "Initiate Grafana Credential Exfiltration",
        "redis-rce": "Execute Redis RCE Exploitation"
      };
      setConfirmAction({ phase, label: labels[phase] || phase });
      return;
    }

    setIsRunning(true);
    setConfirmAction(null);
    try {
      const body: any = {};
      if (phase === "phase1") {
        body.config = {
          ...reconConfig,
          targets: reconConfig.targets.split(",").map(t => t.trim())
        };
      }
      const res = await fetch(`/api/run-${phase}`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(`Failed to execute ${phase}`);
    } catch (e) {
      console.error(`Failed to run ${phase}`, e);
    }
    setIsRunning(false);
  };

  const resetSystem = async () => {
    await fetch("/api/reset", { method: "POST" });
    setLogs([]);
    setLoot(null);
  };

  const renderDashboard = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      <StatusCard 
        title="System Status" 
        value={isRunning ? "ACTIVE" : "READY"} 
        icon={<Activity className={isRunning ? "text-green-400 animate-pulse" : "text-blue-400"} />}
        color={isRunning ? "border-green-500/30" : "border-blue-500/30"}
      />
      <StatusCard 
        title="Vulnerabilities Found" 
        value={loot?.vulnerabilities.length || 0} 
        icon={<ShieldAlert className="text-red-400" />}
        color="border-red-500/30"
      />
      <StatusCard 
        title="Funds Extracted" 
        value={`${loot?.objectives.fundsExtracted.toFixed(2) || "0.00"} RH`} 
        icon={<Lock className="text-orange-400" />}
        color="border-orange-500/30"
      />
      
      <div className="col-span-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div>
            <h3 className="text-zinc-400 font-mono text-xs uppercase tracking-widest mb-1">Kill Chain Execution</h3>
            <p className="text-[10px] text-zinc-600 font-mono">Execute sequential phases of the cyber kill chain.</p>
          </div>
          
          {/* Recon Config */}
          <div className="bg-zinc-950/50 border border-zinc-800/50 p-3 rounded flex flex-wrap gap-4 items-center">
            <div className="flex flex-col gap-1">
              <label className="text-[9px] text-zinc-500 uppercase font-mono">Targets (comma separated)</label>
              <input 
                type="text" 
                value={reconConfig.targets}
                onChange={(e) => setReconConfig({...reconConfig, targets: e.target.value})}
                className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px] px-2 py-1 rounded w-48 focus:outline-none focus:border-orange-500/50"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] text-zinc-500 uppercase font-mono">Crawl Depth</label>
              <select 
                value={reconConfig.depth}
                onChange={(e) => setReconConfig({...reconConfig, depth: parseInt(e.target.value)})}
                className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px] px-2 py-1 rounded focus:outline-none focus:border-orange-500/50"
              >
                <option value={1}>1 (Surface)</option>
                <option value={2}>2 (Deep)</option>
                <option value={3}>3 (Exhaustive)</option>
              </select>
            </div>
            <div className="flex gap-3">
              {["subdomains", "ports", "tech", "emails", "gravatar"].map(dp => (
                <label key={dp} className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={reconConfig.dataPoints.includes(dp)}
                    onChange={(e) => {
                      const newDP = e.target.checked 
                        ? [...reconConfig.dataPoints, dp]
                        : reconConfig.dataPoints.filter(d => d !== dp);
                      setReconConfig({...reconConfig, dataPoints: newDP});
                    }}
                    className="sr-only"
                  />
                  <div className={`w-3 h-3 border rounded-sm transition-colors ${reconConfig.dataPoints.includes(dp) ? "bg-orange-500 border-orange-500" : "border-zinc-700 group-hover:border-zinc-500"}`} />
                  <span className="text-[10px] text-zinc-400 capitalize font-mono">{dp}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ActionButton label="Phase 1: Recon" icon={<Search size={16} />} onClick={() => runPhase("phase1")} disabled={isRunning} />
          <ActionButton label="Phase 2: Weaponize" icon={<Zap size={16} />} onClick={() => runPhase("phase2")} disabled={isRunning} />
          <ActionButton label="Phase 3: Delivery" icon={<Download size={16} />} onClick={() => runPhase("phase3")} disabled={isRunning} />
          <ActionButton label="Phase 4: Exploit" icon={<ShieldAlert size={16} />} onClick={() => runPhase("phase4")} disabled={isRunning} />
          <ActionButton label="Phase 5: Install" icon={<Database size={16} />} onClick={() => runPhase("phase5")} disabled={isRunning} />
          <ActionButton label="Phase 6: C2" icon={<Terminal size={16} />} onClick={() => runPhase("phase6")} disabled={isRunning} />
          <ActionButton label="Phase 7: Actions" icon={<Lock size={16} />} onClick={() => runPhase("phase7")} disabled={isRunning} />
          <ActionButton 
            label="Resilience Test" 
            icon={<ShieldAlert size={16} />} 
            onClick={() => runPhase("resilience-test")} 
            disabled={isRunning} 
            className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
          />
          <ActionButton 
            label="Vuln Scan" 
            icon={<Search size={16} />} 
            onClick={() => runPhase("vuln-scan")} 
            disabled={isRunning} 
            className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
          />
          <ActionButton 
            label="Grafana Scan" 
            icon={<Database size={16} />} 
            onClick={() => runPhase("grafana-scan")} 
            disabled={isRunning} 
            className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
          />
          <ActionButton 
            label="Redis RCE" 
            icon={<Zap size={16} />} 
            onClick={() => runPhase("redis-rce")} 
            disabled={isRunning} 
            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
          />
          <button 
            onClick={resetSystem}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-zinc-700 hover:bg-zinc-800 text-zinc-400 rounded transition-colors font-mono text-sm"
          >
            <RefreshCw size={16} /> RESET
          </button>
        </div>
      </div>
    </div>
  );

  const renderLoot = () => (
    <div className="p-6 space-y-8">
      {/* Recon Findings */}
      <section>
        <h3 className="text-blue-400 font-mono text-sm uppercase mb-4 flex items-center gap-2">
          <Search size={18} /> Reconnaissance Data
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded">
            <h4 className="text-[10px] text-zinc-500 uppercase mb-2">Subdomains Discoverd</h4>
            <div className="space-y-1">
              {loot?.reconData.subdomains.map((s, i) => (
                <div key={i} className="flex justify-between font-mono text-xs">
                  <span className="text-zinc-300">{s.domain}</span>
                  <span className="text-zinc-600">{s.ip}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded">
            <h4 className="text-[10px] text-zinc-500 uppercase mb-2">Open Ports</h4>
            <div className="space-y-1">
              {loot?.reconData.openPorts.map((p, i) => (
                <div key={i} className="flex justify-between font-mono text-xs">
                  <span className="text-zinc-300">Port {p.port} ({p.service})</span>
                  <span className="text-zinc-600 truncate max-w-[150px]">{p.banner}</span>
                </div>
              ))}
            </div>
          </div>
          {loot?.credentials.grafana && loot.credentials.grafana.length > 0 && (
            <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded col-span-full">
              <h4 className="text-[10px] text-zinc-500 uppercase mb-2">Grafana Credentials</h4>
              <div className="space-y-2">
                {loot.credentials.grafana.map((g, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 bg-zinc-950 rounded border border-zinc-800/50 font-mono text-xs">
                    <span className="text-blue-400">{g.source}</span>
                    <div className="flex gap-4 mt-1 sm:mt-0">
                      <span className="text-zinc-500">USER: <span className="text-zinc-300">{g.user}</span></span>
                      <span className="text-zinc-500">PASS: <span className="text-zinc-300">{g.pass}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {loot?.reconData.emails && (
            <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded">
              <h4 className="text-[10px] text-zinc-500 uppercase mb-2">Scraped Emails</h4>
              <div className="space-y-1">
                {loot.reconData.emails.map((email, i) => (
                  <div key={i} className="text-xs font-mono text-zinc-300">
                    {email}
                  </div>
                ))}
              </div>
            </div>
          )}
          {loot?.reconData.gravatarHashes && (
            <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded">
              <h4 className="text-[10px] text-zinc-500 uppercase mb-2">Gravatar Hashes</h4>
              <div className="space-y-1">
                {loot.reconData.gravatarHashes.map((g, i) => (
                  <div key={i} className="flex justify-between font-mono text-xs">
                    <span className="text-orange-500">{g.user}</span>
                    <span className="text-zinc-600 text-[10px]">{g.hash}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Exploitation Data */}
      <section>
        <h3 className="text-red-400 font-mono text-sm uppercase mb-4 flex items-center gap-2">
          <Zap size={18} /> Exploitation & Exfiltration
        </h3>
        <div className="space-y-4">
          {loot?.exploitation.exfiltratedData.map((d, i) => (
            <div key={i} className="bg-red-950/10 border border-red-900/20 p-4 rounded">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-mono text-red-400">{d.source}</span>
                <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded">{d.count} RECORDS</span>
              </div>
              <pre className="text-[10px] text-zinc-500 overflow-x-auto">
                {JSON.stringify(d.sample, null, 2)}
              </pre>
            </div>
          ))}
          <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded">
            <h4 className="text-[10px] text-zinc-500 uppercase mb-2">WebSocket Activity</h4>
            <div className="space-y-1 font-mono text-[10px] text-zinc-400">
              {loot?.exploitation.wsLogs.map((log, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-zinc-600">[{i}]</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Persistence & C2 */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-green-400 font-mono text-sm uppercase mb-4 flex items-center gap-2">
            <Database size={18} /> Persistence
          </h3>
          <div className="space-y-2">
            {loot?.installation.backdoors.map((b, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-green-950/10 border border-green-900/20 rounded font-mono text-xs">
                <span className="text-green-300">{b.type}</span>
                <span className="text-zinc-600">{b.path}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-purple-400 font-mono text-sm uppercase mb-4 flex items-center gap-2">
            <Terminal size={18} /> C2 Channels
          </h3>
          <div className="space-y-2">
            {loot?.c2.channels.map((c, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-purple-950/10 border border-purple-900/20 rounded font-mono text-xs">
                <span className="text-purple-300">{c.type}</span>
                <span className="text-zinc-600">{c.id || c.domain}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );

  const renderIntelligence = () => (
    <div className="p-6 space-y-8">
      <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-600/20 rounded flex items-center justify-center border border-blue-500/30">
            <Search className="text-blue-400" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-100">Module 1: Target Intelligence (RO)</h2>
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Persistent Operational Context</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <IntelSection title="Infrastructure" items={[
            { label: "Origin IP", value: "45.79.181.244", status: "VERIFIED" },
            { label: "Staging Domain", value: "staging-admin.rh420.gg", status: "ACTIVE" },
            { label: "API Endpoint", value: "api.runehall.io", status: "ACTIVE" },
            { label: "Contract Repo", value: "runehall/rh420-contracts", status: "TRACKED" }
          ]} />
          
          <IntelSection title="Access Vectors" items={[
            { label: "SSH Service", value: "Port 22", status: "DETECTED" },
            { label: "Grafana Panel", value: "Port 3000", status: "VULNERABLE" },
            { label: "Node Exporter", value: "Port 9100", status: "EXPOSED" },
            { label: "MongoDB", value: "Port 27017", status: "INTERNAL" }
          ]} />
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-orange-600/20 rounded flex items-center justify-center border border-orange-500/30">
            <ShieldAlert className="text-orange-400" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-100">Operational Clearance</h2>
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Root-Level Persistence</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded">
            <span className="font-mono text-sm text-zinc-400">CLEARANCE_LEVEL</span>
            <span className="font-mono text-sm text-orange-500 font-bold">ROOT_ACCESS_GRANTED</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded">
            <span className="font-mono text-sm text-zinc-400">EVASION_STATUS</span>
            <span className="font-mono text-sm text-green-500">ADAPTIVE_STEALTH_ACTIVE</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard": return renderDashboard();
      case "loot": return renderLoot();
      case "intel": return renderIntelligence();
      default: return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-200 font-sans selection:bg-orange-500/30 overflow-x-hidden">
      <div className="scanline pointer-events-none" />
      {/* Header */}
      <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-4 md:px-6 bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button 
            className="lg:hidden p-2 -ml-2 text-zinc-400 hover:text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Terminal size={20} />
          </button>
          <div className="w-8 h-8 bg-orange-600 rounded flex items-center justify-center shrink-0">
            <ShieldAlert className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-bold tracking-tight text-zinc-100">RHAE <span className="text-orange-500">v2.0</span></h1>
            <p className="text-[9px] md:text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Adversary Emulation Agent</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-2 md:px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full">
            <div className={`w-2 h-2 rounded-full ${errorStatus ? "bg-red-500" : isRunning ? "bg-green-500 animate-pulse" : "bg-zinc-600"}`} />
            <span className="text-[10px] md:text-xs font-mono text-zinc-400 uppercase">{errorStatus || (isRunning ? "ACTIVE" : "STANDBY")}</span>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)] relative">
        {/* Sidebar (Desktop) */}
        <nav className="w-64 border-r border-zinc-800 p-4 space-y-2 hidden lg:block shrink-0">
          <SidebarItem 
            active={activeTab === "dashboard"} 
            onClick={() => setActiveTab("dashboard")} 
            icon={<Activity size={18} />} 
            label="Dashboard" 
          />
          <SidebarItem 
            active={activeTab === "intel"} 
            onClick={() => setActiveTab("intel")} 
            icon={<Search size={18} />} 
            label="Intelligence" 
          />
          <SidebarItem 
            active={activeTab === "loot"} 
            onClick={() => setActiveTab("loot")} 
            icon={<Database size={18} />} 
            label="Loot & Findings" 
          />
          <div className="pt-4 mt-4 border-t border-zinc-800">
            <h4 className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest px-3 mb-2">Target Info</h4>
            <div className="px-3 py-2 bg-zinc-900/50 rounded border border-zinc-800">
              <p className="text-xs font-mono text-zinc-400">IP: 45.79.181.244</p>
              <p className="text-xs font-mono text-zinc-400">DOMAIN: rh420.gg</p>
            </div>
          </div>
        </nav>

        {/* Mobile Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
              />
              <motion.nav 
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed top-0 left-0 bottom-0 w-72 bg-[#0a0a0a] border-r border-zinc-800 p-6 z-[70] lg:hidden"
              >
                <div className="flex items-center gap-3 mb-8">
                  <ShieldAlert className="text-orange-500" size={24} />
                  <span className="font-bold text-xl">RHAE MENU</span>
                </div>
                <div className="space-y-4">
                  <SidebarItem 
                    active={activeTab === "dashboard"} 
                    onClick={() => { setActiveTab("dashboard"); setIsMobileMenuOpen(false); }} 
                    icon={<Activity size={20} />} 
                    label="Dashboard" 
                  />
                  <SidebarItem 
                    active={activeTab === "intel"} 
                    onClick={() => { setActiveTab("intel"); setIsMobileMenuOpen(false); }} 
                    icon={<Search size={20} />} 
                    label="Intelligence" 
                  />
                  <SidebarItem 
                    active={activeTab === "loot"} 
                    onClick={() => { setActiveTab("loot"); setIsMobileMenuOpen(false); }} 
                    icon={<Database size={20} />} 
                    label="Loot & Findings" 
                  />
                </div>
                <div className="absolute bottom-8 left-6 right-6 pt-6 border-t border-zinc-800">
                  <h4 className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">Target Infrastructure</h4>
                  <div className="p-4 bg-zinc-900/50 rounded border border-zinc-800 font-mono text-xs space-y-2">
                    <p className="text-zinc-400">IP: 45.79.181.244</p>
                    <p className="text-zinc-400">HOST: rh420.gg</p>
                    <p className="text-zinc-400">STATUS: REACHABLE</p>
                  </div>
                </div>
              </motion.nav>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className={`flex-1 overflow-y-auto bg-grid-pattern relative pb-24 lg:pb-0 ${isTerminalOpen ? "lg:mb-48" : "lg:mb-10"}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>

          {/* Terminal Log */}
          <div className={`
            fixed bottom-0 right-0 left-0 lg:left-64 bg-black border-t border-zinc-800 transition-all duration-300 z-40
            ${isTerminalOpen ? "h-64 lg:h-48" : "h-10"}
          `}>
            <div 
              className="flex items-center justify-between px-4 h-10 bg-zinc-900/50 cursor-pointer border-b border-zinc-800/50"
              onClick={() => setIsTerminalOpen(!isTerminalOpen)}
            >
              <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest flex items-center gap-2">
                <Terminal size={14} /> System Logs {isTerminalOpen ? "(OPEN)" : "(CLOSED)"}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-zinc-700 font-mono hidden sm:inline">RHAE_OS v2.0.4</span>
                <ChevronRight size={14} className={`text-zinc-500 transition-transform ${isTerminalOpen ? "rotate-90" : "-rotate-90"}`} />
              </div>
            </div>
            
            {isTerminalOpen && (
              <div className="p-4 font-mono text-[10px] md:text-xs overflow-y-auto h-[calc(100%-2.5rem)] scrollbar-hide">
                <div className="space-y-1">
                  {logs.map((log, i) => (
                    <div key={i} className="text-zinc-400 break-all">
                      <span className="text-zinc-600 mr-2">[{i.toString().padStart(3, '0')}]</span>
                      {log}
                    </div>
                  ))}
                  <div ref={logEndRef} />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0a0a0a] border-t border-zinc-800 flex items-center justify-around z-50 px-2">
        <MobileNavItem 
          active={activeTab === "dashboard"} 
          onClick={() => setActiveTab("dashboard")} 
          icon={<Activity size={20} />} 
          label="Dashboard" 
        />
        <MobileNavItem 
          active={activeTab === "intel"} 
          onClick={() => setActiveTab("intel")} 
          icon={<Search size={20} />} 
          label="Intel" 
        />
        <MobileNavItem 
          active={activeTab === "loot"} 
          onClick={() => setActiveTab("loot")} 
          icon={<Database size={20} />} 
          label="Loot" 
        />
      </div>

      <AnimatePresence>
        {confirmAction && (
          <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmAction(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-zinc-900 border border-zinc-800 p-6 rounded-lg max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4 text-orange-500">
                <AlertTriangle size={24} />
                <h3 className="text-lg font-bold font-mono uppercase tracking-tight">Confirm Operation</h3>
              </div>
              <p className="text-zinc-400 text-sm mb-6 font-mono">
                You are about to initiate: <span className="text-zinc-100 font-bold">{confirmAction.label}</span>. 
                This action may have irreversible effects on the target environment and trigger defensive alerts.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => runPhase(confirmAction.phase)}
                  className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-mono py-2 rounded text-sm transition-colors"
                >
                  PROCEED
                </button>
                <button 
                  onClick={() => setConfirmAction(null)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono py-2 rounded text-sm transition-colors"
                >
                  CANCEL
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function IntelSection({ title, items }: { title: string; items: { label: string; value: string; status: string }[] }) {
  return (
    <div className="space-y-3">
      <h4 className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest border-b border-zinc-800 pb-2">{title}</h4>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex flex-col p-3 bg-zinc-950 rounded border border-zinc-800/50">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-mono text-zinc-500 uppercase">{item.label}</span>
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                item.status === "VULNERABLE" ? "bg-red-500/10 text-red-500" : 
                item.status === "ACTIVE" ? "bg-green-500/10 text-green-500" : "bg-zinc-800 text-zinc-400"
              }`}>{item.status}</span>
            </div>
            <span className="text-xs font-mono text-zinc-300 truncate">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MobileNavItem({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${active ? "text-orange-500" : "text-zinc-500"}`}
    >
      {icon}
      <span className="text-[10px] font-mono uppercase tracking-tighter">{label}</span>
    </button>
  );
}

function StatusCard({ title, value, icon, color }: { title: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className={`bg-zinc-900/40 border ${color} p-5 rounded-lg backdrop-blur-sm`}>
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest">{title}</h3>
        {icon}
      </div>
      <div className="text-3xl font-bold tracking-tight text-zinc-100">{value}</div>
    </div>
  );
}

function ActionButton({ label, icon, onClick, disabled, className }: { label: string; icon: React.ReactNode; onClick: () => void; disabled?: boolean; className?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center gap-3 px-6 py-3 rounded font-mono text-sm transition-all
        ${disabled 
          ? "bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed" 
          : className || "bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/20 active:scale-95"}
      `}
    >
      {icon} {label}
    </button>
  );
}

function SidebarItem({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-3 py-2 rounded transition-colors font-mono text-sm
        ${active 
          ? "bg-orange-500/10 text-orange-500 border border-orange-500/20" 
          : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"}
      `}
    >
      {icon} {label}
      {active && <ChevronRight size={14} className="ml-auto" />}
    </button>
  );
}
