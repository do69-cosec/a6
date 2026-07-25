import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export default async function ClientPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const cookieStore = await cookies();

  if (!token) {
    const session = cookieStore.get("client_session");
    if (session?.value) {
      const client = await prisma.client.findUnique({
        where: { id: session.value },
      });
      if (client) redirect("/client/dashboard");
    }

    return (
      <html lang="en">
        <head>
          <title>Client Portal — Blink Beyond</title>
        </head>
        <body className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-5">
          <div className="max-w-md w-full border border-slate-800 bg-slate-950 p-8 rounded-2xl text-center shadow-xl">
            <h1 className="text-2xl font-semibold text-blue-500 mb-3">
              Client Portal
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Use the secure link from your account manager to access your
              workspace. Links look like{" "}
              <code className="text-xs bg-slate-900 px-1 rounded">
                /client/portal?token=…
              </code>
            </p>
          </div>
        </body>
      </html>
    );
  }

  const client = await prisma.client.findUnique({ where: { id: token } });
  if (!client) {
    return (
      <html lang="en">
        <head>
          <title>Invalid Link</title>
        </head>
        <body className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-5">
          <div className="max-w-md w-full border border-red-500/20 bg-slate-950 p-8 rounded-2xl text-center">
            <h1 className="text-2xl font-semibold text-red-500 mb-3">
              Link expired or invalid
            </h1>
            <p className="text-slate-400 text-sm">
              Request a new portal link from your account manager.
            </p>
          </div>
        </body>
      </html>
    );
  }

  cookieStore.set("client_session", token, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/client/dashboard");
}
