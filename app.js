(function () {
  "use strict";

  const data = window.STARDOM_DATA;
  const routeMeta = {
    overview: { title: "资料总览", eyebrow: "DOS 原版资料" },
    attributes: { title: "属性查询", eyebrow: "打工与训练合并比较" },
    awards: { title: "奖项资料库", eyebrow: "赛事与判定" },
    jobs: { title: "打工资料库", eyebrow: "工作与属性变化" },
    trainings: { title: "训练资料库", eyebrow: "课程与成长方向" },
    planner: { title: "养成规划", eyebrow: "单艺人周计划" },
    schedule: { title: "档期计算", eyebrow: "通告冲突与违约风险" }
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
      trainings: { query: "", gains: [], pressures: [] }
    },
    sort: {
      awards: { key: null, direction: null },
      jobs: { key: null, direction: null },
      trainings: { key: null, direction: null }
    },
    explorer: { attribute: "acting", direction: "gain", type: "all" },
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
    saveState: document.getElementById("save-state"),
    scheduleForm: document.getElementById("schedule-form"),
    scheduleContractList: document.getElementById("schedule-contract-list"),
    scheduleOutput: document.getElementById("schedule-output"),
    scheduleWorkspace: document.getElementById("schedule-workspace"),
    scheduleArtistTabs: document.getElementById("schedule-artist-tabs"),
    scheduleAddArtist: document.getElementById("schedule-add-artist"),
    scheduleSaveState: document.getElementById("schedule-save-state"),
    scheduleSubmitLabel: document.getElementById("schedule-submit-label"),
    scheduleFormErrors: document.getElementById("schedule-form-errors")
  };
  const filterSearchTimers = {};
  let scheduleContractCounter = 0;
  let scheduleArtistCounter = 0;
  let scheduleWorkspaceState = null;
  let scheduleVisibleIssues = [];

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
    return effectTagsForKeys(item, keys, type, limit);
  }

  function effectTagsForKeys(item, keys, type, limit, emptyLabel) {
    const items = (keys || []).slice(0, limit || keys.length);
    if (!items.length) return '<span class="tag neutral">' + escapeHtml(emptyLabel || "无") + '</span>';
    return '<div class="tag-list">' + items.map(function (key) {
      const value = item.exact && item.exact[key];
      let signedValue = value == null ? (type === "gain" ? "+" : "−") : (value > 0 ? "+" + value : String(value).replace("-", "−"));
      if (value != null && item.tierMultipliers) {
        signedValue = item.tierMultipliers.map(function (multiplier) {
          const tierValue = value * multiplier;
          return tierValue > 0 ? "+" + tierValue : String(tierValue).replace("-", "−");
        }).join("/");
      }
      return '<span class="tag ' + type + '">' + escapeHtml(attributeName(key)) + " " + signedValue + "</span>";
    }).join("") + "</div>";
  }

  function growthLimitMarkup(item) {
    const limit = item.growthLimit || { status: "unverified", label: "未确认", note: "暂无独立成长上限数据。" };
    return '<div class="growth-limit-cell"><span class="growth-limit-status ' + escapeHtml(limit.status || "unverified") + '">' + escapeHtml(limit.label || "未确认") + '</span><small>' + escapeHtml(limit.note || "暂无独立成长上限数据。") + '</small></div>';
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
    document.getElementById("overview-plan-state").textContent = data.planner.estimateActivityCount;
  }

  function renderJobProgression() {
    const guide = data.companyProgression;
    const target = document.getElementById("job-progression-guide");
    if (!guide || !target) return;
    const methodList = function (items) {
      return '<ul>' + items.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join("") + '</ul>';
    };
    const sourceLinks = guide.sourceRefs.map(function (sourceId) {
      const source = data.sources[sourceId];
      if (!source || !source.url) return "";
      return '<a href="' + escapeHtml(source.url) + '" target="_blank" rel="noreferrer">' + escapeHtml(source.type) + '<i data-lucide="external-link"></i></a>';
    }).join("");
    const route = data.announcementProgression;
    const routeHtml = route ? '<section class="announcement-roadmap" aria-labelledby="announcement-roadmap-title">' +
      '<header class="job-progression-heading"><div><p>按硬门槛分层</p><h3 id="announcement-roadmap-title">' + escapeHtml(route.title) + '</h3></div><span><i data-lucide="milestone"></i>12 打工 + 212 正式合约</span></header>' +
      '<p class="job-progression-summary">' + escapeHtml(route.summary) + '</p>' +
      '<div class="roadmap-stage-grid">' + route.stages.map(function (stage) {
        return '<article class="roadmap-stage stage-' + stage.id + '"><div class="roadmap-stage-top"><span>' + escapeHtml(stage.name) + '</span><b>' + stage.unlocked + ' / ' + route.denominator + ' 打工</b></div><h4>' + escapeHtml(stage.target) + '</h4><div class="roadmap-meter"><i style="width:' + stage.coverage + '%"></i></div><p class="roadmap-coverage">打工覆盖 ' + stage.coverage + '% · ' + escapeHtml(stage.label) + '</p><p class="roadmap-formal-coverage">正式合约：' + escapeHtml(stage.formalCoverage) + '</p><ul>' + stage.focus.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('') + '</ul><small>' + escapeHtml(stage.note) + '</small></article>';
      }).join('') + '</div>' +
      '<div class="roadmap-notice-table"><div class="checkpoint-title"><span>日常打工门槛总表（12 项）</span><small>无门槛项目也列出，方便按阶段查缺口</small></div><div class="roadmap-table-wrap"><table><thead><tr><th>阶段</th><th>通告</th><th>属性门槛</th><th>收入</th></tr></thead><tbody>' + data.jobs.map(function (item) {
        const stage = !item.requirementAttribute ? "前期" : item.requirementValue >= 200 || item.requirementAttribute === "sexiness" ? "后期" : item.requirementValue >= 120 ? "中期" : "前期";
        return '<tr><td><span class="roadmap-stage-tag stage-tag-' + stage + '">' + stage + '</span></td><td><b>' + escapeHtml(item.name) + '</b></td><td>' + escapeHtml(item.requirement) + '</td><td>' + (item.income ? item.income.toLocaleString("zh-CN") + ' 元' : '无') + '</td></tr>';
      }).join('') + '</tbody></table></div></div>' +
      '<div class="roadmap-notice-table"><div class="checkpoint-title"><span>全部通告统计与属性需求基线</span><small>正式合约按四类各 53 项统计；数值未齐的部分明确标注</small></div><div class="roadmap-table-wrap"><table class="roadmap-catalog-table"><thead><tr><th>类别</th><th>数量</th><th>逐案数值</th><th>名气 200 / 属性需求结论</th><th>核验口径</th></tr></thead><tbody>' + route.fullCatalog.map(function (item) {
        return '<tr><td><b>' + escapeHtml(item.category) + '</b></td><td>' + item.count + '</td><td><span class="roadmap-stage-tag">' + escapeHtml(item.numericComplete) + '</span></td><td>' + escapeHtml(item.coverage) + '</td><td>' + escapeHtml(item.note) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>' +
      '<div class="roadmap-notice-table"><div class="checkpoint-title"><span>全通告属性需求基线</span><small>用于确定培养方向；逐案数值未齐时不输出虚假覆盖率</small></div><div class="roadmap-table-wrap"><table class="roadmap-catalog-table"><thead><tr><th>类别</th><th>主要属性要求</th><th>承接判定 / 覆盖口径</th></tr></thead><tbody>' + route.attributeBaseline.map(function (item) {
        return '<tr><td><b>' + escapeHtml(item.category) + '</b></td><td>' + escapeHtml(item.attributes) + '</td><td>' + escapeHtml(item.coverage) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>' +
      '<div class="roadmap-notice-table fame200-check"><div class="checkpoint-title"><span>名气 200 覆盖率校验</span><small>严格按“名气大于要求”计算，不把其它属性默认为满值</small></div><div class="roadmap-table-wrap"><table><thead><tr><th>口径</th><th>名气恰好 200</th><th>名气达到 201</th><th>结论</th></tr></thead><tbody><tr><td>12 项日常打工</td><td>' + route.fame200Check.jobsGuaranteed + '/12（' + route.fame200Check.jobsRate + '%）</td><td>' + route.fame200Check.jobsAt201 + '/12（' + route.fame200Check.jobsAt201Rate + '%）</td><td>200 不足以覆盖大部分；属性门槛仍需另外满足</td></tr><tr><td>212 项正式合约</td><td>' + route.fame200Check.formalGuaranteed + '/212（不可仅凭名气保证）</td><td>仍不可仅凭名气计算</td><td>唱片/电影看能力 80%；电视/广告还要通过组合公式</td></tr><tr><td>全部 224 项（打工 + 正式合约）</td><td>' + route.fame200Check.allGuaranteed + '/224（' + route.fame200Check.allRate + '%）</td><td>' + route.fame200Check.allAt201Guaranteed + '/224（' + route.fame200Check.allAt201Rate + '%）</td><td>这才是“全通告”名气单项保证率；实际承接率还会受属性、作品和公司状态影响</td></tr><tr><td>综艺（额外类别）</td><td>0</td><td>0</td><td>社区资料通常要求名气 &gt;300，即至少 301；不计入 212 项</td></tr></tbody></table></div></div>' +
      '<div class="roadmap-chain"><div class="checkpoint-title"><span>属性解锁链</span><small>达到阈值即可纳入对应候选池</small></div><div class="roadmap-chain-grid">' + route.chains.map(function (chain) { return '<div><b>' + escapeHtml(chain.attribute) + '</b>' + chain.steps.map(function (step) { return '<span>' + escapeHtml(step) + '</span>'; }).join('') + '</div>'; }).join('') + '</div></div>' +
      '<div class="roadmap-note"><i data-lucide="info"></i><div><b>非数值资格单独处理</b><ul>' + route.nonNumeric.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('') + '</ul></div></div>' +
      '</section>' : '';
    target.innerHTML = routeHtml + '<section class="job-progression" aria-labelledby="job-progression-title">' +
      '<header class="job-progression-heading"><div><p>公司属性与随机事件</p><h3 id="job-progression-title">' + escapeHtml(guide.title) + '</h3></div><span><i data-lucide="shield-check"></i>分级核验</span></header>' +
      '<p class="job-progression-summary">' + escapeHtml(guide.summary) + '</p>' +
      '<div class="job-progression-grid">' +
        '<article><div class="progression-label"><i data-lucide="building-2"></i><span>公司形象</span></div><h4>处理事务是稳定入口</h4>' + methodList(guide.imageMethods) + '</article>' +
        '<article><div class="progression-label"><i data-lucide="handshake"></i><span>公共关系</span></div><h4>关说单次增加 20</h4>' + methodList(guide.publicRelationsMethods) + '</article>' +
        '<article><div class="progression-label"><i data-lucide="map-pin"></i><span>眼镜男刷法</span></div><h4>随机出现，无固定星期</h4><p>' + escapeHtml(guide.npcGuide.confirmed) + '</p><div class="location-tags">' + guide.npcGuide.neutralLocations.map(function (location) { return '<span>' + escapeHtml(location) + '</span>'; }).join("") + '</div><small>' + escapeHtml(guide.npcGuide.communityTip) + '</small></article>' +
      '</div>' +
      '<div class="checkpoint-block"><div class="checkpoint-title"><span>玩家流程检查点</span><small>公司形象 / 公共关系</small></div><div class="checkpoint-grid">' + guide.checkpoints.map(function (checkpoint) {
        return '<div><b>' + escapeHtml(checkpoint.image) + ' / ' + escapeHtml(checkpoint.publicRelations) + '</b><span>' + escapeHtml(checkpoint.result) + '</span></div>';
      }).join("") + '</div></div>' +
      '<footer class="job-progression-note"><i data-lucide="flask-conical"></i><p><b>证据边界</b><span>' + escapeHtml(guide.caveat) + '</span></p><div>' + sourceLinks + '</div></footer>' +
    '</section>';
    iconRefresh();
  }

  function filterMenu(label, name, options, selected) {
    return '<details class="filter-menu" data-filter-menu data-filter-name="' + escapeHtml(name) + '">' +
      '<summary><span>' + escapeHtml(label) + '</span><small>' + (selected.length ? selected.length + " 项" : "全部") + '</small><i data-lucide="chevron-down"></i></summary>' +
      '<div class="filter-menu-panel">' + options.map(function (option) {
        const value = typeof option === "string" ? option : option.value;
        const text = typeof option === "string" ? option : option.label;
        return '<label><input type="checkbox" name="' + escapeHtml(name) + '" value="' + escapeHtml(value) + '" ' + (selected.includes(String(value)) ? "checked" : "") + '><span>' + escapeHtml(text) + "</span></label>";
      }).join("") + "</div></details>";
  }

  function attributeQuickFilter(label, name, selected) {
    return '<div class="attribute-quick-filter" data-attribute-filter="' + escapeHtml(name) + '">' +
      '<div class="attribute-quick-heading"><strong>' + escapeHtml(label) + '<small data-attribute-count>' + (selected.length ? selected.length + " 项" : "全部") + '</small></strong>' +
      '<button class="attribute-clear" type="button" data-clear-attribute-filter="' + escapeHtml(name) + '" title="清空属性筛选"><i data-lucide="x"></i><span>清空</span></button></div>' +
      '<div class="attribute-quick-options">' + Object.keys(data.attributes).map(function (key) {
        return '<label><input type="checkbox" name="' + escapeHtml(name) + '" value="' + escapeHtml(key) + '" ' + (selected.includes(key) ? "checked" : "") + '><span>' + escapeHtml(attributeName(key)) + '</span></label>';
      }).join("") + '</div></div>';
  }

  function toolbarHtml(kind) {
    const current = state.filters[kind];
    const searchPlaceholder = kind === "awards" ? "搜索奖项、规则或属性" : kind === "jobs" ? "搜索打工、条件或属性" : "搜索课程或属性";
    let controls = "";
    let attributes = "";
    if (kind === "awards") {
      controls = filterMenu("类别", "categories", ["广告/模特", "音乐", "电影", "票选"], current.categories) +
        filterMenu("月份", "months", [3, 5, 10, 11, 12].map(function (month) { return { value: month, label: month + " 月" }; }), current.months);
      attributes = attributeQuickFilter("关联属性", "attributes", current.attributes);
    } else if (kind === "jobs") {
      controls = '<select class="filter-select" name="direction" aria-label="属性方向"><option value="any">增益或减益</option><option value="gain" ' + (current.direction === "gain" ? "selected" : "") + '>仅增益</option><option value="loss" ' + (current.direction === "loss" ? "selected" : "") + '>仅减益</option></select>' +
        filterMenu("解锁阶段", "stages", ["初始可用", "属性门槛"], current.stages);
      attributes = attributeQuickFilter("属性变化", "attributes", current.attributes);
    } else {
      controls = filterMenu("压力基础值", "pressures", [1, 2, 3].map(function (value) { return { value: value, label: "+" + value + "（初级）" }; }), current.pressures);
      attributes = attributeQuickFilter("增益属性", "gains", current.gains);
    }
    return '<div class="library-toolbar" data-toolbar-kind="' + kind + '">' +
      '<div class="filter-row ' + kind + '">' +
        '<label class="search-field"><i data-lucide="search"></i><input type="search" name="query" value="' + escapeHtml(current.query) + '" placeholder="' + searchPlaceholder + '" aria-label="' + searchPlaceholder + '"></label>' +
        controls +
        '<div class="filter-actions"><button class="filter-button" type="button" data-reset-filter><i data-lucide="rotate-ccw"></i>重置</button></div>' +
      '</div>' + attributes + '<div class="filter-summary" data-filter-summary></div></div>';
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
    return { query: query, gains: collectChecked(container, "gains"), pressures: collectChecked(container, "pressures") };
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
      current.pressures.forEach(function (value) { labels.push("初级压力 +" + value); });
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
          (!filters.pressures.length || (item.exact && filters.pressures.includes(String(item.exact.pressure))));
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
      if (sort.key === "pressure") { av = a.exact && a.exact.pressure; bv = b.exact && b.exact.pressure; }
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
      head = '<tr><th>打工名称</th><th>解锁阶段</th><th>解锁摘要</th><th>' + sortButton(kind, "income", "薪资") + '</th><th>' + sortButton(kind, "gain", "主要增益") + '</th><th>可提升属性上限</th><th>主要减益</th><th>置信等级</th></tr>';
      body = rows.map(function (item) {
        return '<tr tabindex="0" data-kind="job" data-item-id="' + item.id + '"><td><div class="name-cell"><span class="row-icon job"><i data-lucide="' + item.icon + '"></i></span><span><b>' + item.name + '</b><small>能力加权 ' + item.abilityWeight + '</small></span></div></td><td>' + item.unlockStage + '</td><td>' + escapeHtml(item.unlock) + '</td><td><b>' + money(item.income) + '</b></td><td>' + effectTags(item, "gain", 4) + '</td><td>' + growthLimitMarkup(item) + '</td><td>' + effectTags(item, "loss", 4) + '</td><td>' + statusPill(item.status) + '</td></tr>';
      }).join("");
    } else {
      head = '<tr><th>训练名称</th><th>' + sortButton(kind, "cost", "费用") + '</th><th>属性提升</th><th>' + sortButton(kind, "pressure", "压力增加") + '</th><th>等级/阶段</th><th>置信等级</th></tr>';
      body = rows.map(function (item) {
        const coreAttributes = item.increase.filter(function (key) { return key !== "pressure"; });
        const pressureAttributes = item.increase.includes("pressure") ? ["pressure"] : [];
        const emptyLabel = item.exact ? "无" : "未确认";
        return '<tr tabindex="0" data-kind="training" data-item-id="' + item.id + '"><td><div class="name-cell"><span class="row-icon training"><i data-lucide="' + item.icon + '"></i></span><span><b>' + item.name + '</b><small>DOS 原版课程</small></span></div></td><td><b>' + money(item.cost) + '</b></td><td>' + effectTagsForKeys(item, coreAttributes, "gain", 2, emptyLabel) + '</td><td>' + effectTagsForKeys(item, pressureAttributes, "loss", 1, emptyLabel) + '</td><td>初 / 中 / 高 / 特</td><td>' + statusPill(item.status) + '</td></tr>';
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

  function updateToolbarControlMeta(toolbar) {
    toolbar.querySelectorAll("[data-filter-name]").forEach(function (details) {
      const name = details.dataset.filterName;
      const count = details.querySelectorAll('input[name="' + name + '"]:checked').length;
      const summary = details.querySelector("summary small");
      if (summary) summary.textContent = count ? count + " 项" : "全部";
    });
    toolbar.querySelectorAll("[data-attribute-filter]").forEach(function (filter) {
      const name = filter.dataset.attributeFilter;
      const count = filter.querySelectorAll('input[name="' + name + '"]:checked').length;
      const summary = filter.querySelector("[data-attribute-count]");
      if (summary) summary.textContent = count ? count + " 项" : "全部";
    });
  }

  function explorerSegment(name, options, selected) {
    return '<div class="explorer-segment" role="radiogroup">' + options.map(function (option) {
      return '<label><input type="radio" name="' + escapeHtml(name) + '" value="' + escapeHtml(option.value) + '" data-explorer-control="' + escapeHtml(option.control) + '" ' + (selected === option.value ? "checked" : "") + '><span>' + escapeHtml(option.label) + '</span></label>';
    }).join("") + '</div>';
  }

  function explorerAttributeValue(item, key) {
    const value = item.exact && item.exact[key];
    if (value == null) return "—";
    if (item.tierMultipliers) {
      return item.tierMultipliers.map(function (multiplier) {
        const tierValue = value * multiplier;
        return tierValue > 0 ? "+" + tierValue : String(tierValue).replace("-", "−");
      }).join("/");
    }
    return value > 0 ? "+" + value : String(value).replace("-", "−");
  }

  function getExplorerRows() {
    const selected = state.explorer;
    return data.jobs.concat(data.trainings).filter(function (item) {
      if (selected.type !== "all" && item.type !== selected.type) return false;
      const value = item.exact && item.exact[selected.attribute];
      if (value == null || value === 0) return false;
      if (selected.direction === "gain") return value > 0;
      if (selected.direction === "loss") return value < 0;
      return true;
    }).sort(function (a, b) {
      const av = a.exact[state.explorer.attribute];
      const bv = b.exact[state.explorer.attribute];
      if ((av > 0) !== (bv > 0)) return bv - av;
      const magnitude = Math.abs(bv) - Math.abs(av);
      if (magnitude) return magnitude;
      return a.name.localeCompare(b.name, "zh-CN");
    });
  }

  function explorerSideEffects(item, selectedAttribute) {
    const losses = item.decrease.filter(function (key) { return key !== selectedAttribute && key !== "pressure"; });
    const pressure = item.exact && item.exact.pressure != null && selectedAttribute !== "pressure" ? ["pressure"] : [];
    const parts = [];
    if (losses.length) parts.push(effectTagsForKeys(item, losses, "loss", 3));
    if (pressure.length) parts.push(effectTagsForKeys(item, pressure, item.exact.pressure > 0 ? "loss" : "gain", 1));
    return parts.length ? parts.join("") : '<span class="tag neutral">无</span>';
  }

  function renderAttributeExplorer() {
    const target = document.getElementById("attribute-explorer");
    if (!target) return;
    const selected = state.explorer;
    const rows = getExplorerRows();
    const jobCount = rows.filter(function (item) { return item.type === "job"; }).length;
    const trainingCount = rows.length - jobCount;
    const attributeOptions = Object.keys(data.attributes).map(function (key) {
      return '<label><input type="radio" name="explorerAttribute" value="' + escapeHtml(key) + '" data-explorer-control="attribute" ' + (selected.attribute === key ? "checked" : "") + '><span>' + escapeHtml(attributeName(key)) + '</span></label>';
    }).join("");
    const directionControl = explorerSegment("explorerDirection", [
      { value: "gain", label: "数值增加", control: "direction" },
      { value: "loss", label: "数值减少", control: "direction" },
      { value: "any", label: "全部变化", control: "direction" }
    ], selected.direction);
    const typeControl = explorerSegment("explorerType", [
      { value: "all", label: "全部活动", control: "type" },
      { value: "job", label: "只看打工", control: "type" },
      { value: "training", label: "只看训练", control: "type" }
    ], selected.type);
    let results = '<div class="empty-results"><div><i data-lucide="search-x"></i><h3>没有对应活动</h3><p>当前属性与变化方向没有匹配资料。</p></div></div>';
    if (rows.length) {
      const body = rows.map(function (item) {
        const selectedValue = item.exact[selected.attribute];
        const otherGains = item.increase.filter(function (key) { return key !== selected.attribute && key !== "pressure"; });
        const resource = item.type === "job"
          ? '<div class="resource-cell"><b>' + money(item.income) + '</b><small>' + escapeHtml(item.unlock) + '</small></div>'
          : '<div class="resource-cell"><b>' + money(item.cost) + '</b><small>初 / 中 / 高 / 特</small></div>';
        return '<tr tabindex="0" data-kind="' + item.type + '" data-item-id="' + item.id + '"><td data-label="活动"><div class="name-cell"><span class="row-icon ' + item.type + '"><i data-lucide="' + item.icon + '"></i></span><span><b>' + item.name + '</b><small>' + (item.type === "job" ? "打工" : "训练") + '</small></span></div></td>' +
          '<td data-label="目标变化"><span class="attribute-delta ' + (selectedValue > 0 ? "up" : "down") + '">' + escapeHtml(attributeName(selected.attribute)) + ' ' + escapeHtml(explorerAttributeValue(item, selected.attribute)) + '</span></td>' +
          '<td data-label="其他增益">' + effectTagsForKeys(item, otherGains, "gain", 3, "无") + '</td><td data-label="副作用 / 压力">' + explorerSideEffects(item, selected.attribute) + '</td><td data-label="收支 / 条件">' + resource + '</td><td data-label="置信等级">' + statusPill(item.status) + '</td></tr>';
      }).join("");
      results = '<div class="table-shell"><div class="data-table-wrap"><table class="data-table explorer-table"><thead><tr><th>活动</th><th>目标属性变化</th><th>其他增益</th><th>副作用 / 压力</th><th>收支 / 条件</th><th>置信等级</th></tr></thead><tbody>' + body + '</tbody></table></div></div>';
    }
    target.innerHTML = '<section class="attribute-explorer-panel">' +
      '<div class="attribute-explorer-heading"><div><p>目标属性</p><h3>' + escapeHtml(attributeName(selected.attribute)) + '</h3></div><span><b>' + rows.length + '</b> 项匹配</span></div>' +
      '<div class="explorer-attribute-grid">' + attributeOptions + '</div>' +
      '<div class="explorer-control-row"><div><small>变化方向</small>' + directionControl + '</div><div><small>活动类型</small>' + typeControl + '</div></div>' +
      '<div class="attribute-explorer-summary"><strong>' + escapeHtml(attributeName(selected.attribute)) + '</strong><span>打工 ' + jobCount + ' 项</span><span>训练 ' + trainingCount + ' 项</span></div>' +
      '</section>' + results;
    iconRefresh();
  }

  function resetFilters(kind) {
    state.sort[kind] = { key: null, direction: null };
    if (kind === "awards") state.filters.awards = { query: "", categories: [], months: [], attributes: [] };
    if (kind === "jobs") state.filters.jobs = { query: "", attributes: [], direction: "any", stages: [] };
    if (kind === "trainings") state.filters.trainings = { query: "", gains: [], pressures: [] };
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

  function exactMatrix(exact, evidenceLabel, increase, decrease, tierMultipliers) {
    const keys = Object.keys(data.attributes);
    return '<table class="matrix-table"><thead><tr><th>属性</th><th>方向/基础值</th><th>证据</th></tr></thead><tbody>' + keys.map(function (key) {
      let value = "—";
      let evidence = "无变化资料";
      if (exact && Object.prototype.hasOwnProperty.call(exact, key)) {
        const exactValue = exact[key];
        if (tierMultipliers) {
          value = tierMultipliers.map(function (multiplier) {
            const tierValue = exactValue * multiplier;
            return tierValue > 0 ? "+" + tierValue : String(tierValue).replace("-", "−");
          }).join(" / ");
        } else {
          value = exactValue > 0 ? "+" + exactValue : String(exactValue).replace("-", "−");
        }
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
    let content = exactMatrix(item.exact, item.exactEvidence || "单一玩家实测", item.increase, item.decrease, item.tierMultipliers);
    (item.variants || []).forEach(function (variant) {
      content += '<section class="detail-section variant-matrix"><h3>' + escapeHtml(variant.name) + '变体</h3><p>触发条件：' + escapeHtml(variant.requirement) + '；能力加权 ' + variant.abilityWeight + '。</p>' + exactMatrix(variant.exact, item.exactEvidence || "单一玩家实测", [], [], null) + '</section>';
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
      const effectSummary = context.kind === "training"
        ? effectTagsForKeys(item, item.increase.filter(function (key) { return key !== "pressure"; }), "gain", null, item.exact ? "无" : "未确认") + effectTagsForKeys(item, item.increase.includes("pressure") ? ["pressure"] : [], "loss", null, item.exact ? "无" : "未确认")
        : effectTags(item, "gain") + effectTags(item, "loss");
      return '<section class="detail-section"><div class="detail-grid">' +
        '<div class="detail-field"><small>类型</small><b>' + (context.kind === "job" ? "打工" : "训练") + '</b></div>' +
        '<div class="detail-field"><small>' + unit + '</small><b>' + amount + '</b></div>' +
        '<div class="detail-field"><small>解锁阶段</small><b>' + item.unlockStage + '</b></div>' +
        (context.kind === "job" ? '<div class="detail-field"><small>能力加权</small><b>' + item.abilityWeight + '</b></div>' : '') +
        (context.kind === "job" ? '<div class="detail-field"><small>属性成长上限</small><b>' + escapeHtml((item.growthLimit && item.growthLimit.label) || "未确认") + '</b></div>' : '') +
        '<div class="detail-field"><small>规划状态</small><b>最快估算可用</b></div>' +
        '</div></section><section class="detail-section"><h3>解锁与阶段</h3><p>' + escapeHtml(item.unlock) + '</p></section>' +
        (context.kind === "job" ? '<section class="detail-section"><h3>可提升属性上限</h3><p class="growth-limit-note">' + escapeHtml((item.growthLimit && item.growthLimit.note) || "暂无独立成长上限数据。") + '</p></section>' : '') +
        '<section class="detail-section"><h3>主要变化</h3>' + effectSummary + '</section>';
    }
    const calculationBoundary = context.kind === "job"
      ? "打工精确表已经录入，可用于最快达标估算；目标构建重复实测前不视为验证方案。"
      : "四级属性与压力值可用于最快达标估算；训练费用、耗时和上限仍作为未校准边界提示。";
    return '<section class="detail-section"><h3>单次属性矩阵</h3>' + activityMatrix(item) + '</section><section class="detail-section"><h3>计算边界</h3><ul class="rule-list"><li>' + calculationBoundary + '</li>' +
      (item.tierMultipliers ? '<li>训练四级数值按初级 / 中级 / 高级 / 特级展示；费用、升级条件和属性上限仍待复测。</li>' : "") +
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

  function allPlannerActivities() {
    return data.jobs.concat(data.trainings);
  }

  function plannerTierName(index) {
    return ["初级", "中级", "高级", "特级"][Number(index) || 0];
  }

  function plannerActivityHtml(item) {
    const inputId = "planner-" + item.id.replace(/[^a-z0-9_-]/gi, "-");
    const detail = item.type === "job" ? item.requirement : "选择当前课程等级";
    const tierControl = item.type === "training"
      ? '<select name="tier.' + item.id + '" aria-label="' + escapeHtml(item.name) + '等级"><option value="0">初级</option><option value="1">中级</option><option value="2">高级</option><option value="3">特级</option></select>'
      : '<small>' + escapeHtml(detail) + '</small>';
    return '<div class="activity-option ' + item.type + '-option" data-planner-activity="' + item.id + '">' +
      '<input id="' + inputId + '" type="checkbox" name="activity" value="' + item.id + '">' +
      '<label for="' + inputId + '"><b>' + escapeHtml(item.name) + '</b><small>' + (item.type === "job" ? "打工" : "训练") + ' · 估算可用</small></label>' + tierControl + '</div>';
  }

  function updateActivitySelectionSummary() {
    const selected = Array.from(refs.plannerForm.querySelectorAll('input[name="activity"]:checked'));
    const jobs = selected.filter(function (input) { return input.value.indexOf("activity.job.") === 0; }).length;
    const trainings = selected.length - jobs;
    document.getElementById("activity-selection-summary").textContent = "已选 " + selected.length + " 项：打工 " + jobs + " 项，训练 " + trainings + " 项";
  }

  function setPlannerActivitySelection(mode) {
    const currentValues = {};
    plannerAttributes().forEach(function (key) {
      currentValues[key] = Number(refs.plannerForm.elements["current." + key].value || 0);
    });
    allPlannerActivities().forEach(function (item) {
      const input = refs.plannerForm.querySelector('input[name="activity"][value="' + item.id + '"]');
      if (!input) return;
      if (mode === "all") input.checked = true;
      if (mode === "none") input.checked = false;
      if (mode === "recommended") {
        input.checked = item.type === "training" || !item.requirementAttribute || currentValues[item.requirementAttribute] >= item.requirementValue;
      }
    });
    updateActivitySelectionSummary();
  }

  function renderPlannerForm() {
    document.getElementById("planner-status-message").textContent = data.planner.message;
    document.getElementById("attribute-editor").innerHTML = plannerAttributes().map(function (key) {
      return '<label class="attribute-row"><span>' + attributeName(key) + '</span><input type="number" min="0" max="999" step="1" name="current.' + key + '" value="100" aria-label="' + attributeName(key) + '当前值"><i>→</i><input type="number" min="0" max="999" step="1" name="target.' + key + '" value="100" aria-label="' + attributeName(key) + '目标值"></label>';
    }).join("");

    document.getElementById("planner-activities").innerHTML =
      '<section class="activity-group"><div class="activity-group-heading"><b>打工</b><span>' + data.jobs.length + ' 项</span></div>' + data.jobs.map(plannerActivityHtml).join("") + '</section>' +
      '<section class="activity-group"><div class="activity-group-heading"><b>训练</b><span>' + data.trainings.length + ' 项 · 独立等级</span></div>' + data.trainings.map(plannerActivityHtml).join("") + '</section>';
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
      trainingTiers: data.trainings.reduce(function (tiers, item) {
        tiers[item.id] = Number(formData.get("tier." + item.id) || 0);
        return tiers;
      }, {}),
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
      if (!saved || !saved.input) {
        setPlannerActivitySelection("recommended");
        return;
      }
      const input = saved.input;
      ["year", "month", "day", "funds", "pressure", "pressureLimit"].forEach(function (name) {
        const field = refs.plannerForm.elements[name];
        if (field && input[name] != null) field.value = input[name];
      });
      const strategy = refs.plannerForm.querySelector('input[name="strategy"][value="' + input.strategy + '"]');
      if (strategy && !strategy.disabled) strategy.checked = true;
      else refs.plannerForm.elements.strategy.value = "fastest";
      plannerAttributes().forEach(function (key) {
        if (!input.attributes || !input.attributes[key]) return;
        refs.plannerForm.elements["current." + key].value = input.attributes[key].current;
        refs.plannerForm.elements["target." + key].value = input.attributes[key].target;
      });
      data.trainings.forEach(function (item) {
        const tier = refs.plannerForm.elements["tier." + item.id];
        if (tier && input.trainingTiers && input.trainingTiers[item.id] != null) tier.value = input.trainingTiers[item.id];
      });
      if (input.dataVersion === data.version && Array.isArray(input.activities)) {
        refs.plannerForm.querySelectorAll('input[name="activity"]').forEach(function (checkbox) {
          checkbox.checked = input.activities.includes(checkbox.value);
        });
      } else {
        setPlannerActivitySelection("recommended");
      }
      document.getElementById("pressure-limit-value").textContent = input.pressureLimit || 80;
      updateActivitySelectionSummary();
      updateLastPlan(input);
      if (saved.result && input.dataVersion === data.version) renderPlannerResult(saved.result);
    } catch (error) {
      refs.saveState.textContent = "本地方案读取失败";
      setPlannerActivitySelection("recommended");
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

  function renderPlannerDiagnostics(result) {
    const strategyNames = { fastest: "最快达标", cheapest: "最低花费", balanced: "均衡" };
    refs.plannerOutput.innerHTML = '<div class="unreachable-plan"><div class="result-header"><span class="empty-illustration"><i data-lucide="circle-slash-2"></i></span><div><p class="empty-kicker">当前不可计算</p><h3>' + escapeHtml(result.title) + '</h3><p>' + escapeHtml(strategyNames[result.strategy] || "均衡") + ' · 数据版本 ' + data.version + '</p></div></div><div class="diagnostic-list">' + result.diagnostics.map(function (diagnostic) {
      return '<div class="diagnostic-item"><i data-lucide="' + diagnostic.icon + '"></i><div><b>' + escapeHtml(diagnostic.title) + '</b><span>' + escapeHtml(diagnostic.text) + '</span></div></div>';
    }).join("") + '</div></div>';
    iconRefresh();
  }

  function signedNumber(value) {
    return value > 0 ? "+" + value : String(value).replace("-", "−");
  }

  function formatPlanDate(isoDate) {
    const parts = String(isoDate).split("-").map(Number);
    return parts[0] + " 年 " + parts[1] + " 月 " + parts[2] + " 日";
  }

  function renderPlannerSuccess(result) {
    const includesTraining = result.usedTraining === true || result.warnings.some(function (warning) { return warning.indexOf("方案使用训练项目") >= 0; });
    const targetRows = result.targets.map(function (target) {
      return '<div class="plan-target-row"><div><b>' + escapeHtml(attributeName(target.key)) + '</b><span>' + target.start + ' → ' + target.end + ' / ' + target.target + '</span></div><div class="plan-progress"><i style="width:' + target.progress + '%"></i></div></div>';
    }).join("");
    const weekRows = result.weeks.map(function (week, index) {
      const activityText = week.activities.map(function (activity) {
        return escapeHtml(activity.name + (activity.tier ? "（" + activity.tier + "）" : "") + " ×" + activity.count);
      }).join("、");
      const changeText = week.targetChanges.filter(function (change) { return change.value !== 0; }).map(function (change) {
        return attributeName(change.key) + " " + signedNumber(change.value);
      }).join("、") || "目标属性无净变化";
      return '<details class="week-plan" ' + (index === 0 ? "open" : "") + '><summary><span><b>第 ' + week.number + ' 周</b><small>' + escapeHtml(week.dateRange) + '</small></span><em>' + week.actionCount + ' 次</em><i data-lucide="chevron-down"></i></summary><div class="week-plan-body"><p class="week-activities">' + activityText + '</p><div class="week-metrics"><span><small>目标变化</small><b>' + escapeHtml(changeText) + '</b></span><span><small>周末压力</small><b>' + week.endPressure + ' / ' + result.pressureLimit + '</b></span><span><small>已知收入</small><b>' + money(week.knownIncome) + '</b></span></div><p class="week-reason"><i data-lucide="lightbulb"></i>' + escapeHtml(week.reason) + '</p></div></details>';
    }).join("");
    const activityRows = result.activityTotals.map(function (activity) {
      return '<div class="activity-total-row"><span><i data-lucide="' + activity.icon + '"></i><b>' + escapeHtml(activity.name) + '</b>' + (activity.tier ? '<small>' + escapeHtml(activity.tier) + '</small>' : '') + '</span><strong>×' + activity.count + '</strong></div>';
    }).join("");
    const warningRows = result.warnings.map(function (warning) {
      return '<li><i data-lucide="triangle-alert"></i><span>' + escapeHtml(warning) + '</span></li>';
    }).join("");
    refs.plannerOutput.innerHTML = '<div class="plan-result"><div class="result-header success"><span class="empty-illustration"><i data-lucide="zap"></i></span><div><p class="empty-kicker">最快达标 · 估算方案</p><h3>预计 ' + result.weeks.length + ' 周，' + result.totalActions + ' 次活动达标</h3><p>预计完成：' + formatPlanDate(result.completionDate) + ' · 数据版本 ' + data.version + '</p></div></div>' +
      '<div class="plan-summary-grid"><div><small>活动次数</small><b>' + result.totalActions + '</b><span>每天 1 次</span></div><div><small>预计周数</small><b>' + result.weeks.length + '</b><span>每周最多 7 次</span></div><div><small>最高压力</small><b>' + result.maxPressure + '</b><span>安全线 ' + result.pressureLimit + '</span></div><div><small>期末资金</small><b>' + money(result.finalFunds) + '</b><span>' + (includesTraining ? "未扣训练费" : "按打工收入计算") + '</span></div></div>' +
      '<section class="plan-section"><div class="plan-section-heading"><span><i data-lucide="target"></i>目标结果</span><small>全部达到</small></div><div class="plan-target-list">' + targetRows + '</div></section>' +
      '<section class="plan-section"><div class="plan-section-heading"><span><i data-lucide="calendar-range"></i>每周安排</span><small>只给次数，不固定星期</small></div><div class="week-plan-list">' + weekRows + '</div></section>' +
      '<section class="plan-section split"><div><div class="plan-section-heading"><span><i data-lucide="list-checks"></i>活动合计</span></div><div class="activity-total-list">' + activityRows + '</div></div><div><div class="plan-section-heading"><span><i data-lucide="shield-alert"></i>估算边界</span></div><ul class="plan-warning-list">' + warningRows + '</ul></div></section></div>';
    iconRefresh();
  }

  function renderPlannerResult(result) {
    if (result.status === "success") renderPlannerSuccess(result);
    else renderPlannerDiagnostics(result);
  }

  function plannerAction(item, snapshot, targetKeys) {
    const tierIndex = item.type === "training" ? Number((snapshot.trainingTiers || {})[item.id] || 0) : null;
    const multiplier = item.type === "training" ? Number(item.tierMultipliers[tierIndex] || 1) : 1;
    const effect = {};
    Object.keys(item.exact || {}).forEach(function (key) { effect[key] = item.exact[key] * multiplier; });
    return {
      id: item.id,
      name: item.name,
      icon: item.icon,
      type: item.type,
      tier: item.type === "training" ? plannerTierName(tierIndex) : null,
      effect: effect,
      targetDeltas: targetKeys.map(function (key) { return effect[key] || 0; }),
      pressureDelta: effect.pressure || 0,
      income: item.type === "job" ? Number(item.income || 0) : 0,
      nonTargetLoss: Object.keys(effect).filter(function (key) { return key !== "pressure" && !targetKeys.includes(key) && effect[key] < 0; }).reduce(function (sum, key) { return sum + Math.abs(effect[key]); }, 0),
      unknownCost: item.type === "training"
    };
  }

  function prunePlannerActions(actions) {
    return actions.filter(function (candidate, index) {
      return !actions.some(function (other, otherIndex) {
        if (index === otherIndex) return false;
        const noWorseTargets = other.targetDeltas.every(function (value, targetIndex) { return value >= candidate.targetDeltas[targetIndex]; });
        const noWorsePressure = other.pressureDelta <= candidate.pressureDelta;
        const noWorseIncome = other.income >= candidate.income;
        const noWorseLoss = other.nonTargetLoss <= candidate.nonTargetLoss;
        const strictlyBetter = other.pressureDelta < candidate.pressureDelta || other.income > candidate.income || other.nonTargetLoss < candidate.nonTargetLoss || other.targetDeltas.some(function (value, targetIndex) { return value > candidate.targetDeltas[targetIndex]; });
        return noWorseTargets && noWorsePressure && noWorseIncome && noWorseLoss && strictlyBetter;
      });
    });
  }

  function plannerStartDate(snapshot) {
    return new Date(Date.UTC(snapshot.year, snapshot.month - 1, snapshot.day));
  }

  function isoDate(date) {
    return date.toISOString().slice(0, 10);
  }

  function addDays(date, days) {
    return new Date(date.getTime() + days * 86400000);
  }

  function remainingPlannerDays(snapshot) {
    const start = plannerStartDate(snapshot);
    const deadline = new Date(data.planner.deadline + "T00:00:00Z");
    return Math.max(0, Math.floor((deadline - start) / 86400000) + 1);
  }

  function minHeap() {
    const items = [];
    function compare(a, b) { return a.f - b.f || a.h - b.h || a.pressure - b.pressure || a.g - b.g; }
    return {
      get length() { return items.length; },
      push: function (item) {
        items.push(item);
        let index = items.length - 1;
        while (index > 0) {
          const parent = Math.floor((index - 1) / 2);
          if (compare(items[parent], item) <= 0) break;
          items[index] = items[parent];
          index = parent;
        }
        items[index] = item;
      },
      pop: function () {
        if (!items.length) return null;
        const root = items[0];
        const last = items.pop();
        if (items.length) {
          let index = 0;
          while (true) {
            const left = index * 2 + 1;
            const right = left + 1;
            if (left >= items.length) break;
            let child = right < items.length && compare(items[right], items[left]) < 0 ? right : left;
            if (compare(last, items[child]) <= 0) break;
            items[index] = items[child];
            index = child;
          }
          items[index] = last;
        }
        return root;
      }
    };
  }

  function searchFastestPlan(snapshot, actions, targetKeys) {
    const targetValues = targetKeys.map(function (key) { return snapshot.attributes[key].target; });
    const startValues = targetKeys.map(function (key, index) { return Math.min(snapshot.attributes[key].current, targetValues[index] + 20); });
    const maxGains = targetKeys.map(function (key, targetIndex) {
      return Math.max.apply(null, actions.map(function (action) { return Math.max(0, action.targetDeltas[targetIndex]); }));
    });
    const missing = targetKeys.filter(function (key, index) { return maxGains[index] <= 0; });
    if (missing.length) return { ok: false, reason: "coverage", missing: missing };

    const actionLimit = remainingPlannerDays(snapshot);
    if (!actionLimit) return { ok: false, reason: "deadline" };
    function isGoal(values) { return values.every(function (value, index) { return value >= targetValues[index]; }); }
    function heuristic(values) {
      return values.reduce(function (lowerBound, value, index) {
        return Math.max(lowerBound, Math.ceil(Math.max(0, targetValues[index] - value) / maxGains[index]));
      }, 0);
    }
    function stateKey(values, pressure) { return values.join(",") + "|" + pressure; }

    const queue = minHeap();
    const startPressure = Math.max(0, snapshot.pressure);
    const startKey = stateKey(startValues, startPressure);
    const startHeuristic = heuristic(startValues);
    queue.push({ key: startKey, values: startValues, pressure: startPressure, g: 0, h: startHeuristic, f: startHeuristic });
    const best = new Map([[startKey, 0]]);
    const parents = new Map();
    let expanded = 0;
    let hitActionLimit = false;
    const expansionLimit = targetKeys.length <= 4 ? 120000 : 35000;

    while (queue.length && expanded < expansionLimit) {
      const current = queue.pop();
      if (best.get(current.key) !== current.g) continue;
      if (isGoal(current.values)) {
        const path = [];
        let key = current.key;
        while (parents.has(key)) {
          const parent = parents.get(key);
          path.push(parent.actionIndex);
          key = parent.previousKey;
        }
        path.reverse();
        return { ok: true, path: path, method: "shortest_path", expanded: expanded };
      }
      if (current.g >= actionLimit) {
        hitActionLimit = true;
        continue;
      }
      expanded += 1;
      actions.forEach(function (action, actionIndex) {
        const nextPressure = Math.max(0, current.pressure + action.pressureDelta);
        if (current.pressure > snapshot.pressureLimit) {
          if (nextPressure >= current.pressure) return;
        } else if (nextPressure > snapshot.pressureLimit) {
          return;
        }
        const nextValues = current.values.map(function (value, index) {
          return Math.max(0, Math.min(targetValues[index] + 20, value + action.targetDeltas[index]));
        });
        const changesTarget = nextValues.some(function (value, index) { return value !== current.values[index]; });
        if (!changesTarget && nextPressure >= current.pressure) return;
        const nextG = current.g + 1;
        const nextKey = stateKey(nextValues, nextPressure);
        if (best.has(nextKey) && best.get(nextKey) <= nextG) return;
        const nextH = heuristic(nextValues);
        best.set(nextKey, nextG);
        parents.set(nextKey, { previousKey: current.key, actionIndex: actionIndex });
        queue.push({ key: nextKey, values: nextValues, pressure: nextPressure, g: nextG, h: nextH, f: nextG + nextH });
      });
    }
    return { ok: false, reason: expanded >= expansionLimit ? "search_limit" : hitActionLimit ? "deadline" : "constraints" };
  }

  function greedyFastestPlan(snapshot, actions, targetKeys) {
    const targetValues = targetKeys.map(function (key) { return snapshot.attributes[key].target; });
    const values = targetKeys.map(function (key) { return snapshot.attributes[key].current; });
    let pressure = snapshot.pressure;
    const path = [];
    const actionLimit = remainingPlannerDays(snapshot);
    function deficit(list) {
      return list.reduce(function (sum, value, index) { return sum + Math.max(0, targetValues[index] - value); }, 0);
    }
    while (deficit(values) > 0 && path.length < actionLimit) {
      const before = deficit(values);
      const ranked = actions.map(function (action, actionIndex) {
        const nextPressure = Math.max(0, pressure + action.pressureDelta);
        const pressureAllowed = pressure > snapshot.pressureLimit ? nextPressure < pressure : nextPressure <= snapshot.pressureLimit;
        const nextValues = values.map(function (value, index) { return Math.max(0, value + action.targetDeltas[index]); });
        return { actionIndex: actionIndex, nextPressure: nextPressure, nextValues: nextValues, progress: before - deficit(nextValues), pressureAllowed: pressureAllowed };
      }).filter(function (candidate) { return candidate.pressureAllowed; }).sort(function (a, b) {
        return b.progress - a.progress || actions[a.actionIndex].pressureDelta - actions[b.actionIndex].pressureDelta || actions[b.actionIndex].income - actions[a.actionIndex].income;
      });
      let choice = ranked.find(function (candidate) { return candidate.progress > 0; });
      if (!choice) choice = ranked.find(function (candidate) { return actions[candidate.actionIndex].pressureDelta < 0 && candidate.nextPressure < pressure; });
      if (!choice) return { ok: false, reason: "constraints" };
      values.splice(0, values.length).push.apply(values, choice.nextValues);
      pressure = choice.nextPressure;
      path.push(choice.actionIndex);
    }
    return deficit(values) === 0 ? { ok: true, path: path, method: "greedy" } : { ok: false, reason: "deadline" };
  }

  function planReason(targetChanges) {
    const gains = targetChanges.filter(function (change) { return change.value > 0; }).sort(function (a, b) { return b.value - a.value; });
    return gains.length ? "本周优先推进 " + gains.slice(0, 3).map(function (change) { return attributeName(change.key); }).join("、") + "，并保持压力不超过安全线。" : "本周用于降低压力，为后续高收益活动腾出空间。";
  }

  function buildPlannerSuccess(snapshot, actions, search, targetKeys) {
    const initialValues = {};
    plannerAttributes().forEach(function (key) { initialValues[key] = snapshot.attributes[key].current; });
    const values = Object.assign({}, initialValues);
    let pressure = snapshot.pressure;
    let maxPressure = pressure;
    let funds = snapshot.funds;
    const performed = search.path.map(function (actionIndex) {
      const action = actions[actionIndex];
      Object.keys(action.effect).forEach(function (key) {
        if (key !== "pressure") values[key] = Math.max(0, Number(values[key] || 0) + action.effect[key]);
      });
      pressure = Math.max(0, pressure + action.pressureDelta);
      maxPressure = Math.max(maxPressure, pressure);
      funds += action.income;
      return action;
    });
    const startDate = plannerStartDate(snapshot);
    const weeks = [];
    for (let offset = 0; offset < performed.length; offset += data.planner.maxActionsPerWeek) {
      const weekActions = performed.slice(offset, offset + data.planner.maxActionsPerWeek);
      const beforeValues = Object.assign({}, initialValues);
      let weekStartPressure = snapshot.pressure;
      for (let prior = 0; prior < offset; prior += 1) {
        const priorAction = performed[prior];
        Object.keys(priorAction.effect).forEach(function (key) { if (key !== "pressure") beforeValues[key] = Math.max(0, Number(beforeValues[key] || 0) + priorAction.effect[key]); });
        weekStartPressure = Math.max(0, weekStartPressure + priorAction.pressureDelta);
      }
      const afterValues = Object.assign({}, beforeValues);
      let weekEndPressure = weekStartPressure;
      let knownIncome = 0;
      const counts = new Map();
      weekActions.forEach(function (action) {
        Object.keys(action.effect).forEach(function (key) { if (key !== "pressure") afterValues[key] = Math.max(0, Number(afterValues[key] || 0) + action.effect[key]); });
        weekEndPressure = Math.max(0, weekEndPressure + action.pressureDelta);
        knownIncome += action.income;
        const countKey = action.id + "|" + (action.tier || "");
        if (!counts.has(countKey)) counts.set(countKey, { name: action.name, tier: action.tier, count: 0 });
        counts.get(countKey).count += 1;
      });
      const targetChanges = targetKeys.map(function (key) { return { key: key, value: afterValues[key] - beforeValues[key] }; });
      const weekStart = addDays(startDate, offset);
      const weekEnd = addDays(startDate, offset + weekActions.length - 1);
      weeks.push({
        number: weeks.length + 1,
        dateRange: (weekStart.getUTCMonth() + 1) + "/" + weekStart.getUTCDate() + " - " + (weekEnd.getUTCMonth() + 1) + "/" + weekEnd.getUTCDate(),
        actionCount: weekActions.length,
        activities: Array.from(counts.values()),
        targetChanges: targetChanges,
        startPressure: weekStartPressure,
        endPressure: weekEndPressure,
        knownIncome: knownIncome,
        reason: planReason(targetChanges)
      });
    }
    const totals = new Map();
    performed.forEach(function (action) {
      const key = action.id + "|" + (action.tier || "");
      if (!totals.has(key)) totals.set(key, { name: action.name, tier: action.tier, icon: action.icon, count: 0 });
      totals.get(key).count += 1;
    });
    const losses = plannerAttributes().filter(function (key) { return !targetKeys.includes(key) && values[key] < initialValues[key]; }).map(function (key) { return attributeName(key) + " " + signedNumber(values[key] - initialValues[key]); });
    const usedTraining = performed.some(function (action) { return action.unknownCost; });
    const warnings = ["这是基于用户精确表的估算方案；每次活动按 1 天、每周最多 7 次计算。"];
    if (usedTraining) warnings.push("方案使用训练项目，期末资金尚未扣除训练费用。请在游戏中确认资金足够。");
    warnings.push("成长上限、随机波动、失败分支和活动临时不可用状态尚未纳入。");
    if (losses.length) warnings.push("非目标属性预计下降：" + losses.join("、") + "。");
    if (search.method === "greedy") warnings.push("目标较多时使用启发式搜索，结果可达但不保证活动次数为全局最少。");
    return {
      status: "success",
      strategy: "fastest",
      totalActions: performed.length,
      completionDate: isoDate(addDays(startDate, performed.length - 1)),
      maxPressure: maxPressure,
      pressureLimit: snapshot.pressureLimit,
      finalPressure: pressure,
      finalFunds: funds,
      usedTraining: usedTraining,
      targets: targetKeys.map(function (key) {
        const start = initialValues[key];
        const target = snapshot.attributes[key].target;
        return { key: key, start: start, target: target, end: values[key], progress: Math.min(100, Math.round((values[key] - start) / Math.max(1, target - start) * 100)) };
      }),
      weeks: weeks,
      activityTotals: Array.from(totals.values()).sort(function (a, b) { return b.count - a.count || a.name.localeCompare(b.name, "zh-CN"); }),
      warnings: warnings
    };
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
    if (snapshot.strategy !== "fastest") {
      return {
        title: "该策略尚未开放",
        strategy: snapshot.strategy,
        diagnostics: [
          { icon: "wallet", title: "训练费用仍待校准", text: "最低花费和均衡策略需要完整费用数据。" },
          { icon: "zap", title: "最快达标可以使用", text: "切换到最快达标后可立即生成估算方案。" }
        ]
      };
    }
    if (!snapshot.activities.length) {
      return {
        title: "尚未选择可用活动",
        strategy: snapshot.strategy,
        diagnostics: [
          { icon: "list-checks", title: "活动为空", text: "至少勾选一项当前已经解锁的打工或训练。" },
          { icon: "wand-sparkles", title: "可使用按属性推荐", text: "系统会按当前属性勾选满足门槛的打工，并保留全部训练课程。" }
        ]
      };
    }
    const selected = new Set(snapshot.activities);
    let actions = allPlannerActivities().filter(function (item) { return selected.has(item.id) && item.estimateEligible && item.exact; }).map(function (item) {
      return plannerAction(item, snapshot, targets);
    }).filter(function (action) {
      return action.pressureDelta < 0 || action.targetDeltas.some(function (value) { return value > 0; });
    });
    actions = prunePlannerActions(actions);
    const missingTargets = targets.filter(function (key, targetIndex) {
      return !actions.some(function (action) { return action.targetDeltas[targetIndex] > 0; });
    });
    if (missingTargets.length) {
      return {
        title: "所选活动无法覆盖全部目标",
        strategy: snapshot.strategy,
        diagnostics: [
          { icon: "route-off", title: "缺少增益活动", text: "当前没有活动可以提高：" + missingTargets.map(attributeName).join("、") + "。" },
          { icon: "list-plus", title: "调整活动选择", text: "勾选相关训练或已解锁打工后重新生成。" }
        ]
      };
    }
    let search = searchFastestPlan(snapshot, actions, targets);
    if (!search.ok && search.reason === "search_limit") search = greedyFastestPlan(snapshot, actions, targets);
    if (!search.ok) {
      const reasonText = search.reason === "deadline"
        ? "按当前日期，剩余游戏时间不足以完成目标。"
        : "压力安全线阻止了必要活动，且所选活动中没有足够的减压组合。";
      return {
        title: "当前约束下无法完成目标",
        strategy: snapshot.strategy,
        diagnostics: [
          { icon: "shield-alert", title: search.reason === "deadline" ? "时间不足" : "压力约束冲突", text: reasonText },
          { icon: "sliders-horizontal", title: "可调整输入", text: "提高压力上限、增加可用活动或降低目标值后重新生成。" }
        ]
      };
    }
    return buildPlannerSuccess(snapshot, actions, search, targets);
  }

  function scheduleContractId() {
    scheduleContractCounter += 1;
    return "contract-" + Date.now().toString(36) + "-" + scheduleContractCounter;
  }

  function scheduleArtistId() {
    scheduleArtistCounter += 1;
    return "artist-" + Date.now().toString(36) + "-" + scheduleArtistCounter;
  }

  function scheduleDefaultContract(status) {
    return {
      id: scheduleContractId(),
      status: status || "existing",
      name: "",
      remainingDays: 1,
      deadline: "1995-02-28",
      weekdays: [1, 2, 3, 4, 5, 6]
    };
  }

  function scheduleInitialSnapshot(name) {
    return {
      id: scheduleArtistId(),
      name: name || "艺人 A",
      startDate: "1995-01-02",
      bufferSlots: data.scheduleCalculator.defaultBufferSlots,
      contracts: [],
      calculated: false,
      validationAttempted: false
    };
  }

  function scheduleExampleSnapshot(artist) {
    return {
      id: artist && artist.id ? artist.id : scheduleArtistId(),
      name: artist && artist.name ? artist.name : "艺人 A",
      startDate: "1995-01-02",
      bufferSlots: 2,
      contracts: [
        { id: scheduleContractId(), status: "existing", name: "电影 A", remainingDays: 12, deadline: "1995-03-31", weekdays: [1, 3, 5] },
        { id: scheduleContractId(), status: "candidate", name: "广告 B", remainingDays: 4, deadline: "1995-02-28", weekdays: [2, 4, 6] }
      ],
      calculated: true,
      validationAttempted: true
    };
  }

  function scheduleContractRow(contract, index) {
    const weekdayLabels = data.scheduleCalculator.weekdayLabels;
    return '<article class="schedule-contract-row" data-schedule-contract="' + escapeHtml(contract.id) + '">' +
      '<header><span class="schedule-contract-number">' + String(index + 1).padStart(2, "0") + '</span><label class="schedule-status-select"><span>状态</span><select data-schedule-field="status"><option value="existing"' + (contract.status === "existing" ? " selected" : "") + '>已有通告</option><option value="candidate"' + (contract.status === "candidate" ? " selected" : "") + '>待接通告</option></select></label><button class="icon-button schedule-remove" type="button" data-schedule-remove aria-label="删除通告" title="删除通告"><i data-lucide="trash-2"></i></button></header>' +
      '<div class="schedule-contract-fields"><label class="schedule-name-field"><span>通告名称</span><input type="text" maxlength="30" data-schedule-field="name" value="' + escapeHtml(contract.name) + '" placeholder="例如：电影 A"></label><label><span>剩余工作日</span><input type="number" min="1" max="99" data-schedule-field="remainingDays" value="' + Number(contract.remainingDays || 1) + '"></label><label><span>截止日</span><input type="date" min="1995-01-01" max="1996-12-31" data-schedule-field="deadline" value="' + escapeHtml(contract.deadline) + '"></label></div>' +
      '<fieldset class="schedule-weekdays"><legend>允许工作星期</legend>' + weekdayLabels.map(function (label, weekdayIndex) {
        const weekday = weekdayIndex + 1;
        return '<label><input type="checkbox" data-schedule-field="weekday" value="' + weekday + '"' + (contract.weekdays.includes(weekday) ? " checked" : "") + '><span>周' + label + '</span></label>';
      }).join("") + '</fieldset>' +
    '</article>';
  }

  function renderScheduleContracts(contracts) {
    refs.scheduleContractList.innerHTML = contracts.map(scheduleContractRow).join("");
    iconRefresh();
  }

  function applyScheduleSnapshot(snapshot) {
    refs.scheduleForm.elements.artist.value = snapshot.name || snapshot.artist || "艺人 A";
    refs.scheduleForm.elements.startDate.value = snapshot.startDate || "1995-01-02";
    refs.scheduleForm.elements.bufferSlots.value = Number.isFinite(Number(snapshot.bufferSlots)) ? snapshot.bufferSlots : 2;
    renderScheduleContracts(Array.isArray(snapshot.contracts) ? snapshot.contracts : []);
    refs.scheduleSubmitLabel.textContent = "检查" + (snapshot.name || snapshot.artist || "当前艺人") + "档期";
  }

  function readScheduleSnapshot() {
    const active = scheduleCurrentArtist();
    return {
      id: active ? active.id : scheduleArtistId(),
      name: refs.scheduleForm.elements.artist.value.trim() || "未命名艺人",
      startDate: refs.scheduleForm.elements.startDate.value,
      bufferSlots: Math.max(0, Number(refs.scheduleForm.elements.bufferSlots.value || 0)),
      contracts: Array.from(refs.scheduleContractList.querySelectorAll("[data-schedule-contract]")).map(function (row) {
        return {
          id: row.dataset.scheduleContract,
          status: row.querySelector('[data-schedule-field="status"]').value,
          name: row.querySelector('[data-schedule-field="name"]').value.trim(),
          remainingDays: Number(row.querySelector('[data-schedule-field="remainingDays"]').value || 0),
          deadline: row.querySelector('[data-schedule-field="deadline"]').value,
          weekdays: Array.from(row.querySelectorAll('[data-schedule-field="weekday"]:checked')).map(function (input) { return Number(input.value); })
        };
      }),
      calculated: active ? Boolean(active.calculated) : false,
      validationAttempted: active ? Boolean(active.validationAttempted) : false
    };
  }

  function normalizeScheduleContract(contract) {
    return {
      id: contract && contract.id ? String(contract.id) : scheduleContractId(),
      status: contract && contract.status === "candidate" ? "candidate" : "existing",
      name: contract && contract.name ? String(contract.name) : "",
      remainingDays: Math.max(1, Number(contract && contract.remainingDays || 1)),
      deadline: contract && contract.deadline ? String(contract.deadline) : "1995-02-28",
      weekdays: Array.isArray(contract && contract.weekdays)
        ? Array.from(new Set(contract.weekdays.map(Number).filter(function (weekday) { return weekday >= 1 && weekday <= 7; })))
        : [1, 2, 3, 4, 5, 6]
    };
  }

  function normalizeScheduleArtist(artist, index) {
    const contracts = artist && Array.isArray(artist.contracts)
      ? artist.contracts.map(normalizeScheduleContract)
      : [scheduleDefaultContract("existing"), scheduleDefaultContract("candidate")];
    return {
      id: artist && artist.id ? String(artist.id) : scheduleArtistId(),
      name: artist && (artist.name || artist.artist) ? String(artist.name || artist.artist) : "艺人 " + String.fromCharCode(65 + index),
      startDate: artist && artist.startDate ? String(artist.startDate) : "1995-01-02",
      bufferSlots: Math.max(0, Number(artist && artist.bufferSlots != null ? artist.bufferSlots : data.scheduleCalculator.defaultBufferSlots)),
      contracts: contracts,
      calculated: Boolean(artist && artist.calculated),
      validationAttempted: Boolean(artist && artist.validationAttempted)
    };
  }

  function scheduleInitialWorkspace() {
    const artist = scheduleInitialSnapshot("艺人 A");
    return { schemaVersion: 2, activeArtistId: artist.id, view: "artist", artists: [artist] };
  }

  function scheduleCurrentArtist() {
    if (!scheduleWorkspaceState || !Array.isArray(scheduleWorkspaceState.artists)) return null;
    return scheduleWorkspaceState.artists.find(function (artist) { return artist.id === scheduleWorkspaceState.activeArtistId; }) || scheduleWorkspaceState.artists[0] || null;
  }

  function saveScheduleWorkspace() {
    try {
      localStorage.setItem("stardomGuide.scheduleCalculator.v2", JSON.stringify(scheduleWorkspaceState));
    } catch (error) {
      return false;
    }
    return true;
  }

  function restoreScheduleWorkspace() {
    try {
      const saved = JSON.parse(localStorage.getItem("stardomGuide.scheduleCalculator.v2") || "null");
      if (saved && saved.schemaVersion === 2 && Array.isArray(saved.artists) && saved.artists.length) {
        const artists = saved.artists.slice(0, data.scheduleCalculator.maxArtists || 3).map(normalizeScheduleArtist);
        const activeArtistId = artists.some(function (artist) { return artist.id === saved.activeArtistId; }) ? saved.activeArtistId : artists[0].id;
        return { schemaVersion: 2, activeArtistId: activeArtistId, view: saved.view === "all" ? "all" : "artist", artists: artists };
      }

      const legacy = JSON.parse(localStorage.getItem("stardomGuide.scheduleCalculator") || "null");
      if (legacy && Array.isArray(legacy.contracts)) {
        const artist = normalizeScheduleArtist(legacy, 0);
        artist.calculated = false;
        artist.validationAttempted = false;
        return { schemaVersion: 2, activeArtistId: artist.id, view: "artist", artists: [artist] };
      }
    } catch (error) {
      return scheduleInitialWorkspace();
    }
    return scheduleInitialWorkspace();
  }

  function scheduleParseDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
    const date = new Date(value + "T00:00:00Z");
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function scheduleIsoDate(date) {
    return date.toISOString().slice(0, 10);
  }

  function scheduleAddDays(date, amount) {
    return new Date(date.getTime() + amount * 86400000);
  }

  function scheduleWeekday(date) {
    return date.getUTCDay() || 7;
  }

  function scheduleDateLabel(value) {
    const date = typeof value === "string" ? scheduleParseDate(value) : value;
    if (!date) return "—";
    return (date.getUTCMonth() + 1) + "/" + date.getUTCDate();
  }

  function scheduleWeekdayText(weekdays) {
    return (weekdays || []).map(function (weekday) { return data.scheduleCalculator.weekdayLabels[weekday - 1]; }).join("");
  }

  function validateScheduleSnapshot(snapshot) {
    const issues = [];
    function addIssue(details) {
      issues.push(Object.assign({
        severity: "error",
        artistId: snapshot.id,
        artistName: snapshot.name || snapshot.artist || "未命名艺人"
      }, details));
    }
    const start = scheduleParseDate(snapshot.startDate);
    if (!start) addIssue({ code: "date.invalid", scope: "artist", field: "startDate", message: "请选择有效的首个可排日期。", priority: 10 });
    if (!Number.isInteger(snapshot.bufferSlots) || snapshot.bufferSlots < 0 || snapshot.bufferSlots > 14) {
      addIssue({ code: "range.buffer", scope: "artist", field: "bufferSlots", message: "安全余量必须是 0–14 之间的整数。", priority: 20 });
    }
    if (!snapshot.contracts.length) addIssue({ code: "list.empty", scope: "artist", field: "contracts", message: "至少添加一份通告。", priority: 30 });
    snapshot.contracts.forEach(function (contract, index) {
      const label = contract.name || "第 " + (index + 1) + " 份通告";
      const deadline = scheduleParseDate(contract.deadline);
      const priority = 40 + index * 10;
      if (!contract.name || !contract.name.trim()) addIssue({ code: "required", scope: "contract", entityId: contract.id, field: "name", message: "请输入第 " + (index + 1) + " 份通告的名称。", priority: priority });
      if (!deadline) addIssue({ code: "date.invalid", scope: "contract", entityId: contract.id, field: "deadline", message: label + "缺少有效截止日。", priority: priority + 1 });
      else if (start && deadline < start) addIssue({ code: "date.beforeStart", scope: "contract", entityId: contract.id, field: "deadline", relatedField: "startDate", message: label + "的截止日不能早于首个可排日期。", priority: priority + 1 });
      if (!Number.isInteger(contract.remainingDays) || contract.remainingDays < 1 || contract.remainingDays > 99) addIssue({ code: "range.days", scope: "contract", entityId: contract.id, field: "remainingDays", message: label + "的剩余工作日必须是 1–99 之间的整数。", priority: priority + 2 });
      if (!contract.weekdays.length) addIssue({ code: "group.empty", scope: "contract", entityId: contract.id, field: "weekdays", message: label + "至少要选择一个允许工作星期。", priority: priority + 3 });
    });
    return issues.sort(function (a, b) { return a.priority - b.priority; });
  }

  function simulateSchedule(contracts, startDateValue) {
    const start = scheduleParseDate(startDateValue);
    const maxDeadline = contracts.reduce(function (latest, contract) {
      const deadline = scheduleParseDate(contract.deadline);
      return !latest || deadline > latest ? deadline : latest;
    }, start);
    const horizonLimit = scheduleAddDays(start, data.scheduleCalculator.maxHorizonDays - 1);
    const end = maxDeadline > horizonLimit ? horizonLimit : maxDeadline;
    const dates = [];
    for (let cursor = new Date(start); cursor <= end; cursor = scheduleAddDays(cursor, 1)) {
      dates.push({ iso: scheduleIsoDate(cursor), date: new Date(cursor), weekday: scheduleWeekday(cursor) });
    }

    const units = [];
    contracts.forEach(function (contract, contractIndex) {
      const deadline = scheduleParseDate(contract.deadline);
      const allowedDates = dates.filter(function (date) {
        return date.date <= deadline && contract.weekdays.includes(date.weekday);
      }).map(function (date) { return date.iso; });
      for (let unitIndex = 0; unitIndex < contract.remainingDays; unitIndex++) {
        units.push({ id: contract.id + "-unit-" + unitIndex, contract: contract, contractIndex: contractIndex, deadline: contract.deadline, allowedDates: allowedDates });
      }
    });
    units.sort(function (a, b) {
      if (a.deadline !== b.deadline) return a.deadline.localeCompare(b.deadline);
      if (a.contract.status !== b.contract.status) return a.contract.status === "existing" ? -1 : 1;
      return a.contractIndex - b.contractIndex;
    });

    let dateToUnit = new Map();
    function assignUnit(unit, visitedDates) {
      for (let index = 0; index < unit.allowedDates.length; index++) {
        const iso = unit.allowedDates[index];
        if (visitedDates.has(iso)) continue;
        visitedDates.add(iso);
        const occupied = dateToUnit.get(iso);
        if (!occupied || assignUnit(occupied, visitedDates)) {
          dateToUnit.set(iso, unit);
          return true;
        }
      }
      return false;
    }
    units.forEach(function (unit) { assignUnit(unit, new Set()); });

    if (dateToUnit.size === units.length) {
      const remainingByContract = new Map(contracts.map(function (contract) { return [contract.id, contract.remainingDays]; }));
      const greedyAssignments = new Map();
      dates.forEach(function (date) {
        const eligible = contracts.filter(function (contract) {
          return remainingByContract.get(contract.id) > 0 && date.iso <= contract.deadline && contract.weekdays.includes(date.weekday);
        }).sort(function (a, b) {
          if (a.deadline !== b.deadline) return a.deadline.localeCompare(b.deadline);
          if (a.weekdays.length !== b.weekdays.length) return a.weekdays.length - b.weekdays.length;
          if (a.status !== b.status) return a.status === "existing" ? -1 : 1;
          return 0;
        });
        if (!eligible.length) return;
        const contract = eligible[0];
        greedyAssignments.set(date.iso, { contract: contract });
        remainingByContract.set(contract.id, remainingByContract.get(contract.id) - 1);
      });
      if (greedyAssignments.size === units.length) dateToUnit = greedyAssignments;
    }

    const contractResults = contracts.map(function (contract) {
      const scheduledDates = Array.from(dateToUnit.entries()).filter(function (entry) { return entry[1].contract.id === contract.id; }).map(function (entry) { return entry[0]; }).sort();
      const completionDate = scheduledDates.length === contract.remainingDays ? scheduledDates[scheduledDates.length - 1] : null;
      const deadline = scheduleParseDate(contract.deadline);
      let bufferSlots = 0;
      if (completionDate) {
        const completion = scheduleParseDate(completionDate);
        for (let cursor = scheduleAddDays(completion, 1); cursor <= deadline; cursor = scheduleAddDays(cursor, 1)) {
          const iso = scheduleIsoDate(cursor);
          if (contract.weekdays.includes(scheduleWeekday(cursor)) && !dateToUnit.has(iso)) bufferSlots += 1;
        }
      }
      return {
        id: contract.id,
        status: contract.status,
        name: contract.name || "未命名通告",
        weekdays: contract.weekdays,
        requiredDays: contract.remainingDays,
        assignedDays: scheduledDates.length,
        deadline: contract.deadline,
        completionDate: completionDate,
        bufferSlots: bufferSlots,
        feasible: scheduledDates.length === contract.remainingDays
      };
    });
    const assignments = new Map(Array.from(dateToUnit.entries()).map(function (entry) {
      return [entry[0], { id: entry[1].contract.id, name: entry[1].contract.name || "未命名通告", status: entry[1].contract.status }];
    }));
    return {
      feasible: contractResults.every(function (contract) { return contract.feasible; }),
      contractResults: contractResults,
      assignments: assignments,
      assignedDays: assignments.size,
      totalDays: units.length
    };
  }

  function buildScheduleWeeks(startDateValue, assignments) {
    const start = scheduleParseDate(startDateValue);
    const assignedDates = Array.from(assignments.keys()).sort();
    const lastAssigned = assignedDates.length ? scheduleParseDate(assignedDates[assignedDates.length - 1]) : start;
    const firstMonday = scheduleAddDays(start, 1 - scheduleWeekday(start));
    const totalWeeks = Math.max(1, Math.ceil((lastAssigned - firstMonday + 86400000) / (7 * 86400000)));
    const shownWeeks = Math.min(totalWeeks, 24);
    const weeks = [];
    for (let weekIndex = 0; weekIndex < shownWeeks; weekIndex++) {
      const weekStart = scheduleAddDays(firstMonday, weekIndex * 7);
      const days = [];
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const date = scheduleAddDays(weekStart, dayIndex);
        const iso = scheduleIsoDate(date);
        days.push({ iso: iso, date: date, beforeStart: date < start, assignment: assignments.get(iso) || null });
      }
      weeks.push({ index: weekIndex + 1, start: weekStart, days: days });
    }
    return { weeks: weeks, hiddenWeeks: totalWeeks - shownWeeks };
  }

  function calculateSchedule(snapshot) {
    const issues = validateScheduleSnapshot(snapshot);
    if (issues.length) return {
      status: "invalid",
      title: "输入尚未完整",
      artist: snapshot.name || snapshot.artist || "未命名艺人",
      artistId: snapshot.id,
      diagnostics: issues.map(function (issue) { return issue.message; }),
      issues: issues
    };
    const existing = snapshot.contracts.filter(function (contract) { return contract.status === "existing"; });
    const candidates = snapshot.contracts.filter(function (contract) { return contract.status === "candidate"; });
    const existingSimulation = simulateSchedule(existing, snapshot.startDate);
    const combinedSimulation = simulateSchedule(snapshot.contracts, snapshot.startDate);
    let status = "safe";
    let title = candidates.length ? "可以接下待接通告" : "现有通告可以按期完成";
    const diagnostics = [];
    if (!existingSimulation.feasible) {
      status = "blocked";
      title = "现有通告已经存在违约风险";
      diagnostics.push("不加入新通告时，已有通告也无法全部排完；应先缩减现有工作或读取更早的存档。");
    } else if (!combinedSimulation.feasible) {
      status = "blocked";
      title = "档期不足，不建议接下新通告";
      diagnostics.push("加入待接通告后至少有一份通告无法在截止日前完成。");
    } else {
      const tightContracts = combinedSimulation.contractResults.filter(function (contract) { return contract.bufferSlots < snapshot.bufferSlots; });
      if (tightContracts.length) {
        status = "risk";
        title = "理论可完成，但安全余量不足";
        diagnostics.push(tightContracts.map(function (contract) { return contract.name; }).join("、") + "低于设置的 " + snapshot.bufferSlots + " 个备用工作日。");
      } else {
        diagnostics.push("所有通告均可完成，并保留设置的安全工作日余量。");
      }
    }
    if (candidates.length && combinedSimulation.feasible) diagnostics.push("排期可行不代表游戏一定允许同时签约；仍以签约界面的可选状态为准。");
    return {
      status: status,
      title: title,
      artist: snapshot.name || snapshot.artist || "未命名艺人",
      startDate: snapshot.startDate,
      bufferSlots: snapshot.bufferSlots,
      diagnostics: diagnostics,
      contracts: combinedSimulation.contractResults,
      assignments: combinedSimulation.assignments,
      assignedDays: combinedSimulation.assignedDays,
      totalDays: combinedSimulation.totalDays,
      weeks: buildScheduleWeeks(snapshot.startDate, combinedSimulation.assignments)
    };
  }

  function scheduleVerdictLabel(contract, bufferSlots) {
    if (!contract.feasible) return '<span class="schedule-verdict blocked">不可完成</span>';
    if (contract.bufferSlots < bufferSlots) return '<span class="schedule-verdict risk">余量不足</span>';
    return '<span class="schedule-verdict safe">可完成</span>';
  }

  function scheduleIssueDomId(issue, index) {
    return ("schedule-error-" + (issue.artistId || "artist") + "-" + (issue.entityId || "form") + "-" + issue.field + "-" + index).replace(/[^a-zA-Z0-9_-]/g, "-");
  }

  function scheduleContractElement(contractId) {
    return Array.from(refs.scheduleContractList.querySelectorAll("[data-schedule-contract]")).find(function (row) {
      return row.dataset.scheduleContract === contractId;
    }) || null;
  }

  function scheduleResolveIssueTarget(issue) {
    if (!issue || issue.artistId !== scheduleWorkspaceState.activeArtistId) return null;
    if (issue.scope === "artist") {
      if (issue.field === "contracts") {
        const button = refs.scheduleForm.querySelector('[data-schedule-menu="add"]');
        return { container: refs.scheduleForm.querySelector(".schedule-contract-section"), host: refs.scheduleForm.querySelector(".schedule-section-heading"), a11y: button, focus: button };
      }
      const control = refs.scheduleForm.elements[issue.field];
      return control ? { container: control.closest("label") || control, host: control.closest("label") || control, a11y: control, focus: control } : null;
    }
    if (issue.scope === "contract") {
      const row = scheduleContractElement(issue.entityId);
      if (!row) return null;
      if (issue.field === "weekdays") {
        const group = row.querySelector(".schedule-weekdays");
        const firstCheckbox = group ? group.querySelector('input[type="checkbox"]') : null;
        return { container: group, host: group, card: row, a11y: group, focus: firstCheckbox };
      }
      const control = row.querySelector('[data-schedule-field="' + issue.field + '"]');
      return control ? { container: control.closest("label") || control, host: control.closest("label") || control, card: row, a11y: control, focus: control } : null;
    }
    return null;
  }

  function clearScheduleValidationUI() {
    scheduleVisibleIssues = [];
    refs.scheduleForm.querySelectorAll(".field-error").forEach(function (message) { message.remove(); });
    refs.scheduleForm.querySelectorAll(".validation-field-invalid, .validation-control-invalid, .validation-group-invalid, .validation-related, .validation-pulse, .contract-invalid, .section-invalid").forEach(function (element) {
      element.classList.remove("validation-field-invalid", "validation-control-invalid", "validation-group-invalid", "validation-related", "validation-pulse", "contract-invalid", "section-invalid");
    });
    refs.scheduleForm.querySelectorAll("[data-validation-describedby]").forEach(function (element) {
      const original = element.dataset.validationOriginalDescribedby || "";
      if (original) element.setAttribute("aria-describedby", original);
      else element.removeAttribute("aria-describedby");
      element.removeAttribute("aria-invalid");
      delete element.dataset.validationDescribedby;
      delete element.dataset.validationOriginalDescribedby;
    });
    refs.scheduleFormErrors.hidden = true;
    refs.scheduleFormErrors.innerHTML = "";
  }

  function renderScheduleFormErrors(issues) {
    if (!issues.length) {
      refs.scheduleFormErrors.hidden = true;
      refs.scheduleFormErrors.innerHTML = "";
      return;
    }
    refs.scheduleFormErrors.hidden = false;
    refs.scheduleFormErrors.innerHTML = '<span><i data-lucide="circle-alert"></i></span><p><b>' + issues.length + ' 项需要修正</b><small>' + escapeHtml(issues[0].message) + '</small></p><button type="button" data-validation-first>定位第一项</button>';
  }

  function applyScheduleValidationIssues(issues) {
    clearScheduleValidationUI();
    scheduleVisibleIssues = issues.slice();
    const activeIssues = issues.filter(function (issue) { return issue.artistId === scheduleWorkspaceState.activeArtistId; });
    renderScheduleFormErrors(activeIssues);
    activeIssues.forEach(function (issue, index) {
      const target = scheduleResolveIssueTarget(issue);
      if (!target || !target.container || !target.host) return;
      const messageId = scheduleIssueDomId(issue, index);
      const message = document.createElement("p");
      message.className = "field-error";
      message.id = messageId;
      message.innerHTML = '<i data-lucide="circle-alert"></i><span>' + escapeHtml(issue.message) + '</span>';
      target.container.classList.add(issue.field === "weekdays" ? "validation-group-invalid" : "validation-field-invalid");
      if (target.focus && issue.field !== "weekdays") target.focus.classList.add("validation-control-invalid");
      if (target.card) target.card.classList.add("contract-invalid");
      if (issue.field === "contracts") target.container.classList.add("section-invalid");
      if (target.a11y) {
        target.a11y.dataset.validationOriginalDescribedby = target.a11y.getAttribute("aria-describedby") || "";
        target.a11y.dataset.validationDescribedby = "true";
        target.a11y.setAttribute("aria-invalid", "true");
        target.a11y.setAttribute("aria-describedby", [target.a11y.dataset.validationOriginalDescribedby, messageId].filter(Boolean).join(" "));
      }
      if (issue.field === "weekdays" || issue.field === "contracts") target.host.insertAdjacentElement("afterend", message);
      else target.host.appendChild(message);
      if (issue.relatedField) {
        const related = refs.scheduleForm.elements[issue.relatedField];
        if (related) (related.closest("label") || related).classList.add("validation-related");
      }
    });
    iconRefresh();
  }

  function focusScheduleIssue(issue) {
    if (!issue) return;
    if (scheduleWorkspaceState.view !== "artist" || (issue.artistId && issue.artistId !== scheduleWorkspaceState.activeArtistId)) {
      if (issue.artistId) scheduleWorkspaceState.activeArtistId = issue.artistId;
      scheduleWorkspaceState.view = "artist";
      saveScheduleWorkspace();
      renderScheduleCurrent();
    }
    window.requestAnimationFrame(function () {
      const target = scheduleResolveIssueTarget(issue);
      if (!target || !target.container) return;
      target.container.classList.remove("validation-pulse");
      void target.container.offsetWidth;
      target.container.classList.add("validation-pulse");
      target.container.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      window.setTimeout(function () {
        if (target.focus && typeof target.focus.focus === "function") target.focus.focus({ preventScroll: true });
      }, 180);
      window.setTimeout(function () { target.container.classList.remove("validation-pulse"); }, 900);
    });
  }

  function renderScheduleResult(result) {
    if (result.status === "invalid") {
      scheduleVisibleIssues = result.issues || [];
      refs.scheduleOutput.innerHTML = '<div class="schedule-result invalid"><div class="schedule-result-header"><span><i data-lucide="circle-alert"></i></span><div><p>无法计算</p><h3>' + escapeHtml(result.title) + '</h3><small>' + escapeHtml(result.artist || "当前艺人") + ' · ' + scheduleVisibleIssues.length + ' 项需要修正</small></div></div><ul class="schedule-diagnostics validation-diagnostics">' + scheduleVisibleIssues.map(function (issue, index) { return '<li><button type="button" data-validation-jump="' + index + '"><i data-lucide="locate-fixed"></i><span>' + escapeHtml(issue.message) + '</span></button></li>'; }).join("") + '</ul></div>';
      iconRefresh();
      return;
    }
    scheduleVisibleIssues = [];
    const statusMeta = {
      safe: { kicker: "档期可行", icon: "calendar-check-2", label: "可接" },
      risk: { kicker: "档期紧张", icon: "triangle-alert", label: "高风险" },
      blocked: { kicker: "档期冲突", icon: "calendar-x-2", label: "不建议接" }
    }[result.status];
    const candidateCount = result.contracts.filter(function (contract) { return contract.status === "candidate"; }).length;
    const latestCompletion = result.contracts.filter(function (contract) { return contract.completionDate; }).map(function (contract) { return contract.completionDate; }).sort().pop();
    const contractRows = result.contracts.map(function (contract) {
      return '<tr><td><span class="schedule-kind ' + contract.status + '">' + (contract.status === "existing" ? "已有" : "待接") + '</span></td><td><b>' + escapeHtml(contract.name) + '</b></td><td>周' + escapeHtml(scheduleWeekdayText(contract.weekdays)) + '</td><td>' + contract.assignedDays + ' / ' + contract.requiredDays + '</td><td>' + (contract.completionDate ? scheduleDateLabel(contract.completionDate) : "—") + '</td><td>' + scheduleDateLabel(contract.deadline) + '</td><td>' + (contract.feasible ? contract.bufferSlots + ' 天' : '缺 ' + (contract.requiredDays - contract.assignedDays) + ' 天') + '</td><td>' + scheduleVerdictLabel(contract, result.bufferSlots) + '</td></tr>';
    }).join("");
    const timelineRows = result.weeks.weeks.map(function (week) {
      return '<div class="schedule-week-row"><div class="schedule-week-label"><b>第 ' + week.index + ' 周</b><span>' + scheduleDateLabel(week.start) + '</span></div>' + week.days.map(function (day, dayIndex) {
        const assignment = day.assignment;
        return '<div class="schedule-day' + (day.beforeStart ? ' disabled' : '') + (assignment ? ' assigned ' + assignment.status : '') + '"><small>' + data.scheduleCalculator.weekdayLabels[dayIndex] + ' · ' + scheduleDateLabel(day.date) + '</small>' + (assignment ? '<b title="' + escapeHtml(assignment.name) + '">' + escapeHtml(assignment.name) + '</b><span>' + (assignment.status === "existing" ? "已有" : "待接") + '</span>' : '<b>—</b>') + '</div>';
      }).join("") + '</div>';
    }).join("");
    refs.scheduleOutput.innerHTML = '<div class="schedule-result ' + result.status + '">' +
      '<div class="schedule-result-header"><span><i data-lucide="' + statusMeta.icon + '"></i></span><div><p>' + statusMeta.kicker + '</p><h3>' + escapeHtml(result.title) + '</h3><small>' + escapeHtml(result.artist) + ' · 从 ' + scheduleDateLabel(result.startDate) + ' 开始排程</small></div><em>' + statusMeta.label + '</em></div>' +
      '<div class="schedule-summary-grid"><div><span>通告</span><b>' + result.contracts.length + '</b></div><div><span>待接</span><b>' + candidateCount + '</b></div><div><span>已排工作日</span><b>' + result.assignedDays + ' / ' + result.totalDays + '</b></div><div><span>最晚完成</span><b>' + (latestCompletion ? scheduleDateLabel(latestCompletion) : "—") + '</b></div></div>' +
      '<ul class="schedule-diagnostics">' + result.diagnostics.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join("") + '</ul>' +
      '<section class="schedule-result-section"><div class="schedule-result-heading"><div><p>容量核对</p><h4>逐通告结论</h4></div><span>安全余量 ' + result.bufferSlots + ' 工作日</span></div><div class="schedule-table-wrap"><table><thead><tr><th>类别</th><th>通告</th><th>星期</th><th>已排/需要</th><th>完成</th><th>截止</th><th>余量</th><th>判断</th></tr></thead><tbody>' + contractRows + '</tbody></table></div></section>' +
      '<section class="schedule-result-section"><div class="schedule-result-heading"><div><p>逐日安排</p><h4>建议档期</h4></div><span>截止日最早优先</span></div><div class="schedule-timeline-wrap"><div class="schedule-timeline">' + timelineRows + '</div></div>' + (result.weeks.hiddenWeeks ? '<p class="schedule-hidden-weeks">后续 ' + result.weeks.hiddenWeeks + ' 周未展开；逐通告结论仍按完整档期计算。</p>' : '') + '</section>' +
      '<footer class="schedule-evidence-note"><i data-lucide="shield-alert"></i><p>计算器验证的是时间容量，不替代游戏签约限制。通告星期、剩余天数和截止日应以当前游戏画面为准。</p></footer>' +
    '</div>';
    iconRefresh();
  }

  function scheduleStatusInfo(artist) {
    const issues = artist.validationAttempted ? validateScheduleSnapshot(artist) : [];
    if (issues.length) return { status: "invalid", label: issues.length + " 项需修正", result: calculateSchedule(artist), errorCount: issues.length };
    if (!artist.calculated) return { status: "pending", label: "待检查", result: null, errorCount: 0 };
    const result = calculateSchedule(artist);
    const labels = { safe: "可接", risk: "有风险", blocked: "冲突", invalid: "需补全" };
    return { status: result.status, label: labels[result.status] || "待检查", result: result, errorCount: result.issues ? result.issues.length : 0 };
  }

  function scheduleReplaceArtist(snapshot) {
    const index = scheduleWorkspaceState.artists.findIndex(function (artist) { return artist.id === snapshot.id; });
    if (index >= 0) scheduleWorkspaceState.artists[index] = snapshot;
    else scheduleWorkspaceState.artists.push(snapshot);
  }

  function scheduleCommitForm(markDirty) {
    const snapshot = readScheduleSnapshot();
    if (markDirty) snapshot.calculated = false;
    scheduleReplaceArtist(snapshot);
    saveScheduleWorkspace();
    if (refs.scheduleSaveState) refs.scheduleSaveState.innerHTML = '<i data-lucide="hard-drive"></i>已自动保存';
    return snapshot;
  }

  function schedulePendingMarkup(title, text) {
    return '<div class="empty-plan schedule-empty"><span class="empty-illustration"><i data-lucide="calendar-days"></i></span><p class="empty-kicker">当前艺人档期</p><h3>' + escapeHtml(title) + '</h3><p>' + escapeHtml(text) + '</p></div>';
  }

  function renderScheduleDraftState(snapshot, title, text) {
    const issues = snapshot.validationAttempted ? validateScheduleSnapshot(snapshot) : [];
    if (issues.length) {
      const result = calculateSchedule(snapshot);
      renderScheduleResult(result);
      applyScheduleValidationIssues(result.issues || []);
      return result;
    }
    clearScheduleValidationUI();
    refs.scheduleOutput.innerHTML = schedulePendingMarkup(title || "输入已更新，结果待检查", text || "数据已经保存；检查当前艺人后刷新逐日排程。");
    iconRefresh();
    return null;
  }

  function renderScheduleArtistBar() {
    const maxArtists = data.scheduleCalculator.maxArtists || 3;
    refs.scheduleArtistTabs.innerHTML = scheduleWorkspaceState.artists.map(function (artist) {
      const meta = scheduleStatusInfo(artist);
      const isActive = scheduleWorkspaceState.view === "artist" && artist.id === scheduleWorkspaceState.activeArtistId;
      return '<button class="schedule-artist-tab ' + meta.status + (isActive ? ' active' : '') + '" type="button" role="tab" aria-selected="' + (isActive ? 'true' : 'false') + '" data-schedule-artist="' + escapeHtml(artist.id) + '"><span><i data-lucide="user-round"></i>' + escapeHtml(artist.name) + '</span><small>' + artist.contracts.length + ' 份 · ' + meta.label + '</small></button>';
    }).join("");
    refs.scheduleAddArtist.disabled = scheduleWorkspaceState.artists.length >= maxArtists;
    refs.scheduleAddArtist.title = refs.scheduleAddArtist.disabled ? "最多管理 " + maxArtists + " 位艺人" : "添加艺人";
    const allButton = document.querySelector('[data-schedule-view="all"]');
    if (allButton) allButton.classList.toggle("active", scheduleWorkspaceState.view === "all");
    const deleteButton = document.querySelector("[data-schedule-delete-artist]");
    if (deleteButton) deleteButton.disabled = scheduleWorkspaceState.artists.length <= 1;
    const copyButton = document.querySelector("[data-schedule-copy-artist]");
    if (copyButton) copyButton.disabled = scheduleWorkspaceState.artists.length >= maxArtists;
    iconRefresh();
  }

  function scheduleClosePopovers(exceptName) {
    document.querySelectorAll("[data-schedule-popover]").forEach(function (popover) {
      if (popover.dataset.schedulePopover === exceptName) return;
      popover.hidden = true;
    });
    document.querySelectorAll("[data-schedule-menu]").forEach(function (trigger) {
      if (trigger.dataset.scheduleMenu !== exceptName) trigger.setAttribute("aria-expanded", "false");
    });
  }

  function renderScheduleCurrent() {
    const artist = scheduleCurrentArtist();
    if (!artist) return;
    scheduleWorkspaceState.view = "artist";
    refs.scheduleWorkspace.classList.remove("all-view");
    applyScheduleSnapshot(artist);
    renderScheduleArtistBar();
    const issues = artist.validationAttempted ? validateScheduleSnapshot(artist) : [];
    if (issues.length) {
      const result = calculateSchedule(artist);
      renderScheduleResult(result);
      applyScheduleValidationIssues(result.issues || []);
    } else if (artist.calculated) {
      clearScheduleValidationUI();
      renderScheduleResult(calculateSchedule(artist));
    } else {
      clearScheduleValidationUI();
      refs.scheduleOutput.innerHTML = schedulePendingMarkup("录入通告后检查冲突", "切换艺人不会清空数据；完成输入后检查当前艺人的档期。");
      iconRefresh();
    }
  }

  function scheduleCompanyCalendar(rows) {
    const usableRows = rows.filter(function (row) { return row.result && row.result.assignments instanceof Map; });
    if (!usableRows.length) return '<div class="schedule-company-empty"><i data-lucide="calendar-search"></i><p><b>还没有可汇总的排程</b><span>先检查至少一位艺人的档期。</span></p></div>';
    const startDates = usableRows.map(function (row) { return scheduleParseDate(row.artist.startDate); }).filter(Boolean);
    const assignedDates = usableRows.reduce(function (all, row) { return all.concat(Array.from(row.result.assignments.keys()).map(scheduleParseDate)); }, []).filter(Boolean);
    const firstDate = new Date(Math.min.apply(null, startDates.map(function (date) { return date.getTime(); })));
    const lastDate = assignedDates.length ? new Date(Math.max.apply(null, assignedDates.map(function (date) { return date.getTime(); }))) : firstDate;
    const firstMonday = scheduleAddDays(firstDate, 1 - scheduleWeekday(firstDate));
    const totalWeeks = Math.max(1, Math.ceil((lastDate - firstMonday + 86400000) / (7 * 86400000)));
    const shownWeeks = Math.min(totalWeeks, 12);
    let html = '<div class="schedule-company-calendar">';
    for (let weekIndex = 0; weekIndex < shownWeeks; weekIndex++) {
      const weekStart = scheduleAddDays(firstMonday, weekIndex * 7);
      html += '<section class="schedule-company-week"><header><b>第 ' + (weekIndex + 1) + ' 周</b><span>' + scheduleDateLabel(weekStart) + '</span></header><div class="schedule-company-grid"><div class="schedule-company-corner">艺人</div>';
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const date = scheduleAddDays(weekStart, dayIndex);
        html += '<div class="schedule-company-day-head"><b>周' + data.scheduleCalculator.weekdayLabels[dayIndex] + '</b><span>' + scheduleDateLabel(date) + '</span></div>';
      }
      usableRows.forEach(function (row) {
        html += '<button class="schedule-company-artist" type="button" data-schedule-artist="' + escapeHtml(row.artist.id) + '">' + escapeHtml(row.artist.name) + '</button>';
        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
          const date = scheduleAddDays(weekStart, dayIndex);
          const assignment = row.result.assignments.get(scheduleIsoDate(date));
          html += '<div class="schedule-company-day' + (assignment ? ' assigned ' + assignment.status : '') + '">' + (assignment ? '<b title="' + escapeHtml(assignment.name) + '">' + escapeHtml(assignment.name) + '</b><span>' + (assignment.status === "existing" ? "已有" : "待接") + '</span>' : '<span>—</span>') + '</div>';
        }
      });
      html += '</div></section>';
    }
    html += '</div>';
    if (totalWeeks > shownWeeks) html += '<p class="schedule-hidden-weeks">后续 ' + (totalWeeks - shownWeeks) + ' 周未展开；各艺人的完整结果仍按全部档期计算。</p>';
    return html;
  }

  function renderScheduleOverview() {
    scheduleWorkspaceState.view = "all";
    refs.scheduleWorkspace.classList.add("all-view");
    renderScheduleArtistBar();
    const rows = scheduleWorkspaceState.artists.map(function (artist) {
      const meta = scheduleStatusInfo(artist);
      return { artist: artist, status: meta.status, label: meta.label, result: meta.result };
    });
    const severity = { blocked: 4, invalid: 3, risk: 2, pending: 1, safe: 0 };
    const overall = rows.slice().sort(function (a, b) { return severity[b.status] - severity[a.status]; })[0];
    const readyCount = rows.filter(function (row) { return row.result; }).length;
    const issueCount = rows.filter(function (row) { return row.status === "blocked" || row.status === "invalid" || row.status === "risk"; }).length;
    const overallTitle = !readyCount ? "等待检查艺人档期" : issueCount ? "有艺人需要调整档期" : "已检查艺人的档期可行";
    const cards = rows.map(function (row) {
      const result = row.result;
      const hasSchedule = result && Array.isArray(result.contracts);
      const candidateCount = hasSchedule ? result.contracts.filter(function (contract) { return contract.status === "candidate"; }).length : row.artist.contracts.filter(function (contract) { return contract.status === "candidate"; }).length;
      const completion = hasSchedule ? result.contracts.filter(function (contract) { return contract.completionDate; }).map(function (contract) { return contract.completionDate; }).sort().pop() : null;
      return '<button class="schedule-company-card ' + row.status + '" type="button" data-schedule-artist="' + escapeHtml(row.artist.id) + '"><header><span><i data-lucide="user-round"></i>' + escapeHtml(row.artist.name) + '</span><em>' + row.label + '</em></header><div><span>通告<b>' + row.artist.contracts.length + '</b></span><span>待接<b>' + candidateCount + '</b></span><span>已排<b>' + (hasSchedule ? result.assignedDays + '/' + result.totalDays : '—') + '</b></span><span>完成<b>' + (completion ? scheduleDateLabel(completion) : '—') + '</b></span></div></button>';
    }).join("");
    refs.scheduleOutput.innerHTML = '<div class="schedule-company-result ' + (overall ? overall.status : 'pending') + '"><header class="schedule-company-header"><div><p>公司档期</p><h3>' + overallTitle + '</h3><span>每位艺人拥有独立工作槽，同一天可分别执行不同通告。</span></div><button class="primary-button" type="button" data-schedule-calculate-all><i data-lucide="calendar-check-2"></i>检查全部艺人</button></header><div class="schedule-company-metrics"><div><span>艺人</span><b>' + rows.length + ' / ' + (data.scheduleCalculator.maxArtists || 3) + '</b></div><div><span>已检查</span><b>' + readyCount + '</b></div><div><span>需处理</span><b>' + issueCount + '</b></div></div><div class="schedule-company-cards">' + cards + '</div><section class="schedule-result-section"><div class="schedule-result-heading"><div><p>并行排程</p><h4>全员周历</h4></div><span>跨艺人同日不冲突</span></div>' + scheduleCompanyCalendar(rows) + '</section><footer class="schedule-evidence-note"><i data-lucide="shield-alert"></i><p>全员总览只合并三位艺人的时间安排，不计算公司资金、通告场所或游戏签约数量限制。</p></footer></div>';
    iconRefresh();
  }

  function scheduleSwitchArtist(artistId) {
    if (scheduleWorkspaceState.view === "artist" && scheduleCurrentArtist()) scheduleCommitForm(false);
    if (!scheduleWorkspaceState.artists.some(function (artist) { return artist.id === artistId; })) return;
    scheduleWorkspaceState.activeArtistId = artistId;
    scheduleWorkspaceState.view = "artist";
    saveScheduleWorkspace();
    renderScheduleCurrent();
  }

  function scheduleAddArtist(copySettings) {
    const maxArtists = data.scheduleCalculator.maxArtists || 3;
    if (scheduleWorkspaceState.artists.length >= maxArtists) return;
    if (scheduleWorkspaceState.view === "artist") scheduleCommitForm(false);
    const source = scheduleCurrentArtist();
    const name = "艺人 " + String.fromCharCode(65 + scheduleWorkspaceState.artists.length);
    const artist = scheduleInitialSnapshot(name);
    if (copySettings && source) {
      artist.startDate = source.startDate;
      artist.bufferSlots = source.bufferSlots;
    }
    scheduleWorkspaceState.artists.push(artist);
    scheduleWorkspaceState.activeArtistId = artist.id;
    scheduleWorkspaceState.view = "artist";
    saveScheduleWorkspace();
    renderScheduleCurrent();
    refs.scheduleForm.elements.artist.focus();
    refs.scheduleForm.elements.artist.select();
  }

  function renderScheduleCalculator() {
    scheduleWorkspaceState = restoreScheduleWorkspace();
    saveScheduleWorkspace();
    if (scheduleWorkspaceState.view === "all") renderScheduleOverview();
    else renderScheduleCurrent();
    window.STARDOM_SCHEDULE_CALCULATOR = Object.freeze({
      calculate: calculateSchedule,
      calculateAll: function (workspace) { return workspace.artists.map(calculateSchedule); }
    });
  }

  function bindEvents() {
    document.addEventListener("click", function (event) {
      const nav = event.target.closest("[data-route]");
      if (nav) navigate(nav.dataset.route);
      const jump = event.target.closest("[data-route-jump]");
      if (jump) navigate(jump.dataset.routeJump);

      const validationJump = event.target.closest("[data-validation-jump]");
      if (validationJump) {
        focusScheduleIssue(scheduleVisibleIssues[Number(validationJump.dataset.validationJump)]);
        return;
      }
      if (event.target.closest("[data-validation-first]")) {
        focusScheduleIssue(scheduleVisibleIssues[0]);
        return;
      }

      const scheduleMenu = event.target.closest("[data-schedule-menu]");
      if (scheduleMenu) {
        const name = scheduleMenu.dataset.scheduleMenu;
        const popover = document.querySelector('[data-schedule-popover="' + name + '"]');
        const shouldOpen = popover ? popover.hidden : false;
        scheduleClosePopovers();
        if (popover && shouldOpen) {
          popover.hidden = false;
          scheduleMenu.setAttribute("aria-expanded", "true");
        }
        return;
      }
      if (!event.target.closest(".schedule-menu-wrap")) scheduleClosePopovers();

      const scheduleArtist = event.target.closest("[data-schedule-artist]");
      if (scheduleArtist) {
        scheduleSwitchArtist(scheduleArtist.dataset.scheduleArtist);
        return;
      }
      if (event.target.closest('[data-schedule-view="all"]')) {
        if (scheduleWorkspaceState.view === "artist") scheduleCommitForm(false);
        scheduleWorkspaceState.view = "all";
        saveScheduleWorkspace();
        renderScheduleOverview();
        return;
      }
      if (event.target.closest("#schedule-add-artist")) {
        scheduleAddArtist(false);
        return;
      }
      if (event.target.closest("[data-schedule-copy-artist]")) {
        scheduleClosePopovers();
        scheduleAddArtist(true);
        return;
      }
      if (event.target.closest("[data-schedule-calculate-all]")) {
        scheduleWorkspaceState.artists.forEach(function (artist) {
          artist.calculated = true;
          artist.validationAttempted = true;
        });
        const firstIssue = scheduleWorkspaceState.artists.reduce(function (found, artist) {
          return found || validateScheduleSnapshot(artist)[0] || null;
        }, null);
        saveScheduleWorkspace();
        renderScheduleOverview();
        if (firstIssue) focusScheduleIssue(firstIssue);
        return;
      }

      const scheduleAdd = event.target.closest("[data-schedule-add]");
      if (scheduleAdd) {
        const snapshot = readScheduleSnapshot();
        snapshot.contracts.push(scheduleDefaultContract(scheduleAdd.dataset.scheduleAdd));
        snapshot.calculated = false;
        scheduleReplaceArtist(snapshot);
        applyScheduleSnapshot(snapshot);
        saveScheduleWorkspace();
        renderScheduleArtistBar();
        renderScheduleDraftState(snapshot, "通告清单已更新", "检查当前艺人后生成新的逐日排程。");
        scheduleClosePopovers();
        const names = refs.scheduleContractList.querySelectorAll('[data-schedule-field="name"]');
        if (names.length) names[names.length - 1].focus();
        iconRefresh();
        return;
      }
      const scheduleRemove = event.target.closest("[data-schedule-remove]");
      if (scheduleRemove) {
        const snapshot = readScheduleSnapshot();
        const row = scheduleRemove.closest("[data-schedule-contract]");
        snapshot.contracts = snapshot.contracts.filter(function (contract) { return contract.id !== row.dataset.scheduleContract; });
        snapshot.calculated = false;
        scheduleReplaceArtist(snapshot);
        applyScheduleSnapshot(snapshot);
        saveScheduleWorkspace();
        renderScheduleArtistBar();
        renderScheduleDraftState(snapshot, "通告清单已更新", "检查当前艺人后生成新的逐日排程。");
        iconRefresh();
        return;
      }
      if (event.target.closest("[data-schedule-example]")) {
        const snapshot = scheduleExampleSnapshot(scheduleCurrentArtist());
        scheduleReplaceArtist(snapshot);
        applyScheduleSnapshot(snapshot);
        saveScheduleWorkspace();
        clearScheduleValidationUI();
        renderScheduleResult(calculateSchedule(snapshot));
        renderScheduleArtistBar();
        scheduleClosePopovers();
        return;
      }
      if (event.target.closest("[data-schedule-clear]")) {
        const current = scheduleCurrentArtist();
        if (!window.confirm("清空“" + current.name + "”的全部通告？艺人和基础日期会保留。")) return;
        const snapshot = {
          id: current.id,
          name: current.name,
          startDate: current.startDate,
          bufferSlots: current.bufferSlots,
          contracts: [],
          calculated: false,
          validationAttempted: false
        };
        scheduleReplaceArtist(snapshot);
        applyScheduleSnapshot(snapshot);
        saveScheduleWorkspace();
        renderScheduleDraftState(snapshot, "当前艺人尚无通告", "使用“添加通告”录入已有或待接工作。");
        renderScheduleArtistBar();
        scheduleClosePopovers();
        iconRefresh();
        return;
      }
      if (event.target.closest("[data-schedule-delete-artist]")) {
        if (scheduleWorkspaceState.artists.length <= 1) return;
        const current = scheduleCurrentArtist();
        if (!window.confirm("删除艺人“" + current.name + "”及其全部档期数据？")) return;
        const index = scheduleWorkspaceState.artists.findIndex(function (artist) { return artist.id === current.id; });
        scheduleWorkspaceState.artists.splice(index, 1);
        scheduleWorkspaceState.activeArtistId = scheduleWorkspaceState.artists[Math.max(0, index - 1)].id;
        saveScheduleWorkspace();
        scheduleClosePopovers();
        renderScheduleCurrent();
        return;
      }

      const reset = event.target.closest("[data-reset-filter]");
      if (reset) resetFilters(reset.closest("[data-toolbar-kind]").dataset.toolbarKind);
      const clearAttributes = event.target.closest("[data-clear-attribute-filter]");
      if (clearAttributes) {
        const toolbar = clearAttributes.closest("[data-toolbar-kind]");
        const name = clearAttributes.dataset.clearAttributeFilter;
        toolbar.querySelectorAll('input[name="' + name + '"]').forEach(function (input) { input.checked = false; });
        const kind = toolbar.dataset.toolbarKind;
        state.filters[kind] = readToolbar(kind);
        updateToolbarControlMeta(toolbar);
        renderTable(kind);
      }
      const emptyReset = event.target.closest("[data-empty-reset]");
      if (emptyReset) resetFilters(emptyReset.dataset.emptyReset);
      const sort = event.target.closest("[data-sort-kind]");
      if (sort) cycleSort(sort.dataset.sortKind, sort.dataset.sortKey);

      const row = event.target.closest("tr[data-item-id]");
      if (row) openDrawer(row.dataset.kind, row.dataset.itemId);

    });

    document.addEventListener("input", function (event) {
      const toolbar = event.target.closest("[data-toolbar-kind]");
      if (!toolbar || !event.target.matches('input[type="search"]')) return;
      const kind = toolbar.dataset.toolbarKind;
      window.clearTimeout(filterSearchTimers[kind]);
      filterSearchTimers[kind] = window.setTimeout(function () {
        state.filters[kind] = readToolbar(kind);
        renderTable(kind);
      }, 140);
    });

    document.addEventListener("change", function (event) {
      const explorerControl = event.target.closest("[data-explorer-control]");
      if (explorerControl) {
        state.explorer[explorerControl.dataset.explorerControl] = explorerControl.value;
        renderAttributeExplorer();
        return;
      }
      const toolbar = event.target.closest("[data-toolbar-kind]");
      if (!toolbar || event.target.matches('input[type="search"]')) return;
      const kind = toolbar.dataset.toolbarKind;
      state.filters[kind] = readToolbar(kind);
      updateToolbarControlMeta(toolbar);
      renderTable(kind);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        scheduleClosePopovers();
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
          window.clearTimeout(filterSearchTimers[kind]);
          state.filters[kind] = readToolbar(kind);
          renderTable(kind);
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
    refs.plannerForm.addEventListener("change", function (event) {
      if (event.target.name === "activityPreset" && event.target.value) {
        setPlannerActivitySelection(event.target.value);
        event.target.value = "";
      }
      updateActivitySelectionSummary();
      savePlanner(plannerSnapshot(), null);
    });
    refs.plannerForm.addEventListener("submit", function (event) {
      event.preventDefault();
      const snapshot = plannerSnapshot();
      const result = generatePlannerResult(snapshot);
      renderPlannerResult(result);
      savePlanner(snapshot, result);
    });
    refs.scheduleForm.addEventListener("input", function () {
      const snapshot = scheduleCommitForm(true);
      refs.scheduleSubmitLabel.textContent = "检查" + snapshot.name + "档期";
      renderScheduleArtistBar();
      renderScheduleDraftState(snapshot);
    });
    refs.scheduleForm.addEventListener("change", function () {
      const snapshot = scheduleCommitForm(true);
      refs.scheduleSubmitLabel.textContent = "检查" + snapshot.name + "档期";
      renderScheduleArtistBar();
      renderScheduleDraftState(snapshot);
    });
    refs.scheduleForm.addEventListener("submit", function (event) {
      event.preventDefault();
      const snapshot = readScheduleSnapshot();
      snapshot.calculated = true;
      snapshot.validationAttempted = true;
      scheduleReplaceArtist(snapshot);
      const result = calculateSchedule(snapshot);
      renderScheduleResult(result);
      saveScheduleWorkspace();
      renderScheduleArtistBar();
      if (result.status === "invalid") {
        applyScheduleValidationIssues(result.issues || []);
        focusScheduleIssue((result.issues || [])[0]);
      } else clearScheduleValidationUI();
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
    document.getElementById("nav-activity-count").textContent = data.jobs.length + data.trainings.length;
    renderOverview();
    renderAttributeExplorer();
    renderLibrary("awards");
    renderJobProgression();
    renderLibrary("jobs");
    renderLibrary("trainings");
    renderPlannerForm();
    renderScheduleCalculator();
    bindEvents();
    navigate(window.location.hash.replace("#", "") || "overview", false);
    iconRefresh();
  }

  initialize();
})();
