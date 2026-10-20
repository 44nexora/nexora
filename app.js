(() => {
  const telegram = window.Telegram?.WebApp;
  const pages = [...document.querySelectorAll("[data-view]")];
  const navigation = [...document.querySelectorAll("[data-page]")];
  const toast = document.getElementById("toast");
  let toastTimer;

  if (telegram) {
    telegram.ready();
    telegram.expand();
    telegram.setHeaderColor("#10090b");
    telegram.setBackgroundColor("#10090b");

    const user = telegram.initDataUnsafe?.user;
    if (user) {
      const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
      const heading = document.querySelector(".hero-copy h1");
      if (name && heading) {
        heading.innerHTML = `Привет, <em>${escapeHtml(name)}</em>`;
      }
    }
  }

  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character]);
  }

  function showPage(name) {
    pages.forEach((page) => page.classList.toggle("active", page.dataset.view === name));
    navigation.forEach((item) => item.classList.toggle("active", item.dataset.page === name));
    document.getElementById("main-content").focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 2800);
  }

  document.addEventListener("click", (event) => {
    const pageButton = event.target.closest("[data-page]");
    if (pageButton) {
      event.preventDefault();
      showPage(pageButton.dataset.page);
      return;
    }

    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;

    if (actionButton.dataset.action === "new-deal") {
      showToast("Создание сделки пока доступно в Telegram-боте.");
    } else if (actionButton.dataset.action === "bot" && telegram) {
      telegram.close();
    } else {
      showToast("Этот раздел появится после подключения Mini App к боту.");
    }
  });
})();
