import { NextResponse } from "next/server";
import { CommandSchema } from "@/lib/schemas/command";
import { HOUSEGOV_SYSTEM_PROMPT } from "@/lib/ai/systemPrompt";
import { db } from "@/lib/firebase/client";
import { addDoc, collection, doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

type Body = {
  text: string;
  houseId: string;
  uid?: string; // por ahora opcional (luego lo validamos con token)
};

async function callGeminiForJson(text: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Falta GEMINI_API_KEY en .env.local");

  const model = "gemini-3-flash-preview"; // rápido y barato; cambiás cuando quieras
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: HOUSEGOV_SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini error ${res.status}: ${errText}`);
  }

  const data = await res.json();

  // Typical: data.candidates[0].content.parts[0].text
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof rawText !== "string") throw new Error("Gemini no devolvió texto JSON");

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error(`Respuesta no-JSON de Gemini: ${rawText}`);
  }

  return CommandSchema.parse(parsed);
}

async function executeCommand(houseId: string, cmd: any, uid?: string) {
  // Importante: esto asume reglas abiertas o usuario con permisos.
  // Luego lo pasamos a firebase-admin y validamos auth en serio.

  switch (cmd.action) {
    case "AGREGAR_ITEM_COMPRA": {
      const item = String(cmd.metadata?.item ?? "").trim() || "DESCONOCIDO";
      const qty = Number(cmd.metadata?.qty ?? 1) || 1;

      const ref = await addDoc(collection(db, "houses", houseId, "shoppingItems"), {
        item,
        qty,
        status: "PENDIENTE",
        createdAt: serverTimestamp(),
        createdBy: uid ?? "DESCONOCIDO",
      });

      return { ok: true, wrote: "shoppingItems", id: ref.id };
    }

    case "CREAR_TAREA": {
      const ref = await addDoc(collection(db, "houses", houseId, "tasks"), {
        description: cmd.description || "Tarea sin descripción",
        status: "PENDIENTE",
        sector: cmd.sector ?? "DESCONOCIDO",
        taskType: cmd.task_type ?? "DESCONOCIDO",
        createdAt: serverTimestamp(),
        createdBy: uid ?? "DESCONOCIDO",
      });

      return { ok: true, wrote: "tasks", id: ref.id };
    }

    case "REPORTAR_INCUMPLIMIENTO": {
      const ref = await addDoc(collection(db, "houses", houseId, "tasks"), {
        description: cmd.description || "Incumplimiento reportado",
        status: "INCUMPLIDA",
        sector: cmd.sector ?? "DESCONOCIDO",
        taskType: cmd.task_type ?? "DESCONOCIDO",
        createdAt: serverTimestamp(),
        createdBy: uid ?? "DESCONOCIDO",
      });

      return { ok: true, wrote: "tasks", id: ref.id };
    }

    case "PROGRAMAR_EVENTO": {
      const ref = await addDoc(collection(db, "houses", houseId, "events"), {
        description: cmd.description || "Evento",
        status: "PENDIENTE",
        requiresApproval: Boolean(cmd.metadata?.requires_approval ?? true),
        guests: cmd.metadata?.guests ?? "DESCONOCIDO",
        date: cmd.metadata?.date ?? "DESCONOCIDO",
        createdAt: serverTimestamp(),
        createdBy: uid ?? "DESCONOCIDO",
      });

      return { ok: true, wrote: "events", id: ref.id };
    }

    case "NO_ACTION":
    default:
      return { ok: true, wrote: null };
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    if (!body?.text || !body?.houseId) {
      return NextResponse.json({ error: "Faltan text o houseId" }, { status: 400 });
    }

    const cmd = await callGeminiForJson(body.text);
    const result = await executeCommand(body.houseId, cmd, body.uid);

    return NextResponse.json({ cmd, result });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error" },
      { status: 500 }
    );
  }
}