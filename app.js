(function () {
  "use strict";

  const data = window.STARDOM_DATA;
  const routeMeta = {
    overview: { title: "资料总览", eyebrow: "DOS 原版资料" },
    awards: { title: "奖项资料库", eyebrow: "赛事与判定" },
    jobs: { title: "打工资料库", eyebrow: "工作与属性变化" },
    trainings: { title: "训练资料库", eyebrow: "课程与成长方向" },
    planner: { title: "养成规划", eyebrow: "单艺人周计划" }
  };

  const statusMeta = {
    official_partial: { label: "官方规则", className: "official", description: "官方说明书确认赛事结构，完整评分公式未公开。" },
    partial_runtime: { label: "部分实测", className: "partial", description: "方向由官方说明书确认，工资码来自目标构建样本。" },
    user_supplied_exact: { label: "精确表", className: "partial", description: "已按用户提供的完整数值表录入，尚未在目标构建重复验证。" },
    direction_only: { label: "仅确认方向", className: "pending", description: "只确认属性增减方向，不能作为精确计算值。" },
    single_source_empirical: { label: "单一实测", className: "pending", description: "存在玩家实测数字，但尚未在目标构建重复验证。" },
    unknown: { label: "待验证", className: "conflict", description: "目标构建确认条目存在，效果与条件尚未确定。" }
  };

  const state = {
    route: "overview",
    filters: {
      awards: { query: "", categories: [], months: [], attributes: [] },
      jobs: { query: "", attributes: [], direction: "any", stages: [] },
      trainings: { query: "", gains: [], losses: [] }
    },
    sort: {
      awards: { key: null, direction: null },
      jobs: { key: null, direction: null },
      trainings: { key: null, direction: null }
    },
    drawer: null,
    activeTab: "profile"
  };

  const refs = {
    sidebar: document.getElementById("sidebar"),
    sidebarBackdrop: document.getElementById("sidebar-backdrop"),
    menuButton: document.getElementById("menu-button"),
    pageTitle: document.getElementById("page-title"),
    pageEyebrow: document.getElementById("page-eyebrow"),
    drawer: document.getElementById("detail-drawer"),
    drawerBackdrop: document.getElementById("drawer-backdrop"),
    drawerBody: document.getElementById("drawer-body"),
    drawerTitle: document.getElementById("drawer-title"),
    drawerKicker: document.getElementById("drawer-kicker"),
    drawerIcon: document.getElementById("drawer-icon"),
    plannerForm: document.getElementById("planner-form"),
    plannerOutput: document.getElementById("planner-output"),
    saveState: document.getElementById("save-state")
  };

  function iconRefresh() {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons({ attrs: { "aria-hidden": "true" } });
    }
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalize(value) {
    const simplified = {
      "臺": "台", "藝": "艺", "獎": "奖", "選": "选", "廣": "广", "樂": "乐",
      "訓": "训", "練": "练", "攝": "摄", "聲": "声", "發": "发", "學": "学",
      "戲": "戏", "頭": "头", "氣": "气", "體": "体", "會": "会", "電": "电",
      "萬": "万", "與": "与", "為": "为", "員": "员", "義": "义", "務": "务"
    };
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[\s\u3000]+/g, "")
      .replace(/[臺藝獎選廣樂訓練攝聲發學戲頭氣體會電萬與為員義務]/g, function (char) { return simplified[char] || char; });
  }

  function money(value) {
    return value == null ? "待确认" : Number(value).toLocaleString("zh-CN") + " 元";
  }

  function attributeName(key) {
    return data.attributes[key] || key;
  }

  function tags(keys, type, limit) {
    const items = (keys || []).slice(0, limit || keys.length);
    if (!items.length) return '<span class="tag neutral">未确认</span>';
    const prefix = type === "gain" ? "+" : type === "loss" ? "−" : "";
    return '<div class="tag-list">' + items.map(function (key) {
      return '<span class="tag ' + type + '">' + prefix + escapeHtml(attributeName(key)) + "</span>";
    }).join("") + "</div>";
  }

  function effectTags(item, type, limit) {
    const keys = type === "gain" ? item.increase : item.decrease;
    const items = (keys || []).slice(0, limit || keys.length);
    if (!items.length) return '<span class="tag neutral">无</span>';
    return '<div class="tag-list">' + items.map(function (key) {
      const value = item.exact && item.exact[key];
      const signedValue = value == null ? (type === "gain" ? "+" : "−") : (value > 0 ? "+" + value : String(value).replace("-", "−"));
      return '<span class="tag ' + type + '">' + escapeHtml(attributeName(key)) + signedValue + "</span>";
    }).join("") + "</div>";
  }

  function statusPill(status) {
    const meta = statusMeta[status] || statusMeta.unknown;
    return '<span class="status-pill ' + meta.className + '">' + meta.label + "</span>";
  }

  function navigate(route, updateHash) {
    if (!routeMeta[route]) route = "overview";
    state.route = route;
    document.querySelectorAll(".page").forEach(function (page) {
      page.classList.toggle("active", page.dataset.page === route);
    });
    document.querySelectorAll(".nav-item").forEach(function (button) {
      button.classList.toggle("active", button.dataset.route === route);
    });
    refs.pageTitle.textContent = routeMeta[route].title;
    refs.pageEyebrow.textContent = routeMeta[route].eyebrow;
    refs.sidebar.classList.remove("open");
    refs.sidebarBackdrop.classList.remove("open");
    if (updateHash !== false && window.location.hash !== "#" + route) {
      history.replaceState(null, "", "#" + route);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderOverview() {
    const timeline = data.awards
      .filter(function (award) { return award.primary || award.category === "票选"; })
      .sort(function (a, b) { return a.month - b.month; });
    document.getElementById("overview-awards").innerHTML = '<div class="award-list">' + timeline.map(function (award) {
      return '<div class="award-timeline-row">' +
        '<div class="month">' + award.month + '<small>月</small></div>' +
        '<div><b>' + escapeHtml(award.name) + '</b><span>' + escapeHtml(award.date) + '</span></div>' +
        (award.primary ? "<em>三大主奖</em>" : "<em>票选</em>") +
      "</div>";
    }).join("") + "</div>";
    document.getElementById("overview-plan-state").textContent = data.planner.eligibleActivityCount;
  }

  function filterMenu(label, name, options, selected) {
    return '<details class="filter-menu" data-filter-menu>' +
      '<summary><span>' + escapeHtml(label) + '</span><small>' + (selected.length ? selected.length + " 项" : "全部") + '</small><i data-lucide="chevron-down"></i></summary>' +
      '<div class="filter-menu-panel">' + options.map(function (option) {
        const value = typeof option === "string" ? option : option.value;
        const text = typeof option === "string" ? option : option.label;
        return '<label><input type="checkbox" name="' + escapeHtml(name) + '" value="' + escapeHtml(value) + '" ' + (selected.includes(String(value)) ? "checked" : "") + '><span>' + escapeHtml(text) + "</span></label>";
      }).join("") + "</div></details>";
  }

  function toolbarHtml(kind) {
    const current = state.filters[kind];
    const searchPlaceholder = kind === "awards" ? "搜索奖项、规则或属性" : kind === "jobs" ? "搜索打工、条件或属性" : "搜索课程或属性";
    let controls = "";
    if (kind === "awards") {
      controls = filterMenu("类别", "categories", ["广告/模特", "音乐", "电影", "票选"], current.categories) +
        filterMenu("月份", "months", [3, 5, 10, 11, 12].map(function (month) { return { value: month, label: month + " 月" }; }), current.months) +
        filterMenu("关联属性", "attributes", Object.keys(data.attributes).map(function (key) { return { value: key, label: attributeName(key) }; }), current.attributes);
    } else if (kind === "jobs") {
      controls = filterMenu("关联属性", "attributes", Object.keys(data.attributes).map(function (key) { return { value: key, label: attributeName(key) }; }), current.attributes) +
        '<select class="filter-select" name="direction" aria-label="属性方向"><option value="any">增益或减益</option><option value="gain" ' + (current.direction === "gain" ? "selected" : "") + '>仅增益</option><option value="loss" ' + (current.direction === "loss" ? "selected" : "") + '>仅减益</option></select>' +
        filterMenu("解锁阶段", "stages", ["初始可用", "属性门槛"], current.stages);
    } else {
      controls = filterMenu("增益属性", "gains", Object.keys(data.attributes).map(function (key) { return { value: key, label: attributeName(key) }; }), current.gains) +
        filterMenu("减益属性", "losses", Object.keys(data.attributes).map(function (key) { return { value: key, label: attributeName(key) }; }), current.losses);
    }
    return '<div class="library-toolbar" data-toolbar-kind="' + kind + '">' +
      '<div class="filter-row ' + kind + '">' +
        '<label class="search-field"><i data-lucide="search"></i><input type="search" name="query" value="' + escapeHtml(current.query) + '" placeholder="' + searchPlaceholder + '" aria-label="' + searchPlaceholder + '"></label>' +
        controls +
        '<div class="filter-actions"><button class="filter-button" type="button" data-reset-filter><i data-lucide="rotate-ccw"></i>重置</button><button class="filter-button primary" type="button" data-apply-filter><i data-lucide="list-filter"></i>应用</button></div>' +
      '</div><div class="filter-summary" data-filter-summary></div></div>';
  }

  function collectChecked(container, name) {
    return Array.from(container.querySelectorAll('input[name="' + name + '"]:checked')).map(function (input) { return input.value; });
  }

  function readToolbar(kind) {
    const container = document.querySelector('[data-toolbar-kind="' + kind + '"]');
    const query = container.querySelector('input[name="query"]').value.trim();
    if (kind === "awards") {
      return { query: query, categories: collectChecked(container, "categories"), months: collectChecked(container, "months"), attributes: collectChecked(container, "attributes") };
    }
    if (kind === "jobs") {
      return { query: query, attributes: collectChecked(container, "attributes"), direction: container.querySelector('select[name="direction"]').value, stages: collectChecked(container, "stages") };
    }
    return { query: query, gains: collectChecked(container, "gains"), losses: collectChecked(container, "losses") };
  }

  function activeFilterLabels(kind) {
    const current = state.filters[kind];
    const labels = [];
    if (current.query) labels.push("关键词：" + current.query);
    if (kind === "awards") {
      current.categories.forEach(function (value) { labels.push(value); });
      current.months.forEach(function (value) { labels.push(value + " 月"); });
      current.attributes.forEach(function (value) { labels.push(attributeName(value)); });
    } else if (kind === "jobs") {
      current.attributes.forEach(function (value) { labels.push(attributeName(value)); });
      if (current.direction !== "any") labels.push(current.direction === "gain" ? "仅增益" : "仅减益");
      current.stages.forEach(function (value) { labels.push(value); });
    } else {
      current.gains.forEach(function (value) { labels.push("增益 " + attributeName(value)); });
      current.losses.forEach(function (value) { labels.push("减益 " + attributeName(value)); });
    }
    return labels;
  }

  function matchQuery(item, query) {
    if (!query) return true;
    const attrText = (item.attributes || []).concat(item.increase || [], item.decrease || []).map(attributeName).join(" ");
    const text = [item.name, item.category, item.qualification, item.shortlist, item.winner, item.unlock, attrText].join(" ");
    return normalize(text).includes(normalize(query));
  }

  function getFiltered(kind) {
    const filters = state.filters[kind];
    let rows;
    if (kind === "awards") {
      rows = data.awards.filter(function (item) {
        return matchQuery(item, filters.query) &&
          (!filters.categories.length || filters.categories.includes(item.category)) &&
          (!filters.months.length || filters.months.includes(String(item.month))) &&
          (!filters.attributes.length || filters.attributes.some(function (key) { return item.attributes.includes(key); }));
      });
    } else if (kind === "jobs") {
      rows = data.jobs.filter(function (item) {
        const attrMatch = !filters.attributes.length || filters.attributes.some(function (key) {
          if (filters.direction === "gain") return item.increase.includes(key);
          if (filters.direction === "loss") return item.decrease.includes(key);
          return item.increase.includes(key) || item.decrease.includes(key);
        });
        return matchQuery(item, filters.query) && attrMatch && (!filters.stages.length || filters.stages.includes(item.unlockStage));
      });
    } else {
      rows = data.trainings.filter(function (item) {
        return matchQuery(item, filters.query) &&
          (!filters.gains.length || filters.gains.some(function (key) { return item.increase.includes(key); })) &&
          (!filters.losses.length || filters.losses.some(function (key) { return item.decrease.includes(key); }));
      });
    }
    return sortRows(kind, rows);
  }

  function sortRows(kind, rows) {
    const sort = state.sort[kind];
    if (!sort.key || !sort.direction) return rows.slice();
    const direction = sort.direction === "asc" ? 1 : -1;
    return rows.slice().sort(function (a, b) {
      let av;
      let bv;
      if (sort.key === "month") { av = a.month; bv = b.month; }
      if (sort.key === "income") { av = a.income; bv = b.income; }
      if (sort.key === "gain") { av = a.increase.length; bv = b.increase.length; }
      if (sort.key === "cost") { av = a.cost; bv = b.cost; }
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return (av - bv) * direction;
    });
  }

  function sortButton(kind, key, label) {
    const sort = state.sort[kind];
    const icon = sort.key === key && sort.direction === "asc" ? "arrow-up" : sort.key === key && sort.direction === "desc" ? "arrow-down" : "arrow-up-down";
    return '<button class="sortable" type="button" data-sort-kind="' + kind + '" data-sort-key="' + key + '">' + label + '<i data-lucide="' + icon + '"></i></button>';
  }

  function renderFilterSummary(kind, count) {
    const container = document.querySelector('[data-toolbar-kind="' + kind + '"] [data-filter-summary]');
    const labels = activeFilterLabels(kind);
    container.innerHTML = '<strong>' + count + ' 条结果</strong>' + (labels.length ? labels.map(function (label) { return '<span class="applied-chip">' + escapeHtml(label) + "</span>"; }).join("") : "<span>未应用筛选条件</span>");
  }

  function renderTable(kind) {
    const rows = getFiltered(kind);
    const target = document.getElementById(kind === "awards" ? "award-results" : kind === "jobs" ? "job-results" : "training-results");
    renderFilterSummary(kind, rows.length);
    if (!rows.length) {
      target.innerHTML = '<div class="empty-results"><div><i data-lucide="search-x"></i><h3>没有匹配资料</h3><p>当前条件组合没有结果。</p><button class="secondary-button" type="button" data-empty-reset="' + kind + '">重置筛选</button></div></div>';
      iconRefresh();
      return;
    }
    let head;
    let body;
    if (kind === "awards") {
      head = '<tr><th>奖项名称</th><th>类别</th><th>' + sortButton(kind, "month", "固定日期") + '</th><th>入围摘要</th><th>关联属性</th><th>置信等级</th></tr>';
      body = rows.map(function (item) {
        return '<tr tabindex="0" data-kind="award" data-item-id="' + item.id + '"><td><div class="name-cell"><span class="row-icon award"><i data-lucide="' + item.icon + '"></i></span><span><b>' + item.name + '</b><small>' + (item.primary ? "三大主奖" : "相关奖项") + '</small></span></div></td><td>' + item.category + '</td><td>' + item.date + '</td><td>' + escapeHtml(item.shortlist) + '</td><td>' + tags(item.attributes, "neutral", 3) + '</td><td>' + statusPill(item.status) + '</td></tr>';
      }).join("");
    } else if (kind === "jobs") {
      head = '<tr><th>打工名称</th><th>解锁阶段</th><th>解锁摘要</th><th>' + sortButton(kind, "income", "薪资") + '</th><th>' + sortButton(kind, "gain", "主要增益") + '</th><th>主要减益</th><th>置信等级</th></tr>';
      body = rows.map(function (item) {
        return '<tr tabindex="0" data-kind="job" data-item-id="' + item.id + '"><td><div class="name-cell"><span class="row-icon job"><i data-lucide="' + item.icon + '"></i></span><span><b>' + item.name + '</b><small>能力加权 ' + item.abilityWeight + '</small></span></div></td><td>' + item.unlockStage + '</td><td>' + escapeHtml(item.unlock) + '</td><td><b>' + money(item.income) + '</b></td><td>' + effectTags(item, "gain", 4) + '</td><td>' + effectTags(item, "loss", 4) + '</td><td>' + statusPill(item.status) + '</td></tr>';
      }).join("");
    } else {
      head = '<tr><th>训练名称</th><th>' + sortButton(kind, "cost", "费用") + '</th><th>' + sortButton(kind, "gain", "主要增益") + '</th><th>主要减益</th><th>等级/阶段</th><th>置信等级</th></tr>';
      body = rows.map(function (item) {
        return '<tr tabindex="0" data-kind="training" data-item-id="' + item.id + '"><td><div class="name-cell"><span class="row-icon training"><i data-lucide="' + item.icon + '"></i></span><span><b>' + item.name + '</b><small>DOS 原版课程</small></span></div></td><td><b>' + money(item.cost) + '</b></td><td>' + tags(item.increase, "gain", 3) + '</td><td>' + tags(item.decrease, "loss", 3) + '</td><td>初 / 中 / 高 / 特</td><td>' + statusPill(item.status) + '</td></tr>';
      }).join("");
    }
    target.innerHTML = '<div class="table-shell"><div class="data-table-wrap"><table class="data-table"><thead>' + head + '</thead><tbody>' + body + "</tbody></table></div></div>";
    iconRefresh();
  }

  function renderLibrary(kind) {
    const toolbar = document.getElementById(kind === "awards" ? "award-toolbar" : kind === "jobs" ? "job-toolbar" : "training-toolbar");
    toolbar.innerHTML = toolbarHtml(kind);
    renderTable(kind);
    iconRefresh();
  }

  function resetFilters(kind) {
    state.sort[kind] = { key: null, direction: null };
    if (kind === "awards") state.filters.awards = { query: "", categories: [], months: [], attributes: [] };
    if (kind === "jobs") state.filters.jobs = { query: "", attributes: [], direction: "any", stages: [] };
    if (kind === "trainings") state.filters.trainings = { query: "", gains: [], losses: [] };
    renderLibrary(kind);
  }

  function cycleSort(kind, key) {
    const current = state.sort[kind];
    if (current.key !== key || !current.direction) state.sort[kind] = { key: key, direction: "asc" };
    else if (current.direction === "asc") state.sort[kind] = { key: key, direction: "desc" };
    else state.sort[kind] = { key: null, direction: null };
    renderTable(kind);
  }

  function findItem(kind, id) {
    if (kind === "award") return data.awards.find(function (item) { return item.id === id; });
    if (kind === "job") return data.jobs.find(function (item) { return item.id === id; });
    return data.trainings.find(function (item) { return item.id === id; });
  }

  function sourceHtml(item) {
    return item.sourceRefs.map(function (sourceId) {
      const source = data.sources[sourceId];
      if (!source) return "";
      return '<article class="source-item"><span>' + escapeHtml(source.type) + '</span><h3>' + escapeHtml(source.title) + '</h3><p>' + escapeHtml(source.note) + '</p>' +
        (source.url ? '<a href="' + escapeHtml(source.url) + '" target="_blank" rel="noreferrer">查看原始来源<i data-lucide="external-link"></i></a>' : "") + "</article>";
    }).join("");
  }

  function exactMatrix(exact, evidenceLabel, increase, decrease) {
    const keys = Object.keys(data.attributes);
    return '<table class="matrix-table"><thead><tr><th>属性</th><th>方向/基础值</th><th>证据</th></tr></thead><tbody>' + keys.map(function (key) {
      let value = "—";
      let evidence = "无变化资料";
      if (exact && Object.prototype.hasOwnProperty.call(exact, key)) {
        const exactValue = exact[key];
        value = exactValue > 0 ? "+" + exactValue : String(exactValue).replace("-", "−");
        evidence = evidenceLabel;
      } else if ((increase || []).includes(key)) {
        value = "+ 方向已知";
        evidence = "官方说明书";
      } else if ((decrease || []).includes(key)) {
        value = "− 方向已知";
        evidence = "官方说明书";
      }
      return "<tr><td>" + attributeName(key) + "</td><td>" + value + "</td><td>" + evidence + "</td></tr>";
    }).join("") + "</tbody></table>";
  }

  function activityMatrix(item) {
    let content = exactMatrix(item.exact, item.exactEvidence || "单一玩家实测", item.increase, item.decrease);
    (item.variants || []).forEach(function (variant) {
      content += '<section class="detail-section variant-matrix"><h3>' + escapeHtml(variant.name) + '变体</h3><p>触发条件：' + escapeHtml(variant.requirement) + '；能力加权 ' + variant.abilityWeight + '。</p>' + exactMatrix(variant.exact, item.exactEvidence || "单一玩家实测", [], []) + '</section>';
    });
    return content;
  }

  function drawerContent() {
    const context = state.drawer;
    if (!context) return "";
    const item = context.item;
    const tab = state.activeTab;
    if (tab === "sources") {
      return '<section class="detail-section"><h3>证据记录</h3>' + sourceHtml(item) + '</section><section class="detail-section"><h3>当前准入</h3><p>' + escapeHtml((statusMeta[item.status] || statusMeta.unknown).description) + '</p></section>';
    }
    if (context.kind === "award") {
      if (tab === "profile") {
        return '<section class="detail-section"><div class="detail-grid">' +
          '<div class="detail-field"><small>奖项类别</small><b>' + item.category + '</b></div>' +
          '<div class="detail-field"><small>固定日期</small><b>' + item.date + '</b></div>' +
          '<div class="detail-field"><small>三大主奖</small><b>' + (item.primary ? "是" : "否") + '</b></div>' +
          '<div class="detail-field"><small>证据状态</small><b>' + (statusMeta[item.status] || statusMeta.unknown).label + '</b></div>' +
          '</div></section><section class="detail-section"><h3>关联属性</h3>' + tags(item.attributes, "neutral") + '</section>';
      }
      return '<section class="detail-section"><h3>赛事规则</h3><ul class="rule-list"><li><b>参赛资格</b><br>' + escapeHtml(item.qualification) + '</li><li><b>入围规则</b><br>' + escapeHtml(item.shortlist) + '</li><li><b>获奖判定</b><br>' + escapeHtml(item.winner) + '</li></ul></section><section class="detail-section"><h3>边界</h3><p>未公开的权重、阈值和优先级保持待验证，不用于概率预测。</p></section>';
    }
    if (tab === "profile") {
      const unit = context.kind === "job" ? "薪资" : "费用";
      const amount = context.kind === "job" ? money(item.income) : money(item.cost);
      return '<section class="detail-section"><div class="detail-grid">' +
        '<div class="detail-field"><small>类型</small><b>' + (context.kind === "job" ? "打工" : "训练") + '</b></div>' +
        '<div class="detail-field"><small>' + unit + '</small><b>' + amount + '</b></div>' +
        '<div class="detail-field"><small>解锁阶段</small><b>' + item.unlockStage + '</b></div>' +
        (context.kind === "job" ? '<div class="detail-field"><small>能力加权</small><b>' + item.abilityWeight + '</b></div>' : '') +
        '<div class="detail-field"><small>计算准入</small><b>暂不可用</b></div>' +
        '</div></section><section class="detail-section"><h3>解锁与阶段</h3><p>' + escapeHtml(item.unlock) + '</p></section><section class="detail-section"><h3>主要变化</h3>' + effectTags(item, "gain") + effectTags(item, "loss") + '</section>';
    }
    const calculationBoundary = context.kind === "job"
      ? "打工精确表已经录入；在目标构建完成重复实测前，仍不进入规划器。"
      : "基础值、资金、压力、耗时和上限未完成重复实测前，不进入规划器。";
    return '<section class="detail-section"><h3>单次属性矩阵</h3>' + activityMatrix(item) + '</section><section class="detail-section"><h3>计算边界</h3><ul class="rule-list"><li>' + calculationBoundary + '</li>' +
      (item.tierMultipliers ? '<li>单一来源报告的训练等级倍率为 1 / 2 / 3 / 4，当前仅作复测候选。</li>' : "") +
      '<li>方向标签不等于固定数值，随机或状态影响仍需单独校准。</li></ul></section>';
  }

  function openDrawer(kind, id) {
    const item = findItem(kind, id);
    if (!item) return;
    state.drawer = { kind: kind, item: item };
    state.activeTab = "profile";
    refs.drawerTitle.textContent = item.name;
    refs.drawerKicker.textContent = kind === "award" ? item.category : kind === "job" ? "打工资料" : "训练资料";
    refs.drawerIcon.className = "drawer-icon " + kind;
    refs.drawerIcon.innerHTML = '<i data-lucide="' + item.icon + '"></i>';
    document.querySelectorAll(".drawer-tabs button").forEach(function (button) { button.classList.toggle("active", button.dataset.tab === "profile"); });
    refs.drawerBody.innerHTML = drawerContent();
    refs.drawer.classList.add("open");
    refs.drawer.setAttribute("aria-hidden", "false");
    refs.drawerBackdrop.classList.add("open");
    document.body.style.overflow = "hidden";
    iconRefresh();
  }

  function closeDrawer() {
    refs.drawer.classList.remove("open");
    refs.drawer.setAttribute("aria-hidden", "true");
    refs.drawerBackdrop.classList.remove("open");
    document.body.style.overflow = "";
    state.drawer = null;
  }

  function setDrawerTab(tab) {
    state.activeTab = tab;
    document.querySelectorAll(".drawer-tabs button").forEach(function (button) { button.classList.toggle("active", button.dataset.tab === tab); });
    refs.drawerBody.innerHTML = drawerContent();
    refs.drawerBody.scrollTop = 0;
    iconRefresh();
  }

  function plannerAttributes() {
    return Object.keys(data.attributes).filter(function (key) { return key !== "pressure"; });
  }

  function renderPlannerForm() {
    document.getElementById("planner-status-message").textContent = data.planner.message;
    document.getElementById("attribute-editor").innerHTML = plannerAttributes().map(function (key) {
      return '<label class="attribute-row"><span>' + attributeName(key) + '</span><input type="number" min="0" max="999" step="1" name="current.' + key + '" value="100" aria-label="' + attributeName(key) + '当前值"><i>→</i><input type="number" min="0" max="999" step="1" name="target.' + key + '" value="100" aria-label="' + attributeName(key) + '目标值"></label>';
    }).join("");

    const allActivities = data.jobs.concat(data.trainings);
    document.getElementById("planner-activities").innerHTML = allActivities.map(function (item) {
      return '<label class="activity-option"><input type="checkbox" name="activity" value="' + item.id + '" ' + (item.calculationEligible ? "" : "disabled") + '><b>' + item.name + '</b><small>' + (item.calculationEligible ? "可计算" : "校准中") + '</small></label>';
    }).join("");
    restorePlanner();
  }

  function plannerSnapshot() {
    const formData = new FormData(refs.plannerForm);
    const attrs = {};
    plannerAttributes().forEach(function (key) {
      attrs[key] = {
        current: Number(formData.get("current." + key) || 0),
        target: Number(formData.get("target." + key) || 0)
      };
    });
    return {
      dataVersion: data.version,
      savedAt: new Date().toISOString(),
      year: Number(formData.get("year") || 1995),
      month: Number(formData.get("month") || 1),
      day: Number(formData.get("day") || 1),
      funds: Number(formData.get("funds") || 0),
      pressure: Number(formData.get("pressure") || 0),
      pressureLimit: Number(formData.get("pressureLimit") || 80),
      strategy: formData.get("strategy") || "fastest",
      activities: formData.getAll("activity"),
      attributes: attrs
    };
  }

  function savePlanner(snapshot, result) {
    try {
      localStorage.setItem("stardomGuide.latestPlan", JSON.stringify({ input: snapshot, result: result || null }));
      refs.saveState.innerHTML = '<i data-lucide="check"></i>已保存到当前浏览器';
      refs.saveState.style.color = "var(--accent-dark)";
      updateLastPlan(snapshot);
    } catch (error) {
      refs.saveState.innerHTML = '<i data-lucide="triangle-alert"></i>本地保存不可用';
      refs.saveState.style.color = "var(--danger)";
    }
    iconRefresh();
  }

  function restorePlanner() {
    try {
      const saved = JSON.parse(localStorage.getItem("stardomGuide.latestPlan") || "null");
      if (!saved || !saved.input) return;
      const input = saved.input;
      ["year", "month", "day", "funds", "pressure", "pressureLimit"].forEach(function (name) {
        const field = refs.plannerForm.elements[name];
        if (field && input[name] != null) field.value = input[name];
      });
      const strategy = refs.plannerForm.querySelector('input[name="strategy"][value="' + input.strategy + '"]');
      if (strategy) strategy.checked = true;
      plannerAttributes().forEach(function (key) {
        if (!input.attributes || !input.attributes[key]) return;
        refs.plannerForm.elements["current." + key].value = input.attributes[key].current;
        refs.plannerForm.elements["target." + key].value = input.attributes[key].target;
      });
      document.getElementById("pressure-limit-value").textContent = input.pressureLimit || 80;
      updateLastPlan(input);
      if (saved.result) renderPlannerResult(saved.result);
    } catch (error) {
      refs.saveState.textContent = "本地方案读取失败";
    }
  }

  function updateLastPlan(input) {
    const container = document.getElementById("last-plan-summary");
    if (!input) return;
    const targets = Object.keys(input.attributes || {}).filter(function (key) { return input.attributes[key].target > input.attributes[key].current; });
    const strategyNames = { fastest: "最快达标", cheapest: "最低花费", balanced: "均衡" };
    container.textContent = targets.length
      ? input.year + " 年 " + input.month + " 月 " + input.day + " 日 · " + strategyNames[input.strategy] + " · " + targets.map(attributeName).join("、")
      : input.year + " 年 " + input.month + " 月 " + input.day + " 日 · 尚未设置提高目标";
  }

  function renderPlannerResult(result) {
    const strategyNames = { fastest: "最快达标", cheapest: "最低花费", balanced: "均衡" };
    refs.plannerOutput.innerHTML = '<div class="unreachable-plan"><div class="result-header"><span class="empty-illustration"><i data-lucide="circle-slash-2"></i></span><div><p class="empty-kicker">当前不可计算</p><h3>' + escapeHtml(result.title) + '</h3><p>' + escapeHtml(strategyNames[result.strategy] || "均衡") + ' · 数据版本 ' + data.version + '</p></div></div><div class="diagnostic-list">' + result.diagnostics.map(function (diagnostic) {
      return '<div class="diagnostic-item"><i data-lucide="' + diagnostic.icon + '"></i><div><b>' + escapeHtml(diagnostic.title) + '</b><span>' + escapeHtml(diagnostic.text) + '</span></div></div>';
    }).join("") + '</div></div>';
    iconRefresh();
  }

  function generatePlannerResult(snapshot) {
    const targets = Object.keys(snapshot.attributes).filter(function (key) { return snapshot.attributes[key].target > snapshot.attributes[key].current; });
    if (!targets.length) {
      return {
        title: "尚未设置需要提高的属性",
        strategy: snapshot.strategy,
        diagnostics: [
          { icon: "target", title: "目标为空", text: "至少需要一项目标值高于当前值。" },
          { icon: "save", title: "当前状态已保留", text: "资金、压力和属性输入已保存。" }
        ]
      };
    }
    if (!data.planner.eligibleActivityCount) {
      return {
        title: "缺少达到准入门槛的活动",
        strategy: snapshot.strategy,
        diagnostics: [
          { icon: "flask-conical", title: "23 项活动仍在校准", text: "官方资料只确认多数属性方向，尚不足以生成精确次数。" },
          { icon: "shield-alert", title: "已阻止伪精确方案", text: "单一玩家实测和方向性数据不会进入自动计算。" },
          { icon: "list-checks", title: "当前目标已保存", text: "目标属性：" + targets.map(attributeName).join("、") + "。数据升级后可重新计算。" }
        ]
      };
    }
    return {
      title: "所选活动无法覆盖全部目标",
      strategy: snapshot.strategy,
      diagnostics: [{ icon: "route-off", title: "活动覆盖不足", text: "增加已解锁课程或降低目标后重新计算。" }]
    };
  }

  function bindEvents() {
    document.addEventListener("click", function (event) {
      const nav = event.target.closest("[data-route]");
      if (nav) navigate(nav.dataset.route);
      const jump = event.target.closest("[data-route-jump]");
      if (jump) navigate(jump.dataset.routeJump);

      const apply = event.target.closest("[data-apply-filter]");
      if (apply) {
        const kind = apply.closest("[data-toolbar-kind]").dataset.toolbarKind;
        state.filters[kind] = readToolbar(kind);
        apply.closest("[data-toolbar-kind]").querySelectorAll("details").forEach(function (details) { details.open = false; });
        renderLibrary(kind);
      }
      const reset = event.target.closest("[data-reset-filter]");
      if (reset) resetFilters(reset.closest("[data-toolbar-kind]").dataset.toolbarKind);
      const emptyReset = event.target.closest("[data-empty-reset]");
      if (emptyReset) resetFilters(emptyReset.dataset.emptyReset);
      const sort = event.target.closest("[data-sort-kind]");
      if (sort) cycleSort(sort.dataset.sortKind, sort.dataset.sortKey);

      const row = event.target.closest("tr[data-item-id]");
      if (row) openDrawer(row.dataset.kind, row.dataset.itemId);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        if (refs.drawer.classList.contains("open")) closeDrawer();
        else {
          refs.sidebar.classList.remove("open");
          refs.sidebarBackdrop.classList.remove("open");
        }
      }
      if (event.key === "Enter") {
        const row = event.target.closest("tr[data-item-id]");
        if (row) openDrawer(row.dataset.kind, row.dataset.itemId);
        const toolbar = event.target.closest("[data-toolbar-kind]");
        if (toolbar && event.target.matches('input[type="search"]')) {
          event.preventDefault();
          const kind = toolbar.dataset.toolbarKind;
          state.filters[kind] = readToolbar(kind);
          renderLibrary(kind);
        }
      }
    });

    refs.menuButton.addEventListener("click", function () {
      refs.sidebar.classList.add("open");
      refs.sidebarBackdrop.classList.add("open");
    });
    refs.sidebarBackdrop.addEventListener("click", function () {
      refs.sidebar.classList.remove("open");
      refs.sidebarBackdrop.classList.remove("open");
    });
    document.getElementById("drawer-close").addEventListener("click", closeDrawer);
    refs.drawerBackdrop.addEventListener("click", closeDrawer);
    document.querySelectorAll(".drawer-tabs button").forEach(function (button) {
      button.addEventListener("click", function () { setDrawerTab(button.dataset.tab); });
    });

    refs.plannerForm.addEventListener("input", function (event) {
      if (event.target.name === "pressureLimit") document.getElementById("pressure-limit-value").textContent = event.target.value;
      savePlanner(plannerSnapshot(), null);
    });
    refs.plannerForm.addEventListener("change", function () { savePlanner(plannerSnapshot(), null); });
    refs.plannerForm.addEventListener("submit", function (event) {
      event.preventDefault();
      const snapshot = plannerSnapshot();
      const result = generatePlannerResult(snapshot);
      renderPlannerResult(result);
      savePlanner(snapshot, result);
    });

    window.addEventListener("hashchange", function () { navigate(window.location.hash.replace("#", ""), false); });
  }

  function initialize() {
    document.getElementById("header-version").textContent = data.version;
    document.getElementById("header-updated").textContent = data.updatedAt;
    document.getElementById("sidebar-version").textContent = "数据版本 " + data.version;
    document.getElementById("nav-award-count").textContent = data.awards.length;
    document.getElementById("nav-job-count").textContent = data.jobs.length;
    document.getElementById("nav-training-count").textContent = data.trainings.length;
    renderOverview();
    renderLibrary("awards");
    renderLibrary("jobs");
    renderLibrary("trainings");
    renderPlannerForm();
    bindEvents();
    navigate(window.location.hash.replace("#", "") || "overview", false);
    iconRefresh();
  }

  initialize();
})();
