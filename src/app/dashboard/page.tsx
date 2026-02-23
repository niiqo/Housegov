"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase/client";
import { collection, getDocs, addDoc, doc, updateDoc , serverTimestamp, onSnapshot, query, orderBy } from "firebase/firestore";

export default function DashboardPage() {
    const [newTask, setNewTask] = useState("");
    const [houseId, setHouseId] = useState<string | null>(null);
    const [tasks, setTasks] = useState<any[]>([]);
    const [command, setCommand] = useState("");
    const [cmdStatus, setCmdStatus] = useState<string>("");

useEffect(() => {
  const id = localStorage.getItem("houseId");
  if (!id) return;

  setHouseId(id);

  const q = query(
    collection(db, "houses", id, "tasks"),
    orderBy("createdAt", "desc")
  );

  const unsub = onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    setTasks(list);
  });

  return () => unsub();
}, []);

  async function runCommand() {
  if (!houseId || !command.trim()) return;

  setCmdStatus("Ejecutando...");

  try {
    const res = await fetch("/api/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: command,
        houseId,
        uid: auth.currentUser?.uid ?? undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? "Error");

    setCmdStatus(`OK: ${data?.cmd?.action}`);
    setCommand("");
  } catch (e: any) {
    setCmdStatus(`Error: ${e?.message ?? "Error"}`);
  }
}

  async function loadTasks(hId: string) {
    const snapshot = await getDocs(
      collection(db, "houses", hId, "tasks")
    );
    const list = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setTasks(list);
  }

  async function createTask() {
  if (!houseId || !newTask.trim()) return;

  await addDoc(collection(db, "houses", houseId, "tasks"), {
    description: newTask,
    status: "PENDIENTE",
    sector: "DESCONOCIDO",
    taskType: "LIMPIEZA",
    createdAt: serverTimestamp(),
  });

  setNewTask("");
}
async function completeTask(taskId: string) {
  if (!houseId) return;

  await updateDoc(doc(db, "houses", houseId, "tasks", taskId), {
    status: "COMPLETADA",
    completedAt: serverTimestamp(),
  });

}

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <p>
        House ID: <strong>{houseId}</strong>
      </p>

      <div>
        <h2 className="text-xl mb-2">Tasks</h2>
        <div className="space-y-2">
  <input
    className="border px-3 py-2 rounded-md"
    placeholder="Nueva tarea..."
    value={newTask}
    onChange={(e) => setNewTask(e.target.value)}
  />
  <button
    onClick={createTask}
    className="border px-3 py-2 rounded-md font-semibold"
  >
    Crear tarea
  </button>
</div>

<div className="border rounded-md p-3 space-y-2">
  <p className="font-semibold">Comando</p>
  <div className="flex gap-2">
    <input
      className="border px-3 py-2 rounded-md w-full"
      placeholder='Ej: "Agregá papel higiénico"'
      value={command}
      onChange={(e) => setCommand(e.target.value)}
    />
    <button onClick={runCommand} className="border px-3 py-2 rounded-md font-semibold">
      Ejecutar
    </button>
  </div>
  {cmdStatus ? <p className="text-sm opacity-70">{cmdStatus}</p> : null}
</div>



        {tasks.length === 0 && <p>No hay tareas todavía.</p>}

        {tasks.map((task) => (
  <div
    key={task.id}
    className={`border p-3 rounded-md flex items-start justify-between gap-4 ${
      task.status === "COMPLETADA" ? "opacity-60" : ""
    }`}
  >
    <div>
      <p className={task.status === "COMPLETADA" ? "line-through" : ""}>
        {task.description}
      </p>
      <p className="text-sm opacity-60">{task.status}</p>
    </div>

    {task.status !== "COMPLETADA" && (
      <button
        onClick={() => completeTask(task.id)}
        className="border px-3 py-2 rounded-md font-semibold"
      >
        Completar
      </button>
    )}
  </div>
))}
      </div>
    </main>
  );
}