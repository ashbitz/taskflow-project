const form = document.querySelector("#task-form");
const taskInput = document.querySelector("#task-input");
const categoryInput = document.querySelector("#category-input");
const priorityInput = document.querySelector("#priority-input");
const taskList = document.querySelector("#task-list");

let tasks = [];

// Cargar tasks
const savedTasks = localStorage.getItem("tasks");

if (savedTasks) {
  tasks = JSON.parse(savedTasks);
  tasks.forEach(addTaskToDOM);
}

// Guardar tasks
function saveTasks() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

// Crear tasks
function addTaskToDOM(task) {

  const article = document.createElement("article");

  const title = document.createElement("span");
  title.className = "titulo";
  title.textContent = task.title;

  const category = document.createElement("span");
  category.className = "categoria";
  category.textContent = task.category;

  const badge = document.createElement("span");
  badge.className = "badge " + task.priority;
  badge.textContent =
    task.priority.charAt(0).toUpperCase() + task.priority.slice(1);

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "✖";
  deleteBtn.className = "delete-btn";

  deleteBtn.addEventListener("click", () => {
    article.remove();

    tasks = tasks.filter(t => t !== task);
    saveTasks();
  });

  article.append(title, category, badge, deleteBtn);

  taskList.prepend(article);
}

// *****
form.addEventListener("submit", (e) => {

  e.preventDefault();

  const title = taskInput.value.trim();
  const category = categoryInput.value.trim();
  const priority = priorityInput.value;

  if (!title || !category) return;

  const newTask = {
    title: title,
    category: category,
    priority: priority
  };

  tasks.push(newTask);

  saveTasks();

  addTaskToDOM(newTask);

  taskInput.value = "";
  categoryInput.value = "";
  priorityInput.value = "alta";
});