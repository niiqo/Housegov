"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase/client";
import { collection, getDocs, addDoc, doc, updateDoc , serverTimestamp } from "firebase/firestore";

export default function DashboardPage() {
    const [newTask, setNewTask] = useState("");
    const [houseId, setHouseId] = useState<string | null>(null);
    const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    const id = localStorage.getItem("houseId");
    if (id) {
      setHouseId(id);
      loadTasks(id);
    }
  }, []);

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
  loadTasks(houseId);
}
async function completeTask(taskId: string) {
  if (!houseId) return;

  await updateDoc(doc(db, "houses", houseId, "tasks", taskId), {
    status: "COMPLETADA",
    completedAt: serverTimestamp(),
  });

  loadTasks(houseId);
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