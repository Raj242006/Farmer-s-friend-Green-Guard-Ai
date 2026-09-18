import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { moisture } = await request.json();

    const moistureValue = Number(moisture);

    if (isNaN(moistureValue)) {
      return NextResponse.json(
        { error: "Invalid moisture value" },
        { status: 400 }
      );
    }

    // Use the latest farm for the live prototype
    const farm = await prisma.farm.findFirst({
      orderBy: {
        updatedAt: "desc",
      },
    });

    if (!farm) {
      return NextResponse.json(
        { error: "No farm found" },
        { status: 404 }
      );
    }

    // Get latest reading for this farm
    const latest = await prisma.farmData.findFirst({
      where: {
        farmId: farm.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    let saved;

    if (latest) {
      saved = await prisma.farmData.update({
        where: {
          id: latest.id,
        },
        data: {
          soilMoisture: moistureValue,
        },
      });
    } else {
      saved = await prisma.farmData.create({
        data: {
          farmId: farm.id,
          soilMoisture: moistureValue,
        },
      });
    }

    return NextResponse.json({
      success: true,
      moisture: saved.soilMoisture,
    });
  } catch (error) {
    console.error("IoT soil API error:", error);

    return NextResponse.json(
      { error: "Failed to save soil moisture" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const latest = await prisma.farmData.findFirst({
      where: {
        soilMoisture: {
          not: null,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      moisture: latest?.soilMoisture ?? null,
    });
  } catch (error) {
    console.error("IoT soil GET error:", error);

    return NextResponse.json(
      { error: "Failed to get soil moisture" },
      { status: 500 }
    );
  }
}