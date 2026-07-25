"use server";

import { prisma } from "@/lib/db";

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle?: string;
  type: "client" | "project" | "task" | "lead" | "page";
  href: string;
}

export async function globalSearch(query: string): Promise<SearchResultItem[]> {
  if (!query || query.trim().length < 2) return [];
  const q = query.trim().toLowerCase();

  try {
    // Clients
    const clients = await prisma.client.findMany({
      where: {
        OR: [
          { companyName: { contains: q } },
          { contactPerson: { contains: q } },
          { email: { contains: q } }
        ]
      },
      take: 5
    });

    // Projects
    const projects = await prisma.project.findMany({
      where: {
        name: { contains: q }
      },
      take: 5
    });

    // Tasks
    const tasks = await prisma.task.findMany({
      where: {
        OR: [
          { title: { contains: q } },
          { description: { contains: q } }
        ]
      },
      take: 5
    });

    // Leads
    const leads = await prisma.lead.findMany({
      where: {
        OR: [
          { title: { contains: q } },
          { companyName: { contains: q } }
        ]
      },
      take: 5
    });

    const results: SearchResultItem[] = [];

    clients.forEach(c => {
      results.push({
        id: `client-${c.id}`,
        title: c.companyName,
        subtitle: c.contactPerson || c.email || undefined,
        type: "client",
        href: `/clients/${c.id}`
      });
    });

    projects.forEach(p => {
      results.push({
        id: `project-${p.id}`,
        title: p.name,
        subtitle: p.serviceType || undefined,
        type: "project",
        href: `/projects/${p.id}`
      });
    });

    tasks.forEach(t => {
      results.push({
        id: `task-${t.id}`,
        title: t.title,
        subtitle: t.status.toLowerCase(),
        type: "task",
        href: `/tasks?taskId=${t.id}`
      });
    });

    leads.forEach(l => {
      results.push({
        id: `lead-${l.id}`,
        title: l.title,
        subtitle: l.companyName || undefined,
        type: "lead",
        href: `/sales?leadId=${l.id}`
      });
    });

    return results;
  } catch (error) {
    console.error("Search error:", error);
    return [];
  }
}
