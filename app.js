const form = document.querySelector("#task-form");
const taskInput = document.querySelector("#task-input");
const categoryInput = document.querySelector("#category-input");
const priorityInput = document.querySelector("#priority-input");
const taskList = document.querySelector("#task-list");
const themeToggle = document.querySelector("#theme-toggle");
const navHome = document.querySelector("#nav-home");
const navOpenTasks = document.querySelector("#nav-open-tasks");
const navClosedTasks = document.querySelector("#nav-closed-tasks");
const asideLinks = document.querySelectorAll(".aside-link");

let tasks = [];
const taskElements = new WeakMap();
let currentFilter = "all";

function setActiveNav(link) {
  if (!link) return;
  asideLinks.forEach((item) => {
    item.classList.remove("bg-slate-100", "dark:bg-slate-700", "font-semibold");
  });
  link.classList.add("bg-slate-100", "dark:bg-slate-700", "font-semibold");
}

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

// ================================
// Gestión del tema claro/oscuro
// ================================
const savedTheme = localStorage.getItem("theme");

// Comprobar y aplicar el tema guardado
if (savedTheme === "dark") {
  document.body.classList.add("dark");
  themeToggle.textContent = "☀️";
} else {
  themeToggle.textContent = "🌑";
}

// Cambiar tema con el botón
themeToggle.addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  themeToggle.textContent = isDark ? "☀️" : "🌑";
});

// ========================
// Cargar tareas guardadas
// ========================
const savedTasks = localStorage.getItem("tasks");

if (savedTasks) {
  tasks = JSON.parse(savedTasks);
  tasks.forEach(addTaskToDOM);
}

// ==============================
// Función para guardar tareas
// ==============================
function saveTasks() {
  try {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  } catch (error) {
    console.error("Error al guardar las tareas en localStorage:", error);
    alert("No se pudo guardar la tarea. Puede que tu navegador tenga desactivado el almacenamiento local o esté lleno.");
  }
}

// ================================================
// Devuelve clases TailwindCSS según la prioridad
// ================================================
function getPriorityClasses(priority) {
  if (priority === "alta") {
    return "bg-red-100 text-red-700";
  }
  if (priority === "media") {
    return "bg-yellow-100 text-yellow-700";
  }
  return "bg-green-100 text-green-700";
}

// =====================================
// Crea un elemento visual para la tarea
// =====================================
function createTaskElement(task) {
  const article = document.createElement("article");
  article.className =
    "flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 px-3 py-2 shadow-sm";

  // Checkbox para completar tarea
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = task.completed;
  checkbox.className = "h-4 w-4 accent-slate-600";

  // Título de la tarea
  const title = document.createElement("span");
  title.className = "font-medium text-slate-900 dark:text-slate-100";
  title.textContent = task.title;

  // Categoría de la tarea
  const category = document.createElement("span");
  category.className = "text-sm text-slate-500 dark:text-slate-300";
  category.textContent = task.category;

  // Insignia de prioridad
  const badge = document.createElement("span");
  const badgeColor = getPriorityClasses(task.priority);
  badge.className =
    "rounded-full px-2 py-1 text-xs font-semibold " + badgeColor;
  badge.textContent =
    task.priority.charAt(0).toUpperCase() + task.priority.slice(1);

  // Botón para eliminar tarea
  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "✖";
  deleteBtn.className =
    "ml-2 border-0 bg-transparent text-gray-400 hover:text-red-500 cursor-pointer text-sm transition-colors";

  // Añadir todos los elementos al artículo
  article.append(checkbox, title, category, badge, deleteBtn);

  // Retornar todos los nodos/elementos creados
  return { article, checkbox, title, category, badge, deleteBtn };
}

// =====================================================
// Actualiza los estilos según si la tarea está completada
// =====================================================
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

  // Clases cuando la tarea está completada
  const completedArticleClasses = [
    ...baseArticleClasses,
    "border-slate-200",
    "bg-slate-100",
    "dark:bg-slate-700",
    "dark:border-slate-600",
    "opacity-70"
  ].join(" ");

  // Clases cuando la tarea está activa
  const activeArticleClasses = [
    ...baseArticleClasses,
    "border-slate-200",
    "bg-white",
    "dark:bg-slate-800",
    "dark:border-slate-700"
  ].join(" ");

  // Clases para el título y categoría, dependiendo del estado
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

// ===================================================================
// Añade los eventos relacionados a la tarea creada (completar, borrar)
// ===================================================================
function attachTaskEventHandlers(task, elements) {
  const { article, checkbox, deleteBtn } = elements;

  // Evento para marcar tarea como completada/no completada
  checkbox.addEventListener("change", () => {
    task.completed = checkbox.checked;
    updateTaskStyle(task, elements);
    saveTasks();
    applyFilter();
  });

  // Evento para eliminar tarea
  deleteBtn.addEventListener("click", () => {
    article.remove();
    tasks = tasks.filter((t) => t !== task);
    saveTasks();
    applyFilter();
  });
}

// ==========================================================
// Añade la tarea al DOM (a la lista de tareas en pantalla)
// ==========================================================
function addTaskToDOM(task) {
  const elements = createTaskElement(task);

  // Aplicar estilo inicial según si la tarea está completada o no
  // (importante para que, al recargar la página, las tareas completadas
  // sigan viéndose en gris y con el texto tachado).
  updateTaskStyle(task, elements);

  taskElements.set(task, elements);
  attachTaskEventHandlers(task, elements);
  taskList.prepend(elements.article);
  applyFilter();
}

if (navHome) {
  navHome.addEventListener("click", (event) => {
    event.preventDefault();
    currentFilter = "all";
    applyFilter();
    setActiveNav(event.currentTarget);
  });
}

if (navOpenTasks) {
  navOpenTasks.addEventListener("click", (event) => {
    event.preventDefault();
    currentFilter = "open";
    applyFilter();
    setActiveNav(event.currentTarget);
  });
}

if (navClosedTasks) {
  navClosedTasks.addEventListener("click", (event) => {
    event.preventDefault();
    currentFilter = "closed";
    applyFilter();
    setActiveNav(event.currentTarget);
  });
}

setActiveNav(navHome);

// =============================================
// Evento para el envío del formulario de tareas
// =============================================
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const title = taskInput.value.trim();
  const category = categoryInput.value.trim();
  const priority = priorityInput.value;

  if (!title || !category) return;

  // Crear nuevo objeto de tarea
  const newTask = {
    title: title,
    category: category,
    priority: priority,
    completed: false
  };

  // Añadir la tarea al array y guardar
  tasks.push(newTask);
  saveTasks();

  // Añadir tarea al DOM y resetear el formulario
  addTaskToDOM(newTask);

  taskInput.value = "";
  categoryInput.value = "";
  priorityInput.value = "alta";
});