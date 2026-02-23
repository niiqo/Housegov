"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase/client";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { db } from "@/lib/firebase/client";
import { addDoc, collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

console.log("Firestore projectId:", db.app.options.projectId);

export default function LoginPage() {
  const router = useRouter(); 
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string>("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("");

    try {
      if (mode === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const uid = cred.user.uid;
      
        // 1) Crear una house
        const houseRef = await addDoc(collection(db, "houses"), {
          name: `Casa de ${email.split("@")[0] ?? "Nuevo usuario"}`,
          createdAt: serverTimestamp(),
          createdBy: uid,
        });
      
        const houseId = houseRef.id;

        console.log("Nueva house creada:", houseId);

      
        // 2) Crear miembro admin dentro de la house
        await setDoc(doc(db, "houses", houseId, "members", uid), {
          userId: uid,
          email,
          role: "admin",
          points: 0,
          joinedAt: serverTimestamp(),
        });
      
        // 3) Guardar houseId localmente (MVP)
        localStorage.setItem("houseId", houseId);
      
        setStatus(`Cuenta creada. HouseId: ${houseId}`);
        router.push("/dashboard");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        setStatus("Sesión iniciada.");
        router.push("/dashboard");
      }
    } catch (err: any) {
      setStatus(err?.message ?? "Error");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border p-6 space-y-4">
        <h1 className="text-2xl font-semibold">HouseGov</h1>

        <div className="flex gap-2">
          <button
            className={`px-3 py-2 rounded-md border ${
              mode === "login" ? "font-semibold" : ""
            }`}
            onClick={() => setMode("login")}
            type="button"
          >
            Iniciar sesión
          </button>
          <button
            className={`px-3 py-2 rounded-md border ${
              mode === "signup" ? "font-semibold" : ""
            }`}
            onClick={() => setMode("signup")}
            type="button"
          >
            Crear cuenta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block space-y-1">
            <span className="text-sm">Email</span>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              autoComplete="email"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm">Contraseña</span>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              minLength={6}
            />
          </label>

          <button className="w-full rounded-md border px-3 py-2 font-semibold">
            {mode === "signup" ? "Crear cuenta" : "Entrar"}
          </button>
        </form>

        {status ? (
          <p className="text-sm whitespace-pre-wrap opacity-80">{status}</p>
        ) : null}

        <p className="text-xs opacity-60">
          Nota: esto es un login MVP. Luego lo hacemos más lindo y con redirects.
        </p>
      </div>
    </main>
  );
}