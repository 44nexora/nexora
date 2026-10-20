(() => {
  const telegram = window.Telegram?.WebApp;
  const apiBase = String(window.NEXORA_API_URL || "").replace(/\/+$/, "");
  const pages = [...document.querySelectorAll("[data-view]")];
  const navigation = [...document.querySelectorAll("[data-page]")];
  const toast = document.getElementById("toast");
  const connectNotice = document.getElementById("connect-notice");
  const connectionStatus = document.getElementById("connection-status");
  let profile = null;
  let toastTimer;

  if (telegram) {
    telegram.ready();
    telegram.expand();
    telegram.setHeaderColor("#10090b");
    telegram.setBackgroundColor("#10090b");
    const user = telegram.initDataUnsafe?.user;
    const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ");
    const heading = document.querySelector(".hero-copy h1");
    if (name && heading) {
      heading.innerHTML = `Привет, <em>${escapeHtml(name)}</em>`;
    }
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
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
    if (profile) renderProfile(profile);
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 3200);
  }

  function setConnection(ready, message) {
    connectionStatus.innerHTML = `<i></i> ${ready ? "ОНЛАЙН" : "НЕТ СВЯЗИ"}`;
    connectionStatus.classList.toggle("is-online", ready);
    connectNotice.hidden = ready;
    if (!ready && message) {
      connectNotice.querySelector("p").textContent = message;
    }
  }

  async function request(path, options = {}) {
    if (!apiBase) {
      throw new Error("Сервер ещё не подключён. Настройте адрес API в config.js.");
    }
    if (!telegram?.initData) {
      throw new Error("Откройте Mini App кнопкой в Telegram, чтобы войти в аккаунт.");
    }
    const response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Init-Data": telegram.initData,
        ...options.headers,
      },
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `Ошибка сервера (${response.status}).`);
    }
    return response.status === 204 ? null : response.json();
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function rub(value) {
    return `${Number(value || 0).toLocaleString("ru-RU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ₽`;
  }

  function renderProfile(data) {
    profile = data;
    const user = data.user;
    setText("home-balance", rub(user.balance));
    setText("balance-value", rub(user.balance));
    setText("home-completed", String(user.deals_completed));
    setText("home-referrals", String(user.referrals));
    setText("stats-total", String(user.deals_total));
    setText("stats-completed", String(user.deals_completed));
    setText("stats-turnover", rub(user.turnover_rub));
    setText("stats-referrals", String(user.referrals));
    document.getElementById("referral-link").value = data.referral_link || "";

    const tonInput = document.querySelector('[name="ton_wallet"]');
    const cardInput = document.querySelector('[name="card_number"]');
    if (document.activeElement !== tonInput) tonInput.value = user.ton_wallet || "";
    if (document.activeElement !== cardInput) cardInput.value = user.card_number || "";

    const requirements = [];
    if (Number(user.balance) < 600) requirements.push("баланс не менее 600 ₽");
    if (Number(user.deals_completed) < 3) requirements.push("3 завершённые сделки");
    setText(
      "withdraw-requirements",
      requirements.length
        ? `Пока не выполнено: ${requirements.join(" и ")}. Автоматическая заявка на выплату не создаётся.`
        : "Условия выполнены. Для оформления выплаты обратитесь в поддержку.",
    );
    renderDeals(data.deals || []);
    setConnection(true);
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? ""
      : date.toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" });
  }

  function renderDeals(deals) {
    const list = document.getElementById("deal-list");
    const empty = document.getElementById("deals-empty");
    empty.hidden = deals.length !== 0;
    list.innerHTML = deals.map((deal) => {
      const statuses = {
        pending: ["Ожидает участника", "status-pending"],
        joined: ["Ожидает оплаты", "status-pending"],
        paid: ["Ожидает передачи", "status-progress"],
        gift_sent: ["На проверке", "status-progress"],
        completed: ["Завершена", "status-completed"],
        cancelled: ["Отменена", "status-muted"],
      };
      const [statusText, statusClass] = statuses[deal.status] || ["Статус обновлён", "status-muted"];
      const lines = [
        `<div class="deal-meta"><span>Сделка #${escapeHtml(String(deal.id).padStart(4, "0"))}</span><span class="status-pill ${statusClass}">${statusText}</span></div>`,
        `<div class="deal-amount">${escapeHtml(deal.amount)}</div>`,
        `<div class="deal-details">${escapeHtml(deal.role === "seller" ? "Вы продавец" : "Вы покупатель")} · ${escapeHtml(deal.payment_method)}</div>`,
      ];
      if (deal.nft_description) {
        lines.push(`<div class="deal-details">🎁 ${escapeHtml(deal.nft_description)}</div>`);
      }
      if (deal.counterparty) {
        lines.push(`<div class="deal-details">Контрагент: ${escapeHtml(deal.counterparty)}</div>`);
      }
      if (deal.buyer_stats) {
        lines.push(`<div class="deal-details">Покупатель: ${escapeHtml(String(deal.buyer_stats.completed))} успешных сделок · ${escapeHtml(rub(deal.buyer_stats.turnover_rub))} оборот</div>`);
      }
      if (deal.seller_requisite) {
        lines.push(`<div class="seller-requisite"><span>Реквизиты продавца</span><code>${escapeHtml(deal.seller_requisite)}</code><button class="button button-secondary" data-action="copy-value" data-copy-value="${escapeHtml(deal.seller_requisite)}">Скопировать реквизиты</button></div>`);
      }
      if (deal.payment_method === "Звёзды" && deal.amount_stars) {
        const rate = Number(profile?.star_price_rub || 0).toLocaleString("ru-RU", {
          minimumFractionDigits: 4,
          maximumFractionDigits: 4,
        });
        lines.push(`<div class="deal-details">Курс: 1 ⭐ = ${escapeHtml(rate)} ₽, округление вверх</div>`);
      }
      lines.push(`<div class="deal-date">${escapeHtml(formatDate(deal.created_at))}</div>`);

      if (deal.can_join) {
        lines.push(`<button class="button button-primary" data-deal-action="join" data-deal-id="${deal.id}">Присоединиться</button>`);
      } else if (deal.can_mark_paid) {
        lines.push(`<p class="form-note warning-note">Нажимайте только после фактического перевода. Бот не проверяет поступление денег автоматически.</p>`);
        lines.push(`<button class="button button-primary" data-deal-action="mark_paid" data-deal-id="${deal.id}">Я оплатил</button>`);
      } else if (deal.can_mark_gift_sent) {
        lines.push(`<button class="button button-secondary" data-deal-action="mark_gift_sent" data-deal-id="${deal.id}">Я отправил подарок</button>`);
      } else if (deal.status === "gift_sent") {
        lines.push(`<div class="deal-details">Ожидает проверки администрацией.</div>`);
      }
      return `<article class="deal-card">${lines.join("")}</article>`;
    }).join("");
  }

  async function loadProfile(showErrors = false) {
    try {
      const data = await request("/api/me");
      renderProfile(data);
      return true;
    } catch (error) {
      setConnection(false, error.message);
      if (showErrors) showToast(error.message);
      return false;
    }
  }

  async function submitForm(form, path, body, successMessage) {
    const submitButton = form.querySelector('[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    try {
      await request(path, { method: "POST", body: JSON.stringify(body) });
      form.reset();
      showToast(successMessage);
      await loadProfile();
    } catch (error) {
      showToast(error.message);
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  }

  async function copyText(value, successMessage) {
    if (!value) {
      showToast("Пока нечего копировать.");
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      showToast(successMessage);
    } catch {
      showToast("Не удалось скопировать. Выделите текст и скопируйте вручную.");
    }
  }

  document.addEventListener("click", async (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const pageButton = target.closest("[data-page]");
    if (pageButton) {
      event.preventDefault();
      showPage(pageButton.dataset.page);
      return;
    }
    const actionButton = target.closest("[data-action]");
    if (actionButton) {
      const action = actionButton.dataset.action;
      if (action === "new-deal") {
        document.getElementById("deal-dialog").showModal();
      } else if (action === "close-dialog") {
        actionButton.closest("dialog").close();
      } else if (action === "refresh") {
        await loadProfile(true);
      } else if (action === "copy-invite") {
        try {
          await navigator.clipboard.writeText(document.getElementById("deal-invite-link").value);
          showToast("Ссылка скопирована.");
        } catch {
          showToast("Не удалось скопировать ссылку. Выделите её и скопируйте вручную.");
        }
      } else if (action === "copy-referral") {
        await copyText(document.getElementById("referral-link").value, "Реферальная ссылка скопирована.");
      } else if (action === "copy-value") {
        await copyText(actionButton.dataset.copyValue, "Реквизиты скопированы.");
      } else if (action === "contact-manager") {
        const username = profile?.manager_username?.replace(/^@/, "");
        if (username && telegram) telegram.openTelegramLink(`https://t.me/${username}`);
        else if (username) window.open(`https://t.me/${username}`, "_blank", "noopener");
        else showToast("Контакт менеджера пока недоступен.");
      }
      return;
    }

    const dealButton = target.closest("[data-deal-action]");
    if (!dealButton) return;
    const action = dealButton.dataset.dealAction;
    if (action === "mark_paid" && !window.confirm(
      "Подтвердите: вы действительно перевели деньги продавцу? Бот не проверяет поступление платежа.",
    )) return;
    if (action === "mark_gift_sent" && !window.confirm(
      "Подтвердите, что вы передали подарок менеджеру. Сделка будет ожидать проверки администрацией.",
    )) return;
    dealButton.disabled = true;
    try {
      const updated = action === "join"
        ? await request(`/api/deals/${dealButton.dataset.dealId}/join`, { method: "POST" })
        : await request(`/api/deals/${dealButton.dataset.dealId}/action`, {
          method: "POST",
          body: JSON.stringify({ action }),
        });
      renderProfile(updated);
      showToast(action === "join" ? "Вы присоединились к сделке." : "Статус сделки обновлён.");
    } catch (error) {
      showToast(error.message);
      dealButton.disabled = false;
    }
  });

  const dealForm = document.getElementById("deal-form");
  const roleSelect = dealForm.elements.namedItem("role");
  const nftField = dealForm.querySelector(".nft-field");
  roleSelect.addEventListener("change", () => {
    nftField.hidden = roleSelect.value !== "Продавец";
  });
  dealForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(dealForm);
    const submitButton = dealForm.querySelector('[type="submit"]');
    submitButton.disabled = true;
    try {
      const result = await request("/api/deals", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(formData.entries())),
      });
      document.getElementById("deal-dialog").close();
      document.getElementById("deal-invite-link").value = result.invite_link;
      document.getElementById("deal-result-dialog").showModal();
      dealForm.reset();
      nftField.hidden = false;
      await loadProfile();
    } catch (error) {
      showToast(error.message);
    } finally {
      submitButton.disabled = false;
    }
  });

  document.getElementById("requisites-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const field = event.submitter?.dataset.requisite;
    if (!field) return;
    const value = document.querySelector(`[name="${field}"]`).value.trim();
    event.submitter.disabled = true;
    try {
      await request("/api/requisites", {
        method: "PUT",
        body: JSON.stringify({ field, value }),
      });
      showToast("Реквизиты сохранены.");
      await loadProfile();
    } catch (error) {
      showToast(error.message);
    } finally {
      event.submitter.disabled = false;
    }
  });

  document.getElementById("ticket-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    await submitForm(
      form,
      "/api/tickets",
      { message: new FormData(form).get("message") },
      "Обращение отправлено администрации.",
    );
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) loadProfile();
  });
  if (apiBase && telegram?.initData) {
    loadProfile();
    window.setInterval(() => {
      if (!document.hidden) loadProfile();
    }, 20000);
  } else {
    setConnection(false, !telegram?.initData
      ? "Откройте Mini App из Telegram. В браузере вход в аккаунт недоступен."
      : "API ещё не настроен. Укажите публичный HTTPS-адрес сервера в config.js.");
  }
})();
