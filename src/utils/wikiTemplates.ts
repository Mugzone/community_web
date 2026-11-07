import { avatarUidUrl, avatarUrl, coverUrl } from "./formatters";
import { URLS } from "../lib/urls";
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

type Loose = Record<string, unknown>;
const asObj = (v: unknown): Loose =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Loose) : {};
const asArr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const s = (v: unknown, fb = ""): string =>
  v === undefined || v === null || v === "" ? fb : String(v);
const n2 = (v: unknown): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
const field = (d: Loose, p: Record<string, string>, key: string): string => {
  const dv = d[key];
  return dv === undefined || dv === null || dv === "" ? p[key] ?? "" : String(dv);
};

/** CSS url() 里用的 URL：转义并去掉可能闭合 url() 的圆括号 */
const cssUrl = (v: string) => escapeHtml(v).replace(/[()]/g, "");
const chartLink = (id: string) => escapeHtml(URLS.chartPage(id));
const userLink = (uid: string) => escapeHtml(URLS.user(uid));

/** 老站 {% avatar %}：按 uid 取头像，无 uid 时留空（由 CSS 背景兜底） */
const avatarImg = (uid: string, username: string, avatar?: string): string => {
  if (!uid) return "";
  const src = avatar && avatar.length ? avatarUrl(avatar, uid) : avatarUidUrl(n2(uid));
  return `<img src="${escapeHtml(src)}" alt="${escapeHtml(username)}"/>`;
};

/**
 * 按老站 tmpl_*.html 1:1 生成模板 DOM。
 * 名字先归一化（去前导下划线），数据优先取 resp.data，缺失字段用 tmpl.params 兜底，
 * 空数据也返回完整骨架，绝不返回空串。用户可控文本一律 escapeHtml。
 */
export const renderTemplateHtml = (
  t: TranslateFn,
  tmpl: WikiTemplate,
  resp: RespWikiTemplate
): string => {
  const n = tmpl.name.replace(/^_/, "");
  const p = tmpl.params;
  const obj: Loose = asObj(resp.data);
  const arr: unknown[] = Array.isArray(resp.data) ? resp.data : [];
  const g = (key: string) => field(obj, p, key);

  const chart = () => {
    // 后端查不到谱面（历史活动谱面已下线）时 id 会回落成 0，此时用 wiki 正文里写的 id
    const pickId = (...vals: (string | undefined)[]) =>
      vals.find((v) => v !== undefined && v !== "" && n2(v) > 0) ?? "";
    const id =
      pickId(g("id"), g("cid"), g("chart_id")) ||
      pickId(p.id, p.cid, p.chart_id);
    return {
      id,
      title: g("title"),
      version: g("version"),
      cover: g("cover"),
      mode: n2(obj.mode ?? p.mode),
      finish: Boolean(obj.finish) || p.finish === "1" || p.finish === "true",
      condition: g("condition"),
      description: g("description"),
    };
  };

  // 1. action —— 数据全在 params，本地合成，不发请求
  if (n === "action") {
    return `<a href="${escapeHtml(g("link") || "#")}" class="g_round g_action">${escapeHtml(
      g("title")
    )}</a>`;
  }

  // 1a. achieve —— 老站动态模板 tmpl_achieve：$uid$ 取当前登录用户，未登录回退 login 模板
  if (n === "achieve") {
    const uid = n2(obj.uid);
    if (uid <= 1) {
      return `<div class="g_tmpl_login">Please login to view the content</div>`;
    }
    return `<a href="/accounts/user/achieve/${uid}" class="g_round g_action">${escapeHtml(
      g("title")
    )}</a>`;
  }

  // 2. activity
  if (n === "activity") {
    const c = chart();
    const conds = c.condition.split("|").map((x) => x.trim()).filter(Boolean);
    const condHtml = conds.length
      ? conds.map((x) => `<p class="cond">${escapeHtml(x)}</p>`).join("")
      : `<p class="cond">N/A</p>`;
    const desc = c.description
      ? `<p class="desc">${escapeHtml(c.description)}</p>`
      : "";
    return `<div class="g_tmpl_activity"><a href="${chartLink(
      c.id
    )}"><div class="g_cover" style="background-image:url(${cssUrl(
      coverUrl(c.cover)
    )})"></div><div class="right"><p class="textfix">${escapeHtml(
      c.title
    )}</p><p class="sub textfix">${escapeHtml(
      c.version
    )}</p><p class="goal">Goal:</p>${condHtml}${desc}</div></a></div>`;
  }

  // 3. chart
  if (n === "chart") {
    const c = chart();
    return `<div class="g_tmpl_activity"><a href="${chartLink(
      c.id
    )}"><div class="g_cover" style="background-image:url(${cssUrl(
      coverUrl(c.cover)
    )})"></div><div class="right"><p class="textfix">${escapeHtml(
      c.title
    )}</p><p class="sub textfix">${escapeHtml(
      c.version
    )}</p><p class="goal"></p><p>Search c${escapeHtml(
      c.id
    )} in game to download</p></div></a></div>`;
  }

  // 4. event
  if (n === "event") {
    const c = chart();
    const cover = c.cover ? cssUrl(coverUrl(c.cover)) : "";
    const a = cover
      ? `<a href="${chartLink(c.id)}" style="background-image: url(${cover})"></a>`
      : `<a href="${chartLink(c.id)}"></a>`;
    const fin = c.finish ? `<span class="fin">Complete</span>` : "";
    return `<div class="g_tmpl_event">${a}<div class="right"><p class="title textfix"><img src="/static/img/mode/mode-${c.mode}.png"/><span class="textfix" style="max-width: 150px;">${escapeHtml(
      c.title
    )}</span>-${escapeHtml(
      c.version
    )}</p><p>Search c${escapeHtml(
      c.id
    )} in game to download</p>${fin}</div></div>`;
  }

  // 5. event_chart
  if (n === "event_chart") {
    const c = chart();
    const cover = cssUrl(c.cover ? coverUrl(c.cover) : "/static/img/cover.png");
    const fin = c.finish ? `<span class="fin">Complete</span>` : "";
    return `<div class="g_tmpl_event"><a href="${chartLink(
      c.id
    )}" style="background-image: url(${cover})"></a><div class="right"><p class="title textfix"><img src="/static/img/mode/mode-${c.mode}.png"/><span class="textfix" style="max-width: 150px;">${escapeHtml(
      c.title
    )}</span>-${escapeHtml(c.version)}</p>${fin}</div></div>`;
  }

  // 6. event3
  if (n === "event3") {
    const total = n2(obj.total ?? p.total);
    const items = asArr(obj.items ?? obj.list ?? p.items);
    const lis = items
      .map((it) => {
        const o = asObj(it);
        const cid = s(o.cid ?? o.chart_id ?? o.id);
        const title = s(o.title ?? o.name);
        const point = s(o.point ?? o.score ?? 0);
        return `<li><span class="textfix" style="width:180px;"><a href="${chartLink(
          cid
        )}">${escapeHtml(title)}</a></span><span style="width: 80px">${escapeHtml(
          point
        )}</span></li>`;
      })
      .join("");
    // 老站 tmpl_event3.html：{% if total > 0 %} 才渲染表头和列表
    const listHtml =
      total > 0
        ? `<div class="list_head"><span style="width:180px;">Chart</span><span style="width: 80px">Point</span></div><ul class="list">${lis}</ul>`
        : "";
    return `<div class="g_normallist"><div>Current: ${total} point(s)</div>${listHtml}</div>`;
  }

  // 7. eventsum
  if (n === "eventsum") {
    const items = arr.length ? arr : asArr(obj.list ?? obj.items);
    const lis = items
      .map((it, i) => {
        const o = asObj(it);
        const uid = s(o.uid ?? o.user ?? o.id);
        const username = s(o.username ?? o.name);
        const total = s(o.total ?? o.score ?? 0);
        const rank = i + 1;
        const head =
          rank <= 3
            ? `<li class="top"><span class="rank">${avatarImg(
                uid,
                username,
                s(o.avatar)
              )}</span><i class="label top-${rank}"></i>`
            : `<li><span class="rank">${rank}</span>`;
        return `${head}<span class="name textfix"><a href="${userLink(
          uid
        )}">${escapeHtml(username)}</a></span><span class="score">${escapeHtml(
          total
        )}</span></li>`;
      })
      .join("");
    return `<span class="clear"></span><div class="score_area" style="display: inline-block"><div class="list_head"><span class="rank">Rank</span><span class="name">Player</span><span class="score">Score</span></div><ul class="list">${lis}</ul></div>`;
  }

  // 8. first
  if (n === "first") {
    const logoSrc = escapeHtml(`/static/img/${g("pic")}`);
    const time = g("time");
    const ru = obj.user ?? p.user ?? obj.uid ?? p.uid ?? obj.id ?? p.id;
    let uid = "";
    let username = "";
    let avatar = "";
    if (ru && typeof ru === "object") {
      const u = asObj(ru);
      uid = s(u.uid ?? u.id);
      username = s(u.username ?? u.name ?? obj.username ?? p.username);
      avatar = s(u.avatar);
    } else if (ru) {
      uid = s(ru);
      username = s(obj.username ?? p.username);
    }
    const body =
      uid || username
        ? `<span class="avatar">${avatarImg(
            uid,
            username,
            avatar
          )}</span><div class="right"><a href="${userLink(
            uid
          )}">${escapeHtml(username)}</a><p>${escapeHtml(time)}</p></div>`
        : `<div class="empty">Empty</div>`;
    return `<div class="g_tmpl_first g_rblock"><img class="logo" src="${logoSrc}"/>${body}</div>`;
  }

  // 9. grouplist
  if (n === "grouplist") {
    const users = asArr(obj.users ?? obj.list ?? p.users);
    const cards = users
      .map((it) => {
        const u = asObj(it);
        const uid = s(u.uid ?? u.id);
        const username = s(u.username ?? u.name);
        return `<div class="g_tmpl_user"><span class="avatar">${avatarImg(
          uid,
          username,
          s(u.avatar)
        )}</span><a class="textfix" href="${userLink(
          uid
        )}">Mail:${escapeHtml(username)}</a></div>`;
      })
      .join("");
    return `<div class="g_tmpl_grouplist">${cards}</div>`;
  }

  // 10. level
  if (n === "level") {
    const levels = asArr(obj.levels ?? obj.list ?? p.levels);
    const lis = levels
      .map((it) => {
        let a = "";
        let b = "";
        if (Array.isArray(it)) {
          a = s(it[0]);
          b = s(it[1]);
        } else {
          const o = asObj(it);
          a = s(o.level ?? o[0] ?? o.name);
          b = s(o.count ?? o.charts ?? o[1]);
        }
        return `<li><span class="" style="width:100px;">${escapeHtml(
          a
        )}</span><span style="width:100px">${escapeHtml(b)}</span></li>`;
      })
      .join("");
    return `<div class="g_normallist"><div class="list_head"><span style="width: 100px;">Level</span><span style="width: 100px">Charts</span></div><ul class="list">${lis}</ul></div>`;
  }

  // 11. login
  if (n === "login") {
    return `<div class="g_tmpl_login">Please login to view the content</div>`;
  }

  // 12. user
  if (n === "user") {
    const uid = g("uid") || g("id");
    const username = g("username");
    return `<div class="g_tmpl_user"><span class="avatar">${avatarImg(
      uid,
      username,
      s(obj.avatar)
    )}</span><a class="textfix" href="${userLink(uid)}">${escapeHtml(
      username
    )}</a></div>`;
  }

  // 13. vote
  if (n === "vote") {
    const eid = g("eid");
    const choice = g("choice") || "1";
    const voted = obj.voted === true || p.voted === "1" || p.voted === "true";
    return `<a href="#" class="g_round g_tmpl_vote${
      voted ? " g_tmpl_voted" : ""
    }" data-eid="${escapeHtml(eid)}" data-choice="${escapeHtml(choice)}">${
      voted ? "Voted" : "Vote"
    }</a>`;
  }

  // 14. voted
  if (n === "voted") {
    const records = asArr(obj.records ?? obj.list ?? p.records);
    const rows = records
      .map((it) => {
        const r = asObj(it);
        const choice = s(r.choice);
        const percent = n2(r.percent);
        const count = s(r.voted ?? r.count);
        // 老站 {% widthratio 3 1 record.percent %}：进度条宽度 = percent * 3
        return `<div><span>${escapeHtml(
          choice
        )}</span><i style="width:${percent * 3}px"></i>${escapeHtml(count)}</div>`;
      })
      .join("");
    return `<div class="g_tmpl_votedlist">${rows}</div>`;
  }

  // 兜底：未知名字也返回非空的老站骨架
  return `<div class="g_tmpl_login">${escapeHtml(
    t("wiki.template.unknown")
  )}</div>`;
};

/** 总是替换每个 data-template-idx 占位（含空串也清空），移除 "Loading template..." 文案 */
export const applyTemplateHtml = (
  html: string,
  templateBlocks: Array<string | undefined>
): string => {
  if (!templateBlocks.length) return html;
  return html.replace(
    /<div class="wiki-template-placeholder"([^>]*)>[\s\S]*?<\/div>/g,
    (_match, attrs: string) => {
      const m = /data-template-idx="(\d+)"/.exec(attrs);
      if (!m) return "";
      return templateBlocks[Number(m[1])] ?? "";
    }
  );
};
