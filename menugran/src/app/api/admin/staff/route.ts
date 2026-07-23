import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPin } from "@/lib/crypto";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: { role: { in: ["OPERATOR", "RIDER"] } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      users.map((u) => ({
        id: u.id,
        name: u.name,
        cedula: u.cedula ?? "",
        phone: u.phone ?? "",
        role: u.role === "OPERATOR" ? "Operador" : "Repartidor",
        active: u.active,
      }))
    );
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, cedula, phone, pin, role } = body;

    if (!name || !cedula || !phone || !pin || !role) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: "PIN must be 4 digits" }, { status: 400 });
    }

    const dbRole = role === "Operador" ? "OPERATOR" : "RIDER";
    const hashedPin = await hashPin(pin);

    const user = await prisma.user.create({
      data: { name, cedula, phone, pin: hashedPin, role: dbRole },
    });

    return NextResponse.json({
      id: user.id,
      name: user.name,
      cedula: user.cedula ?? "",
      phone: user.phone ?? "",
      role: user.role === "OPERATOR" ? "Operador" : "Repartidor",
      active: user.active,
    }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "La cédula ya está registrada" }, { status: 409 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
