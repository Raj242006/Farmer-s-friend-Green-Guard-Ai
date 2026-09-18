import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { moisture, rawValue } = await request.json();

    console.log("ESP8266:", {
      moisture,
      rawValue,
      time: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      moisture,
      rawValue,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Invalid data" },
      { status: 400 }
    );
  }
}