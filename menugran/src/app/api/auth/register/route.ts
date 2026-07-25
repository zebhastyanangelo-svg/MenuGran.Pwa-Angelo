import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPin } from "@/lib/crypto";

export async function POST(req: NextRequest) {
  try {
    const { name, cedula, phone, pin } = await req.json();

    if (!name || !cedula || !phone || !pin) {
      return NextResponse.json(
        { success: false, message: "Todos los campos son requeridos" },
        { status: 400 }
      );
    }

    if (!/^[0-9]{4}$/.test(pin)) {
      return NextResponse.json(
        { success: false, message: "El PIN debe tener exactamente 4 dígitos" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { cedula },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Ya existe un usuario con esa cédula" },
        { status: 409 }
      );
    }

    const hashedPin = await hashPin(pin);

    const user = await prisma.user.create({
      data: {
        name,
        cedula,
        phone,
        pin: hashedPin,
        role: 'CLIENT',
      },
    });

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
