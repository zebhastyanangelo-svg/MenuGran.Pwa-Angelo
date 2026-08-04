import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPin } from "@/lib/crypto";
import { withAuth } from "@/lib/api-auth";

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

    // Comprobar PIN de forma segura utilizando bcryptjs vía verifyPin
    const isPinValid = await verifyPin(pin, user.pin || "");
    if (!isPinValid) {
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
      user: {
        id: user.id,
        name: user.name,
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

export async function PUT(req: NextRequest) {
  try {
    const session = await withAuth();
    if (session instanceof NextResponse) return session;

    const { id, name, phone } = await req.json();

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID de usuario requerido" },
        { status: 400 }
      );
    }

    // Users can only update their own profile (unless privileged)
    const role = session.user.role;
    const isPrivileged = role === "ADMIN" || role === "EMPLOYEE" || role === "SUPER_ADMIN";
    if (!isPrivileged && session.user.id !== id) {
      return NextResponse.json(
        { success: false, message: "No autorizado" },
        { status: 403 }
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