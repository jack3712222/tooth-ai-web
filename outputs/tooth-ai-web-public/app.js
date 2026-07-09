let totalEpochs = 100;
let currentEpoch = 0;
let trainingTimer = null;
let isPaused = false;
let selectedDemo = "蛀牙";
let currentPreviewUrl = null;
let currentUploadFile = null;
let currentImageInfo = {
  name: "sample-cavity.png",
  type: "demo sample",
  size: "--",
};
let lastInferenceMs = "--";
let currentConfidence = 0;
const demoRecordKey = "toothAiDemoRecords";
const labels = ["蛀牙", "阻生智齒"];
const demoLabels = new Set(["蛀牙", "阻生智齒", "未偵測到目標"]);
const allowedOptimizers = new Set(["AdamW"]);
const allowedLearningRates = new Set(["0.001", "0.01", "0.0001"]);
const allowedBatchSizes = new Set(["8", "4"]);
const allowedImageTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/bmp", "image/gif", "application/dicom"]);
const maxUploadBytes = 8 * 1024 * 1024;
const comboResultCsv = `1,7.5,0.001,0.001,0.9,linear,10,0.7171,0.487,0.7327,0.7058,0.7188,0.4508,34.94,0.5486,0.8856
2,7.5,0.001,0.001,0.9,cosine,10,0.7089,0.4835,0.7417,0.6982,0.7191,0.4501,35.94,0.538,0.8797
3,7.5,0.001,0.01,0.9,linear,10,0.7166,0.4921,0.7467,0.6887,0.7155,0.4469,47.52,0.5434,0.8899
4,7.5,0.001,0.01,0.9,cosine,10,0.7108,0.4849,0.7279,0.7095,0.718,0.4474,34.3,0.5435,0.8781
5,7.5,0.001,0.1,0.9,linear,10,0.7123,0.4872,0.7323,0.7068,0.719,0.4485,34.48,0.5383,0.8864
6,7.5,0.001,0.1,0.9,cosine,10,0.7123,0.4859,0.7346,0.7024,0.7176,0.4479,34.44,0.5381,0.8865
7,7.5,0.001,0.001,0.937,linear,10,0.7097,0.4843,0.7247,0.7102,0.717,0.4476,39.38,0.5376,0.8819
8,7.5,0.001,0.001,0.937,cosine,10,0.7167,0.4892,0.7418,0.7009,0.7194,0.45,34.28,0.544,0.8893
9,7.5,0.001,0.01,0.937,linear,10,0.7125,0.4844,0.735,0.7006,0.7172,0.4413,34.31,0.5402,0.8848
10,7.5,0.001,0.01,0.937,cosine,10,0.7135,0.489,0.7285,0.7043,0.7157,0.4441,38.33,0.5389,0.8881
11,7.5,0.001,0.1,0.937,linear,10,0.7028,0.4795,0.7279,0.7029,0.7147,0.4397,37.01,0.5262,0.8793
12,7.5,0.001,0.1,0.937,cosine,10,0.7079,0.4832,0.7306,0.7036,0.7163,0.444,34.4,0.5357,0.8802
13,7.5,0.01,0.001,0.9,linear,10,0.7429,0.4976,0.6904,0.7303,0.7083,0.4282,50.98,0.5803,0.9056
14,7.5,0.01,0.001,0.9,cosine,10,0.7477,0.4992,0.6894,0.7364,0.7112,0.4355,45.32,0.5865,0.909
15,7.5,0.01,0.01,0.9,linear,10,0.7477,0.5016,0.7026,0.7288,0.7147,0.4431,34.42,0.5905,0.9048
16,7.5,0.01,0.01,0.9,cosine,10,0.7468,0.502,0.7149,0.7261,0.7197,0.4363,38.97,0.5891,0.9045
17,7.5,0.01,0.1,0.9,linear,10,0.7424,0.4974,0.6916,0.748,0.718,0.4409,39.99,0.5862,0.8986
18,7.5,0.01,0.1,0.9,cosine,10,0.748,0.5039,0.6913,0.7461,0.7169,0.443,59.34,0.5898,0.9062
19,7.5,0.01,0.001,0.937,linear,10,0.7429,0.5001,0.6969,0.7245,0.71,0.4366,59.4,0.584,0.9019
20,7.5,0.01,0.001,0.937,cosine,10,0.7443,0.5005,0.7136,0.7214,0.7168,0.4376,58.68,0.5868,0.9017
21,7.5,0.01,0.01,0.937,linear,10,0.7408,0.4966,0.6958,0.7295,0.712,0.4419,58.92,0.5826,0.899
22,7.5,0.01,0.01,0.937,cosine,10,0.7424,0.5009,0.696,0.7308,0.7125,0.4359,58.28,0.5803,0.9045
23,7.5,0.01,0.1,0.937,linear,10,0.7424,0.4969,0.6927,0.7265,0.7084,0.432,59.38,0.5818,0.9031
24,7.5,0.01,0.1,0.937,cosine,10,0.7443,0.5003,0.7041,0.7233,0.7133,0.4342,58.54,0.5858,0.9027
25,7.5,0.0001,0.001,0.9,linear,10,0.6858,0.4775,0.7156,0.6803,0.6964,0.4068,58.91,0.4802,0.8914
26,7.5,0.0001,0.001,0.9,cosine,10,0.6862,0.4778,0.7047,0.6882,0.6961,0.4063,58.14,0.4829,0.8895
27,7.5,0.0001,0.01,0.9,linear,10,0.6824,0.4748,0.7053,0.678,0.6909,0.4043,57.21,0.4779,0.8869
28,7.5,0.0001,0.01,0.9,cosine,10,0.6781,0.4707,0.7132,0.6713,0.6912,0.3966,56.85,0.4677,0.8885
29,7.5,0.0001,0.1,0.9,linear,10,0.6779,0.4718,0.6914,0.6805,0.6854,0.3926,56.59,0.4701,0.8856
30,7.5,0.0001,0.1,0.9,cosine,10,0.6849,0.4755,0.7132,0.6746,0.6925,0.4035,56.34,0.4766,0.8932
31,7.5,0.0001,0.001,0.937,linear,10,0.6811,0.4725,0.7116,0.6783,0.6939,0.4026,56.63,0.4661,0.8961
32,7.5,0.0001,0.001,0.937,cosine,10,0.6795,0.4723,0.6986,0.6792,0.6883,0.3981,56.36,0.4689,0.8902
33,7.5,0.0001,0.01,0.937,linear,10,0.6834,0.4717,0.707,0.6797,0.6925,0.3985,88.86,0.4706,0.8961
34,7.5,0.0001,0.01,0.937,cosine,10,0.6896,0.477,0.7136,0.6717,0.6916,0.4035,92.45,0.4919,0.8873
35,7.5,0.0001,0.1,0.937,linear,10,0.6833,0.4745,0.7136,0.6702,0.6904,0.3947,90.32,0.4744,0.8922
36,7.5,0.0001,0.1,0.937,cosine,10,0.6851,0.4746,0.7139,0.684,0.6982,0.4037,88.55,0.4755,0.8948
37,10,0.001,0.001,0.9,linear,10,0.714,0.4893,0.7319,0.7022,0.7164,0.4446,89.82,0.5386,0.8894
38,10,0.001,0.001,0.9,cosine,10,0.7148,0.4854,0.7318,0.7015,0.7161,0.4452,89.18,0.5416,0.888
39,10,0.001,0.01,0.9,linear,10,0.7153,0.4895,0.7395,0.7017,0.7192,0.4442,105,0.5417,0.889
40,10,0.001,0.01,0.9,cosine,10,0.7111,0.4864,0.7295,0.7052,0.7165,0.4435,88.82,0.5399,0.8822
41,10,0.001,0.1,0.9,linear,10,0.7098,0.4861,0.7193,0.7013,0.7099,0.4377,85.05,0.5369,0.8828
42,10,0.001,0.1,0.9,cosine,10,0.709,0.4861,0.7346,0.6938,0.7128,0.4412,87.62,0.5384,0.8796
43,10,0.001,0.001,0.937,linear,10,0.7101,0.4851,0.7193,0.7043,0.7114,0.4431,85,0.5417,0.8785
44,10,0.001,0.001,0.937,cosine,10,0.7192,0.4931,0.7191,0.7053,0.7118,0.4421,83.15,0.5538,0.8846
45,10,0.001,0.01,0.937,linear,10,0.7085,0.4838,0.7264,0.6946,0.7095,0.4321,81.64,0.5312,0.8858
46,10,0.001,0.01,0.937,cosine,10,0.707,0.4818,0.7263,0.7046,0.7149,0.4426,81.62,0.534,0.8799
47,10,0.001,0.1,0.937,linear,10,0.713,0.4885,0.7236,0.7055,0.714,0.4395,80.99,0.5338,0.8922
48,10,0.001,0.1,0.937,cosine,10,0.7077,0.4826,0.7226,0.6992,0.7104,0.4405,82.96,0.5362,0.8793
49,10,0.01,0.001,0.9,linear,10,0.7389,0.4941,0.677,0.734,0.7041,0.4257,80.16,0.5781,0.8998
50,10,0.01,0.001,0.9,cosine,10,0.7417,0.4945,0.7002,0.7195,0.7092,0.4317,80.7,0.5813,0.9021
51,10,0.01,0.01,0.9,linear,10,0.7391,0.4947,0.6892,0.7365,0.7114,0.4312,80.77,0.5755,0.9027
52,10,0.01,0.01,0.9,cosine,10,0.7409,0.4962,0.6835,0.7434,0.7114,0.4306,80.13,0.5803,0.9016
53,10,0.01,0.1,0.9,linear,10,0.7484,0.5029,0.689,0.7449,0.7146,0.4341,80.13,0.5791,0.9178
54,10,0.01,0.1,0.9,cosine,10,0.7442,0.4967,0.6948,0.7306,0.7104,0.4295,83.49,0.5767,0.9116
55,10,0.01,0.001,0.937,linear,10,0.743,0.4967,0.6938,0.7296,0.7106,0.4313,83.2,0.5743,0.9116
56,10,0.01,0.001,0.937,cosine,10,0.7428,0.4975,0.7033,0.7196,0.7102,0.429,107.72,0.5789,0.9066
57,10,0.01,0.01,0.937,linear,10,0.7336,0.4908,0.6753,0.735,0.7032,0.4253,109.01,0.5684,0.8989
58,10,0.01,0.01,0.937,cosine,10,0.7422,0.4974,0.6853,0.7414,0.7117,0.4343,110.58,0.5812,0.9032
59,10,0.01,0.1,0.937,linear,10,0.7462,0.4998,0.6939,0.7392,0.7148,0.4381,108.37,0.5871,0.9053
60,10,0.01,0.1,0.937,cosine,10,0.7493,0.4987,0.7016,0.7274,0.7138,0.4408,108.88,0.5957,0.9029
61,10,0.0001,0.001,0.9,linear,10,0.6776,0.4743,0.7031,0.6722,0.6869,0.3965,107.7,0.4722,0.883
62,10,0.0001,0.001,0.9,cosine,10,0.6777,0.4747,0.7043,0.6768,0.6899,0.3978,108.47,0.4722,0.8832
63,10,0.0001,0.01,0.9,linear,10,0.682,0.4734,0.7054,0.676,0.6898,0.3985,111.77,0.4803,0.8836
64,10,0.0001,0.01,0.9,cosine,10,0.6855,0.4765,0.7072,0.6817,0.6932,0.4014,417.89,0.4745,0.8965
65,10,0.0001,0.1,0.9,linear,10,0.6773,0.471,0.6921,0.6769,0.684,0.3902,421.49,0.4657,0.889
66,10,0.0001,0.1,0.9,cosine,10,0.6774,0.4719,0.7039,0.6749,0.6888,0.3949,39.29,0.4711,0.8836
67,10,0.0001,0.001,0.937,linear,10,0.6758,0.4679,0.702,0.6724,0.6862,0.3964,42.93,0.4674,0.8841
68,10,0.0001,0.001,0.937,cosine,10,0.6801,0.4709,0.7075,0.6724,0.689,0.3961,35.17,0.471,0.8893
69,10,0.0001,0.01,0.937,linear,10,0.6811,0.4748,0.6958,0.6802,0.6877,0.3937,35.47,0.4682,0.894
70,10,0.0001,0.01,0.937,cosine,10,0.6803,0.4707,0.7158,0.6677,0.6905,0.401,39.76,0.4715,0.8891
71,10,0.0001,0.1,0.937,linear,10,0.6774,0.4703,0.6921,0.6809,0.6861,0.3941,83.39,0.4669,0.8879
72,10,0.0001,0.1,0.937,cosine,10,0.6798,0.4734,0.7027,0.6775,0.6893,0.3972,65.6,0.4718,0.8878`;

const comboResults = comboResultCsv.trim().split("\n").map((line) => {
  const [id, box, lr0, weightDecay, momentum, scheduler, runs, map50, map5095, precision, recall, f1, accuracy, time, cavityAp50, wisdomAp50] = line.split(",");
  return {
    id: Number(id),
    box: Number(box),
    lr0: Number(lr0),
    weightDecay: Number(weightDecay),
    momentum: Number(momentum),
    scheduler,
    runs: Number(runs),
    map50: Number(map50),
    map5095: Number(map5095),
    precision: Number(precision),
    recall: Number(recall),
    f1: Number(f1),
    accuracy: Number(accuracy),
    time: Number(time),
    cavityAp50: Number(cavityAp50),
    wisdomAp50: Number(wisdomAp50),
  };
});

const predictionProfiles = {
  "蛀牙": [88, 12],
  "阻生智齒": [14, 86],
  "未偵測到目標": [0, 0],
};

const els = {
  runTrainingBtn: document.querySelector("#runTrainingBtn"),
  resetTrainingBtn: document.querySelector("#resetTrainingBtn"),
  progressText: document.querySelector("#progressText"),
  progressBar: document.querySelector("#progressBar"),
  epochValue: document.querySelector("#epochValue"),
  epochState: document.querySelector("#epochState"),
  lossValue: document.querySelector("#lossValue"),
  accValue: document.querySelector("#accValue"),
  trainingState: document.querySelector("#trainingState"),
  bestAccuracy: document.querySelector("#bestAccuracy"),
  cliLog: document.querySelector("#cliLog"),
  chart: document.querySelector("#trainingChart"),
  chartTooltip: document.querySelector("#chartTooltip"),
  frontendStatus: document.querySelector("#frontendStatus"),
  apiStatus: document.querySelector("#apiStatus"),
  modelStatus: document.querySelector("#modelStatus"),
  slicerBridgeStatus: document.querySelector("#slicerBridgeStatus"),
  checkSystemBtn: document.querySelector("#checkSystemBtn"),
  modelModal: document.querySelector("#modelModal"),
  openModelModalBtn: document.querySelector("#openModelModalBtn"),
  closeModelModalBtn: document.querySelector("#closeModelModalBtn"),
  archSimpleBtn: document.querySelector("#archSimpleBtn"),
  archFullBtn: document.querySelector("#archFullBtn"),
  simpleArch: document.querySelector("#simpleArch"),
  fullArch: document.querySelector("#fullArch"),
  dataImageModal: document.querySelector("#dataImageModal"),
  dataImagePreview: document.querySelector("#dataImagePreview"),
  dataImageTitle: document.querySelector("#dataImageTitle"),
  dataImageMeta: document.querySelector("#dataImageMeta"),
  closeDataImageModalBtn: document.querySelector("#closeDataImageModalBtn"),
  dataImageFolderInput: document.querySelector("#dataImageFolderInput"),
  localImageStatus: document.querySelector("#localImageStatus"),
  dataSearchInput: document.querySelector("#dataSearchInput"),
  dataSplitFilter: document.querySelector("#dataSplitFilter"),
  dataClassFilter: document.querySelector("#dataClassFilter"),
  dataRecordTableBody: document.querySelector("#dataRecordTableBody"),
  dataBrowserSummary: document.querySelector("#dataBrowserSummary"),
  dataPrevBtn: document.querySelector("#dataPrevBtn"),
  dataNextBtn: document.querySelector("#dataNextBtn"),
  dataPageInfo: document.querySelector("#dataPageInfo"),
  predictionValue: document.querySelector("#predictionValue"),
  confidenceValue: document.querySelector("#confidenceValue"),
  heroPrediction: document.querySelector("#heroPrediction"),
  heroConfidence: document.querySelector("#heroConfidence"),
  probList: document.querySelector("#probList"),
  predictBtn: document.querySelector("#predictBtn"),
  imageUpload: document.querySelector("#imageUpload"),
  apiBaseInput: document.querySelector("#apiBaseInput"),
  previewBox: document.querySelector("#previewBox"),
  previewLabel: document.querySelector("#previewLabel"),
  pipelineResult: document.querySelector("#pipelineResult"),
  lrInput: document.querySelector("#lrInput"),
  batchInput: document.querySelector("#batchInput"),
  epochInput: document.querySelector("#epochInput"),
  optimizerInput: document.querySelector("#optimizerInput"),
  configSummary: document.querySelector("#configSummary"),
  pauseTrainingBtn: document.querySelector("#pauseTrainingBtn"),
  fastTrainingBtn: document.querySelector("#fastTrainingBtn"),
  epochTableBody: document.querySelector("#epochTableBody"),
  comboSelect: document.querySelector("#comboSelect"),
  comboSort: document.querySelector("#comboSort"),
  metricSelect: document.querySelector("#metricSelect"),
  chartMode: document.querySelector("#chartMode"),
  chartTitle: document.querySelector("#chartTitle"),
  selectedMetricLabel: document.querySelector("#selectedMetricLabel"),
  selectedComboTitle: document.querySelector("#selectedComboTitle"),
  selectedComboParams: document.querySelector("#selectedComboParams"),
  selectedMap50: document.querySelector("#selectedMap50"),
  selectedMap5095: document.querySelector("#selectedMap5095"),
  selectedPrecision: document.querySelector("#selectedPrecision"),
  selectedRecall: document.querySelector("#selectedRecall"),
  selectedF1: document.querySelector("#selectedF1"),
  selectedTime: document.querySelector("#selectedTime"),
  selectedCavityAp: document.querySelector("#selectedCavityAp"),
  selectedWisdomAp: document.querySelector("#selectedWisdomAp"),
  cavityBar: document.querySelector("#cavityBar"),
  wisdomBar: document.querySelector("#wisdomBar"),
  goodComboList: document.querySelector("#goodComboList"),
  inferenceTime: document.querySelector("#inferenceTime"),
  topResult: document.querySelector("#topResult"),
  explainText: document.querySelector("#explainText"),
  exportReportBtn: document.querySelector("#exportReportBtn"),
  jumpDemoBtn: document.querySelector("#jumpDemoBtn"),
  slicerStatus: document.querySelector("#slicerStatus"),
  slicerScene: document.querySelector("#slicerScene"),
  slicerFindingBox: document.querySelector("#slicerFindingBox"),
  slicerFindingLabel: document.querySelector("#slicerFindingLabel"),
  imageNameValue: document.querySelector("#imageNameValue"),
  imageTypeValue: document.querySelector("#imageTypeValue"),
  imageSizeValue: document.querySelector("#imageSizeValue"),
  savedPredictionValue: document.querySelector("#savedPredictionValue"),
  savedConfidenceValue: document.querySelector("#savedConfidenceValue"),
  recordCountValue: document.querySelector("#recordCountValue"),
  saveDemoBtn: document.querySelector("#saveDemoBtn"),
  downloadRecordsBtn: document.querySelector("#downloadRecordsBtn"),
  clearRecordsBtn: document.querySelector("#clearRecordsBtn"),
  recordTableBody: document.querySelector("#recordTableBody"),
  manualPredictionInput: document.querySelector("#manualPredictionInput"),
  manualConfidenceInput: document.querySelector("#manualConfidenceInput"),
  applyEditBtn: document.querySelector("#applyEditBtn"),
};

const trainingHistory = {
  loss: [],
  accuracy: [],
};

let chartHitRegions = [];
let dataPage = 1;
const dataPageSize = 25;
const dentexRecords = Array.isArray(window.dentexRecords) ? window.dentexRecords : [];
const localImageUrls = new Map();

const metricConfigs = {
  map50: { label: "mAP@50", better: "higher", digits: 4 },
  map5095: { label: "mAP@50-95", better: "higher", digits: 4 },
  precision: { label: "Precision", better: "higher", digits: 4 },
  recall: { label: "Recall", better: "higher", digits: 4 },
  f1: { label: "F1", better: "higher", digits: 4 },
  accuracy: { label: "Accuracy", better: "higher", digits: 4 },
  cavityAp50: { label: "Cavity AP@50", better: "higher", digits: 4 },
  wisdomAp50: { label: "Wisdom Tooth AP@50", better: "higher", digits: 4 },
  time: { label: "Avg Time", better: "lower", digits: 2, suffix: " min" },
};

function appendLog(line) {
  if (!els.cliLog) return;
  els.cliLog.textContent += `\n${line}`;
  const maxLogLength = 16000;
  if (els.cliLog.textContent.length > maxLogLength) {
    els.cliLog.textContent = els.cliLog.textContent.slice(-maxLogLength);
  }
  els.cliLog.scrollTop = els.cliLog.scrollHeight;
}

function setStatusPill(element, state, text) {
  if (!element) return;
  element.classList.remove("online", "offline", "checking");
  element.classList.add(state);
  element.textContent = text;
}

function apiBaseUrl() {
  return (els.apiBaseInput?.value || "https://f266ef74df291e.lhr.life").trim().replace(/\/+$/, "");
}

async function fetchJsonWithTimeout(url, timeoutMs = 1800) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method: "GET", signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json().catch(() => ({}));
  } finally {
    window.clearTimeout(timer);
  }
}

async function checkSystemStatus() {
  setStatusPill(els.apiStatus, "checking", "API 檢查中");
  setStatusPill(els.modelStatus, "checking", "模型：檢查中");
  setStatusPill(els.slicerBridgeStatus, "checking", "3D Slicer：檢查中");
  const base = apiBaseUrl();

  try {
    await fetchJsonWithTimeout(`${base}/health`);
    setStatusPill(els.apiStatus, "online", "API 已連線");
    setStatusPill(els.modelStatus, "online", "模型：API 可呼叫");
  } catch (error) {
    setStatusPill(els.apiStatus, "offline", "API 未連線");
    setStatusPill(els.modelStatus, "offline", "模型：等待 API");
    setStatusPill(els.slicerBridgeStatus, "offline", "3D Slicer：等待 API");
    appendLog(`[status] API health check failed: ${error.message}`);
    return;
  }

  try {
    const slicer = await fetchJsonWithTimeout(`${base}/slicer/status`, 1500);
    setStatusPill(
      els.slicerBridgeStatus,
      slicer.connected ? "online" : "offline",
      slicer.connected ? "3D Slicer：已連線" : "3D Slicer：未連線",
    );
  } catch (error) {
    setStatusPill(els.slicerBridgeStatus, "offline", "3D Slicer：未連線");
    appendLog(`[status] Slicer status check failed: ${error.message}`);
  }
}

function openModelModal() {
  if (!els.modelModal) return;
  els.modelModal.classList.add("show");
  els.modelModal.setAttribute("aria-hidden", "false");
}

function closeModelModal() {
  if (!els.modelModal) return;
  els.modelModal.classList.remove("show");
  els.modelModal.setAttribute("aria-hidden", "true");
}

function setArchitectureMode(mode) {
  const full = mode === "full";
  if (els.simpleArch) els.simpleArch.hidden = full;
  if (els.fullArch) els.fullArch.hidden = !full;
  els.archSimpleBtn?.classList.toggle("active", !full);
  els.archFullBtn?.classList.toggle("active", full);
}

function recordImageName(record) {
  return String(record.image || "").split(/[\\/]/).pop();
}

function recordThumbUrl(record) {
  const imageName = recordImageName(record);
  const stem = imageName.replace(/\.[^.]+$/, "");
  return record.thumb || `dataset-thumbs/${stem}.jpg`;
}

function recordImageUrl(record) {
  return localImageUrls.get(recordImageName(record).toLowerCase()) || recordThumbUrl(record);
}

function openDataImageModal(record) {
  const url = recordImageUrl(record);
  if (!url || !els.dataImageModal || !els.dataImagePreview) return;
  if (els.dataImageTitle) els.dataImageTitle.textContent = recordImageName(record);
  els.dataImagePreview.src = url;
  els.dataImagePreview.alt = `${recordImageName(record)} 影像預覽`;
  if (els.dataImageMeta) {
    els.dataImageMeta.replaceChildren();
    [
      ["Split", record.split],
      ["蛀牙標註", `${record.cavity} 顆`],
      ["阻生智齒標註", `${record.wisdom_tooth} 顆`],
      ["總標註", `${record.total} 顆`],
    ].forEach(([label, value]) => {
      const item = document.createElement("div");
      const key = document.createElement("span");
      const text = document.createElement("strong");
      key.textContent = label;
      text.textContent = String(value);
      item.append(key, text);
      els.dataImageMeta.appendChild(item);
    });
  }
  els.dataImageModal.classList.add("show");
  els.dataImageModal.setAttribute("aria-hidden", "false");
}

function closeDataImageModal() {
  if (!els.dataImageModal) return;
  els.dataImageModal.classList.remove("show");
  els.dataImageModal.setAttribute("aria-hidden", "true");
  if (els.dataImagePreview) els.dataImagePreview.removeAttribute("src");
}

function loadLocalDatasetImages(event) {
  const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/"));
  localImageUrls.forEach((url) => URL.revokeObjectURL(url));
  localImageUrls.clear();
  files.forEach((file) => {
    localImageUrls.set(file.name.toLowerCase(), URL.createObjectURL(file));
  });
  const matched = dentexRecords.reduce((count, record) => count + (localImageUrls.has(recordImageName(record).toLowerCase()) ? 1 : 0), 0);
  if (els.localImageStatus) {
    els.localImageStatus.textContent = `已載入 ${files.length} 張本機照片，對上資料索引 ${matched} 張；會優先顯示本機檔案。`;
  }
  renderDataBrowser();
}

function filteredDentexRecords() {
  const query = (els.dataSearchInput?.value || "").trim().toLowerCase();
  const split = els.dataSplitFilter?.value || "all";
  const cls = els.dataClassFilter?.value || "all";
  return dentexRecords.filter((record) => {
    const matchesQuery = !query
      || String(record.id).toLowerCase().includes(query)
      || String(record.image).toLowerCase().includes(query);
    const matchesSplit = split === "all" || record.split === split;
    const matchesClass = cls === "all"
      || (cls === "cavity" && Number(record.cavity) > 0)
      || (cls === "wisdom_tooth" && Number(record.wisdom_tooth) > 0)
      || (cls === "both" && Number(record.cavity) > 0 && Number(record.wisdom_tooth) > 0);
    return matchesQuery && matchesSplit && matchesClass;
  });
}

function renderDataBrowser() {
  if (!els.dataRecordTableBody) return;
  const rows = filteredDentexRecords();
  const totalPages = Math.max(1, Math.ceil(rows.length / dataPageSize));
  dataPage = Math.min(Math.max(1, dataPage), totalPages);
  const start = (dataPage - 1) * dataPageSize;
  const pageRows = rows.slice(start, start + dataPageSize);
  els.dataRecordTableBody.replaceChildren();

  if (!pageRows.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 7;
    cell.textContent = "沒有符合條件的資料";
    row.appendChild(cell);
    els.dataRecordTableBody.appendChild(row);
  } else {
    pageRows.forEach((record, index) => {
      const row = document.createElement("tr");
      const orderCell = document.createElement("td");
      orderCell.textContent = String(start + index + 1);
      row.appendChild(orderCell);

      const imageCell = document.createElement("td");
      const imageButton = document.createElement("button");
      imageButton.type = "button";
      imageButton.className = "thumb-button";
      imageButton.setAttribute("aria-label", `查看 ${recordImageName(record)} 影像`);
      const image = document.createElement("img");
      image.className = "data-thumb";
      image.src = recordImageUrl(record);
      image.alt = recordImageName(record);
      image.loading = "lazy";
      imageButton.appendChild(image);
      imageButton.addEventListener("click", () => openDataImageModal(record));
      imageCell.appendChild(imageButton);
      row.appendChild(imageCell);

      [
        record.split,
        record.image,
        record.cavity,
        record.wisdom_tooth,
        record.total,
      ].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = String(value);
        row.appendChild(cell);
      });
      els.dataRecordTableBody.appendChild(row);
    });
  }

  const cavitySum = rows.reduce((sum, record) => sum + Number(record.cavity || 0), 0);
  const wisdomSum = rows.reduce((sum, record) => sum + Number(record.wisdom_tooth || 0), 0);
  if (els.dataBrowserSummary) {
    els.dataBrowserSummary.textContent = `目前顯示 ${rows.length} / ${dentexRecords.length} 張；蛀牙 ${cavitySum} 顆，阻生智齒 ${wisdomSum} 顆`;
  }
  if (els.dataPageInfo) els.dataPageInfo.textContent = `Page ${dataPage} / ${totalPages}`;
  if (els.dataPrevBtn) els.dataPrevBtn.disabled = dataPage <= 1;
  if (els.dataNextBtn) els.dataNextBtn.disabled = dataPage >= totalPages;
}

function resetDataBrowserPage() {
  dataPage = 1;
  renderDataBrowser();
}

function trainingConfig() {
  const epochs = Number(els.epochInput?.value || 100);
  const optimizer = els.optimizerInput?.value || "AdamW";
  const lr = els.lrInput?.value || "0.001";
  const batchSize = els.batchInput?.value || "8";
  return {
    optimizer: allowedOptimizers.has(optimizer) ? optimizer : "AdamW",
    lr: allowedLearningRates.has(lr) ? lr : "0.001",
    batchSize: allowedBatchSizes.has(batchSize) ? batchSize : "8",
    epochs: Number.isFinite(epochs) ? Math.min(200, Math.max(20, epochs)) : 100,
  };
}

function updateConfigSummary() {
  if (els.configSummary) {
    els.configSummary.textContent = "固定訓練設定：YOLOv8m, AdamW, imgsz=1280, batch=8, epochs=100；變動參數為 box、lr0、weight_decay、momentum、scheduler。";
  }
  updateTrainingUi();
}

function updateTrainingUi() {
  const selected = selectedComboResult();
  const metricKey = currentMetricKey();
  els.progressText.textContent = "Excel";
  els.progressBar.style.width = "100%";
  els.epochValue.textContent = String(selected.id);
  els.epochState.textContent = "72 combos / 720 runs";
  els.lossValue.textContent = `${selected.runs} / 10`;
  if (els.selectedMetricLabel) els.selectedMetricLabel.textContent = metricConfigs[metricKey].label;
  els.accValue.textContent = formatMetricValue(selected[metricKey], metricKey);
  els.trainingState.textContent = "Loaded";
  drawChart();
}

function currentMetricKey() {
  const key = els.metricSelect?.value || els.comboSort?.value || "map50";
  return metricConfigs[key] ? key : "map50";
}

function currentMetricConfig() {
  return metricConfigs[currentMetricKey()];
}

function formatMetricValue(value, key = currentMetricKey()) {
  const config = metricConfigs[key] || metricConfigs.map50;
  if (value === undefined || value === null || Number.isNaN(Number(value))) return "--";
  return `${Number(value).toFixed(config.digits)}${config.suffix || ""}`;
}

function formatAxisValue(value, key = currentMetricKey()) {
  if (key === "count") return String(Math.round(Number(value)));
  if (key === "time") return `${Number(value).toFixed(0)}m`;
  return `${(Number(value) * 100).toFixed(0)}%`;
}

function formatTooltipValue(value, key = currentMetricKey()) {
  if (key === "time") return `${Number(value).toFixed(2)} min`;
  return `${(Number(value) * 100).toFixed(2)}% (${Number(value).toFixed(4)})`;
}

function rankedCombosByMetric(metricKey = currentMetricKey()) {
  const config = metricConfigs[metricKey] || metricConfigs.map50;
  return [...comboResults].sort((a, b) => {
    if (config.better === "lower") return a[metricKey] - b[metricKey];
    return b[metricKey] - a[metricKey];
  });
}

function drawChart() {
  const canvas = els.chart;
  if (!canvas) return;
  chartHitRegions = [];
  hideChartTooltip();
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const metricKey = currentMetricKey();
  const metricConfig = currentMetricConfig();
  const mode = els.chartMode?.value || "ranking";
  if (els.chartTitle) {
    els.chartTitle.textContent = `72 組 ${metricConfig.label} ${mode === "distribution" ? "分布圖" : "排名圖"}`;
  }
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfdff";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#667085";
  ctx.font = "13px Segoe UI";
  ctx.fillText(metricConfig.label, 14, 24);

  if (mode === "distribution") {
    drawMetricDistribution(ctx, metricKey);
  } else {
    drawComboBars(ctx, metricKey);
  }

  ctx.fillStyle = "#2563eb";
  ctx.fillRect(width - 160, 18, 12, 12);
  ctx.fillText("selected", width - 142, 29);
  ctx.fillStyle = "#0f766e";
  ctx.fillRect(width - 82, 18, 12, 12);
  ctx.fillText("others", width - 64, 29);
}

function drawYAxis(ctx, { left, right, top, bottom, min, max, metricKey, label = "Combo" }) {
  ctx.strokeStyle = "#d8e0ea";
  ctx.fillStyle = "#667085";
  ctx.lineWidth = 1;
  ctx.font = "12px Segoe UI";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let i = 0; i <= 4; i += 1) {
    const ratio = i / 4;
    const value = max - (max - min) * ratio;
    const y = top + (bottom - top) * ratio;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
    ctx.fillText(formatAxisValue(value, metricKey), left - 8, y);
  }
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(label, left, bottom + 20);
}

function drawComboBars(ctx, metricKey = currentMetricKey()) {
  const selected = selectedComboResult();
  const rows = rankedCombosByMetric(metricKey);
  const values = rows.map((combo) => combo[metricKey]);
  const rangePadding = metricKey === "time" ? 2 : 0.005;
  const min = Math.min(...values) - rangePadding;
  const max = Math.max(...values) + rangePadding;
  const left = 64;
  const right = els.chart.width - 18;
  const top = 34;
  const bottom = els.chart.height - 28;
  drawYAxis(ctx, { left, right, top, bottom, min, max, metricKey });
  const barWidth = Math.max(2, (right - left) / rows.length - 2);
  rows.forEach((combo, index) => {
    const x = left + (index / rows.length) * (right - left);
    const normalized = (combo[metricKey] - min) / (max - min || 1);
    const y = bottom - normalized * (bottom - top);
    ctx.fillStyle = combo.id === selected.id ? "#2563eb" : "#0f766e";
    ctx.fillRect(x, y, barWidth, bottom - y);
    chartHitRegions.push({
      type: "combo",
      combo,
      rank: index + 1,
      metricKey,
      x,
      y,
      width: barWidth,
      height: bottom - y,
    });
  });
}

function drawMetricDistribution(ctx, metricKey = currentMetricKey()) {
  const selected = selectedComboResult();
  const values = comboResults.map((combo) => combo[metricKey]);
  const bins = 8;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const counts = Array.from({ length: bins }, () => 0);
  values.forEach((value) => {
    const index = Math.min(bins - 1, Math.floor(((value - min) / (max - min || 1)) * bins));
    counts[index] += 1;
  });
  const left = 64;
  const right = els.chart.width - 18;
  const top = 34;
  const bottom = els.chart.height - 28;
  const barWidth = Math.max(16, (right - left) / bins - 8);
  const maxCount = Math.max(...counts, 1);
  drawYAxis(ctx, { left, right, top, bottom, min: 0, max: maxCount, metricKey: "count", label: "Count" });
  counts.forEach((count, index) => {
    const x = left + index * ((right - left) / bins) + 3;
    const h = (count / maxCount) * (bottom - top);
    ctx.fillStyle = "#0f766e";
    ctx.fillRect(x, bottom - h, barWidth, h);
    ctx.fillStyle = "#334155";
    ctx.fillText(String(count), x + 2, bottom - h - 6);
    chartHitRegions.push({
      type: "bin",
      count,
      index,
      metricKey,
      min: min + ((max - min) / bins) * index,
      max: min + ((max - min) / bins) * (index + 1),
      x,
      y: bottom - h,
      width: barWidth,
      height: h,
    });
  });
  const selectedX = left + ((selected[metricKey] - min) / (max - min || 1)) * (right - left);
  ctx.strokeStyle = "#2563eb";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(selectedX, top);
  ctx.lineTo(selectedX, bottom);
  ctx.stroke();
}

function canvasPointFromEvent(event) {
  if (!els.chart) return null;
  const rect = els.chart.getBoundingClientRect();
  const scaleX = els.chart.width / rect.width;
  const scaleY = els.chart.height / rect.height;
  return {
    canvasX: (event.clientX - rect.left) * scaleX,
    canvasY: (event.clientY - rect.top) * scaleY,
    viewX: event.clientX - rect.left,
    viewY: event.clientY - rect.top,
  };
}

function chartRegionAtPoint(point) {
  if (!point) return null;
  return chartHitRegions.find((region) => (
    point.canvasX >= region.x
    && point.canvasX <= region.x + region.width
    && point.canvasY >= region.y
    && point.canvasY <= region.y + region.height
  ));
}

function showChartTooltip(region, point) {
  if (!els.chartTooltip || !region || !point) return;
  const metricKey = region.metricKey || currentMetricKey();
  const metricConfig = metricConfigs[metricKey] || metricConfigs.map50;
  if (region.type === "combo") {
    els.chartTooltip.innerHTML = `
      <strong>#${region.rank} Combo ${region.combo.id}</strong>
      <span>${metricConfig.label}: ${formatTooltipValue(region.combo[metricKey], metricKey)}</span>
      <small>${formatComboParams(region.combo)}</small>
    `;
  } else {
    els.chartTooltip.innerHTML = `
      <strong>${metricConfig.label} 分布</strong>
      <span>${formatTooltipValue(region.min, metricKey)} - ${formatTooltipValue(region.max, metricKey)}</span>
      <small>${region.count} 組參數落在此區間</small>
    `;
  }
  const tooltipWidth = 230;
  const left = Math.min(Math.max(els.chart.offsetLeft + point.viewX + 14, 8), els.chart.offsetLeft + els.chart.clientWidth - tooltipWidth);
  const top = Math.max(els.chart.offsetTop + point.viewY + 14, 8);
  els.chartTooltip.style.left = `${left}px`;
  els.chartTooltip.style.top = `${top}px`;
  els.chartTooltip.hidden = false;
}

function hideChartTooltip() {
  if (els.chartTooltip) els.chartTooltip.hidden = true;
}

function handleChartPointerMove(event) {
  const point = canvasPointFromEvent(event);
  const region = chartRegionAtPoint(point);
  if (!region) {
    hideChartTooltip();
    if (els.chart) els.chart.style.cursor = "default";
    return;
  }
  if (els.chart) els.chart.style.cursor = region.type === "combo" ? "pointer" : "default";
  showChartTooltip(region, point);
}

function handleChartClick(event) {
  const region = chartRegionAtPoint(canvasPointFromEvent(event));
  if (!region || region.type !== "combo") return;
  if (els.comboSelect) els.comboSelect.value = String(region.combo.id);
  renderComboResults();
  appendLog(`[chart] selected Combo ${region.combo.id} from ranking chart`);
}

function runTraining() {
  if (els.comboSelect) els.comboSelect.value = "60";
  renderComboResults();
  appendLog("[query] selected best Combo 60 from 72-combo Excel summary");
}

function selectedComboResult() {
  const selectedId = Number(els.comboSelect?.value || 60);
  return comboResults.find((combo) => combo.id === selectedId) || comboResults.find((combo) => combo.id === 60) || comboResults[0];
}

function populateComboSelect() {
  if (!els.comboSelect || els.comboSelect.childElementCount) return;
  comboResults.forEach((combo) => {
    const option = document.createElement("option");
    option.value = String(combo.id);
    option.textContent = `Combo ${combo.id}`;
    if (combo.id === 60) option.selected = true;
    els.comboSelect.appendChild(option);
  });
}

function sortedComboResults() {
  const sortMode = els.comboSort?.value || "map50";
  const rows = [...comboResults];
  const sorters = {
    id: (a, b) => a.id - b.id,
    map50: (a, b) => b.map50 - a.map50,
    map5095: (a, b) => b.map5095 - a.map5095,
    precision: (a, b) => b.precision - a.precision,
    recall: (a, b) => b.recall - a.recall,
    f1: (a, b) => b.f1 - a.f1,
    accuracy: (a, b) => b.accuracy - a.accuracy,
    cavityAp50: (a, b) => b.cavityAp50 - a.cavityAp50,
    wisdomAp50: (a, b) => b.wisdomAp50 - a.wisdomAp50,
    time: (a, b) => a.time - b.time,
  };
  return rows.sort(sorters[sortMode] || sorters.map50);
}

function formatComboParams(combo) {
  return `box=${combo.box.toFixed(1)}, lr0=${combo.lr0}, weight_decay=${combo.weightDecay.toFixed(3)}, momentum=${combo.momentum.toFixed(3)}, scheduler=${combo.scheduler}`;
}

function renderResultSummary(selected) {
  if (!selected) return;
  if (els.selectedComboTitle) els.selectedComboTitle.textContent = `Combo ${selected.id}`;
  if (els.selectedComboParams) els.selectedComboParams.textContent = formatComboParams(selected);
  if (els.selectedMap50) els.selectedMap50.textContent = selected.map50.toFixed(4);
  if (els.selectedMap5095) els.selectedMap5095.textContent = selected.map5095.toFixed(4);
  if (els.selectedPrecision) els.selectedPrecision.textContent = selected.precision.toFixed(4);
  if (els.selectedRecall) els.selectedRecall.textContent = selected.recall.toFixed(4);
  if (els.selectedF1) els.selectedF1.textContent = selected.f1.toFixed(4);
  if (els.selectedTime) els.selectedTime.textContent = `${selected.time.toFixed(2)} min`;
  if (els.selectedCavityAp) els.selectedCavityAp.textContent = selected.cavityAp50.toFixed(4);
  if (els.selectedWisdomAp) els.selectedWisdomAp.textContent = selected.wisdomAp50.toFixed(4);
  if (els.cavityBar) els.cavityBar.style.width = `${Math.max(0, Math.min(100, selected.cavityAp50 * 100))}%`;
  if (els.wisdomBar) els.wisdomBar.style.width = `${Math.max(0, Math.min(100, selected.wisdomAp50 * 100))}%`;

  if (els.goodComboList) {
    const metricKey = currentMetricKey();
    const metricConfig = metricConfigs[metricKey];
    els.goodComboList.replaceChildren();
    rankedCombosByMetric(metricKey)
      .slice(0, 5)
      .forEach((combo, index) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = combo.id === selected.id ? "good-combo selected" : "good-combo";
        item.dataset.combo = String(combo.id);
        item.textContent = `#${index + 1} Combo ${combo.id}  ${metricConfig.label} ${formatMetricValue(combo[metricKey], metricKey)}  F1 ${combo.f1.toFixed(4)}`;
        item.addEventListener("click", () => {
          if (els.comboSelect) els.comboSelect.value = String(combo.id);
          renderComboResults();
          appendLog(`[query] selected high-performing Combo ${combo.id}`);
        });
        els.goodComboList.appendChild(item);
      });
  }
}

function renderComboResults() {
  if (!els.epochTableBody) return;
  populateComboSelect();
  const selected = selectedComboResult();
  const metricKey = currentMetricKey();
  renderResultSummary(selected);
  els.progressText.textContent = "72 組結果";
  els.epochValue.textContent = String(selected.id);
  els.lossValue.textContent = `${selected.runs} / 10`;
  if (els.selectedMetricLabel) els.selectedMetricLabel.textContent = metricConfigs[metricKey].label;
  els.accValue.textContent = formatMetricValue(selected[metricKey], metricKey);
  els.epochTableBody.replaceChildren();
  sortedComboResults().forEach((combo) => {
    const row = document.createElement("tr");
    if (combo.id === selected.id) row.className = "selected-row";
    [
      combo.id,
      combo.box.toFixed(1),
      combo.lr0,
      combo.weightDecay.toFixed(3),
      combo.momentum.toFixed(3),
      combo.scheduler,
      `${combo.runs}/10`,
      combo.map50.toFixed(4),
      combo.map5095.toFixed(4),
      combo.precision.toFixed(4),
      combo.recall.toFixed(4),
      combo.f1.toFixed(4),
      combo.accuracy.toFixed(4),
      `${combo.time.toFixed(2)} min`,
      combo.cavityAp50.toFixed(4),
      combo.wisdomAp50.toFixed(4),
    ].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = String(value);
      row.appendChild(cell);
    });
    els.epochTableBody.appendChild(row);
  });
  updateTrainingUi();
}

function pauseTraining() {
  if (els.comboSort) els.comboSort.value = "id";
  renderComboResults();
  appendLog("[query] showing all 72 combos by Combo ID");
}

function fastFinishTraining() {
  const metricKey = currentMetricKey();
  if (els.comboSort) els.comboSort.value = metricKey;
  renderComboResults();
  updateTrainingUi();
  els.trainingState.textContent = "Ranked";
  const best = rankedCombosByMetric(metricKey)[0];
  appendLog(`[summary] 72-combo query sorted by ${metricConfigs[metricKey].label}; best Combo ${best.id}=${formatMetricValue(best[metricKey], metricKey)}`);
}

function resetTraining() {
  if (trainingTimer) {
    window.clearInterval(trainingTimer);
    trainingTimer = null;
  }
  currentEpoch = 0;
  isPaused = false;
  trainingHistory.loss = [];
  trainingHistory.accuracy = [];
  if (els.pauseTrainingBtn) els.pauseTrainingBtn.textContent = "依 Combo 編號";
  if (els.epochTableBody) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 16;
    cell.textContent = "Excel 72 組結果載入中";
    row.appendChild(cell);
    els.epochTableBody.replaceChildren(row);
  }
  if (els.cliLog) els.cliLog.textContent = `[ready] DENTEX YOLOv8 dashboard initialized
[data] source=DENTEX CHALLENGE 2023 quadrant-enumeration-disease
[convert] COCO JSON -> YOLO labels, names: cavity, wisdom_tooth
[model] YOLOv8m optimizer=AdamW imgsz=1280 batch_size=8 epochs=100
[runs] 72 combos, 720 individual runs, all combos completed 10/10
[result] best_combo=60 Test_mAP50=0.7493 Test_F1=0.7138
[reset] 72-combo result query reloaded`;
  renderComboResults();
  updateTrainingUi();
}

function renderProbabilities(profile) {
  els.probList.replaceChildren();
  labels.forEach((label, index) => {
    const value = profile[index];
    const item = document.createElement("div");
    item.className = "prob-item";
    const labelNode = document.createElement("strong");
    labelNode.textContent = label;
    const track = document.createElement("div");
    track.className = "prob-track";
    const fill = document.createElement("div");
    fill.style.width = `${Math.max(0, Math.min(100, Number(value) || 0))}%`;
    track.appendChild(fill);
    const valueNode = document.createElement("span");
    valueNode.textContent = `${value}%`;
    item.append(labelNode, track, valueNode);
    els.probList.appendChild(item);
  });
}

function clampConfidence(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "--";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function normalizePredictionLabel(label) {
  const value = String(label || "").toLowerCase().replace(/[\s-]+/g, "_");
  const map = {
    cavity: "蛀牙",
    caries: "蛀牙",
    wisdom_tooth: "阻生智齒",
    impacted_wisdom_tooth: "阻生智齒",
    wisdom: "阻生智齒",
    "蛀牙": "蛀牙",
    "阻生智齒": "阻生智齒",
    no_finding: "未偵測到目標",
    none: "未偵測到目標",
    "未偵測到目標": "未偵測到目標",
  };
  return map[value] || "未偵測到目標";
}

function profileFromEditedResult(label, confidence) {
  const safeConfidence = clampConfidence(confidence);
  if (label === "阻生智齒") return [Math.max(0, 100 - safeConfidence), safeConfidence];
  if (label === "未偵測到目標") return [0, 0];
  return [safeConfidence, Math.max(0, 100 - safeConfidence)];
}

function updateImageInfoUi() {
  if (els.imageNameValue) els.imageNameValue.textContent = currentImageInfo.name;
  if (els.imageTypeValue) els.imageTypeValue.textContent = currentImageInfo.type;
  if (els.imageSizeValue) els.imageSizeValue.textContent = currentImageInfo.size;
  if (els.savedPredictionValue) els.savedPredictionValue.textContent = selectedDemo;
  if (els.savedConfidenceValue) els.savedConfidenceValue.textContent = `${currentConfidence}%`;
}

function updateSlicerViewer(label, confidence, status = "已完成") {
  if (els.slicerStatus) els.slicerStatus.textContent = status;
  if (els.slicerFindingLabel) {
    els.slicerFindingLabel.textContent = confidence > 0 ? `${label} ${confidence}%` : label;
  }
  if (els.slicerFindingBox) {
    els.slicerFindingBox.dataset.result = label.replace(/\s+/g, "-").toLowerCase();
    els.slicerFindingBox.style.opacity = label === "未偵測到目標" ? "0.35" : "1";
  }
}

function setPendingSelection(label) {
  selectedDemo = normalizePredictionLabel(label);
  if (!["蛀牙", "阻生智齒"].includes(selectedDemo)) selectedDemo = "蛀牙";
  currentConfidence = 0;
  els.predictionValue.textContent = selectedDemo;
  els.confidenceValue.textContent = "等待模型推論";
  els.heroPrediction.textContent = selectedDemo;
  els.heroConfidence.textContent = "等待模型推論";
  if (els.topResult) els.topResult.textContent = selectedDemo;
  if (els.manualPredictionInput) els.manualPredictionInput.value = selectedDemo;
  if (els.manualConfidenceInput) els.manualConfidenceInput.value = "0";
  renderProbabilities([0, 0]);
  updateImageInfoUi();
  updateSlicerViewer(selectedDemo, 0, "待推論");
}

function getDemoRecords() {
  try {
    const parsed = JSON.parse(localStorage.getItem(demoRecordKey) || "[]");
    return Array.isArray(parsed) ? parsed.slice(0, 50) : [];
  } catch {
    return [];
  }
}

function setDemoRecords(records) {
  localStorage.setItem(demoRecordKey, JSON.stringify(records.slice(0, 50)));
}

function renderDemoRecords() {
  const records = getDemoRecords();
  if (els.recordCountValue) els.recordCountValue.textContent = String(records.length);
  if (!els.recordTableBody) return;
  els.recordTableBody.replaceChildren();
  if (!records.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.textContent = "尚未儲存 Demo 紀錄";
    row.appendChild(cell);
    els.recordTableBody.appendChild(row);
    return;
  }
  records.slice(0, 8).forEach((record) => {
    const row = document.createElement("tr");
    [record.time, record.imageName, record.imageType, record.prediction, `${record.confidence}%`, record.inferenceMs].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = String(value);
      row.appendChild(cell);
    });
    els.recordTableBody.appendChild(row);
  });
}

function saveDemoRecord() {
  const record = {
    id: Date.now(),
    time: new Date().toLocaleString("zh-TW", { hour12: false }),
    imageName: currentImageInfo.name,
    imageType: currentImageInfo.type,
    imageSize: currentImageInfo.size,
    prediction: selectedDemo,
    confidence: currentConfidence,
    inferenceMs: lastInferenceMs,
    source: "web-demo",
  };
  setDemoRecords([record, ...getDemoRecords()]);
  renderDemoRecords();
  appendLog(`[record] saved image=${record.imageName} prediction=${record.prediction} confidence=${record.confidence}%`);
}

function downloadDemoRecords() {
  const records = getDemoRecords();
  const blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "tooth-ai-demo-records.json";
  link.click();
  URL.revokeObjectURL(url);
}

function clearDemoRecords() {
  setDemoRecords([]);
  renderDemoRecords();
  appendLog("[record] cleared demo records");
}

function setPrediction(label, animated = false) {
  label = normalizePredictionLabel(label);
  if (!demoLabels.has(label)) {
    appendLog(`[security] ignored invalid demo label=${label}`);
    label = "蛀牙";
  }
  selectedDemo = label;
  const baseProfile = predictionProfiles[label];
  const max = animated ? currentConfidence : Math.max(...baseProfile);
  currentConfidence = animated ? currentConfidence : max;
  const profile = animated ? profileFromEditedResult(label, currentConfidence) : baseProfile;
  els.predictionValue.textContent = animated ? "Analyzing..." : label;
  els.confidenceValue.textContent = animated ? "Confidence --" : `Confidence ${max}%`;
  els.heroPrediction.textContent = label;
  els.heroConfidence.textContent = `Confidence ${max}%`;
  if (els.topResult) els.topResult.textContent = label;
  if (els.manualPredictionInput) els.manualPredictionInput.value = label;
  if (els.manualConfidenceInput) els.manualConfidenceInput.value = String(max);
  if (els.explainText) {
    const notes = {
      "蛀牙": "模型在 X-ray 疑似齲齒區域產生偵測框，判斷結果偏向蛀牙。",
      "阻生智齒": "模型偵測框集中在後牙區域，判斷結果偏向阻生智齒。",
      "未偵測到目標": "模型沒有產生 cavity 或 wisdom_tooth 偵測框；這不是第三類別，只代表目前影像未偵測到目標。",
    };
    els.explainText.textContent = notes[label];
  }
  renderProbabilities(profile);
  els.pipelineResult.textContent = animated ? "Running" : "Output";
  updateImageInfoUi();
  updateSlicerViewer(label, max, animated ? "推論中" : "已完成");
}

function runPrediction() {
  appendLog(`[demo] input image received, preprocessing label_hint=${selectedDemo}`);
  const apiBase = els.apiBaseInput?.value?.trim();
  if (apiBase && currentUploadFile) {
    setPrediction(selectedDemo, true);
    runApiPrediction(apiBase, currentUploadFile);
    return;
  }
  els.confidenceValue.textContent = "請先上傳影像並確認 API Endpoint";
  if (els.slicerStatus) els.slicerStatus.textContent = "等待上傳";
  appendLog("[api] skipped: upload an image and use API Endpoint for real confidence");
}

async function runApiPrediction(apiBase, file) {
  try {
    const form = new FormData();
    form.append("file", file);
    form.append("prediction", selectedDemo);
    form.append("confidence", String(currentConfidence / 100));
    const response = await fetch(`${apiBase.replace(/\/$/, "")}/predict`, {
      method: "POST",
      body: form,
    });
    if (!response.ok) throw new Error(`API ${response.status}`);
    const result = await response.json();
    selectedDemo = normalizePredictionLabel(result.prediction || selectedDemo);
    currentConfidence = clampConfidence((Number(result.confidence) || 0) * 100);
    lastInferenceMs = `${Number(result.inference_ms || 0).toFixed(0)} ms`;
    if (els.inferenceTime) els.inferenceTime.textContent = lastInferenceMs;
    if (els.manualPredictionInput && ["蛀牙", "阻生智齒"].includes(selectedDemo)) els.manualPredictionInput.value = selectedDemo;
    if (els.manualConfidenceInput) els.manualConfidenceInput.value = String(currentConfidence);
    applyResultToUi(selectedDemo, currentConfidence, result.slicer?.connected ? "Slicer 已連線" : "API 已完成");
    appendLog(`[api] /predict ok record=${result.id || "none"} slicer=${result.slicer?.connected ? "connected" : "offline"}`);
  } catch (error) {
    els.confidenceValue.textContent = "API 推論失敗";
    if (els.slicerStatus) els.slicerStatus.textContent = "API 失敗";
    appendLog(`[api] /predict failed: ${error.message}`);
  }
}

function applyResultToUi(label, confidence, status = "已完成") {
  selectedDemo = normalizePredictionLabel(label);
  currentConfidence = clampConfidence(confidence);
  const profile = profileFromEditedResult(selectedDemo, currentConfidence);
  els.predictionValue.textContent = selectedDemo;
  els.confidenceValue.textContent = selectedDemo === "未偵測到目標" ? "未偵測到目標" : `Confidence ${currentConfidence}%`;
  els.heroPrediction.textContent = selectedDemo;
  els.heroConfidence.textContent = selectedDemo === "未偵測到目標" ? "No target detected" : `Confidence ${currentConfidence}%`;
  if (els.topResult) els.topResult.textContent = selectedDemo;
  renderProbabilities(profile);
  updateImageInfoUi();
  updateSlicerViewer(selectedDemo, currentConfidence, status);
}

function applyEditedResult() {
  const label = normalizePredictionLabel(els.manualPredictionInput?.value || "蛀牙");
  const confidence = clampConfidence(els.manualConfidenceInput?.value || currentConfidence);
  if (!["蛀牙", "阻生智齒"].includes(label)) {
    appendLog(`[security] ignored invalid edited label=${label}`);
    return;
  }
  applyResultToUi(label, confidence, "已修改");
  appendLog(`[edit] prediction=${label} confidence=${confidence}%`);
}

function exportReport() {
  const config = trainingConfig();
  const report = {
    project: "DENTEX YOLOv8 Dental X-ray Detection Dashboard",
    dataset: "DENTEX CHALLENGE 2023 quadrant-enumeration-disease",
    model: "YOLOv8m",
    config,
    currentEpoch,
    bestCombo: 60,
    bestTestMap50: 0.7493,
    bestTestMap50_95: 0.4987,
    bestPrecision: 0.7016,
    bestRecall: 0.7274,
    bestF1: 0.7138,
    runStatus: "72 combos / 720 runs / all combos completed 10/10",
    bestMetricLabel: els.bestAccuracy?.textContent,
    demoPrediction: selectedDemo,
    demoConfidence: currentConfidence > 0 ? `${currentConfidence}%` : "not inferred",
    metrics: {
      map50: 0.7493,
      map50_95: 0.4987,
      precision: 0.7016,
      recall: 0.7274,
      f1Score: 0.7138,
    },
  };
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "tooth-ai-report.json";
  link.click();
  URL.revokeObjectURL(url);
  appendLog("[export] report exported as tooth-ai-report.json");
}

document.querySelectorAll(".sample").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".sample").forEach((el) => el.classList.remove("selected"));
    button.classList.add("selected");
    selectedDemo = button.dataset.label;
    appendLog(`[data] preview sample class=${selectedDemo}`);
  });
});

document.querySelectorAll(".demo-choice").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".demo-choice").forEach((el) => el.classList.remove("selected"));
    button.classList.add("selected");
    setPendingSelection(button.dataset.demo);
    const label = document.querySelector("#previewLabel");
    if (label) label.textContent = `Selected sample: ${button.dataset.demo}`;
  });
});

els.imageUpload.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const isDicomFile = file.name.toLowerCase().endsWith(".dcm");
  if (!allowedImageTypes.has(file.type) && !isDicomFile) {
    appendLog(`[security] rejected upload type=${file.type || "unknown"} file=${file.name}`);
    currentUploadFile = null;
    event.target.value = "";
    return;
  }
  if (file.size > maxUploadBytes) {
    appendLog(`[security] rejected upload file=${file.name} reason=size>${maxUploadBytes}`);
    currentUploadFile = null;
    event.target.value = "";
    return;
  }
  currentUploadFile = file;
  if (currentPreviewUrl) {
    URL.revokeObjectURL(currentPreviewUrl);
    currentPreviewUrl = null;
  }
  const url = URL.createObjectURL(file);
  currentPreviewUrl = url;
  currentImageInfo = {
    name: file.name,
    type: file.type || (isDicomFile ? "application/dicom" : "unknown"),
    size: formatBytes(file.size),
  };
  const label = document.createElement("span");
  label.id = "previewLabel";
  label.textContent = `Uploaded: ${file.name}`;
  if (file.type.startsWith("image/")) {
    const image = document.createElement("img");
    image.src = url;
    image.alt = "uploaded dental image";
    els.previewBox.replaceChildren(image, label);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "preview-tooth";
    els.previewBox.replaceChildren(placeholder, label);
  }
  if (els.slicerScene) {
    els.slicerScene.style.backgroundImage = file.type.startsWith("image/")
      ? `linear-gradient(rgba(8, 16, 32, 0.42), rgba(8, 16, 32, 0.42)), url("${url}")`
      : "";
  }
  updateImageInfoUi();
  appendLog(`[demo] uploaded file=${file.name}`);
});

els.runTrainingBtn?.addEventListener("click", runTraining);
els.resetTrainingBtn.addEventListener("click", resetTraining);
els.predictBtn.addEventListener("click", runPrediction);
els.pauseTrainingBtn?.addEventListener("click", pauseTraining);
els.fastTrainingBtn?.addEventListener("click", fastFinishTraining);
els.comboSelect?.addEventListener("change", () => {
  renderComboResults();
  appendLog(`[query] selected Combo ${selectedComboResult().id}`);
});
els.comboSort?.addEventListener("change", () => {
  renderComboResults();
  appendLog(`[query] sorted 72 combos by ${els.comboSort.value}`);
});
els.metricSelect?.addEventListener("change", () => {
  renderComboResults();
  appendLog(`[chart] metric changed to ${currentMetricConfig().label}`);
});
els.chartMode?.addEventListener("change", () => {
  drawChart();
  appendLog(`[chart] mode changed to ${els.chartMode.value}`);
});
els.chart?.addEventListener("mousemove", handleChartPointerMove);
els.chart?.addEventListener("mouseleave", hideChartTooltip);
els.chart?.addEventListener("click", handleChartClick);
els.checkSystemBtn?.addEventListener("click", checkSystemStatus);
els.openModelModalBtn?.addEventListener("click", openModelModal);
els.closeModelModalBtn?.addEventListener("click", closeModelModal);
els.archSimpleBtn?.addEventListener("click", () => setArchitectureMode("simple"));
els.archFullBtn?.addEventListener("click", () => setArchitectureMode("full"));
els.modelModal?.addEventListener("click", (event) => {
  if (event.target === els.modelModal) closeModelModal();
});
els.closeDataImageModalBtn?.addEventListener("click", closeDataImageModal);
els.dataImageModal?.addEventListener("click", (event) => {
  if (event.target === els.dataImageModal) closeDataImageModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModelModal();
    closeDataImageModal();
  }
});
els.dataImageFolderInput?.addEventListener("change", loadLocalDatasetImages);
els.dataSearchInput?.addEventListener("input", resetDataBrowserPage);
els.dataSplitFilter?.addEventListener("change", resetDataBrowserPage);
els.dataClassFilter?.addEventListener("change", resetDataBrowserPage);
els.dataPrevBtn?.addEventListener("click", () => {
  dataPage -= 1;
  renderDataBrowser();
});
els.dataNextBtn?.addEventListener("click", () => {
  dataPage += 1;
  renderDataBrowser();
});
els.exportReportBtn?.addEventListener("click", exportReport);
els.jumpDemoBtn?.addEventListener("click", () => showTab("demo"));
els.applyEditBtn?.addEventListener("click", applyEditedResult);
els.saveDemoBtn?.addEventListener("click", saveDemoRecord);
els.downloadRecordsBtn?.addEventListener("click", downloadDemoRecords);
els.clearRecordsBtn?.addEventListener("click", clearDemoRecords);
[els.lrInput, els.batchInput, els.epochInput, els.optimizerInput].forEach((input) => {
  input?.addEventListener("change", updateConfigSummary);
  input?.addEventListener("input", updateConfigSummary);
});

function showTab(tabName) {
  const safeTab = tabName || "overview";
  document.querySelectorAll("[data-tab-page]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.tabPage === safeTab);
  });
  document.querySelectorAll("nav a[data-tab]").forEach((link) => {
    link.classList.toggle("active", link.dataset.tab === safeTab);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("nav a[data-tab]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    showTab(link.dataset.tab);
  });
});

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  const target = link.getAttribute("href")?.slice(1);
  if (!target || !document.querySelector(`[data-tab-page="${target}"]`)) return;
  link.addEventListener("click", (event) => {
    event.preventDefault();
    showTab(target);
  });
});

setPendingSelection("蛀牙");
renderDemoRecords();
updateConfigSummary();
renderComboResults();
renderDataBrowser();
checkSystemStatus();
