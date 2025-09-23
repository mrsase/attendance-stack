import { NextResponse } from "next/server";
import { prisma } from "@repo/db";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { hasAnyRole, ROLE } from "@/lib/rbac";

const Body = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  note: z.string().max(500).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success)
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

    const leave = await prisma.leaveRequest.findUnique({
      where: { id: params.id },
      select: { id: true, orgId: true, status: true, departmentId: true },
    });
    if (!leave || leave.orgId !== user.orgId)
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (leave.status !== "PENDING")
      return NextResponse.json({ error: "not_pending" }, { status: 409 });

    const isHR = hasAnyRole(user, [
      ROLE.HR_MANAGER,
      ROLE.SUPER_ADMIN,
      ROLE.IT_MANAGER,
    ]);
    const canTeam =
      !!leave.departmentId &&
      hasAnyRole(user, [ROLE.DIRECTOR, ROLE.MANAGER], leave.departmentId);

    if (!isHR && !canTeam)
      return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const { action, note } = parsed.data;
    const status = action === "APPROVE" ? "APPROVED" : "REJECTED";
    const approverRole = isHR
      ? "HR_MANAGER"
      : hasAnyRole(user, [ROLE.DIRECTOR])
        ? "DIRECTOR"
        : "MANAGER";

    await prisma.leaveRequest.update({
      where: { id: leave.id },
      data: {
        status,
        // was: approverId: user.id,
        approver: { connect: { id: user.id } },
        approverRole,
        decisionNote: note ?? null,
        decidedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.message === "unauthorized")
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
