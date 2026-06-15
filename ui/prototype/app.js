const items = [
  "Dashboard",
  "Imports",
  "Organized Output",
  "Datasets",
  "Tiered DB",
  "Review Queue",
  "Diagnostics",
  "Governance",
  "Settings"
];

const nav = document.getElementById("nav");
const title = document.getElementById("screen-title");

items.forEach((item, index) => {
  const btn = document.createElement("button");
  btn.className = "nav-btn" + (index === 0 ? " active" : "");
  btn.textContent = item;
  btn.onclick = () => {
    document.querySelectorAll(".nav-btn").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    title.textContent = item;
  };
  nav.appendChild(btn);
});
