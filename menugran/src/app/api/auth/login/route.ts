import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { cedula, pin } = await req.json();

    if (!cedula || !pin) {
      return NextResponse.json(
        { success: false, message: "Cédula y PIN son requeridos" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { cedula },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    if (user.pin !== pin) {
      return NextResponse.json(
        { success: false, message: "PIN incorrecto" },
        { status: 401 }
      );
    }

    if (!user.active) {
      return NextResponse.json(
        { success: false, message: "Usuario inactivo. Contacta al administrador" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Login exitoso",
      user: {
        id: user.id,
        name: user.name,
        cedula: user.cedula,
        role: user.role,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}