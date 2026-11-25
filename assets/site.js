// Shared behaviour: island nav, scroll reveals, footer year, the subtitle demo.
(function () {
  const nav = document.querySelector(".nav");
  const btn = document.querySelector(".menu-btn");
  if (btn && nav) btn.addEventListener("click", () => nav.classList.toggle("open"));

  const page = document.body.dataset.page;
  document.querySelectorAll(".nav a.link").forEach((a) => {
    if (a.dataset.page === page) a.classList.add("active");
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  // Island subtitle demo: words appear as they are "spoken", like the app.
  const demo = document.querySelector(".island-demo");
  if (demo) {
    const who = demo.querySelector("[data-who]");
    const cap = demo.querySelector(".caption");
    const lines = [
      ["YOU", "Jarvis, find me the best phone under thirty thousand on Amazon and add it to my cart."],
      ["JARVIS", "On it. Comparing the top-rated phones now. I'll stop before checkout so you can pay."],
      ["YOU", "Any problems with my PC today?"],
      ["JARVIS", "Chrome crashed twice this morning and your C drive is nearly full. Want me to clean it up?"],
    ];
    let li = 0;
    function play() {
      const [w, text] = lines[li];
      who.textContent = w;
      const words = text.split(" ");
      let n = 0;
      cap.innerHTML = "";
      const step = () => {
        n++;
        cap.textContent = words.slice(0, n).join(" ");
        if (n < words.length) setTimeout(step, 230);
        else setTimeout(() => { li = (li + 1) % lines.length; play(); }, 2200);
      };
      step();
    }
    play();
  }

  // Download page OS tabs
  const tabs = document.querySelectorAll(".os-tabs button");
  tabs.forEach((t) => t.addEventListener("click", () => {
    tabs.forEach((x) => x.classList.toggle("on", x === t));
    document.querySelectorAll(".panel").forEach((p) => (p.hidden = p.id !== t.dataset.panel));
  }));
  if (tabs.length && /Mac/i.test(navigator.platform || navigator.userAgent)) {
    document.querySelector('.os-tabs button[data-panel="mac"]')?.click();
  }
})();
