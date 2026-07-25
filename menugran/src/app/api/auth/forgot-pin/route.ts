import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { maskPhone } from "@/lib/crypto";

export async function POST(req: NextRequest) {
  try {
    const { cedula } = await req.json();

    if (!cedula) {
      return NextResponse.json(
        { success: false, message: "Cedula requerida" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { cedula },
      select: { phone: true, active: true },
    });

    if (!user || !user.active) {
      return NextResponse.json(
        { success: false, message: "No se encontro una cuenta con esa cedula" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      phone: maskPhone(user.phone),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
