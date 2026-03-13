const STORAGE_KEYS = {
  theme: "theme",
  tasks: "tasks"
};

const VALID_PRIORITIES = new Set(["alta", "media", "baja"]);
const MOON_ICON = "\u{1F311}";
const SUN_ICON = "\u2600\uFE0F";

const form = document.querySelector("#task-form");
const taskInput = document.querySelector("#task-input");
const categoryInput = document.querySelector("#category-input");
const priorityInput = document.querySelector("#priority-input");
const taskFormError = document.querySelector("#task-form-error");
const taskList = document.querySelector("#task-list");
const themeToggle = document.querySelector("#theme-toggle");
const navHome = document.querySelector("#nav-home");
const navOpenTasks = document.querySelector("#nav-open-tasks");
const navClosedTasks = document.querySelector("#nav-closed-tasks");
const asideLinks = document.querySelectorAll(".aside-link");

let tasks = [];
let currentFilter = "all";
const taskElements = new WeakMap();

function getStorageItem(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error(`No se pudo leer "${key}" desde localStorage:`, error);
    return null;
  }
}

function setStorageItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error(`No se pudo guardar "${key}" en localStorage:`, error);
    return false;
  }
}

function removeStorageItem(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`No se pudo eliminar "${key}" de localStorage:`, error);
  }
}

function createTaskId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeTask(rawTask) {
  if (!rawTask || typeof rawTask !== "object") {
    return null;
  }

  const title = typeof rawTask.title === "string" ? rawTask.title.trim() : "";
  const category =
    typeof rawTask.category === "string" ? rawTask.category.trim() : "";
  const rawPriority =
    typeof rawTask.priority === "string" ? rawTask.priority.toLowerCase() : "";

  if (!title || !category) {
    return null;
  }

  return {
    id:
      typeof rawTask.id === "string" && rawTask.id.trim()
        ? rawTask.id
        : createTaskId(),
    title,
    category,
    priority: VALID_PRIORITIES.has(rawPriority) ? rawPriority : "alta",
    completed: Boolean(rawTask.completed)
  };
}

function shouldPersistNormalizedTasks(parsedTasks, normalizedTasks) {
  if (parsedTasks.length !== normalizedTasks.length) {
    return true;
  }

  return parsedTasks.some((rawTask, index) => {
    const normalizedTask = normalizedTasks[index];
    const rawId =
      rawTask && typeof rawTask === "object" && typeof rawTask.id === "string"
        ? rawTask.id
        : "";
    const rawPriority =
      rawTask && typeof rawTask === "object" && typeof rawTask.priority === "string"
        ? rawTask.priority.toLowerCase()
        : "";

    return (
      rawId !== normalizedTask.id ||
      rawPriority !== normalizedTask.priority ||
      Boolean(rawTask?.completed) !== normalizedTask.completed ||
      rawTask?.title !== normalizedTask.title ||
      rawTask?.category !== normalizedTask.category
    );
  });
}

/**
 * Serializa la lista actual de tareas y la guarda en `localStorage`.
 *
 * @param {{ notifyOnError?: boolean }} [options={}] Opciones de guardado.
 * @param {boolean} [options.notifyOnError=true] Indica si se debe mostrar una alerta cuando falle el guardado.
 * @returns {void}
 */
function saveTasks({ notifyOnError = true } = {}) {
  try {
    const serializedTasks = JSON.stringify(tasks);
    const saved = setStorageItem(STORAGE_KEYS.tasks, serializedTasks);

    if (!saved && notifyOnError) {
      alert(
        "No se pudo guardar la tarea. Puede que el almacenamiento local este desactivado o lleno."
      );
    }
  } catch (error) {
    console.error("Error al serializar las tareas:", error);
    if (notifyOnError) {
      alert("No se pudo preparar la tarea para guardarla.");
    }
  }
}

/**
 * Recupera las tareas guardadas desde `localStorage`, las normaliza y elimina datos invalidos si es necesario.
 *
 * @returns {{ id: string, title: string, category: string, priority: string, completed: boolean }[]} Lista de tareas restauradas.
 */
function loadTasks() {
  const savedTasks = getStorageItem(STORAGE_KEYS.tasks);

  if (!savedTasks) {
    return [];
  }

  try {
    const parsedTasks = JSON.parse(savedTasks);

    if (!Array.isArray(parsedTasks)) {
      throw new Error("El contenido guardado no es una lista de tareas.");
    }

    const normalizedTasks = parsedTasks
      .map(normalizeTask)
      .filter((task) => task !== null);

    if (shouldPersistNormalizedTasks(parsedTasks, normalizedTasks)) {
      console.warn("Se normalizaron tareas guardadas al restaurar la sesion.");
      tasks = normalizedTasks;
      saveTasks({ notifyOnError: false });
    }

    return normalizedTasks;
  } catch (error) {
    console.error("No se pudieron recuperar las tareas guardadas:", error);
    removeStorageItem(STORAGE_KEYS.tasks);
    return [];
  }
}

function updateThemeButton(isDark) {
  themeToggle.textContent = isDark ? SUN_ICON : MOON_ICON;
  themeToggle.setAttribute(
    "aria-label",
    isDark ? "Activar modo claro" : "Activar modo oscuro"
  );
  themeToggle.setAttribute("aria-pressed", String(isDark));
}

function setActiveNav(link) {
  if (!link) return;

  asideLinks.forEach((item) => {
    item.classList.remove("bg-slate-100", "dark:bg-slate-700", "font-semibold");
    item.setAttribute("aria-pressed", "false");
  });

  link.classList.add("bg-slate-100", "dark:bg-slate-700", "font-semibold");
  link.setAttribute("aria-pressed", "true");
}

/**
 * Aplica el filtro de visibilidad actual a las tareas renderizadas en el DOM.
 *
 * @returns {void}
 */
function applyFilter() {
  tasks.forEach((task) => {
    const elements = taskElements.get(task);
    if (!elements) return;

    let visible = true;
    if (currentFilter === "open") {
      visible = !task.completed;
    } else if (currentFilter === "closed") {
      visible = task.completed;
    }

    elements.article.style.display = visible ? "" : "none";
  });
}

function getPriorityClasses(priority) {
  if (priority === "alta") {
    return "bg-red-100 text-red-700";
  }
  if (priority === "media") {
    return "bg-yellow-100 text-yellow-700";
  }
  return "bg-green-100 text-green-700";
}

function showTaskFormError(message) {
  if (!taskFormError) {
    return;
  }

  taskFormError.textContent = message;
  taskFormError.classList.remove("hidden");
}

function clearTaskFormError() {
  if (!taskFormError) {
    return;
  }

  taskFormError.textContent = "";
  taskFormError.classList.add("hidden");
}

/**
 * Valida y normaliza los valores introducidos para crear una nueva tarea.
 *
 * @param {string} title Titulo introducido por la persona usuaria.
 * @param {string} category Categoria introducida por la persona usuaria.
 * @returns {{ isValid: false, error: string } | { isValid: true, title: string, category: string }} Resultado de la validacion.
 */
function validateTaskInput(title, category) {
  const normalizedTitle = title.trim();
  const normalizedCategory = category.trim();

  if (!normalizedTitle) {
    return {
      isValid: false,
      error: "El titulo es obligatorio."
    };
  }

  if (normalizedTitle.length < 3) {
    return {
      isValid: false,
      error: "El titulo debe tener al menos 3 caracteres."
    };
  }

  if (normalizedTitle.length > 20) {
    return {
      isValid: false,
      error: "El titulo no puede superar los 20 caracteres."
    };
  }

  if (!normalizedCategory) {
    return {
      isValid: false,
      error: "La categoria es obligatoria."
    };
  }

  if (normalizedCategory.length < 3) {
    return {
      isValid: false,
      error: "La categoria debe tener al menos 3 caracteres."
    };
  }

  if (normalizedCategory.length > 10) {
    return {
      isValid: false,
      error: "La categoria no puede superar los 10 caracteres."
    };
  }

  const hasDuplicateTitle = tasks.some(
    (task) => task.title.toLowerCase() === normalizedTitle.toLowerCase()
  );

  if (hasDuplicateTitle) {
    return {
      isValid: false,
      error: "Ya existe una tarea con ese titulo."
    };
  }

  return {
    isValid: true,
    title: normalizedTitle,
    category: normalizedCategory
  };
}

/**
 * Crea los elementos del DOM necesarios para representar una tarea.
 *
 * @param {{ id: string, title: string, category: string, priority: string, completed: boolean }} task Tarea a representar.
 * @returns {{ article: HTMLElement, checkbox: HTMLInputElement, title: HTMLSpanElement, category: HTMLSpanElement, badge: HTMLSpanElement, deleteBtn: HTMLButtonElement }} Elementos creados para la tarea.
 */
function createTaskElement(task) {
  const article = document.createElement("article");
  article.setAttribute("role", "listitem");

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = task.completed;
  checkbox.className = "h-4 w-4 accent-slate-600";
  checkbox.setAttribute("aria-label", `Marcar tarea ${task.title} como completada`);

  const title = document.createElement("span");
  title.textContent = task.title;

  const category = document.createElement("span");
  category.textContent = task.category;

  const badge = document.createElement("span");
  badge.className =
    "rounded-full px-2 py-1 text-xs font-semibold " +
    getPriorityClasses(task.priority);
  badge.textContent =
    task.priority.charAt(0).toUpperCase() + task.priority.slice(1);

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.textContent = "\u00D7";
  deleteBtn.className =
    "ml-2 cursor-pointer border-0 bg-transparent text-lg font-bold text-gray-400 transition-colors hover:text-red-500";
  deleteBtn.setAttribute("aria-label", `Eliminar tarea ${task.title}`);

  article.append(checkbox, title, category, badge, deleteBtn);

  return { article, checkbox, title, category, badge, deleteBtn };
}

/**
 * Actualiza las clases CSS de una tarea segun su estado de completado.
 *
 * @param {{ completed: boolean }} task Tarea cuyo estado visual se debe reflejar.
 * @param {{ article: HTMLElement, title: HTMLElement, category: HTMLElement }} elements Elementos del DOM asociados a la tarea.
 * @returns {void}
 */
function updateTaskStyle(task, elements) {
  const { article, title, category } = elements;

  const baseArticleClasses = [
    "flex",
    "items-center",
    "justify-between",
    "gap-3",
    "rounded-lg",
    "border",
    "mb-3",
    "px-3",
    "py-2",
    "shadow-sm",
    "transition-transform",
    "hover:-translate-y-[2px]",
    "hover:shadow-lg"
  ];

  const completedArticleClasses = [
    ...baseArticleClasses,
    "border-slate-200",
    "bg-slate-100",
    "dark:bg-slate-700",
    "dark:border-slate-600",
    "opacity-70"
  ].join(" ");

  const activeArticleClasses = [
    ...baseArticleClasses,
    "border-slate-200",
    "bg-white",
    "dark:bg-slate-800",
    "dark:border-slate-700"
  ].join(" ");

  const completedTitleClasses =
    "font-medium text-slate-500 dark:text-slate-400 line-through";
  const activeTitleClasses =
    "font-medium text-slate-900 dark:text-slate-100";
  const completedCategoryClasses =
    "text-sm text-slate-400 dark:text-slate-500 line-through";
  const activeCategoryClasses =
    "text-sm text-slate-500 dark:text-slate-300";

  if (task.completed) {
    article.className = completedArticleClasses;
    title.className = completedTitleClasses;
    category.className = completedCategoryClasses;
  } else {
    article.className = activeArticleClasses;
    title.className = activeTitleClasses;
    category.className = activeCategoryClasses;
  }
}

/**
 * Registra los eventos necesarios para completar o eliminar una tarea desde la interfaz.
 *
 * @param {{ id: string, completed: boolean }} task Tarea asociada a los eventos.
 * @param {{ article: HTMLElement, checkbox: HTMLInputElement, deleteBtn: HTMLButtonElement }} elements Elementos interactivos de la tarea.
 * @returns {void}
 */
function attachTaskEventHandlers(task, elements) {
  const { article, checkbox, deleteBtn } = elements;

  checkbox.addEventListener("change", () => {
    task.completed = checkbox.checked;
    updateTaskStyle(task, elements);
    saveTasks();
    applyFilter();
  });

  deleteBtn.addEventListener("click", () => {
    article.remove();
    tasks = tasks.filter((storedTask) => storedTask.id !== task.id);
    saveTasks();
    applyFilter();
  });
}

/**
 * Crea, configura e inserta una tarea en la lista visible del documento.
 *
 * @param {{ id: string, title: string, category: string, priority: string, completed: boolean }} task Tarea que se va a renderizar.
 * @param {{ applyCurrentFilter?: boolean }} [options={}] Opciones de renderizado.
 * @param {boolean} [options.applyCurrentFilter=true] Indica si se debe reaplicar el filtro actual tras insertar la tarea.
 * @returns {void}
 */
function addTaskToDOM(task, { applyCurrentFilter = true } = {}) {
  const elements = createTaskElement(task);

  updateTaskStyle(task, elements);
  taskElements.set(task, elements);
  attachTaskEventHandlers(task, elements);
  taskList.prepend(elements.article);

  if (applyCurrentFilter) {
    applyFilter();
  }
}

function renderStoredTasks() {
  tasks.forEach((task) => addTaskToDOM(task, { applyCurrentFilter: false }));
  applyFilter();
}

const savedTheme = getStorageItem(STORAGE_KEYS.theme);
const isDarkTheme = savedTheme === "dark";

if (isDarkTheme) {
  document.body.classList.add("dark");
}

updateThemeButton(isDarkTheme);

themeToggle.addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark");
  setStorageItem(STORAGE_KEYS.theme, isDark ? "dark" : "light");
  updateThemeButton(isDark);
});

tasks = loadTasks();
renderStoredTasks();

if (navHome) {
  navHome.addEventListener("click", () => {
    currentFilter = "all";
    applyFilter();
    setActiveNav(navHome);
  });
}

if (navOpenTasks) {
  navOpenTasks.addEventListener("click", () => {
    currentFilter = "open";
    applyFilter();
    setActiveNav(navOpenTasks);
  });
}

if (navClosedTasks) {
  navClosedTasks.addEventListener("click", () => {
    currentFilter = "closed";
    applyFilter();
    setActiveNav(navClosedTasks);
  });
}

setActiveNav(navHome);

taskInput.addEventListener("input", clearTaskFormError);
categoryInput.addEventListener("input", clearTaskFormError);

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = taskInput.value;
  const category = categoryInput.value;
  const priority = priorityInput.value;
  const validation = validateTaskInput(title, category);

  if (!validation.isValid) {
    showTaskFormError(validation.error);
    return;
  }

  clearTaskFormError();
  taskInput.value = validation.title;
  categoryInput.value = validation.category;

  const newTask = normalizeTask({
    id: createTaskId(),
    title: validation.title,
    category: validation.category,
    priority,
    completed: false
  });

  if (!newTask) {
    return;
  }

  tasks.push(newTask);
  saveTasks();
  addTaskToDOM(newTask);

  taskInput.value = "";
  categoryInput.value = "";
  priorityInput.value = "alta";
  taskInput.focus();
});
