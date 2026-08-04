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
      note: "STARFON.MKB 确认第 11 项分镜训练及全部活动名称。"
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

  const jobs = [
    ["street_performance", "街头表演", "mic-vocal", ["confidence", "acting", "pressure", "fame"], ["temperament", "appearance"], null, 0],
    ["folk_restaurant", "民歌演唱", "guitar", ["singing", "temperament", "fame", "pressure"], ["sexiness", "athletics"], 600, 1],
    ["voice_acting", "人物配音", "radio", ["wisdom", "acting", "fame", "pressure"], ["singing", "sexiness"], null, 0],
    ["backing_vocals", "幕后合音", "audio-lines", ["singing", "appearance", "pressure", "fame"], ["athletics", "acting"], 800, 2],
    ["dance_floor_dj", "舞池 DJ", "disc-3", ["athletics", "rebellion", "fame", "pressure"], ["temperament", "singing"], 1000, 3],
    ["backup_dancer", "舞群伴舞", "music", ["athletics", "confidence", "pressure", "fame"], ["wisdom", "appearance"], 800, 2],
    ["art_photography", "艺术摄影", "camera", ["sexiness", "appearance", "fame", "pressure"], ["morality", "confidence"], 800, 2],
    ["company_business", "公司事务", "briefcase-business", ["wisdom", "appearance", "fame", "pressure"], ["athletics", "rebellion"], 800, 2],
    ["dance_hall_singing", "舞厅演唱", "mic-2", ["singing", "sexiness", "fame", "pressure"], ["acting", "morality"], 1200, 4],
    ["extra_actor", "临时演员", "clapperboard", ["acting", "athletics", "fame", "pressure"], ["confidence", "wisdom"], 1000, 3],
    ["charity_volunteer", "慈善义工", "heart-handshake", ["morality", "temperament", "fame", "pressure"], ["sexiness", "rebellion"], 1500, 5],
    ["stage_show", "登台作秀", "star", ["sexiness", "confidence", "fame", "pressure"], ["temperament", "wisdom"], 1500, 5]
  ].map(function (item) {
    const isStage = item[0] === "stage_show";
    return {
      id: "activity.job." + item[0],
      type: "job",
      name: item[1],
      icon: item[2],
      increase: item[3],
      decrease: item[4],
      income: item[5],
      incomeCode: item[6],
      unlockStage: isStage ? "后期候选" : "条件不明",
      unlock: isStage ? "玩家实测报告称名气 > 200，目标构建尚待重复验证。" : "具体解锁前置仍在目标构建校准中。",
      status: isStage ? "single_source_empirical" : (item[5] ? "partial_runtime" : "direction_only"),
      calculationEligible: false,
      sourceRefs: isStage
        ? ["SRC-OFFICIAL-MANUAL", "SRC-TARGET-BUILD-SAVE", "SRC-BAHA-TEST-2017"]
        : ["SRC-OFFICIAL-MANUAL", "SRC-TARGET-BUILD-SAVE"],
      exact: isStage ? { sexiness: 5, confidence: 3, fame: 6, pressure: 5, temperament: -1, wisdom: -1 } : null
    };
  });

  const trainingSeeds = [
    ["etiquette", "礼仪训练", "handshake", ["appearance", "morality", "pressure"], [], { appearance: 2, morality: 1, pressure: 2 }],
    ["posture", "美姿训练", "person-standing", ["appearance", "temperament", "pressure"], [], null],
    ["dance", "舞蹈训练", "music-2", ["athletics", "rebellion", "pressure"], [], { athletics: 2, rebellion: 1, pressure: 2 }],
    ["music_theory", "乐理训练", "notebook-tabs", ["temperament", "wisdom", "pressure"], [], { temperament: 2, wisdom: 1, pressure: 1 }],
    ["vocalization", "发音训练", "mic-2", ["singing", "confidence", "pressure"], [], { singing: 3, confidence: 1, pressure: 2 }],
    ["songwriting", "词曲训练", "pen-line", ["singing", "temperament", "pressure"], [], null],
    ["instrument", "乐器训练", "guitar", ["singing", "rebellion", "pressure"], [], null],
    ["expression", "表情训练", "drama", ["acting", "sexiness", "pressure"], [], null],
    ["stage", "舞台训练", "theater", ["acting", "athletics", "pressure"], [], { acting: 3, athletics: 1, pressure: 3 }],
    ["photography", "摄影训练", "camera", ["sexiness", "wisdom", "pressure"], [], { sexiness: 2, wisdom: 1, pressure: 2 }],
    ["storyboard", "分镜训练", "panels-top-left", [], [], null]
  ];

  const trainings = trainingSeeds.map(function (item) {
    const isStoryboard = item[0] === "storyboard";
    return {
      id: "activity.training." + item[0],
      type: "training",
      name: item[1],
      icon: item[2],
      increase: item[3],
      decrease: item[4],
      cost: null,
      tiers: ["初级", "中级", "高级", "特级"],
      unlockStage: "条件不明",
      unlock: isStoryboard ? "目标构建资源已确认课程存在，效果与解锁条件待校准。" : "训练等级存在，升级条件和费用仍待目标构建校准。",
      status: isStoryboard ? "unknown" : (item[5] ? "single_source_empirical" : "direction_only"),
      calculationEligible: false,
      sourceRefs: isStoryboard
        ? ["SRC-TARGET-BUILD-RESOURCE"]
        : (item[5] ? ["SRC-OFFICIAL-MANUAL", "SRC-BAHA-TEST-2017"] : ["SRC-OFFICIAL-MANUAL"]),
      exact: item[5],
      tierMultipliers: item[5] ? [1, 2, 3, 4] : null
    };
  });

  window.STARDOM_DATA = {
    version: "2026.08-M0",
    updatedAt: "2026-08-03",
    gameVersion: "1995 DOS 原版 · 简体目标构建",
    attributes: attributes,
    sources: sources,
    awards: awards,
    jobs: jobs,
    trainings: trainings,
    planner: {
      status: "calibrating",
      eligibleActivityCount: 0,
      message: "当前 23 项活动尚未达到重复实测准入门槛。规划器保留输入与诊断，但不会生成伪精确方案。"
    }
  };
})();
