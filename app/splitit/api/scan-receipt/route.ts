import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // 1. Ambil API Key dari environment variable (Server side)
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "API Key tidak dijumpai dalam server" }, 
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Guna model flash sebab laju untuk image
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 2. Terima data JSON dari Frontend (page.tsx)
    const data = await req.json();
    const { imageBase64, prompt } = data;

    if (!imageBase64) {
      return NextResponse.json(
        { error: "Tiada data gambar diterima" }, 
        { status: 400 }
      );
    }

    // 3. Bersihkan format base64 (buang header data:image/...)
    // Contoh: "data:image/jpeg;base64,/9j/4AAQSkZJRg..." -> "/9j/4AAQSkZJRg..."
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    // 4. Hantar ke Google Gemini
    const result = await model.generateContent([
      prompt || "Senaraikan item dan harga dalam resit ini. Return JSON sahaja.", 
      {
        inlineData: {
          data: base64Data,
          mimeType: "image/jpeg",
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();

    // 5. Hantar jawapan balik ke Frontend
    return NextResponse.json({ result: text });

  } catch (error) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: "Gagal memproses AI" }, 
      { status: 500 }
    );
  }
}