import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(req: NextRequest) {
  try {
    const { id, name, phone } = await req.json();

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID de usuario requerido" },
        { status: 400 }
      );
    }

    const data: Record<string, string> = {};
    if (name) data.name = name;
    if (phone) data.phone = phone;

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        cedula: true,
        phone: true,
        role: true,
      },
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
