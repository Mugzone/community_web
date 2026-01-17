import { avatarUidUrl, coverUrl } from "./formatters";
import type { RespWikiTemplate } from "../network/api";
import type { WikiTemplate } from "./wiki";

type TranslateFn = (
  key: string,
  vars?: Record<string, string | number>
) => string;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export const renderTemplateHtml = (
  t: TranslateFn,
  tmpl: WikiTemplate,
  resp: RespWikiTemplate
) => {
  if (resp.message) {
    return `<div class="wiki-template-placeholder wiki-template-warning">${escapeHtml(
      resp.message
    )}</div>`;
  }
  const name = tmpl.name;
  const data = resp.data as
    | Record<string, unknown>
    | Array<unknown>
    | undefined;
  const asChart = (payload?: unknown) =>
    payload as {
      id?: number;
      title?: string;
      artist?: string;
      version?: string;
      cover?: string;
      mode?: number;
      finish?: boolean;
      condition?: string;
    };
  const asUser = (payload?: unknown) =>
    payload as { uid?: number; username?: string; avatar?: string };

  if (name === "_login") {
    return `<div class="wiki-template-card wiki-template-login">${t(
      "wiki.template.login"
    )}</div>`;
  }

  if (name === "_user") {
    const u = asUser(data);
    if (!u) return "";
    const avatar = u.uid
      ? `<img class="wiki-template-avatar" src="${escapeHtml(avatarUidUrl(u.uid))}" alt="${escapeHtml(u.username ?? "")}">`
      : `<span class="wiki-template-avatar placeholder" aria-hidden="true"></span>`;
    return `<a class="wiki-template-card wiki-template-user" href="/player/${u.uid ?? ""}">${avatar}<p class="wiki-template-title">${escapeHtml(
      u.username ?? ""
    )}</p></a>`;
  }

  if (name === "_chart" || name === "_activity" || name === "_event") {
    const c = asChart(data);
    if (!c) return "";
    const finish = c.finish
      ? `<span class="pill ghost">${t("wiki.template.finish")}</span>`
      : "";
    const condition = tmpl.params.condition
      ? `<p class="wiki-template-condition">${escapeHtml(tmpl.params.condition)}</p>`
      : "";
    const cover = coverUrl(c.cover ? String(c.cover) : undefined);
    const coverStyle = cover
      ? `style="background-image:url('${escapeHtml(cover)}')"`
      : "";
    const link = c.id ? `href="/chart/${c.id}"` : "";
    const bodyClass = condition
      ? "wiki-template-body wiki-template-body-compact"
      : "wiki-template-body";
    return `<a class="wiki-template-card wiki-template-chart" ${link}><div class="wiki-template-cover" ${coverStyle}></div><div class="${bodyClass}"><p class="wiki-template-title">${escapeHtml(
      c.title ?? ""
    )}</p><p class="wiki-template-meta">${escapeHtml(
      c.artist ?? ""
    )} · ${escapeHtml(c.version ?? "")}</p>${condition}${finish}</div></a>`;
  }

  if (name === "_grouplist") {
    const group = data as {
      groupId?: number;
      users?: Array<{ uid?: number; username?: string }>;
    };
    if (!group || !group.users?.length)
      return `<div class="wiki-template-placeholder wiki-template-warning">${t(
        "wiki.template.empty"
      )}</div>`;
    const items = group.users
      .map(
        (u) =>
          `<li>${escapeHtml(u.username ?? "")}${
            u.uid ? ` (UID ${u.uid})` : ""
          }</li>`
      )
      .join("");
    return `<div class="wiki-template-card"><p class="wiki-template-title">${t(
      "wiki.template.group",
      { id: group.groupId ?? "" }
    )}</p><ul class="wiki-template-list">${items}</ul></div>`;
  }

  if (name === "_eventsum") {
    const list = Array.isArray(data)
      ? (data as Array<{ uid?: number; username?: string; total?: number }>)
      : [];
    if (!list.length)
      return `<div class="wiki-template-placeholder wiki-template-warning">${t(
        "wiki.template.empty"
      )}</div>`;
    const max = Math.max(...list.map((i) => Number(i.total) || 0), 1);
    const items = list
      .map((item, index) => {
        const percent = Math.round(((Number(item.total) || 0) / max) * 100);
        const name = escapeHtml(item.username ?? (item.uid ? `#${item.uid}` : "-"));
        const rank = index + 1;
        const avatar = item.uid
          ? `<img class="wiki-template-avatar" src="${escapeHtml(
              avatarUidUrl(item.uid)
            )}" alt="${name}">`
          : `<span class="wiki-template-avatar placeholder" aria-hidden="true"></span>`;
        const label = item.uid
          ? `<a class="wiki-template-label" href="/player/${item.uid}">${name}</a>`
          : `<span class="wiki-template-label">${name}</span>`;
        return `<li><span class="wiki-template-rank">${rank}</span><div class="wiki-template-user">${avatar}${label}</div><span class="wiki-template-value">${
          item.total ?? 0
        }</span><div class="wiki-template-bar" style="width:${percent}%"></div></li>`;
      })
      .join("");
    return `<div class="wiki-template-card"><p class="wiki-template-title">${t(
      "wiki.template.eventsum"
    )}</p><div class="wiki-template-bars-wrap"><div class="wiki-template-bars-head"><span>${t(
      "wiki.template.table.rank"
    )}</span><span>${t("wiki.template.table.player")}</span><span>${t(
      "wiki.template.table.value"
    )}</span></div><ul class="wiki-template-bars">${items}</ul></div></div>`;
  }

  if (
    name === "_event3" ||
    name === "_vote" ||
    name === "_voted" ||
    name === "_level"
  ) {
    return `<div class="wiki-template-placeholder wiki-template-warning">${t(
      "wiki.template.unsupported"
    )}</div>`;
  }

  return `<div class="wiki-template-placeholder wiki-template-warning">${t(
    "wiki.template.unknown"
  )}</div>`;
};

export const applyTemplateHtml = (
  html: string,
  templateBlocks: Array<string | undefined>
) => {
  if (!templateBlocks.length) return html;
  const container = document.createElement("div");
  container.innerHTML = html;
  templateBlocks.forEach((fragment, idx) => {
    if (!fragment) return;
    const target = container.querySelector(`[data-template-idx="${idx}"]`);
    if (target) {
      target.innerHTML = fragment;
      target.classList.add("wiki-template-loaded");
    }
  });
  return container.innerHTML;
};
