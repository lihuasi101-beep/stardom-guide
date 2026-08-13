(function () {
  const attributes = {
    acting: "演技",
    singing: "歌艺",
    appearance: "仪态",
    temperament: "气质",
    wisdom: "智慧",
    confidence: "自信",
    morality: "道德",
    athletics: "运动",
    sexiness: "性感",
    rebellion: "叛逆",
    pressure: "压力",
    fame: "名气"
  };

  const sources = {
    "SRC-OFFICIAL-MANUAL": {
      title: "Softstar《明星志愿》官方说明书扫描件",
      type: "官方说明书",
      url: "https://archive.org/details/star-dream-manual-cht",
      note: "印刷页 18-23 已复核奖项、12 项打工和说明书记载的 10 项训练。"
    },
    "SRC-TARGET-BUILD-RESOURCE": {
      title: "指纹一致的目标构建资源",
      type: "本地只读证据",
      url: "",
      note: "STARFON.MKB 含额外训练槽标签，但实际跑测未出现对应项目，当前不计入有效训练目录。"
    },
    "SRC-TARGET-BUILD-SAVE": {
      title: "目标构建受控槽位样本",
      type: "本地实测",
      url: "",
      note: "只读存档矩阵确认部分工资码；不修改游戏存档。"
    },
    "SRC-BAHA-TEST-2017": {
      title: "巴哈姆特《明星志愿1攻略极限》",
      type: "玩家单一实测",
      url: "https://forum.gamer.com.tw/C.php?bsn=866&snA=22790",
      note: "部分训练和登台作秀数值仍需在目标构建重复验证。"
    },
    "SRC-BAHA-SYSTEM-2015": {
      title: "巴哈姆特《明星志愿1－攻略整理》",
      type: "社区整理",
      url: "https://forum.gamer.com.tw/C.php?bsn=866&snA=22448",
      note: "记录处理事务、普通外出地点与随机公关 NPC；作者说明内容整理自其他攻略。"
    },
    "SRC-TIEBA-WORK-2022": {
      title: "百度贴吧《明星志愿1的通告和综艺》",
      type: "玩家流程实测",
      url: "https://tieba.baidu.com/p/8176092199",
      note: "记录公司属性检查点、公关增长数值和打工项目开放过程；不等同于程序公式。"
    },
    "SRC-USER-JOB-TABLE-2026-08-04": {
      title: "《打工项目》精确数值表",
      type: "用户提供截图",
      url: "assets/job-values-reference.png",
      note: "覆盖 12 项打工的门槛、属性增减、压力、名气、能力加权和收入，并包含慈善义工的“有新闻”变体；未印幅度的减益项按 −1 录入。"
    },
    "SRC-USER-TRAINING-TABLE-2026-08-04": {
      title: "《训练项目》四级精确数值表",
      type: "用户提供截图",
      url: "assets/training-values-reference.png",
      note: "覆盖说明书记载的 10 项训练，列出初级、中级、高级、特级的两项属性提升与压力增加。"
    }
  };

  const awards = [
    {
      id: "award.best-ad-model",
      name: "最佳广告模特儿选拔",
      category: "广告/模特",
      month: 10,
      date: "10 月第二个星期日",
      primary: true,
      icon: "badge-cent",
      qualification: "九月底前至少拍过一部广告。",
      shortlist: "参赛明星先经初审；广告成绩前三名进入总决赛。",
      winner: "总决赛第一名取得奖杯。说明书未公开完整评分公式。",
      attributes: ["appearance", "temperament", "sexiness"],
      status: "official_partial",
      sourceRefs: ["SRC-OFFICIAL-MANUAL"]
    },
    {
      id: "award.photogenic",
      name: "最上镜头奖",
      category: "广告/模特",
      month: 10,
      date: "10 月第二个星期日",
      primary: false,
      icon: "camera",
      qualification: "随广告模特儿选拔产生；具体资格沿用该赛事。",
      shortlist: "官方说明书未单列入围数量。",
      winner: "获奖可提高公司形象与明星属性，但不计入董事长要求的三项大奖。",
      attributes: ["appearance", "temperament"],
      status: "official_partial",
      sourceRefs: ["SRC-OFFICIAL-MANUAL"]
    },
    {
      id: "award.best-song",
      name: "最佳金曲演唱奖",
      category: "音乐",
      month: 11,
      date: "11 月第二个星期日",
      primary: true,
      icon: "music-2",
      qualification: "当年度发行过唱片，并有作品进入票选前三。",
      shortlist: "唱片成绩最好的三个作品入围。",
      winner: "入围歌手在颁奖演唱会演唱入围歌曲，以歌艺及相关属性判定；第一名取得奖杯。",
      attributes: ["singing", "temperament", "confidence"],
      status: "official_partial",
      sourceRefs: ["SRC-OFFICIAL-MANUAL"]
    },
    {
      id: "award.new-singer",
      name: "鼓励新人奖",
      category: "音乐",
      month: 11,
      date: "11 月第二个星期日",
      primary: false,
      icon: "medal",
      qualification: "随最佳金曲演唱奖产生；新人资格与完整评分公式未公开。",
      shortlist: "官方说明书未单列入围规则。",
      winner: "属于鼓励性奖项，不计入董事长要求的三项大奖。",
      attributes: ["singing", "fame"],
      status: "official_partial",
      sourceRefs: ["SRC-OFFICIAL-MANUAL"]
    },
    {
      id: "award.film",
      name: "电影金像奖",
      category: "电影",
      month: 12,
      date: "12 月第二个星期日",
      primary: true,
      icon: "clapperboard",
      qualification: "当年度出演过电影，并有作品进入电影协会评选前三。",
      shortlist: "电影成绩最好的三个作品入围，并产生最佳男女主角候选。",
      winner: "依入围男女主角的各项相关属性与电影属性判定。",
      attributes: ["acting", "wisdom", "confidence"],
      status: "official_partial",
      sourceRefs: ["SRC-OFFICIAL-MANUAL"]
    },
    {
      id: "award.promising-newcomer",
      name: "潜力新人奖",
      category: "电影",
      month: 12,
      date: "12 月第二个星期日",
      primary: false,
      icon: "sparkles",
      qualification: "随电影金像奖产生；新人资格与完整评分公式未公开。",
      shortlist: "官方说明书未单列入围规则。",
      winner: "属于鼓励性奖项，不计入董事长要求的三项大奖。",
      attributes: ["acting", "fame"],
      status: "official_partial",
      sourceRefs: ["SRC-OFFICIAL-MANUAL"]
    },
    {
      id: "award.military-sweetheart",
      name: "军中情人",
      category: "票选",
      month: 3,
      date: "3 月 5-6 日",
      primary: false,
      icon: "heart",
      qualification: "由票选活动产生；说明书未给出最低参选门槛。",
      shortlist: "不采用三人入围制。",
      winner: "性感与气质是主要投票因素，其他属性也会影响；获奖增加名气。",
      attributes: ["sexiness", "temperament", "fame"],
      status: "official_partial",
      sourceRefs: ["SRC-OFFICIAL-MANUAL"]
    },
    {
      id: "award.student-sweetheart",
      name: "学生情人",
      category: "票选",
      month: 5,
      date: "5 月 20-21 日",
      primary: false,
      icon: "graduation-cap",
      qualification: "由票选活动产生；说明书未给出最低参选门槛。",
      shortlist: "不采用三人入围制。",
      winner: "智慧与气质是主要投票因素，其他属性也会影响；获奖增加名气。",
      attributes: ["wisdom", "temperament", "fame"],
      status: "official_partial",
      sourceRefs: ["SRC-OFFICIAL-MANUAL"]
    }
  ];

  const jobSeeds = [
    { id: "company_business", name: "公司事务", icon: "briefcase-business", requirement: "无", unlockStage: "初始可用", income: 0, incomeCode: 0, abilityWeight: 0, exact: { wisdom: 1, temperament: 1, athletics: -1, rebellion: -1, pressure: -1, fame: -1 } },
    { id: "street_performance", name: "街头表演", icon: "mic-vocal", requirement: "无", unlockStage: "初始可用", income: 600, incomeCode: 1, abilityWeight: 1, exact: { confidence: 2, acting: 1, temperament: -1, appearance: -1, pressure: 1, fame: 2 } },
    { id: "charity_volunteer", name: "慈善义工", icon: "heart-handshake", requirement: "无", unlockNote: "无属性要求；有新闻时触发强化效果。", unlockStage: "初始可用", income: 0, incomeCode: 0, abilityWeight: 1, exact: { morality: 2, temperament: 1, sexiness: -1, rebellion: -1, pressure: -1, fame: 3 }, variants: [{ name: "有新闻", requirement: "有新闻", abilityWeight: 4, exact: { morality: 4, temperament: 2, rebellion: -1, sexiness: -1, pressure: -1, fame: 6 } }] },
    { id: "extra_actor", name: "临时演员", icon: "clapperboard", requirement: "无", unlockStage: "初始可用", income: 800, incomeCode: 2, abilityWeight: 1, exact: { acting: 2, athletics: 1, confidence: -1, wisdom: -1, pressure: 2, fame: 2 } },
    { id: "dance_floor_dj", name: "舞池 DJ", icon: "disc-3", requirement: "运动 80", requirementAttribute: "athletics", requirementValue: 80, unlockStage: "属性门槛", income: 1000, incomeCode: 3, abilityWeight: 1, exact: { athletics: 2, rebellion: 1, temperament: -1, singing: -1, pressure: 3, fame: 3 } },
    { id: "backing_vocals", name: "幕后合音", icon: "audio-lines", requirement: "歌艺 80", requirementAttribute: "singing", requirementValue: 80, unlockStage: "属性门槛", income: 800, incomeCode: 2, abilityWeight: 2, exact: { singing: 3, appearance: 1, athletics: -1, acting: -1, pressure: 3, fame: 1 } },
    { id: "folk_restaurant", name: "民歌演唱", icon: "guitar", requirement: "歌艺 120", requirementAttribute: "singing", requirementValue: 120, unlockStage: "属性门槛", income: 800, incomeCode: 2, abilityWeight: 3, exact: { singing: 3, temperament: 2, sexiness: -1, athletics: -1, pressure: 3, fame: 4 } },
    { id: "voice_acting", name: "人物配音", icon: "radio", requirement: "智慧 100", requirementAttribute: "wisdom", requirementValue: 100, unlockStage: "属性门槛", income: 800, incomeCode: 2, abilityWeight: 3, exact: { wisdom: 2, acting: 2, singing: -1, sexiness: -1, pressure: 3, fame: 4 } },
    { id: "backup_dancer", name: "舞群伴舞", icon: "music", requirement: "运动 100", requirementAttribute: "athletics", requirementValue: 100, unlockStage: "属性门槛", income: 1200, incomeCode: 4, abilityWeight: 4, exact: { athletics: 3, confidence: 3, wisdom: -1, appearance: -1, pressure: 4, fame: 2 } },
    { id: "dance_hall_singing", name: "舞厅演唱", icon: "mic-2", requirement: "歌艺 120", requirementAttribute: "singing", requirementValue: 120, unlockStage: "属性门槛", income: 1000, incomeCode: 3, abilityWeight: 6, exact: { singing: 4, sexiness: 4, acting: -1, morality: -1, pressure: 4, fame: 5 } },
    { id: "art_photography", name: "艺术摄影", icon: "camera", requirement: "性感 100", requirementAttribute: "sexiness", requirementValue: 100, unlockStage: "属性门槛", income: 1500, incomeCode: 5, abilityWeight: 4, exact: { sexiness: 4, appearance: 2, morality: -1, confidence: -1, pressure: 5, fame: 5 } },
    { id: "stage_show", name: "登台作秀", icon: "star", requirement: "名气 200", requirementAttribute: "fame", requirementValue: 200, unlockStage: "属性门槛", income: 1500, incomeCode: 5, abilityWeight: 6, exact: { sexiness: 5, confidence: 3, temperament: -1, wisdom: -1, pressure: 5, fame: 6 } }
  ];

  const announcementProgression = {
    title: "通告成长路线",
    summary: "按已录入的 12 项打工硬门槛分成三段；覆盖率只统计这 12 项，不把尚未复测的电影、唱片、电视和广告合约资格混入百分比。",
    denominator: 12,
    stages: [
      { id: "early", name: "前期", target: "运动 80、歌艺 80、智慧 100", threshold: 80, coverage: 58, unlocked: 7, label: "打开基础收入与三条专长入口", focus: ["运动 80：舞池 DJ", "歌艺 80：幕后合音", "智慧 100：人物配音"], note: "连同 4 项无门槛打工，共可使用 7/12 项；名气 80 不是已确认的硬解锁门槛。" },
      { id: "mid", name: "中期", target: "歌艺 120、运动 100", threshold: 120, coverage: 83, unlocked: 10, label: "形成稳定的专长收入循环", focus: ["歌艺 120：民歌演唱 / 舞厅演唱", "运动 100：舞群伴舞"], note: "在前期基础上再开放 3 项，共覆盖 10/12 项；优先选择与角色定位相符的专长打工。" },
      { id: "late", name: "后期", target: "名气 200、性感 100；压力保持可控", threshold: 200, coverage: 100, unlocked: 12, label: "进入完整通告池与高收益阶段", focus: ["名气 200：登台作秀", "性感 100：艺术摄影"], note: "补齐最后 2 项后覆盖 12/12；高压力通告需要用休息或低压力训练调节。" }
    ],
    chains: [
      { attribute: "运动", key: "athletics", steps: ["80 · 舞池 DJ", "100 · 舞群伴舞"] },
      { attribute: "歌艺", key: "singing", steps: ["80 · 幕后合音", "120 · 民歌演唱 / 舞厅演唱"] },
      { attribute: "智慧", key: "wisdom", steps: ["100 · 人物配音"] },
      { attribute: "性感", key: "sexiness", steps: ["100 · 艺术摄影"] },
      { attribute: "名气", key: "fame", steps: ["200 · 登台作秀"] }
    ],
    nonNumeric: [
      "电影、唱片、电视、广告正式合约：目前只保留游戏中的作品成绩、属性要求和通告类型线索，尚无完整可复核的逐项数值门槛。",
      "奖项冲刺：作品进入年度前三比单纯属性更优先；属性目标应围绕当前作品的相关属性设置。"
    ],
    sourceRefs: ["SRC-USER-JOB-TABLE-2026-08-04", "SRC-BAHA-SYSTEM-2015", "SRC-OFFICIAL-MANUAL"]
  };

  const jobs = jobSeeds.map(function (item) {
    const effectKeys = Object.keys(item.exact);
    return {
      id: "activity.job." + item.id,
      type: "job",
      name: item.name,
      icon: item.icon,
      increase: effectKeys.filter(function (key) { return item.exact[key] > 0; }),
      decrease: effectKeys.filter(function (key) { return item.exact[key] < 0; }),
      income: item.income,
      incomeCode: item.incomeCode,
      abilityWeight: item.abilityWeight,
      unlockStage: item.unlockStage,
      requirement: item.requirement,
      requirementAttribute: item.requirementAttribute || null,
      requirementValue: item.requirementValue || null,
      unlock: item.unlockNote || (item.requirement === "无" ? "无属性要求。" : "要求：" + item.requirement + "。"),
      status: "user_supplied_exact",
      calculationEligible: false,
      estimateEligible: true,
      sourceRefs: ["SRC-OFFICIAL-MANUAL", "SRC-USER-JOB-TABLE-2026-08-04"],
      exact: item.exact,
      exactEvidence: "用户提供精确表",
      variants: item.variants || []
    };
  });

  const companyProgression = {
    title: "公司成长与打工解锁",
    summary: "打工项目是否出现不只看公关；游戏提示同时提到公司形象与公共关系。项目出现后，艺人仍须满足对应属性门槛。",
    imageMethods: [
      "秘书 → 公司交易处理 → 处理事务：花费 500 元并经过一天，可能提升公司形象、知名度或公共关系。",
      "玩家实测流程中，开放新的打工项目时会结算公司形象 +10。"
    ],
    publicRelationsMethods: [
      "普通地点遇到白衬衫眼镜男：花费 10,000 元关说，公共关系 +20。",
      "进入唱片、电影、电视、广告公司：每处公共关系 +5，四处合计 +20。"
    ],
    npcGuide: {
      confirmed: "眼镜男会在普通外出地点随机出现，目前没有确认固定星期。外出前存档，未遇到时可读档并更换地点。",
      neutralLocations: ["捷运车站", "西餐厅", "旅店街", "茶艺馆"],
      communityTip: "社区常称捷运车站较容易遇到，但尚无程序权重或批量对照实测；只作为优先尝试地点。"
    },
    checkpoints: [
      { image: "200", publicRelations: "10", result: "目标构建开局基线" },
      { image: "235", publicRelations: "75", result: "玩家流程已出现民歌演唱" },
      { image: "291", publicRelations: "150", result: "玩家流程解锁舞厅演唱" },
      { image: "约 300", publicRelations: "约 190", result: "玩家流程打工项目齐全" }
    ],
    caveat: "以上是可复现的流程检查点，不是每项工作的精确程序阈值。官方说明书未公开地点概率和完整解锁公式。",
    sourceRefs: ["SRC-OFFICIAL-MANUAL", "SRC-TARGET-BUILD-SAVE", "SRC-BAHA-SYSTEM-2015", "SRC-TIEBA-WORK-2022"]
  };

  const trainingSeeds = [
    { id: "etiquette", name: "礼仪训练", icon: "handshake", exact: { appearance: 2, morality: 1, pressure: 2 } },
    { id: "posture", name: "美姿训练", icon: "person-standing", exact: { appearance: 2, temperament: 2, pressure: 2 } },
    { id: "dance", name: "舞蹈训练", icon: "music-2", exact: { athletics: 2, rebellion: 1, pressure: 2 } },
    { id: "music_theory", name: "乐理训练", icon: "notebook-tabs", exact: { temperament: 2, wisdom: 1, pressure: 1 } },
    { id: "vocalization", name: "发音训练", icon: "mic-2", exact: { singing: 3, confidence: 1, pressure: 2 } },
    { id: "songwriting", name: "词曲训练", icon: "pen-line", exact: { singing: 2, temperament: 2, pressure: 3 } },
    { id: "instrument", name: "乐器训练", icon: "guitar", exact: { singing: 2, rebellion: 1, pressure: 2 } },
    { id: "expression", name: "表情训练", icon: "drama", exact: { acting: 2, sexiness: 2, pressure: 2 } },
    { id: "stage", name: "舞台训练", icon: "theater", exact: { acting: 3, athletics: 1, pressure: 3 } },
    { id: "photography", name: "摄影训练", icon: "camera", exact: { sexiness: 2, wisdom: 1, pressure: 2 } }
  ];

  const communityTestedTrainingIds = ["etiquette", "dance", "music_theory", "vocalization", "stage", "photography"];

  const trainings = trainingSeeds.map(function (item) {
    const effectKeys = item.exact ? Object.keys(item.exact) : [];
    const sourceRefs = ["SRC-OFFICIAL-MANUAL", "SRC-USER-TRAINING-TABLE-2026-08-04"];
    if (communityTestedTrainingIds.includes(item.id)) sourceRefs.push("SRC-BAHA-TEST-2017");
    return {
      id: "activity.training." + item.id,
      type: "training",
      name: item.name,
      icon: item.icon,
      increase: effectKeys.filter(function (key) { return item.exact[key] > 0; }),
      decrease: effectKeys.filter(function (key) { return item.exact[key] < 0; }),
      cost: null,
      tiers: ["初级", "中级", "高级", "特级"],
      unlockStage: "条件不明",
      unlock: "四级属性与压力数值已录入；升级条件和费用仍待目标构建校准。",
      status: "user_supplied_exact",
      calculationEligible: false,
      estimateEligible: true,
      sourceRefs: sourceRefs,
      exact: item.exact,
      exactEvidence: "用户提供精确表",
      tierMultipliers: item.exact ? [1, 2, 3, 4] : null
    };
  });

  window.STARDOM_DATA = {
    version: "2026.08-M6",
    updatedAt: "2026-08-07",
    gameVersion: "1995 DOS 原版 · 简体目标构建",
    attributes: attributes,
    sources: sources,
    awards: awards,
    jobs: jobs,
    announcementProgression: announcementProgression,
    companyProgression: companyProgression,
    trainings: trainings,
    planner: {
      status: "estimate_ready",
      eligibleActivityCount: 0,
      estimateActivityCount: 22,
      maxActionsPerWeek: 7,
      deadline: "1996-12-31",
      message: "使用 12 项打工和 10 项训练精确表估算；每次活动按 1 天计算，训练费用、成长上限与随机波动暂不计入。"
    }
  };
})();
