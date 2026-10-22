// The glass card that opens over the tunnel when an exhibit is chosen.
// Content is built from the page view element behind the exhibit.

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function el(tag, cls, txt) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt) n.textContent = txt;
  return n;
}

// Copies a page section without ids, so nothing on the page is duplicated.
function cleanClone(node) {
  const c = node.cloneNode(true);
  for (const n of [c, ...c.querySelectorAll("[id], [aria-labelledby]")]) {
    n.removeAttribute("id");
    n.removeAttribute("aria-labelledby");
  }
  c.querySelectorAll(".clause-head").forEach((h) => h.remove());
  c.querySelectorAll("img[loading]").forEach((i) => i.removeAttribute("loading"));
  return c;
}

function projectBody(item, body) {
  const { el: src, info } = item;
  const sub = el("p", "card-sub", info.sub);
  body.append(sub);
  src.querySelectorAll(".reg-desc, .job-body > p:not(.job-org):not(.job-tools)").forEach((p) => {
    body.append(el("p", "card-text", p.textContent.replace(/\s+/g, " ").trim()));
  });
  const facts = [...src.querySelectorAll(".job-when span")].map((s) => s.textContent.trim());
  const tags = info.tags ? info.tags.split(/,\s*/) : [];
  if (facts.length || tags.length) {
    const ul = el("ul", "card-chips");
    ul.setAttribute("aria-label", facts.length ? "Details" : "Built with");
    for (const t of [...facts, ...tags]) ul.append(el("li", "", t));
    body.append(ul);
  }
  const links = [...src.querySelectorAll("a[href]")];
  const status = [...src.querySelectorAll(".reg-meta span")].find((s) => /private/i.test(s.textContent));
  if (status) body.append(el("p", "card-note", "Private repository, so there is no public link."));
  if (links.length) {
    const row = el("div", "card-actions");
    links.forEach((a, i) => {
      const link = a.cloneNode(true);
      link.className = i === 0 ? "btn" : "text-action";
      row.append(link);
    });
    body.append(row);
  }
}

export function createDialog(root, { onClose }) {
  const scrim = root.querySelector("#scrim");
  const card = root.querySelector("#card");
  const media = card.querySelector(".card-media");
  const title = card.querySelector("#card-title");
  const body = card.querySelector(".card-body-inner");
  const close = card.querySelector(".card-x");
  let opener = null;
  let moved = null; // { node, home } when page content is lent to the card
  let open = false;

  function giveBack() {
    if (moved) {
      moved.home.replaceWith(moved.node);
      moved = null;
    }
  }

  function show(item, from) {
    opener = from || null;
    giveBack();
    body.replaceChildren();
    media.replaceChildren();
    card.classList.remove("has-media", "is-wide");
    title.textContent = item.info.title;

    const src = item.el;
    if (src.matches("li, article")) {
      projectBody(item, body);
      if (item.info.img) {
        const img = el("img");
        img.src = item.info.img;
        img.alt = "";
        media.append(img);
        card.classList.add("has-media");
      }
    } else if (item.key === "contact") {
      // Lend the real form so it submits exactly as on the page.
      const node = src.querySelector(".contact");
      const home = document.createComment("contact");
      node.replaceWith(home);
      moved = { node, home };
      body.append(node);
      card.classList.add("is-wide");
    } else {
      body.append(el("p", "card-sub", item.info.sub));
      const clone = cleanClone(src);
      clone.removeAttribute("data-exhibit");
      clone.className = "card-section " + (src.dataset.cardClass || "");
      body.append(clone);
      card.classList.add("is-wide");
    }

    // Grow the card out of the label that opened it.
    if (from) {
      const r = from.getBoundingClientRect();
      card.style.setProperty("--ox", `${r.left + r.width / 2}px`);
      card.style.setProperty("--oy", `${r.top + r.height / 2}px`);
    }
    scrim.hidden = false;
    card.hidden = false;
    card.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => {
      scrim.classList.add("on");
      card.classList.add("on");
    });
    card.scrollTop = 0;
    body.scrollTop = 0;
    open = true;
    close.focus({ preventScroll: true });
  }

  function hide() {
    if (!open) return;
    open = false;
    scrim.classList.remove("on");
    card.classList.remove("on");
    card.setAttribute("aria-hidden", "true");
    const done = () => {
      if (open) return;
      scrim.hidden = true;
      card.hidden = true;
      giveBack();
    };
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(done, reduce ? 0 : 260);
    onClose(opener);
  }

  close.addEventListener("click", hide);
  scrim.addEventListener("click", hide);
  card.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      hide();
      return;
    }
    if (e.key !== "Tab") return;
    const f = [...card.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null);
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  return {
    show,
    hide,
    get open() {
      return open;
    },
  };
}
