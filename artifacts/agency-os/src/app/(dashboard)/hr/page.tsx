import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/constants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPayrollRecord, createPerformanceReview } from "@/lib/actions/hr";
import { UserCog, Wallet, Award, CheckSquare, Megaphone, UserPlus } from "lucide-react";

export default async function HRPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [employees, announcements, postings] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.announcement.findMany({ take: 5, orderBy: { createdAt: "desc" } }),
    prisma.jobPosting.findMany({ where: { status: "open" } }),
  ]);

  const showFinancials = isAdmin(user.systemRole);

  const payrolls = showFinancials
    ? await prisma.payrollRecord.findMany({
        orderBy: { year: "desc" },
      })
    : [];

  const reviews = showFinancials
    ? await prisma.performanceReview.findMany({
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true } } },
      })
    : [];

  const employeeMap = new Map(employees.map(e => [e.id, e.name]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">HR & Employee OS</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Directory, hiring, onboarding checklists, payroll & appraisal logs
        </p>
      </div>

      <Tabs defaultValue="directory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="directory"><UserCog className="h-4 w-4 mr-2" /> Employee Directory</TabsTrigger>
          <TabsTrigger value="onboarding"><CheckSquare className="h-4 w-4 mr-2" /> Onboarding</TabsTrigger>
          {showFinancials && (
            <>
              <TabsTrigger value="payroll"><Wallet className="h-4 w-4 mr-2" /> Payroll & Salaries</TabsTrigger>
              <TabsTrigger value="appraisals"><Award className="h-4 w-4 mr-2" /> Appraisals</TabsTrigger>
            </>
          )}
          <TabsTrigger value="hiring"><UserPlus className="h-4 w-4 mr-2" /> Hiring Pipeline</TabsTrigger>
        </TabsList>

        {/* Directory Tab */}
        <TabsContent value="directory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Staff Directory ({employees.length})</CardTitle>
              <CardDescription>Active employees registered under Blink Beyond</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {employees.map((e) => (
                <div key={e.id} className="rounded-xl border bg-card p-4 shadow-sm space-y-2 hover:shadow-md transition">
                  <div>
                    <p className="font-semibold text-slate-800">{e.name}</p>
                    <p className="text-xs text-muted-foreground">{e.email}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <Badge variant="secondary" className="text-[10px]">
                      {ROLE_LABELS[e.systemRole]}
                    </Badge>
                    {e.department && (
                      <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-200">
                        {e.department}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Announcements & Open Positions in Subgrid */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Company Announcements</CardTitle>
              </CardHeader>
              <CardContent>
                {announcements.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No active announcements</p>
                ) : (
                  announcements.map((a) => (
                    <div key={a.id} className="mb-3 border-b pb-2 last:border-0 last:pb-0">
                      <p className="font-medium text-sm text-slate-800">{a.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {a.content}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Hiring - Open Positions</CardTitle>
              </CardHeader>
              <CardContent>
                {postings.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No open postings currently listed</p>
                ) : (
                  postings.map((j) => (
                    <div key={j.id} className="py-2 border-b last:border-0 flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm text-slate-800">{j.title}</p>
                        <p className="text-xs text-muted-foreground">{j.department}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/10">Active</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Onboarding Tab */}
        <TabsContent value="onboarding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>New Hire Onboarding Checklist</CardTitle>
              <CardDescription>Standard checklist tasks assigned to employees during onboarding</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-w-2xl">
              <div className="space-y-2">
                {[
                  "Sign NDA & Offer Letter (Document Vault)",
                  "IT Setup: Google Workspace, Slack, Figma & Github invites",
                  "Review Blink Beyond SOPs & Brand Guides",
                  "HR check-in and bank account mapping",
                  "Welcome call with assigned Team Lead/Manager"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 border p-3 rounded-lg bg-slate-50/50">
                    <div className="h-5 w-5 rounded border border-slate-300 flex items-center justify-center text-xs text-slate-500 font-bold">
                      {idx + 1}
                    </div>
                    <span className="text-sm font-medium text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll Tab */}
        {showFinancials && (
          <TabsContent value="payroll" className="grid gap-6 lg:grid-cols-3">
            {/* Payroll History */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Payroll Ledger</CardTitle>
                <CardDescription>Monthly salary disbursements and deductions record</CardDescription>
              </CardHeader>
              <CardContent>
                {payrolls.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No payroll records logged yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Base Salary</TableHead>
                        <TableHead>Deductions</TableHead>
                        <TableHead className="text-right">Net Pay</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrolls.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">
                            {employeeMap.get(p.userId) ?? "Unknown Employee"}
                          </TableCell>
                          <TableCell>{p.month}/{p.year}</TableCell>
                          <TableCell>₹{p.baseSalary.toLocaleString("en-IN")}</TableCell>
                          <TableCell className="text-red-600">₹{p.deductions.toLocaleString("en-IN")}</TableCell>
                          <TableCell className="text-right font-semibold">₹{p.netPay.toLocaleString("en-IN")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Create Payroll Record Form */}
            <Card>
              <CardHeader>
                <CardTitle>Disburse Salary</CardTitle>
                <CardDescription>Log monthly salary payments for employees</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={createPayrollRecord} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="payUser">Employee *</Label>
                    <select id="payUser" name="userId" required className="flex h-9 w-full rounded-md border px-3 text-sm bg-background">
                      {employees.map((e) => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="payMonth">Month *</Label>
                      <Input id="payMonth" name="month" type="number" min={1} max={12} defaultValue={new Date().getMonth() + 1} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="payYear">Year *</Label>
                      <Input id="payYear" name="year" type="number" defaultValue={new Date().getFullYear()} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="payBase">Base Salary ₹ *</Label>
                      <Input id="payBase" name="baseSalary" type="number" required defaultValue={30000} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="payDeduct">Deductions ₹</Label>
                      <Input id="payDeduct" name="deductions" type="number" defaultValue={0} />
                    </div>
                  </div>
                  <SubmitButton label="Record Payment" />
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Appraisals Tab */}
        {showFinancials && (
          <TabsContent value="appraisals" className="grid gap-6 lg:grid-cols-3">
            {/* Appraisal Logs */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Performance Appraisals</CardTitle>
                <CardDescription>Appraisal reviews and employee performance ratings</CardDescription>
              </CardHeader>
              <CardContent>
                {reviews.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No performance reviews recorded yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reviews.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.user.name}</TableCell>
                          <TableCell>{r.period}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10">
                              {r.rating} / 5
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate" title={r.notes || ""}>
                            {r.notes || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Log Performance Review Form */}
            <Card>
              <CardHeader>
                <CardTitle>Add Appraisal Review</CardTitle>
                <CardDescription>Submit performance evaluation scorecards</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={createPerformanceReview} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="revUser">Employee *</Label>
                    <select id="revUser" name="userId" required className="flex h-9 w-full rounded-md border px-3 text-sm bg-background">
                      {employees.map((e) => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="revPeriod">Period *</Label>
                      <Input id="revPeriod" name="period" placeholder="e.g. Q1 2026" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="revRating">Rating (1-5) *</Label>
                      <Input id="revRating" name="rating" type="number" min={1} max={5} defaultValue={4} required />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="revNotes">Performance notes</Label>
                    <Textarea id="revNotes" name="notes" placeholder="Evaluation details..." rows={3} />
                  </div>
                  <SubmitButton label="Submit Evaluation" />
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Hiring pipeline Tab */}
        <TabsContent value="hiring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Structured Interview Stages</CardTitle>
              <CardDescription>Standard lifecycle tracking application stages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 items-center">
                {["Applied", "Screening Call", "Technical Round", "Manager Interview", "Offer Sent", "Joined"].map((stage, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Badge className="bg-slate-900 border border-slate-800 text-slate-100 font-medium py-1 px-3">
                      {idx + 1}. {stage}
                    </Badge>
                    {idx < 5 && <span className="text-slate-400">→</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
