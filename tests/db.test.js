import { describe, it, expect } from "vitest";
import { migrateFromLocalStorage, db, normalizeTask, Task } from "@/db/db";

describe("migrateFromLocalStorage", () => {
  beforeEach(async () => {
    // Limpia IndexedDB y localStorage antes de cada test
    await db.tasks_local.clear();
    localStorage.clear();
  });

  it("no hace nada si localStorage está vacío", async () => {
    const result = await migrateFromLocalStorage();
    expect(result).toBe(false);
  });

  it("no migra si ya existen tareas en IndexedDB", async () => {
    // Simula que ya hay datos en IndexedDB (migración ya hecha antes)
    await db.tasks_local.add({
      id: 1,
      name: "Tarea existente",
      prompt: "ya migrada",
      media: [{ url_post: "", url_video: "" }],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Aunque haya datos en localStorage, no debe migrar de nuevo
    localStorage.setItem(
      "prompt-studio-tasks",
      JSON.stringify([{ id: 2, name: "Tarea vieja", prompt: "del pasado" }]),
    );

    const result = await migrateFromLocalStorage();
    expect(result).toBe(false);

    const count = await db.tasks_local.count();
    expect(count).toBe(1); // sigue siendo 1, no se duplicó
  });

  it("migra tareas desde localStorage correctamente", async () => {
    const tareasViejas = [
      {
        id: 10,
        name: "Tarea migrada",
        prompt: "prompt viejo",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-02T00:00:00.000Z",
      },
    ];
    localStorage.setItem("prompt-studio-tasks", JSON.stringify(tareasViejas));

    const result = await migrateFromLocalStorage();
    expect(result).toBe(true);

    const tareas = await db.tasks_local.toArray();
    expect(tareas).toHaveLength(1);
    expect(tareas[0].name).toBe("Tarea migrada");
  });

  it("convierte fechas string a número durante la migración", async () => {
    const tareasViejas = [
      {
        id: 11,
        name: "Test fechas",
        prompt: "",
        createdAt: "2024-06-15T10:00:00.000Z", // string → debe convertirse a number
        updatedAt: "2024-06-15T12:00:00.000Z",
      },
    ];
    localStorage.setItem("prompt-studio-tasks", JSON.stringify(tareasViejas));

    await migrateFromLocalStorage();

    const tareas = await db.tasks_local.toArray();
    expect(typeof tareas[0].createdAt).toBe("number"); // ← esto es lo crítico
    expect(typeof tareas[0].updatedAt).toBe("number");
  });

  it("normaliza media durante la migración", async () => {
    const tareasViejas = [
      {
        id: 12,
        name: "Sin media",
        prompt: "test",
        // media ausente — versión antigua del formato
      },
    ];
    localStorage.setItem("prompt-studio-tasks", JSON.stringify(tareasViejas));

    await migrateFromLocalStorage();

    const tareas = await db.tasks_local.toArray();
    expect(tareas[0].media).toEqual([{ url_post: "", url_video: "" }]);
  });

  it("retorna false si el JSON en localStorage es inválido", async () => {
    localStorage.setItem("prompt-studio-tasks", "esto no es json {{{");

    const result = await migrateFromLocalStorage();
    expect(result).toBe(false); // no debe crashear, solo retornar false
  });
});

describe("Task constructor", () => {
  it("crea una tarea con valores por defecto", () => {
    const task = new Task();
    expect(task.name).toBe("Nueva Tarea");
    expect(task.prompt).toBe("Escribe tu prompt aquí.");
    expect(task.media).toEqual([{ url_post: "", url_video: "" }]);
    expect(task.id).toBeDefined();
    expect(task.createdAt).toBeDefined();
  });

  it("respeta los valores que le pasas", () => {
    const task = new Task({ name: "Mi tarea", prompt: "Hola mundo" });
    expect(task.name).toBe("Mi tarea");
    expect(task.prompt).toBe("Hola mundo");
  });

  it("siempre genera un id único", () => {
    const a = new Task();
    const b = new Task();
    expect(a.id).not.toBe(b.id);
  });

  it("acepta media personalizada", () => {
    const media = [
      { url_post: "https://x.com/img.jpg", url_video: "https://x.com/vid.mp4" },
    ];
    const task = new Task({ media });
    expect(task.media).toEqual(media);
  });
});

describe("normalizeTask", () => {
  it("agrega slot vacío si media es array vacío", () => {
    const result = normalizeTask({ media: [] });
    expect(result.media).toEqual([{ url_post: "", url_video: "" }]);
  });

  it("agrega slot si media no existe", () => {
    const result = normalizeTask({ name: "test" });
    expect(result.media).toEqual([{ url_post: "", url_video: "" }]);
  });

  it("mantiene media si ya tiene datos válidos", () => {
    const media = [{ url_post: "https://img.com/foto.jpg", url_video: "" }];
    const result = normalizeTask({ media });
    expect(result.media).toEqual(media);
  });

  it("conserva el resto de propiedades", () => {
    const result = normalizeTask({ id: 42, name: "Mi tarea", media: [] });
    expect(result.id).toBe(42);
    expect(result.name).toBe("Mi tarea");
  });
});
