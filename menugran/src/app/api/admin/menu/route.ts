import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { withAuth } from "@/lib/api-auth";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "menu");

async function getDefaultRestaurantId() {
  const first = await prisma.restaurant.findFirst({ orderBy: { createdAt: "asc" } });
  return first?.id ?? "";
}

async function saveImage(file: File): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const filename = `${timestamp}-${random}.webp`;
  const filepath = path.join(UPLOAD_DIR, filename);

  await sharp(buffer)
    .resize(800, 600, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(filepath);

  return `/uploads/menu/${filename}`;
}

export async function GET(req: NextRequest) {
  const session = await withAuth({ requiredRole: ["ADMIN", "SUPERADMIN"] });
  if (session instanceof NextResponse) return session;

  try {
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get("restaurantId");

    const where = restaurantId ? { restaurantId } : {};

    const categories = await prisma.menuCategory.findMany({
      where,
      include: { _count: { select: { items: true } } },
      orderBy: { order: "asc" },
    });

    const items = await prisma.menuItem.findMany({
      where,
      include: { category: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        order: c.order,
        dishCount: c._count.items,
      })),
      dishes: items.map((i) => ({
        id: i.id,
        name: i.name,
        description: i.description ?? "",
        categoryId: i.categoryId,
        categoryName: i.category.name,
        price: i.price,
        available: i.available,
        image: i.image ?? "",
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await withAuth({ requiredRole: ["ADMIN", "SUPERADMIN"] });
  if (session instanceof NextResponse) return session;

  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const action = formData.get("action") as string;

      if (action === "dish") {
        const id = formData.get("id") as string | null;
        const name = formData.get("name") as string;
        const description = formData.get("description") as string | null;
        const price = formData.get("price") as string;
        const categoryId = formData.get("categoryId") as string;
        const available = formData.get("available") as string | null;
        const restaurantId = formData.get("restaurantId") as string | null;
        const imageFile = formData.get("image") as File | null;

        if (!name || !price || !categoryId) {
          return NextResponse.json({ error: "name, price and categoryId are required" }, { status: 400 });
        }

        let imageUrl: string | null = null;

        if (imageFile && imageFile.size > 0) {
          imageUrl = await saveImage(imageFile);
        }

        if (id) {
          const existing = imageUrl ? null : await prisma.menuItem.findUnique({ where: { id } });

          const updated = await prisma.menuItem.update({
            where: { id },
            data: {
              name,
              description: description ?? null,
              price: Number(price),
              categoryId,
              image: imageUrl !== null ? imageUrl : existing?.image ?? null,
              available: available !== undefined ? available === "true" : undefined,
            },
            include: { category: { select: { name: true } } },
          });
          return NextResponse.json({
            id: updated.id,
            name: updated.name,
            description: updated.description ?? "",
            categoryId: updated.categoryId,
            categoryName: updated.category.name,
            price: updated.price,
            available: updated.available,
            image: updated.image ?? "",
          });
        }

        const rid2 = restaurantId || (await getDefaultRestaurantId());
        if (!rid2) {
          return NextResponse.json({ error: "restaurantId is required for new dish" }, { status: 400 });
        }

        const created = await prisma.menuItem.create({
          data: {
            restaurantId: rid2,
            categoryId,
            name,
            description: description ?? null,
            price: Number(price),
            image: imageUrl,
            available: available !== undefined ? available === "true" : true,
          },
          include: { category: { select: { name: true } } },
        });
        return NextResponse.json({
          id: created.id,
          name: created.name,
          description: created.description ?? "",
          categoryId: created.categoryId,
          categoryName: created.category.name,
          price: created.price,
          available: created.available,
          image: created.image ?? "",
        }, { status: 201 });
      }
    }

    const body = await req.json();
    const { action } = body;

    if (action === "category") {
      const { id, name, order, restaurantId } = body;

      if (!name || order === undefined) {
        return NextResponse.json({ error: "name and order are required" }, { status: 400 });
      }

      if (id) {
        const updated = await prisma.menuCategory.update({
          where: { id },
          data: { name, order: Number(order) },
          include: { _count: { select: { items: true } } },
        });
        return NextResponse.json({
          id: updated.id,
          name: updated.name,
          order: updated.order,
          dishCount: updated._count.items,
        });
      }

      const rid = restaurantId || (await getDefaultRestaurantId());
      if (!rid) {
        return NextResponse.json({ error: "restaurantId is required for new category" }, { status: 400 });
      }

      const created = await prisma.menuCategory.create({
        data: { restaurantId: rid, name, order: Number(order) },
        include: { _count: { select: { items: true } } },
      });
      return NextResponse.json({
        id: created.id,
        name: created.name,
        order: created.order,
        dishCount: created._count.items,
      }, { status: 201 });
    }

    if (action === "dish") {
      const { id, name, description, price, categoryId, image, available, restaurantId } = body;

      if (!name || !price || !categoryId) {
        return NextResponse.json({ error: "name, price and categoryId are required" }, { status: 400 });
      }

      if (id) {
        const updated = await prisma.menuItem.update({
          where: { id },
          data: {
            name,
            description: description ?? null,
            price: Number(price),
            categoryId,
            image: image || null,
            available: available !== undefined ? available : undefined,
          },
          include: { category: { select: { name: true } } },
        });
        return NextResponse.json({
          id: updated.id,
          name: updated.name,
          description: updated.description ?? "",
          categoryId: updated.categoryId,
          categoryName: updated.category.name,
          price: updated.price,
          available: updated.available,
          image: updated.image ?? "",
        });
      }

      const rid2 = restaurantId || (await getDefaultRestaurantId());
      if (!rid2) {
        return NextResponse.json({ error: "restaurantId is required for new dish" }, { status: 400 });
      }

      const created = await prisma.menuItem.create({
        data: {
          restaurantId: rid2,
          categoryId,
          name,
          description: description ?? null,
          price: Number(price),
          image: image || null,
          available: available !== undefined ? available : true,
        },
        include: { category: { select: { name: true } } },
      });
      return NextResponse.json({
        id: created.id,
        name: created.name,
        description: created.description ?? "",
        categoryId: created.categoryId,
        categoryName: created.category.name,
        price: created.price,
        available: created.available,
        image: created.image ?? "",
      }, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}