import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/crypto";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 50);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, password, role } = body;

    if (!name || !email || !phone || !password) {
      return NextResponse.json(
        { success: false, message: "Todos los campos son requeridos" },
        { status: 400 }
      );
    }

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json(
        { success: false, message: "El email no es válido" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "Ya existe una cuenta con ese email" },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        role: role === "MERCHANT" ? "MERCHANT" : "CUSTOMER",
      },
      select: { id: true, name: true, email: true, role: true },
    });

    let business: { id: string; name: string; slug: string } | null = null;
    if (role === "MERCHANT") {
      const businessName = body.businessName?.trim();
      const sector = body.sector?.trim() || null;
      if (!businessName) {
        return NextResponse.json(
          { success: false, message: "El nombre del negocio es requerido" },
          { status: 400 }
        );
      }
      const base = slugify(businessName) || "negocio";
      const slug = `${base}-${Math.random().toString(36).slice(2, 7)}`;
      business = await prisma.business.create({
        data: { name: businessName, slug, description: sector, ownerId: user.id },
        select: { id: true, name: true, slug: true },
      });
    }

    return NextResponse.json({ success: true, user, business });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}