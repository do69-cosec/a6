"use client";

import { useState, useEffect } from "react";
import { Zap, Plus, Play, Pause, Trash2, Clock, Bell, FileText, Send, CheckCircle2, ArrowRight, Activity, Terminal } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Rule = {
  id: string;
  name: string;
  trigger: string;
  action: string;
  isActive: boolean;
  executionCount: number;
  lastRunAt: Date | null;
};

type RuleLog = {
  id: string;
  ruleName: string;
  trigger: string;
  action: string;
  status: "SUCCESS" | "FAILED";
  message: string;
  timestamp: Date;
};

const TRIGGER_OPTIONS = [
  { value: "lead.won", label: "Lead marked as Won", icon: "🎯" },
  { value: "proposal.approved", label: "Proposal approved by client", icon: "✅" },
  { value: "invoice.overdue", label: "Invoice becomes overdue", icon: "⚠️" },
  { value: "task.completed", label: "All tasks in project done", icon: "✔️" },
  { value: "content.approved", label: "Content admin-approved", icon: "📸" },
  { value: "client.created", label: "New client added", icon: "🏢" },
  { value: "attendance.late", label: "Employee checks in late", icon: "🕐" },
  { value: "project.overdue", label: "Project passes deadline", icon: "📅" },
];

const ACTION_OPTIONS = [
  { value: "create.client", label: "Auto-create client from lead", icon: "🏢" },
  { value: "create.agreement", label: "Generate draft agreement", icon: "📄" },
  { value: "send.invoice", label: "Send invoice to client", icon: "💳" },
  { value: "send.reminder", label: "Send payment reminder", icon: "🔔" },
  { value: "publish.content", label: "Publish to social platforms", icon: "📲" },
  { value: "notify.team", label: "Notify team on Slack/Email", icon: "📧" },
  { value: "update.status", label: "Update project status", icon: "🔄" },
  { value: "create.task", label: "Create follow-up task", icon: "📋" },
];

const PRESET_TEMPLATES = [
  {
    name: "Lead → Client Auto-Convert",
    trigger: "lead.won",
    action: "create.client",
    description: "When a lead is marked Won, automatically create a new client record and notify the account manager.",
    category: "Sales",
    color: "emerald",
  },
  {
    name: "Proposal → Contract Generator",
    trigger: "proposal.approved",
    action: "create.agreement",
    description: "When a proposal is approved, auto-generate a draft service agreement ready for e-signature.",
    category: "Finance",
    color: "blue",
  },
  {
    name: "Overdue Invoice Reminder",
    trigger: "invoice.overdue",
    action: "send.reminder",
    description: "Automatically send a payment reminder email to the client when an invoice passes its due date.",
    category: "Finance",
    color: "amber",
  },
  {
    name: "Content Approval → Auto Publish",
    trigger: "content.approved",
    action: "publish.content",
    description: "When content gets admin approval, automatically publish to all selected social platforms.",
    category: "Content",
    color: "violet",
  },
  {
    name: "Project Overdue Alert",
    trigger: "project.overdue",
    action: "notify.team",
    description: "When a project passes its end date, send an alert to the project manager and team.",
    category: "Projects",
    color: "red",
  },
  {
    name: "New Client Onboarding Task",
    trigger: "client.created",
    action: "create.task",
    description: "When a new client is added, auto-create an onboarding checklist task for the account manager.",
    category: "CRM",
    color: "sky",
  },
];

const COLOR_MAP: Record<string, string> = {
  emerald: "bg-emerald-50 border-emerald-250 dark:bg-emerald-950/20 dark:border-emerald-800",
  blue: "bg-blue-50 border-blue-250 dark:bg-blue-950/20 dark:border-blue-800",
  amber: "bg-amber-50 border-amber-250 dark:bg-amber-950/20 dark:border-amber-800",
  violet: "bg-violet-50 border-violet-250 dark:bg-violet-950/20 dark:border-violet-800",
  red: "bg-red-50 border-red-250 dark:bg-red-950/20 dark:border-red-800",
  sky: "bg-sky-50 border-sky-250 dark:bg-sky-950/20 dark:border-sky-800",
};

const CATEGORY_COLORS: Record<string, string> = {
  Sales: "text-emerald-400 bg-emerald-900/40 border border-emerald-800",
  Finance: "text-blue-400 bg-blue-900/40 border border-blue-800",
  Content: "text-violet-400 bg-violet-900/40 border border-violet-800",
  Projects: "text-red-400 bg-red-900/40 border border-red-800",
  CRM: "text-sky-400 bg-sky-900/40 border border-sky-800",
};

export function AutomationManager({ rules, isAdmin }: { rules: Rule[]; isAdmin: boolean }) {
  const [localRules, setLocalRules] = useState<Rule[]>(rules);
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTrigger, setNewTrigger] = useState("lead.won");
  const [newAction, setNewAction] = useState("create.client");
  const [activeTab, setActiveTab] = useState<"rules" | "templates">("rules");

  // Visual Simulator State
  const [testRule, setTestRule] = useState<Rule | null>(null);
  const [simulationStep, setSimulationStep] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);

  // Simulation Log history
  const [executionLogs, setExecutionLogs] = useState<RuleLog[]>([
    {
      id: "log-1",
      ruleName: "Lead → Client Auto-Convert",
      trigger: "lead.won",
      action: "create.client",
      status: "SUCCESS",
      message: "Lead 'Acme Retail Campaign' was auto-created as Client successfully.",
      timestamp: new Date(Date.now() - 3600000 * 2),
    },
    {
      id: "log-2",
      ruleName: "Proposal → Contract Generator",
      trigger: "proposal.approved",
      action: "create.agreement",
      status: "SUCCESS",
      message: "Draft Contract generated for Acme Retail.",
      timestamp: new Date(Date.now() - 3600000 * 4),
    },
  ]);

  // Trigger test simulator timeline
  const triggerSimulator = (rule: Rule) => {
    setTestRule(rule);
    setSimulationStep(0);
    setIsSimulating(true);
  };

  useEffect(() => {
    if (isSimulating && testRule) {
      if (simulationStep < 4) {
        const interval = setTimeout(() => {
          setSimulationStep(prev => prev + 1);
        }, 1000);
        return () => clearTimeout(interval);
      } else {
        // Appends trace result to log and show notification
        const newLog: RuleLog = {
          id: `sim-log-${Math.random().toString(36).substring(2, 7)}`,
          ruleName: testRule.name,
          trigger: testRule.trigger,
          action: testRule.action,
          status: "SUCCESS",
          message: `Simulation of "${testRule.name}" completed successfully. Output: [${testRule.action}] event processed.`,
          timestamp: new Date(),
        };
        setExecutionLogs(prev => [newLog, ...prev]);

        // Increment local rule run count
        setLocalRules(prev => prev.map(r => r.id === testRule.id ? { ...r, executionCount: r.executionCount + 1, lastRunAt: new Date() } : r));
        setIsSimulating(false);
        toast.success("Rule simulation completed successfully!");
      }
    }
  }, [isSimulating, simulationStep, testRule]);

  const toggleRule = (id: string) => {
    setLocalRules(prev => prev.map(r =>
      r.id === id ? { ...r, isActive: !r.isActive } : r
    ));
    toast.success("Rule status updated");
  };

  const deleteRule = (id: string) => {
    if (!confirm("Delete this automation rule?")) return;
    setLocalRules(prev => prev.filter(r => r.id !== id));
    toast.success("Rule deleted");
  };

  const addFromTemplate = (t: typeof PRESET_TEMPLATES[0]) => {
    const fakeRule: Rule = {
      id: Math.random().toString(36).slice(2),
      name: t.name,
      trigger: t.trigger,
      action: t.action,
      isActive: true,
      executionCount: 0,
      lastRunAt: null,
    };
    setLocalRules(prev => [fakeRule, ...prev]);
    toast.success(`"${t.name}" automation enabled!`);
  };

  const addCustomRule = () => {
    if (!newName.trim()) { toast.error("Enter a rule name"); return; }
    const fakeRule: Rule = {
      id: Math.random().toString(36).slice(2),
      name: newName,
      trigger: newTrigger,
      action: newAction,
      isActive: true,
      executionCount: 0,
      lastRunAt: null,
    };
    setLocalRules(prev => [fakeRule, ...prev]);
    setOpen(false);
    setNewName("");
    toast.success("Automation rule created!");
  };

  const getTriggerLabel = (key: string) => TRIGGER_OPTIONS.find(t => t.value === key)?.label ?? key;
  const getActionLabel = (key: string) => ACTION_OPTIONS.find(a => a.value === key)?.label ?? key;
  const getTriggerIcon = (key: string) => TRIGGER_OPTIONS.find(t => t.value === key)?.icon ?? "⚡";
  const getActionIcon = (key: string) => ACTION_OPTIONS.find(a => a.value === key)?.icon ?? "🔧";

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-violet-400" />
              <span className="text-xs text-slate-400">Total Rules</span>
            </div>
            <p className="text-2xl font-bold text-slate-200">{localRules.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Play className="h-4 w-4 text-emerald-400 animate-pulse" />
              <span className="text-xs text-slate-400">Active</span>
            </div>
            <p className="text-2xl font-bold text-slate-200">{localRules.filter(r => r.isActive).length}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-slate-400">Executions</span>
            </div>
            <p className="text-2xl font-bold text-slate-200">{localRules.reduce((s, r) => s + r.executionCount, 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tab Toggle */}
      <div className="flex gap-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab("rules")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "rules" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-white"}`}
        >
          My Rules ({localRules.length})
        </button>
        <button
          onClick={() => setActiveTab("templates")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "templates" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-white"}`}
        >
          ✨ Templates
        </button>
      </div>

      {activeTab === "rules" && (
        <div className="space-y-6">
          <div className="flex justify-end">
            {isAdmin && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger render={<Button className="btn-micro-anim" />}>
                  <Plus className="h-4 w-4 mr-2" /> New Rule
                </DialogTrigger>
                <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-white">
                  <DialogHeader><DialogTitle className="text-white">Create Automation Rule</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-slate-400">Rule Name *</Label>
                      <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Invoice follow-up" className="bg-slate-950 border-slate-800 text-white input-focus-anim" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-400">When (Trigger)</Label>
                      <select value={newTrigger} onChange={e => setNewTrigger(e.target.value)} className="flex h-9 w-full rounded-md border border-slate-850 bg-slate-950 px-3 text-sm text-white">
                        {TRIGGER_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-400">Then (Action)</Label>
                      <select value={newAction} onChange={e => setNewAction(e.target.value)} className="flex h-9 w-full rounded-md border border-slate-850 bg-slate-950 px-3 text-sm text-white">
                        {ACTION_OPTIONS.map(a => <option key={a.value} value={a.value}>{a.icon} {a.label}</option>)}
                      </select>
                    </div>
                    {/* Preview */}
                    <div className="bg-slate-950 border border-slate-850 rounded-xl p-3 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">{getTriggerIcon(newTrigger)}</span>
                        <div className="text-xs">
                          <p className="text-slate-500 font-bold">WHEN</p>
                          <p className="font-semibold text-slate-300">{getTriggerLabel(newTrigger)}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-500 shrink-0 mx-2" />
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">{getActionIcon(newAction)}</span>
                        <div className="text-xs">
                          <p className="text-slate-500 font-bold">THEN</p>
                          <p className="font-semibold text-primary">{getActionLabel(newAction)}</p>
                        </div>
                      </div>
                    </div>
                    <Button onClick={addCustomRule} className="w-full btn-micro-anim">Create Rule</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {localRules.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl">
              <Zap className="h-10 w-10 text-slate-650 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No automation rules yet</p>
              <p className="text-xs text-slate-500 mt-1">Use templates to get started quickly</p>
              <Button variant="outline" className="mt-4 border-slate-800 hover:bg-slate-800 text-slate-300" onClick={() => setActiveTab("templates")}>Browse Templates</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {localRules.map((rule) => (
                <Card key={rule.id} className={`transition-all border-slate-800 bg-slate-900/40 text-white ${rule.isActive ? "" : "opacity-50"}`}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-bold text-sm text-slate-200">{rule.name}</p>
                          <Badge variant={rule.isActive ? "default" : "secondary"} className="text-[10px] py-0">
                            {rule.isActive ? "Active" : "Paused"}
                          </Badge>
                          {rule.executionCount > 0 && (
                            <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full font-mono">
                              {rule.executionCount}× ran
                            </span>
                          )}
                        </div>
                        {/* Visual rule flow */}
                        <div className="flex items-center gap-2 text-xs">
                          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1.5">
                            <span>{getTriggerIcon(rule.trigger)}</span>
                            <span className="text-slate-400">{getTriggerLabel(rule.trigger)}</span>
                          </div>
                          <ArrowRight className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-lg px-2.5 py-1.5">
                            <span>{getActionIcon(rule.action)}</span>
                            <span className="text-primary font-bold">{getActionLabel(rule.action)}</span>
                          </div>
                        </div>
                        {rule.lastRunAt && (
                          <p className="text-[10px] text-slate-500 mt-2">
                            Last run: {new Date(rule.lastRunAt).toLocaleString("en-IN")}
                          </p>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-3">
                          {rule.isActive && (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => triggerSimulator(rule)}
                              className="text-[10px] h-7 border-slate-800 hover:bg-slate-800 flex items-center gap-1 text-slate-300 btn-micro-anim"
                            >
                              <Play className="h-3 w-3 text-emerald-400" /> Test Run
                            </Button>
                          )}
                          <Switch checked={rule.isActive} onCheckedChange={() => toggleRule(rule.id)} />
                          <button onClick={() => deleteRule(rule.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Rule Execution Audit Logs panel */}
          <Card className="border-slate-800 bg-slate-900/40 text-slate-100 mt-6">
            <CardHeader className="py-4 border-b border-slate-800 bg-slate-950/20 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                  <Terminal className="h-4 w-4 text-primary" /> Automation Audit History Logs
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">Execution records of automated background workflows</CardDescription>
              </div>
              <Activity className="h-4 w-4 text-slate-650" />
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {executionLogs.map((log) => (
                  <div key={log.id} className="border border-slate-800 bg-slate-950/30 p-2.5 rounded-lg text-xs flex justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-300">{log.ruleName}</span>
                        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] py-0 leading-none">
                          {log.status}
                        </Badge>
                      </div>
                      <p className="text-slate-400">{log.message}</p>
                      <p className="text-[9px] text-slate-500 font-mono">
                        Trigger: {log.trigger} → Action: {log.action}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono text-right shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "templates" && (
        <div className="grid gap-4 md:grid-cols-2">
          {PRESET_TEMPLATES.map((t, idx) => (
            <Card key={idx} className={`border-2 ${COLOR_MAP[t.color] ?? ""} hover:shadow-md transition-all text-white bg-slate-900/40`}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${CATEGORY_COLORS[t.category] ?? "text-slate-400 bg-slate-800"}`}>
                      {t.category}
                    </span>
                    <p className="font-bold text-sm mt-2 text-slate-200">{t.name}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mb-3 leading-relaxed">{t.description}</p>
                {/* Rule preview */}
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-3">
                  <code className="bg-slate-950 border border-slate-850 px-1.5 py-0.5 rounded text-[9px]">{TRIGGER_OPTIONS.find(o => o.value === t.trigger)?.icon} {TRIGGER_OPTIONS.find(o => o.value === t.trigger)?.label}</code>
                  <ArrowRight className="h-3 w-3" />
                  <code className="bg-primary/10 border border-primary/20 text-primary px-1.5 py-0.5 rounded font-medium text-[9px]">
                    {ACTION_OPTIONS.find(o => o.value === t.action)?.icon} {ACTION_OPTIONS.find(o => o.value === t.action)?.label}
                  </code>
                </div>
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs border-slate-800 hover:bg-slate-800 text-slate-300 btn-micro-anim"
                    onClick={() => addFromTemplate(t)}
                    disabled={localRules.some(r => r.name === t.name)}
                  >
                    {localRules.some(r => r.name === t.name) ? (
                      <><CheckCircle2 className="h-3 w-3 mr-1 text-emerald-400" /> Enabled</>
                    ) : (
                      <><Zap className="h-3 w-3 mr-1 text-violet-400" /> Enable automation</>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Visual Trace Simulator Dialog */}
      <Dialog open={!!testRule} onOpenChange={(openState) => { if (!openState) setTestRule(null); }}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Zap className="h-5 w-5 text-violet-400 animate-pulse" />
              Automation Simulator Trace
            </DialogTitle>
            <CardDescription className="text-slate-400">
              Visualizing step-by-step trigger verification, validation, and action execution.
            </CardDescription>
          </DialogHeader>

          {testRule && (
            <div className="space-y-4 py-4">
              <div className="bg-slate-950 border border-slate-850 p-3 rounded-lg flex justify-between items-center text-xs">
                <span className="font-bold text-slate-300 truncate max-w-[200px]">{testRule.name}</span>
                <Badge className="bg-primary/20 text-primary border-0 font-mono text-[9px]">
                  {testRule.trigger}
                </Badge>
              </div>

              {/* Trace Timeline Steps */}
              <div className="space-y-3.5 relative pl-4 border-l border-slate-800 mt-2">
                {/* Step 1 */}
                <div className={`space-y-1 relative soft-transition ${simulationStep >= 1 ? "opacity-100" : "opacity-30"}`}>
                  <div className={`absolute -left-[21px] top-0.5 h-3 w-3 rounded-full border ${simulationStep >= 1 ? "bg-emerald-500 border-emerald-500" : "bg-slate-950 border-slate-800"}`} />
                  <p className="text-xs font-bold text-slate-200">1. Trigger Fired</p>
                  <p className="text-[10px] text-slate-400">Trigger event <code className="bg-slate-950 px-1 py-0.5 rounded text-indigo-400">{testRule.trigger}</code> received from system.</p>
                </div>

                {/* Step 2 */}
                <div className={`space-y-1 relative soft-transition ${simulationStep >= 2 ? "opacity-100" : "opacity-30"}`}>
                  <div className={`absolute -left-[21px] top-0.5 h-3 w-3 rounded-full border ${simulationStep >= 2 ? "bg-emerald-500 border-emerald-500" : "bg-slate-950 border-slate-800"}`} />
                  <p className="text-xs font-bold text-slate-200">2. Condition Verification</p>
                  <p className="text-[10px] text-slate-400">Verifying execution scope. Parameters match default catalog policies.</p>
                </div>

                {/* Step 3 */}
                <div className={`space-y-1 relative soft-transition ${simulationStep >= 3 ? "opacity-100" : "opacity-30"}`}>
                  <div className={`absolute -left-[21px] top-0.5 h-3 w-3 rounded-full border ${simulationStep >= 3 ? "bg-emerald-500 border-emerald-500" : "bg-slate-950 border-slate-800"}`} />
                  <p className="text-xs font-bold text-slate-200">3. Action Validation</p>
                  <p className="text-[10px] text-slate-400">Mapping target node to: <code className="bg-slate-950 px-1 py-0.5 rounded text-primary font-bold">{testRule.action}</code>.</p>
                </div>

                {/* Step 4 */}
                <div className={`space-y-1 relative soft-transition ${simulationStep >= 4 ? "opacity-100" : "opacity-30"}`}>
                  <div className={`absolute -left-[21px] top-0.5 h-3 w-3 rounded-full border ${simulationStep >= 4 ? "bg-emerald-500 border-emerald-500" : "bg-slate-950 border-slate-800"}`} />
                  <p className="text-xs font-bold text-slate-200">4. Execution Success</p>
                  <p className="text-[10px] text-slate-400">Target action executed. Trace logs recorded in Audit History.</p>
                </div>
              </div>

              {/* Progress Indicator */}
              <div className="pt-2">
                {isSimulating ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <div className="h-1.5 flex-1 bg-slate-950 rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-300" style={{ width: `${(simulationStep / 4) * 100}%` }} />
                    </div>
                    <span className="font-mono text-[10px]">{simulationStep}/4 Done</span>
                  </div>
                ) : (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 p-2.5 rounded-lg text-xs flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>All execution trace steps completed successfully!</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setTestRule(null)} className="text-slate-400 hover:text-white">
              Close Trace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
