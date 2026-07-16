let totalEpochs = 100;
let currentEpoch = 0;
let trainingTimer = null;
let isPaused = false;
let selectedDemo = "";
let currentPreviewUrl = null;
let currentUploadFile = null;
let currentImageInfo = {
  name: "sample-cavity.png",
  type: "demo sample",
  size: "--",
};
let lastInferenceMs = "--";
let currentConfidence = 0;
let localApiOnline = false;
const localApiBase = String(window.TOOTH_AI_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
let currentPredictionBoxes = [];
let currentApiRecordId = null;
let demoBoxesDirty = false;
const demoRecordKey = "toothAiDemoRecords";
const accessModeKey = "toothAiAccessMode";
const editorSessionKey = "toothAiEditorSession";
const labels = ["蛀牙", "阻生智齒"];
const demoLabels = new Set(["蛀牙", "阻生智齒", "未偵測到目標"]);
const allowedOptimizers = new Set(["AdamW"]);
const allowedLearningRates = new Set(["0.001", "0.01", "0.0001"]);
const allowedBatchSizes = new Set(["8", "4"]);
const allowedImageTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/bmp"]);
const allowedImageExtensions = new Set(["png", "jpg", "jpeg", "webp", "bmp"]);
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
  medicalImageStage: document.querySelector("#medicalImageStage"),
  medicalViewerImage: document.querySelector("#medicalViewerImage"),
  medicalViewerPlaceholder: document.querySelector("#medicalViewerPlaceholder"),
  detectionOverlay: document.querySelector("#detectionOverlay"),
  boxEditToolbar: document.querySelector("#boxEditToolbar"),
  addCavityBoxBtn: document.querySelector("#addCavityBoxBtn"),
  addWisdomBoxBtn: document.querySelector("#addWisdomBoxBtn"),
  saveBoxEditsBtn: document.querySelector("#saveBoxEditsBtn"),
  checkSystemBtn: document.querySelector("#checkSystemBtn"),
  visitorModeBtn: document.querySelector("#visitorModeBtn"),
  editorModeBtn: document.querySelector("#editorModeBtn"),
  accessModeLabel: document.querySelector("#accessModeLabel"),
  authModal: document.querySelector("#authModal"),
  authForm: document.querySelector("#authForm"),
  authUsernameInput: document.querySelector("#authUsernameInput"),
  authPasswordInput: document.querySelector("#authPasswordInput"),
  authError: document.querySelector("#authError"),
  closeAuthModalBtn: document.querySelector("#closeAuthModalBtn"),
  cancelAuthBtn: document.querySelector("#cancelAuthBtn"),
  modelModal: document.querySelector("#modelModal"),
  openModelModalBtn: document.querySelector("#openModelModalBtn"),
  closeModelModalBtn: document.querySelector("#closeModelModalBtn"),
  expandParamBtn: document.querySelector("#expandParamBtn"),
  collapseParamBtn: document.querySelector("#collapseParamBtn"),
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
  dataPageSizeSelect: document.querySelector("#dataPageSizeSelect"),
  dataRecordTableBody: document.querySelector("#dataRecordTableBody"),
  dataBrowserSummary: document.querySelector("#dataBrowserSummary"),
  dataPrevBtn: document.querySelector("#dataPrevBtn"),
  dataNextBtn: document.querySelector("#dataNextBtn"),
  dataPageInfo: document.querySelector("#dataPageInfo"),
  lastUpdatedValue: document.querySelector("#lastUpdatedValue"),
  predictionValue: document.querySelector("#predictionValue"),
  confidenceValue: document.querySelector("#confidenceValue"),
  heroPrediction: document.querySelector("#heroPrediction"),
  heroConfidence: document.querySelector("#heroConfidence"),
  probList: document.querySelector("#probList"),
  predictBtn: document.querySelector("#predictBtn"),
  imageUpload: document.querySelector("#imageUpload"),
  apiBaseInput: document.querySelector("#apiBaseInput"),
  localInferenceHelp: document.querySelector("#localInferenceHelp"),
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
  applySimulationControlsBtn: document.querySelector("#applySimulationControlsBtn"),
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
  compositeBestTitle: document.querySelector("#compositeBestTitle"),
  compositeBestText: document.querySelector("#compositeBestText"),
  selectedCompositeScore: document.querySelector("#selectedCompositeScore"),
  selectedCompositeRank: document.querySelector("#selectedCompositeRank"),
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
  activeModelSelect: document.querySelector("#activeModelSelect"),
  applyModelBtn: document.querySelector("#applyModelBtn"),
  modelManagementHint: document.querySelector("#modelManagementHint"),
  adminRecordCount: document.querySelector("#adminRecordCount"),
  adminBackupCount: document.querySelector("#adminBackupCount"),
  adminActiveModel: document.querySelector("#adminActiveModel"),
  adminLatestRecord: document.querySelector("#adminLatestRecord"),
  adminActiveModelSelect: document.querySelector("#adminActiveModelSelect"),
  adminApplyModelBtn: document.querySelector("#adminApplyModelBtn"),
  adminModelHint: document.querySelector("#adminModelHint"),
  adminRecordTableBody: document.querySelector("#adminRecordTableBody"),
  refreshAdminRecordsBtn: document.querySelector("#refreshAdminRecordsBtn"),
  exportAdminRecordsBtn: document.querySelector("#exportAdminRecordsBtn"),
  adminRecordSearch: document.querySelector("#adminRecordSearch"),
  adminRecordStatusFilter: document.querySelector("#adminRecordStatusFilter"),
  adminRecordSort: document.querySelector("#adminRecordSort"),
  adminReviewedCount: document.querySelector("#adminReviewedCount"),
  adminFollowUpCount: document.querySelector("#adminFollowUpCount"),
  createBackupBtn: document.querySelector("#createBackupBtn"),
  adminBackupHint: document.querySelector("#adminBackupHint"),
  backupList: document.querySelector("#backupList"),
  refreshSecurityBtn: document.querySelector("#refreshSecurityBtn"),
  securityStatusList: document.querySelector("#securityStatusList"),
  adminRecordModal: document.querySelector("#adminRecordModal"),
  closeAdminRecordModalBtn: document.querySelector("#closeAdminRecordModalBtn"),
  adminRecordModalTitle: document.querySelector("#adminRecordModalTitle"),
  adminRecordImage: document.querySelector("#adminRecordImage"),
  adminRecordDetails: document.querySelector("#adminRecordDetails"),
  adminReviewForm: document.querySelector("#adminReviewForm"),
  adminReviewCavity: document.querySelector("#adminReviewCavity"),
  adminReviewWisdom: document.querySelector("#adminReviewWisdom"),
  adminReviewStatus: document.querySelector("#adminReviewStatus"),
  adminReviewNote: document.querySelector("#adminReviewNote"),
  saveAdminReviewBtn: document.querySelector("#saveAdminReviewBtn"),
  auditTableBody: document.querySelector("#auditTableBody"),
  refreshAdminBtn: document.querySelector("#refreshAdminBtn"),
};

const trainingHistory = {
  loss: [],
  accuracy: [],
};

let chartHitRegions = [];
let dataPage = 1;
let dataPageSize = 25;
let dataSortKey = "index";
let dataSortDirection = "asc";
let appliedComboSort = "map50";
let appliedMetricKey = "map50";
let appliedChartMode = "ranking";
const dentexRecords = Array.isArray(window.dentexRecords) ? window.dentexRecords : [];
const localImageUrls = new Map();
let adminRecordsCache = [];
let activeAdminRecord = null;
let activeAdminImageUrl = null;

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
  composite: { label: "Composite", better: "higher", digits: 4 },
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
  return localApiBase;
}

function editorToken() {
  return sessionStorage.getItem(editorSessionKey) || "";
}

function editorHeaders() {
  const token = editorToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function boxEditingAvailable() {
  return Boolean(editorToken() && currentApiRecordId && !els.medicalImageStage?.hidden);
}

function updateBoxEditingUi() {
  const available = boxEditingAvailable();
  if (els.boxEditToolbar) els.boxEditToolbar.hidden = !available;
  if (els.addCavityBoxBtn) els.addCavityBoxBtn.disabled = !available;
  if (els.addWisdomBoxBtn) els.addWisdomBoxBtn.disabled = !available;
  if (els.saveBoxEditsBtn) els.saveBoxEditsBtn.disabled = !available || !demoBoxesDirty;
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
  setStatusPill(els.apiStatus, "checking", "本機模型：檢查中");
  setStatusPill(els.modelStatus, "checking", "本機 YOLO：檢查中");
  if (els.predictBtn) els.predictBtn.disabled = true;
  try {
    const health = await fetchJsonWithTimeout(`${localApiBase}/health`);
    if (!health.model_available) throw new Error("model file is unavailable");
    localApiOnline = true;
    setStatusPill(els.apiStatus, "online", "本機模型：已連線");
    setStatusPill(els.modelStatus, "online", "本機 YOLO：可推論");
    if (els.localInferenceHelp) els.localInferenceHelp.textContent = "本機 API 已連線。上傳 X-ray 後可使用 current_model.pt 推論；影像不會離開這台電腦。";
    if (els.predictBtn) els.predictBtn.disabled = !currentUploadFile;
  } catch (error) {
    localApiOnline = false;
    setStatusPill(els.apiStatus, "offline", "本機模型：尚未啟動");
    setStatusPill(els.modelStatus, "offline", "本機 YOLO：等待 API");
    setStatusPill(els.slicerBridgeStatus, "offline", "3D Slicer：未連接");
    if (els.localInferenceHelp) els.localInferenceHelp.textContent = "尚未偵測到本機 API。請先依本機推論說明啟動 http://127.0.0.1:8000。";
    return;
  }
  setStatusPill(els.slicerBridgeStatus, "online", "2D 檢視器：已就緒");
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
  if (els.simpleArch) {
    els.simpleArch.hidden = full;
    els.simpleArch.style.display = full ? "none" : "block";
  }
  if (els.fullArch) {
    els.fullArch.hidden = !full;
    els.fullArch.style.display = full ? "block" : "none";
  }
  els.archSimpleBtn?.classList.toggle("active", !full);
  els.archFullBtn?.classList.toggle("active", full);
  window.requestAnimationFrame(renderYoloArchitectureDiagrams);
}

function prepareArchitectureCanvas(canvas, height) {
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(320, Math.floor(rect.width));
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  return { ctx, width, height };
}

function drawArchitectureArrow(ctx, fromX, fromY, toX, toY, color = "#0f766e") {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
  const angle = Math.atan2(toY - fromY, toX - fromX);
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - 10 * Math.cos(angle - Math.PI / 6), toY - 10 * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(toX - 10 * Math.cos(angle + Math.PI / 6), toY - 10 * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawFeatureMap(ctx, x, y, radiusX, radiusY, color, label, detail = "") {
  ctx.save();
  for (let layer = 2; layer >= 0; layer -= 1) {
    ctx.globalAlpha = 0.17 + (2 - layer) * 0.14;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x - layer * 7, y - layer * 5, radiusX, radiusY, -0.12, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y, radiusX, radiusY, -0.12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#17324d";
  ctx.font = "700 13px Arial";
  ctx.textAlign = "center";
  ctx.fillText(label, x, y + radiusY + 24);
  if (detail) {
    ctx.fillStyle = "#667085";
    ctx.font = "600 11px Arial";
    ctx.fillText(detail, x, y + radiusY + 40);
  }
  ctx.restore();
}

function drawArchitectureTitle(ctx, title, subtitle, width) {
  ctx.fillStyle = "#102a43";
  ctx.font = "800 17px Arial";
  ctx.textAlign = "left";
  ctx.fillText(title, 22, 29);
  ctx.fillStyle = "#667085";
  ctx.font = "600 11px Arial";
  ctx.fillText(subtitle, 22, 47);
  ctx.strokeStyle = "#dbe7f4";
  ctx.beginPath();
  ctx.moveTo(22, 60);
  ctx.lineTo(width - 22, 60);
  ctx.stroke();
}

function renderYoloArchitectureDiagrams() {
  const simple = prepareArchitectureCanvas(document.querySelector("#simpleArchCanvas"), 255);
  if (simple) {
    const { ctx, width } = simple;
    drawArchitectureTitle(ctx, "YOLOv8m Detection Pipeline", "Ultralytics YOLOv8: Backbone → PAN-FPN → Detect", width);
    const nodes = [
      [width * 0.12, 138, 29, 46, "#64748b", "Input", "OPG X-ray / 1280"],
      [width * 0.37, 138, 34, 58, "#2563eb", "Backbone", "Conv · C2f · SPPF"],
      [width * 0.63, 138, 37, 52, "#0f766e", "Neck", "PAN-FPN fusion"],
      [width * 0.88, 138, 30, 45, "#c26a12", "Detect", "P3 · P4 · P5"],
    ];
    nodes.forEach((node, index) => {
      if (index > 0) drawArchitectureArrow(ctx, nodes[index - 1][0] + nodes[index - 1][2] + 16, 138, node[0] - node[2] - 16, 138, node[4]);
      drawFeatureMap(ctx, ...node);
    });
    ctx.fillStyle = "#475467";
    ctx.font = "700 11px Arial";
    ctx.textAlign = "center";
    ctx.fillText("2 classes: cavity / wisdom_tooth", width * 0.88, 224);
  }

  const full = prepareArchitectureCanvas(document.querySelector("#fullArchCanvas"), 475);
  if (!full) return;
  const { ctx, width } = full;
  drawArchitectureTitle(ctx, "YOLOv8m Architecture", "Exact high-level topology from the YOLOv8 YAML: Conv, C2f, SPPF, PAN-FPN and Detect", width);
  const left = width * 0.19;
  const middle = width * 0.51;
  const right = width * 0.83;
  const backbone = [
    [105, "Input", "1280 x 1280"], [155, "Conv", "P1 / 2"], [205, "C2f", "P2 / 4"], [255, "C2f", "P3 / 8"], [305, "C2f", "P4 / 16"], [355, "C2f + SPPF", "P5 / 32"],
  ];
  backbone.forEach(([y, label, detail], index) => {
    drawFeatureMap(ctx, left, y, 31 - index * 1.5, 15 + index * 1.8, "#2563eb", label, detail);
    if (index > 0) drawArchitectureArrow(ctx, left, y - 27, left, y - 19, "#2563eb");
  });
  const neck = [[175, "Upsample + Concat", "P5 → P4"], [230, "C2f", "P4 refined"], [275, "Upsample + Concat", "P4 → P3"], [330, "C2f", "P3 refined"], [375, "Downsample + Concat", "P3 → P4"], [420, "C2f", "P4 / P5 refined"]];
  neck.forEach(([y, label, detail], index) => {
    drawFeatureMap(ctx, middle, y, 39, 13, "#0f766e", label, detail);
    if (index > 0) drawArchitectureArrow(ctx, middle, y - 25, middle, y - 16, "#0f766e");
  });
  drawArchitectureArrow(ctx, left + 42, 355, middle - 48, 175, "#0f766e");
  drawArchitectureArrow(ctx, left + 39, 305, middle - 47, 275, "#0f766e");
  drawArchitectureArrow(ctx, left + 36, 255, middle - 47, 375, "#0f766e");
  const heads = [[275, "Detect P3 / 8", "small objects"], [345, "Detect P4 / 16", "medium objects"], [415, "Detect P5 / 32", "large objects"]];
  heads.forEach(([y, label, detail], index) => {
    drawFeatureMap(ctx, right, y, 42, 17, "#c26a12", label, detail);
    drawArchitectureArrow(ctx, middle + 48, neck[index + 2][0], right - 52, y, "#c26a12");
  });
  ctx.fillStyle = "#17324d";
  ctx.font = "800 12px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Box regression · class score · confidence", right, 456);
}

function setParamGroups(open) {
  document.querySelectorAll(".param-group").forEach((group) => {
    group.open = open;
  });
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

function sortedDentexRecords(rows) {
  const direction = dataSortDirection === "asc" ? 1 : -1;
  const valueFor = (record, index) => {
    if (dataSortKey === "index") return index;
    if (["cavity", "wisdom_tooth", "total"].includes(dataSortKey)) return Number(record[dataSortKey] || 0);
    return String(record[dataSortKey] || "").toLowerCase();
  };
  return rows
    .map((record, index) => ({ record, index }))
    .sort((a, b) => {
      const av = valueFor(a.record, a.index);
      const bv = valueFor(b.record, b.index);
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * direction;
      return String(av).localeCompare(String(bv), "zh-Hant", { numeric: true }) * direction;
    })
    .map((item) => item.record);
}

function updateDataSortHeaders() {
  document.querySelectorAll("[data-data-sort]").forEach((button) => {
    const key = button.dataset.dataSort;
    const base = button.textContent.replace(/[▲▼]\s*$/, "").trim();
    button.textContent = key === dataSortKey
      ? `${base} ${dataSortDirection === "asc" ? "▲" : "▼"}`
      : base;
  });
}

function renderDataBrowser() {
  if (!els.dataRecordTableBody) return;
  const rows = sortedDentexRecords(filteredDentexRecords());
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
  updateDataSortHeaders();
}

function resetDataBrowserPage() {
  dataPage = 1;
  renderDataBrowser();
}

function setLastUpdatedTime() {
  if (!els.lastUpdatedValue) return;
  const formatter = new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  els.lastUpdatedValue.textContent = formatter.format(new Date()).replace(/\//g, "-");
}

function setAccessMode(mode) {
  const safeMode = mode === "editor" && editorToken() ? "editor" : "visitor";
  localStorage.setItem(accessModeKey, safeMode);
  document.body.dataset.accessMode = safeMode;
  const editorEnabled = safeMode === "editor";
  document.querySelectorAll(".editor-only").forEach((element) => {
    element.hidden = !editorEnabled;
  });
  [
    els.applyEditBtn,
    els.manualPredictionInput,
    els.manualConfidenceInput,
  ].forEach((control) => {
    if (control) control.disabled = !editorEnabled;
  });
  if (els.saveDemoBtn) els.saveDemoBtn.disabled = false;
  if (els.clearRecordsBtn) els.clearRecordsBtn.disabled = false;
  els.visitorModeBtn?.classList.toggle("active", !editorEnabled);
  els.editorModeBtn?.classList.toggle("active", editorEnabled);
  if (els.accessModeLabel) {
    els.accessModeLabel.textContent = editorEnabled ? "管理已連線" : "展示狀態";
    els.accessModeLabel.classList.toggle("editor", editorEnabled);
    els.accessModeLabel.classList.toggle("visitor", !editorEnabled);
  }
  if (els.editorModeBtn) els.editorModeBtn.textContent = editorEnabled ? "管理中" : "管理登入";
  if (els.saveDemoBtn) els.saveDemoBtn.textContent = editorEnabled ? "同步到後台" : "儲存照片資訊";
  updateBoxEditingUi();
  renderDetectionBoxes();
  if (editorEnabled) {
    loadModelManagement();
    loadAdminDashboard();
    loadAdminRecords();
  }
  appendLog(`[access] mode=${safeMode}`);
}

function formatAdminTime(value) {
  if (!value) return "尚無紀錄";
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(Number(value) * 1000));
}

function apiPredictionToLabel(value) {
  return normalizePredictionLabel(value);
}

function formatConfidenceValue(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "--";
  return `${Math.round(numeric * 1000) / 10}%`;
}

function adminFindingsFromRecord(record) {
  const fallback = {
    cavity: { label: "蛀牙", count: 0, maxConfidence: 0 },
    wisdom_tooth: { label: "阻生智齒", count: 0, maxConfidence: 0 },
  };
  const classes = record.findings?.classes;
  if (classes) {
    return {
      cavity: {
        label: "蛀牙",
        count: Number(classes.cavity?.count || 0),
        maxConfidence: Number(classes.cavity?.max_confidence || classes.cavity?.maxConfidence || 0),
      },
      wisdom_tooth: {
        label: "阻生智齒",
        count: Number(classes.wisdom_tooth?.count || 0),
        maxConfidence: Number(classes.wisdom_tooth?.max_confidence || classes.wisdom_tooth?.maxConfidence || 0),
      },
    };
  }
  (Array.isArray(record.boxes) ? record.boxes : []).forEach((box) => {
    const key = normalizeDetectionClass(box.class ?? box.label ?? box.name ?? box.class_name);
    fallback[key].count += 1;
    fallback[key].maxConfidence = Math.max(fallback[key].maxConfidence, Number(box.confidence) || 0);
  });
  return fallback;
}

function adminDiseaseSummary(record) {
  const findings = adminFindingsFromRecord(record);
  const parts = Object.values(findings)
    .filter((item) => item.count > 0)
    .map((item) => `${item.label} ${item.count} 個`);
  return parts.length ? parts.join("，") : "未偵測到蛀牙或阻生智齒";
}

function adminBoxSummary(record) {
  const findings = adminFindingsFromRecord(record);
  return Object.values(findings).map((item) => ({
    label: item.label,
    text: item.count > 0 ? `${item.count} 框，最高 ${formatConfidenceValue(item.maxConfidence)}` : "0 框",
    active: item.count > 0,
  }));
}

async function loadModelManagement() {
  if (!editorToken()) return;
  try {
    const response = await fetch(`${localApiBase}/models`, { headers: editorHeaders() });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    [els.activeModelSelect, els.adminActiveModelSelect].filter(Boolean).forEach((select) => {
      select.replaceChildren();
      (data.available || []).forEach((model) => {
        const option = document.createElement("option");
        option.value = model;
        option.textContent = model;
        option.selected = model === data.active;
        select.appendChild(option);
      });
      select.disabled = !(data.available || []).length;
    });
    if (els.applyModelBtn) els.applyModelBtn.disabled = !(data.available || []).length;
    if (els.adminApplyModelBtn) els.adminApplyModelBtn.disabled = !(data.available || []).length;
    if (els.modelManagementHint) els.modelManagementHint.textContent = `目前使用：${data.active || "未找到模型"}`;
    if (els.adminModelHint) els.adminModelHint.textContent = `目前使用：${data.active || "未找到模型"}`;
  } catch (error) {
    if (els.modelManagementHint) els.modelManagementHint.textContent = "無法讀取模型清單，請確認本機 API 已啟動。";
    if (els.adminModelHint) els.adminModelHint.textContent = "無法讀取模型清單，請確認本機 API 已啟動。";
    appendLog(`[model] list failed: ${error.message}`);
  }
}

function renderAdminRecords(records) {
  if (!els.adminRecordTableBody) return;
  els.adminRecordTableBody.replaceChildren();
  if (!records.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.textContent = "尚無後台推論紀錄。";
    row.appendChild(cell);
    els.adminRecordTableBody.appendChild(row);
    return;
  }
  const query = (els.adminRecordSearch?.value || "").trim().toLowerCase();
  const status = els.adminRecordStatusFilter?.value || "all";
  const sort = els.adminRecordSort?.value || "newest";
  const filtered = records.filter((record) => {
    const matchesQuery = !query || `${record.image_name || ""} ${record.id || ""}`.toLowerCase().includes(query);
    return matchesQuery && (status === "all" || (record.review_status || "pending") === status);
  }).sort((a, b) => {
    if (sort === "oldest") return Number(a.created_at) - Number(b.created_at);
    if (sort === "findings") return Number(b.findings?.total || 0) - Number(a.findings?.total || 0);
    if (sort === "review") return String(a.review_status || "pending").localeCompare(String(b.review_status || "pending"));
    return Number(b.created_at) - Number(a.created_at);
  });
  if (!filtered.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.textContent = "沒有符合目前篩選條件的影像案件。";
    row.appendChild(cell);
    els.adminRecordTableBody.appendChild(row);
    return;
  }
  filtered.forEach((record) => {
    const row = document.createElement("tr");
    row.dataset.recordId = record.id;

    const timeCell = document.createElement("td");
    timeCell.textContent = formatAdminTime(record.created_at);
    row.appendChild(timeCell);

    const imageCell = document.createElement("td");
    const imageName = document.createElement("strong");
    imageName.textContent = record.image_name || "--";
    const imageFolder = document.createElement("small");
    imageFolder.textContent = `影像資料夾：${record.id}`;
    imageCell.append(imageName, imageFolder);
    row.appendChild(imageCell);

    const diseaseCell = document.createElement("td");
    diseaseCell.textContent = adminDiseaseSummary(record);
    row.appendChild(diseaseCell);

    const boxesCell = document.createElement("td");
    const boxList = document.createElement("div");
    boxList.className = "admin-finding-list";
    adminBoxSummary(record).forEach((item) => {
      const chip = document.createElement("span");
      chip.className = `finding-chip${item.active ? " active" : ""}`;
      chip.textContent = `${item.label}：${item.text}`;
      boxList.appendChild(chip);
    });
    boxesCell.appendChild(boxList);
    row.appendChild(boxesCell);

    const reviewCell = document.createElement("td");
    const reviewTag = document.createElement("span");
    const reviewStatus = record.review_status || "pending";
    reviewTag.className = `review-status ${reviewStatus}`;
    reviewTag.textContent = ({ pending: "待覆核", reviewed: "已覆核", needs_follow_up: "待追蹤" })[reviewStatus] || "待覆核";
    const reviewMeta = document.createElement("small");
    reviewMeta.textContent = record.reviewed_at ? `更新：${formatAdminTime(record.reviewed_at)}` : `推論：${Math.round(Number(record.inference_ms || 0))} ms`;
    reviewCell.append(reviewTag, reviewMeta);
    row.appendChild(reviewCell);

    const actionCell = document.createElement("td");
    const viewButton = document.createElement("button");
    viewButton.type = "button";
    viewButton.className = "small-action";
    viewButton.dataset.adminRecordAction = "view";
    viewButton.textContent = "查看／覆核";
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "small-action danger";
    deleteButton.dataset.adminRecordAction = "delete";
    deleteButton.textContent = "刪除";
    actionCell.append(viewButton, deleteButton);
    row.appendChild(actionCell);

    els.adminRecordTableBody.appendChild(row);
  });
}

async function loadAdminRecords() {
  if (!editorToken()) return;
  try {
    const response = await fetch(`${localApiBase}/records`, { headers: editorHeaders() });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    adminRecordsCache = await response.json();
    renderAdminRecords(adminRecordsCache);
  } catch (error) {
    if (els.adminRecordTableBody) {
      els.adminRecordTableBody.replaceChildren();
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 6;
      cell.textContent = "無法載入後台紀錄，請確認已登入且 API 已啟動。";
      row.appendChild(cell);
      els.adminRecordTableBody.appendChild(row);
    }
    appendLog(`[admin] records failed: ${error.message}`);
  }
}

function closeAdminRecordModal() {
  if (activeAdminImageUrl) URL.revokeObjectURL(activeAdminImageUrl);
  activeAdminImageUrl = null;
  activeAdminRecord = null;
  els.adminRecordModal?.classList.remove("show");
  els.adminRecordModal?.setAttribute("aria-hidden", "true");
}

async function openAdminRecordModal(recordId) {
  const record = adminRecordsCache.find((item) => item.id === recordId);
  if (!record || !editorToken()) return;
  activeAdminRecord = record;
  if (els.adminRecordModalTitle) els.adminRecordModalTitle.textContent = record.image_name || "影像案件";
  if (els.adminRecordDetails) {
    els.adminRecordDetails.replaceChildren();
    const details = [
      ["案件編號", record.id], ["建立時間", formatAdminTime(record.created_at)],
      ["模型輸出", adminDiseaseSummary({ ...record, findings: record.model_findings })],
      ["推論時間", `${Math.round(Number(record.inference_ms || 0))} ms`],
    ];
    details.forEach(([label, value]) => {
      const item = document.createElement("div");
      const name = document.createElement("span"); name.textContent = label;
      const content = document.createElement("strong"); content.textContent = value;
      item.append(name, content); els.adminRecordDetails.appendChild(item);
    });
  }
  const findings = adminFindingsFromRecord(record);
  if (els.adminReviewCavity) els.adminReviewCavity.value = String(findings.cavity.count);
  if (els.adminReviewWisdom) els.adminReviewWisdom.value = String(findings.wisdom_tooth.count);
  if (els.adminReviewStatus) els.adminReviewStatus.value = record.review_status || "pending";
  if (els.adminReviewNote) els.adminReviewNote.value = record.review_note || "";
  if (els.adminRecordImage) {
    els.adminRecordImage.removeAttribute("src");
    const response = await fetch(`${localApiBase}/records/${record.id}/image`, { headers: editorHeaders() });
    if (response.ok) {
      activeAdminImageUrl = URL.createObjectURL(await response.blob());
      els.adminRecordImage.src = activeAdminImageUrl;
    }
  }
  els.adminRecordModal?.classList.add("show");
  els.adminRecordModal?.setAttribute("aria-hidden", "false");
}

async function saveAdminReview(event) {
  event.preventDefault();
  if (!activeAdminRecord || !editorToken()) return;
  const payload = {
    cavity_count: Number(els.adminReviewCavity?.value || 0),
    wisdom_tooth_count: Number(els.adminReviewWisdom?.value || 0),
    review_status: els.adminReviewStatus?.value || "pending",
    note: els.adminReviewNote?.value.trim() || "",
  };
  if (els.saveAdminReviewBtn) els.saveAdminReviewBtn.disabled = true;
  try {
    const response = await fetch(`${localApiBase}/records/${activeAdminRecord.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json", ...editorHeaders() }, body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    appendLog(`[admin] reviewed record=${activeAdminRecord.id}`);
    closeAdminRecordModal();
    await loadAdminRecords();
    await loadAdminDashboard();
  } catch (error) {
    window.alert("覆核儲存失敗，請確認本機 API 已啟動且登入未逾期。");
    appendLog(`[admin] review failed: ${error.message}`);
  } finally {
    if (els.saveAdminReviewBtn) els.saveAdminReviewBtn.disabled = false;
  }
}

function exportAdminRecords() {
  const rows = adminRecordsCache.map((record) => ({
    id: record.id, image_name: record.image_name, created_at: formatAdminTime(record.created_at),
    findings: adminDiseaseSummary(record), review_status: record.review_status || "pending",
    review_note: record.review_note || "", inference_ms: Math.round(Number(record.inference_ms || 0)),
  }));
  const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob); const link = document.createElement("a");
  link.href = url; link.download = `tooth-ai-case-records-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url);
}

async function deleteAdminRecord(row) {
  const recordId = row?.dataset.recordId;
  if (!recordId || !editorToken()) return;
  if (!window.confirm("確定刪除此筆後台紀錄？此操作會移除資料庫紀錄與對應上傳影像。")) return;
  const response = await fetch(`${localApiBase}/records/${recordId}`, {
    method: "DELETE",
    headers: editorHeaders(),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  appendLog(`[admin] deleted record=${recordId}`);
}

async function handleAdminRecordAction(event) {
  const button = event.target.closest("[data-admin-record-action]");
  if (!button) return;
  const row = button.closest("tr");
  button.disabled = true;
  try {
    if (button.dataset.adminRecordAction === "view") {
      await openAdminRecordModal(row?.dataset.recordId);
    } else if (button.dataset.adminRecordAction === "delete") {
      await deleteAdminRecord(row);
      await loadAdminRecords();
      await loadAdminDashboard();
    }
  } catch (error) {
    appendLog(`[admin] record action failed: ${error.message}`);
    window.alert("後台紀錄操作失敗，請確認 API 連線與登入狀態。");
  } finally {
    button.disabled = false;
  }
}

async function applyActiveModel(modelOverride) {
  const model = modelOverride || els.activeModelSelect?.value || els.adminActiveModelSelect?.value;
  if (!model || !editorToken()) return;
  if (els.applyModelBtn) els.applyModelBtn.disabled = true;
  if (els.adminApplyModelBtn) els.adminApplyModelBtn.disabled = true;
  try {
    const response = await fetch(`${localApiBase}/models/active`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...editorHeaders() },
      body: JSON.stringify({ model }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (els.modelManagementHint) els.modelManagementHint.textContent = `已套用：${data.active}`;
    if (els.adminModelHint) els.adminModelHint.textContent = `已套用：${data.active}`;
    appendLog(`[model] active=${data.active}`);
    await checkSystemStatus();
    await loadModelManagement();
    await loadAdminDashboard();
  } catch (error) {
    if (els.modelManagementHint) els.modelManagementHint.textContent = "模型切換失敗，模型檔案需位於本機 models 資料夾。";
    if (els.adminModelHint) els.adminModelHint.textContent = "模型切換失敗，模型檔案需位於本機 models 資料夾。";
    appendLog(`[model] switch failed: ${error.message}`);
  } finally {
    if (els.applyModelBtn) els.applyModelBtn.disabled = false;
    if (els.adminApplyModelBtn) els.adminApplyModelBtn.disabled = false;
  }
}

async function loadAdminDashboard() {
  if (!editorToken()) return;
  try {
    const [summaryResponse, auditResponse, backupsResponse] = await Promise.all([
      fetch(`${localApiBase}/admin/summary`, { headers: editorHeaders() }),
      fetch(`${localApiBase}/audit`, { headers: editorHeaders() }),
      fetch(`${localApiBase}/backups`, { headers: editorHeaders() }),
    ]);
    if (!summaryResponse.ok || !auditResponse.ok || !backupsResponse.ok) throw new Error("admin request failed");
    const summary = await summaryResponse.json();
    const auditRows = await auditResponse.json();
    const backups = await backupsResponse.json();
    if (els.adminRecordCount) els.adminRecordCount.textContent = String(summary.record_count || 0);
    if (els.adminBackupCount) els.adminBackupCount.textContent = String(summary.backup_count || 0);
    if (els.adminActiveModel) els.adminActiveModel.textContent = summary.active_model || "--";
    if (els.adminReviewedCount) els.adminReviewedCount.textContent = String(summary.reviewed_count || 0);
    if (els.adminFollowUpCount) els.adminFollowUpCount.textContent = String(summary.follow_up_count || 0);
    if (els.adminLatestRecord) els.adminLatestRecord.textContent = `最後儲存：${formatAdminTime(summary.latest_record_at)}`;
    renderBackupList(backups);
    renderSecurityStatus(summary);
    if (els.auditTableBody) {
      els.auditTableBody.replaceChildren();
      if (!auditRows.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 4;
        cell.textContent = "尚無管理操作。";
        row.appendChild(cell);
        els.auditTableBody.appendChild(row);
      } else {
        auditRows.forEach((entry) => {
          const row = document.createElement("tr");
          [formatAdminTime(entry.created_at), entry.username, entry.action, entry.record_id || "--"].forEach((value) => {
            const cell = document.createElement("td");
            cell.textContent = String(value);
            row.appendChild(cell);
          });
          els.auditTableBody.appendChild(row);
        });
      }
    }
  } catch (error) {
    appendLog(`[admin] load failed: ${error.message}`);
  }
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderBackupList(backups) {
  if (els.adminBackupHint) els.adminBackupHint.textContent = backups.length ? `保留最近 ${backups.length} 份資料庫備份。` : "尚未建立備份，首次儲存或手動建立後會出現。";
  if (!els.backupList) return;
  els.backupList.replaceChildren();
  backups.slice(0, 5).forEach((backup) => {
    const item = document.createElement("div"); item.className = "backup-item";
    const name = document.createElement("strong"); name.textContent = backup.name;
    const meta = document.createElement("small"); meta.textContent = `${formatAdminTime(backup.created_at)} ・ ${formatBytes(backup.size)}`;
    item.append(name, meta); els.backupList.appendChild(item);
  });
}

function renderSecurityStatus(summary) {
  if (!els.securityStatusList) return;
  const apiState = localApiOnline ? "已連線（本機）" : "未連線";
  const values = [
    ["登入工作階段", `${summary.session_ttl_minutes || "--"} 分鐘`],
    ["上傳上限", formatBytes(summary.max_upload_bytes)],
    ["資料庫影像容量", formatBytes(summary.storage_bytes)],
    ["API 狀態", apiState],
  ];
  els.securityStatusList.replaceChildren();
  values.forEach(([label, value]) => {
    const item = document.createElement("div"); const key = document.createElement("dt"); const data = document.createElement("dd");
    key.textContent = label; data.textContent = value; item.append(key, data); els.securityStatusList.appendChild(item);
  });
}

async function createAdminBackup() {
  if (!editorToken()) return;
  if (els.createBackupBtn) els.createBackupBtn.disabled = true;
  try {
    const response = await fetch(`${localApiBase}/backups`, { method: "POST", headers: editorHeaders() });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    appendLog("[admin] manual backup created");
    await loadAdminDashboard();
  } catch (error) {
    window.alert("備份建立失敗，請確認本機 API 已啟動。");
    appendLog(`[admin] backup failed: ${error.message}`);
  } finally {
    if (els.createBackupBtn) els.createBackupBtn.disabled = false;
  }
}

function openAuthModal() {
  if (!localApiOnline) {
    if (els.authModal) {
      if (els.authError) els.authError.textContent = "請先啟動本機 API，管理功能才能連線。";
      els.authModal.classList.add("show");
      els.authModal.setAttribute("aria-hidden", "false");
    } else {
      window.alert("請先啟動本機 API，管理功能才能連線。");
    }
    return;
  }
  if (!els.authModal) return;
  if (els.authError) els.authError.textContent = "";
  if (els.authPasswordInput) els.authPasswordInput.value = "";
  els.authModal.classList.add("show");
  els.authModal.setAttribute("aria-hidden", "false");
  els.authUsernameInput?.focus();
}

function closeAuthModal() {
  if (!els.authModal) return;
  els.authModal.classList.remove("show");
  els.authModal.setAttribute("aria-hidden", "true");
}

async function submitEditorLogin(event) {
  event.preventDefault();
  const username = els.authUsernameInput?.value.trim() || "";
  const password = els.authPasswordInput?.value || "";
  if (!username || !password) return;
  try {
    const response = await fetch(`${localApiBase}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) throw new Error("login failed");
    const session = await response.json();
    sessionStorage.setItem(editorSessionKey, session.access_token);
    setAccessMode("editor");
    closeAuthModal();
    appendLog(`[auth] editor login=${session.username}`);
  } catch {
    sessionStorage.removeItem(editorSessionKey);
    setAccessMode("visitor");
    if (els.authError) els.authError.textContent = "帳號或密碼錯誤，請再試一次。";
  }
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
  els.accValue.textContent = formatMetricValue(metricValue(selected, metricKey), metricKey);
  els.trainingState.textContent = "Loaded";
  drawChart();
}

function currentMetricKey() {
  const key = appliedMetricKey || "map50";
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

function metricValue(combo, metricKey = currentMetricKey()) {
  return metricKey === "composite" ? compositeScore(combo) : combo[metricKey];
}

function rankedCombosByMetric(metricKey = currentMetricKey()) {
  if (metricKey === "composite") return rankedCombosByComposite();
  const config = metricConfigs[metricKey] || metricConfigs.map50;
  return [...comboResults].sort((a, b) => {
    if (config.better === "lower") return a[metricKey] - b[metricKey];
    return b[metricKey] - a[metricKey];
  });
}

function compositeScore(combo) {
  const qualityKeys = ["map50", "map5095", "precision", "recall", "f1", "accuracy", "cavityAp50", "wisdomAp50"];
  const quality = qualityKeys.reduce((sum, key) => sum + Number(combo[key] || 0), 0) / qualityKeys.length;
  const times = comboResults.map((item) => item.time);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const timeScore = 1 - ((combo.time - minTime) / (maxTime - minTime || 1));
  return (quality * 0.85) + (timeScore * 0.15);
}

function rankedCombosByComposite() {
  return [...comboResults].sort((a, b) => compositeScore(b) - compositeScore(a));
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
  const mode = appliedChartMode || "ranking";
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
  const values = rows.map((combo) => metricValue(combo, metricKey));
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
    const normalized = (metricValue(combo, metricKey) - min) / (max - min || 1);
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
  const values = comboResults.map((combo) => metricValue(combo, metricKey));
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
  const selectedX = left + ((metricValue(selected, metricKey) - min) / (max - min || 1)) * (right - left);
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
      <span>${metricConfig.label}: ${formatTooltipValue(metricValue(region.combo, metricKey), metricKey)}</span>
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
  const sortMode = appliedComboSort || "map50";
  if (sortMode === "composite") return rankedCombosByComposite();
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
  return `box = ${combo.box.toFixed(1)}；lr0 = ${combo.lr0}；weight_decay = ${combo.weightDecay.toFixed(3)}；momentum = ${combo.momentum.toFixed(3)}；scheduler = ${combo.scheduler}。`;
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
  const compositeRows = rankedCombosByComposite();
  const compositeBest = compositeRows[0];
  const selectedCompositeRank = compositeRows.findIndex((combo) => combo.id === selected.id) + 1;
  if (els.compositeBestTitle) els.compositeBestTitle.textContent = `Combo ${compositeBest.id}`;
  if (els.compositeBestText) {
    els.compositeBestText.textContent = `綜合分數 ${compositeScore(compositeBest).toFixed(4)}。此排名同時考慮偵測品質與平均時間，適合用來挑整體最均衡的候選組合。`;
  }
  if (els.selectedCompositeScore) els.selectedCompositeScore.textContent = compositeScore(selected).toFixed(4);
  if (els.selectedCompositeRank) els.selectedCompositeRank.textContent = `#${selectedCompositeRank}`;

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
        item.textContent = `#${index + 1} Combo ${combo.id}  ${metricConfig.label} ${formatMetricValue(metricValue(combo, metricKey), metricKey)}  F1 ${combo.f1.toFixed(4)}`;
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
  els.accValue.textContent = formatMetricValue(metricValue(selected, metricKey), metricKey);
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

function markSimulationControlsPending() {
  els.applySimulationControlsBtn?.classList.add("pending");
}

function applySimulationControls() {
  appliedComboSort = els.comboSort?.value || appliedComboSort;
  appliedMetricKey = els.metricSelect?.value || appliedMetricKey;
  appliedChartMode = els.chartMode?.value || appliedChartMode;
  els.applySimulationControlsBtn?.classList.remove("pending");
  renderComboResults();
  appendLog(`[query] applied controls sort=${appliedComboSort}, metric=${appliedMetricKey}, chart=${appliedChartMode}`);
}

function pauseTraining() {
  if (els.comboSort) els.comboSort.value = "id";
  appliedComboSort = "id";
  renderComboResults();
  appendLog("[query] showing all 72 combos by Combo ID");
}

function fastFinishTraining() {
  const metricKey = currentMetricKey();
  if (els.comboSort) els.comboSort.value = metricKey;
  appliedComboSort = metricKey;
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

function detectionClassLabel(value) {
  return normalizeDetectionClass(value) === "wisdom_tooth" ? "阻生智齒" : "蛀牙";
}

function normalizeDetectionClass(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (["wisdom_tooth", "impacted_wisdom_tooth", "wisdom", "阻生智齒", "智齒阻生", "阻升智齒"].includes(normalized)) {
    return "wisdom_tooth";
  }
  return "cavity";
}

function normalizedBoxCoordinates(box, width, height) {
  const raw = Array.isArray(box.xyxy)
    ? box.xyxy
    : [box.x1, box.y1, box.x2, box.y2];
  let [x1, y1, x2, y2] = raw.map(Number);
  if (![x1, y1, x2, y2].every(Number.isFinite) || x2 <= x1 || y2 <= y1) return null;
  const appearsNormalized = Math.max(x1, y1, x2, y2) <= 1.5;
  if (appearsNormalized) {
    x1 *= width;
    x2 *= width;
    y1 *= height;
    y2 *= height;
  }
  return [
    Math.max(0, Math.min(width, x1)),
    Math.max(0, Math.min(height, y1)),
    Math.max(0, Math.min(width, x2)),
    Math.max(0, Math.min(height, y2)),
  ];
}

function detectionStats() {
  const boxes = Array.isArray(currentPredictionBoxes) ? currentPredictionBoxes : [];
  const stats = {
    cavity: { label: "蛀牙", count: 0, maxConfidence: 0 },
    wisdom_tooth: { label: "阻生智齒", count: 0, maxConfidence: 0 },
  };
  boxes.forEach((box) => {
    const key = normalizeDetectionClass(box.class ?? box.label ?? box.name ?? box.class_name);
    stats[key].count += 1;
    stats[key].maxConfidence = Math.max(stats[key].maxConfidence, Number(box.confidence) || 0);
  });
  return stats;
}

function detectionCountSummary() {
  const stats = detectionStats();
  const total = stats.cavity.count + stats.wisdom_tooth.count;
  if (!total && currentConfidence > 0) return `人工標註：${selectedDemo}`;
  if (!total) return "尚未推論";
  return `蛀牙 ${stats.cavity.count} 個，阻生智齒 ${stats.wisdom_tooth.count} 個`;
}

function detectionConfidenceSummary() {
  const stats = detectionStats();
  const total = stats.cavity.count + stats.wisdom_tooth.count;
  if (!total) return currentConfidence > 0 ? `偵測信心 ${currentConfidence}%` : "上傳影像並按推論後顯示數量";
  const best = stats.cavity.maxConfidence >= stats.wisdom_tooth.maxConfidence ? stats.cavity : stats.wisdom_tooth;
  return `共 ${total} 個偵測框，最高信心 ${best.label} ${(best.maxConfidence * 100).toFixed(1)}%`;
}

function renderProbabilities() {
  els.probList.replaceChildren();
  const stats = detectionStats();
  const total = stats.cavity.count + stats.wisdom_tooth.count;
  if (total) {
    Object.values(stats).forEach((group) => {
      const item = document.createElement("div");
      item.className = "prob-item summary";
      const labelNode = document.createElement("strong");
      labelNode.textContent = group.label;
      const detailNode = document.createElement("span");
      detailNode.textContent = `${group.count} 個`;
      const valueNode = document.createElement("b");
      valueNode.textContent = group.count ? `最高信心 ${(group.maxConfidence * 100).toFixed(1)}%` : "未偵測到";
      item.append(labelNode, detailNode, valueNode);
      els.probList.appendChild(item);
    });
    return;
  }

  const item = document.createElement("div");
  item.className = "prob-item summary";
  const labelNode = document.createElement("strong");
  labelNode.textContent = currentConfidence > 0 ? selectedDemo : "尚未推論";
  const detailNode = document.createElement("span");
  detailNode.textContent = currentConfidence > 0 ? "人工修改或 API 回傳結果" : "上傳影像並連線本機模型後才會產生偵測框";
  const valueNode = document.createElement("b");
  valueNode.textContent = currentConfidence > 0 ? `偵測信心 ${currentConfidence}%` : "--";
  item.append(labelNode, detailNode, valueNode);
  els.probList.appendChild(item);
}

function renderLegacyProbabilities(profile) {
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
  if (els.savedPredictionValue) els.savedPredictionValue.textContent = detectionCountSummary();
  if (els.savedConfidenceValue) els.savedConfidenceValue.textContent = detectionConfidenceSummary();
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

function renderDetectionBoxes() {
  if (!els.detectionOverlay || !els.medicalViewerImage || els.medicalImageStage?.hidden) return;
  els.detectionOverlay.replaceChildren();
  const width = els.medicalViewerImage.naturalWidth || 1;
  const height = els.medicalViewerImage.naturalHeight || 1;
  currentPredictionBoxes.forEach((box, index) => {
    const coords = normalizedBoxCoordinates(box, width, height);
    if (!coords) return;
    const [x1, y1, x2, y2] = coords;
    const marker = document.createElement("div");
    const detectionClass = normalizeDetectionClass(box.class ?? box.label ?? box.name ?? box.class_name);
    marker.className = `detection-box ${detectionClass === "wisdom_tooth" ? "wisdom" : "cavity"}`;
    marker.style.left = `${(x1 / width) * 100}%`;
    marker.style.top = `${(y1 / height) * 100}%`;
    marker.style.width = `${((x2 - x1) / width) * 100}%`;
    marker.style.height = `${((y2 - y1) / height) * 100}%`;
    const label = document.createElement("span");
    label.textContent = `${detectionClassLabel(detectionClass)} ${(Number(box.confidence) * 100).toFixed(1)}%`;
    marker.appendChild(label);
    if (boxEditingAvailable()) {
      marker.classList.add("editable");
      marker.dataset.boxIndex = String(index);
      marker.addEventListener("pointerdown", (event) => startBoxPointerEdit(event, index, "move"));
      const resizeHandle = document.createElement("button");
      resizeHandle.type = "button";
      resizeHandle.className = "detection-resize-handle";
      resizeHandle.setAttribute("aria-label", "調整框選大小");
      resizeHandle.addEventListener("pointerdown", (event) => startBoxPointerEdit(event, index, "resize"));
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "detection-remove-button";
      removeButton.setAttribute("aria-label", "刪除此框選");
      removeButton.textContent = "×";
      removeButton.addEventListener("click", () => {
        currentPredictionBoxes.splice(index, 1);
        demoBoxesDirty = true;
        renderDetectionBoxes();
        updateBoxEditingUi();
      });
      marker.append(resizeHandle, removeButton);
    }
    els.detectionOverlay.appendChild(marker);
  });
  updateImageInfoUi();
  updateBoxEditingUi();
}

function startBoxPointerEdit(event, index, mode) {
  if (!boxEditingAvailable() || event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  const stageRect = els.medicalImageStage.getBoundingClientRect();
  const imageWidth = els.medicalViewerImage.naturalWidth || 1;
  const imageHeight = els.medicalViewerImage.naturalHeight || 1;
  const original = normalizedBoxCoordinates(currentPredictionBoxes[index], imageWidth, imageHeight);
  if (!original) return;
  const startX = event.clientX;
  const startY = event.clientY;
  const move = (pointerEvent) => {
    const dx = ((pointerEvent.clientX - startX) / stageRect.width) * imageWidth;
    const dy = ((pointerEvent.clientY - startY) / stageRect.height) * imageHeight;
    let [x1, y1, x2, y2] = original;
    if (mode === "move") {
      const boxWidth = x2 - x1;
      const boxHeight = y2 - y1;
      x1 = Math.max(0, Math.min(imageWidth - boxWidth, x1 + dx));
      y1 = Math.max(0, Math.min(imageHeight - boxHeight, y1 + dy));
      x2 = x1 + boxWidth;
      y2 = y1 + boxHeight;
    } else {
      x2 = Math.max(x1 + 8, Math.min(imageWidth, x2 + dx));
      y2 = Math.max(y1 + 8, Math.min(imageHeight, y2 + dy));
    }
    currentPredictionBoxes[index] = { ...currentPredictionBoxes[index], xyxy: [x1, y1, x2, y2] };
    demoBoxesDirty = true;
    renderDetectionBoxes();
  };
  const end = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", end);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end, { once: true });
}

function addDetectionBox(detectionClass) {
  if (!boxEditingAvailable()) return;
  const width = els.medicalViewerImage.naturalWidth || 1;
  const height = els.medicalViewerImage.naturalHeight || 1;
  currentPredictionBoxes.push({
    class: detectionClass,
    confidence: 0.5,
    xyxy: [width * 0.35, height * 0.35, width * 0.65, height * 0.65],
  });
  demoBoxesDirty = true;
  renderDetectionBoxes();
}

async function saveBoxEdits() {
  if (!boxEditingAvailable() || !demoBoxesDirty) return;
  if (els.saveBoxEditsBtn) els.saveBoxEditsBtn.disabled = true;
  const payload = {
    boxes: currentPredictionBoxes.map((box) => ({
      class: normalizeDetectionClass(box.class ?? box.label ?? box.name ?? box.class_name),
      confidence: Math.max(0, Math.min(1, Number(box.confidence) || 0)),
      xyxy: normalizedBoxCoordinates(box, els.medicalViewerImage.naturalWidth || 1, els.medicalViewerImage.naturalHeight || 1),
    })).filter((box) => Array.isArray(box.xyxy)),
  };
  try {
    const response = await fetch(`${localApiBase}/records/${currentApiRecordId}/boxes`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...editorHeaders() },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const record = await response.json();
    currentPredictionBoxes = Array.isArray(record.boxes) ? record.boxes : currentPredictionBoxes;
    selectedDemo = normalizePredictionLabel(record.prediction || selectedDemo);
    currentConfidence = clampConfidence((Number(record.confidence) || 0) * 100);
    demoBoxesDirty = false;
    applyResultToUi(selectedDemo, currentConfidence, "已儲存框選修改");
    renderDetectionBoxes();
    appendLog(`[edit] boxes saved record=${currentApiRecordId}`);
  } catch (error) {
    window.alert("框選修改儲存失敗，請確認編輯登入仍有效。");
    appendLog(`[edit] boxes save failed: ${error.message}`);
  } finally {
    updateBoxEditingUi();
  }
}

function resetDemoInferenceState() {
  selectedDemo = "";
  currentConfidence = 0;
  els.predictionValue.textContent = "尚未推論";
  els.confidenceValue.textContent = "上傳影像並按推論後顯示數量";
  els.heroPrediction.textContent = "尚未推論";
  els.heroConfidence.textContent = "等待模型推論";
  if (els.topResult) els.topResult.textContent = "尚未推論";
  if (els.manualPredictionInput) els.manualPredictionInput.value = "蛀牙";
  if (els.manualConfidenceInput) els.manualConfidenceInput.value = "0";
  currentPredictionBoxes = [];
  currentApiRecordId = null;
  demoBoxesDirty = false;
  renderProbabilities();
  updateImageInfoUi();
  updateSlicerViewer("未偵測到目標", 0, "等待本機推論");
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
  if (!animated) currentPredictionBoxes = [];
  els.predictionValue.textContent = animated ? "推論中" : detectionCountSummary();
  els.confidenceValue.textContent = animated ? "偵測信心 --" : `偵測信心 ${max}%`;
  els.heroPrediction.textContent = label;
  els.heroConfidence.textContent = animated ? "推論中" : `偵測信心 ${max}%`;
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
  renderProbabilities();
  els.pipelineResult.textContent = animated ? "Running" : "Output";
  updateImageInfoUi();
  updateSlicerViewer(label, max, animated ? "推論中" : "已完成");
}

function runPrediction() {
  appendLog("[demo] input image received, running model inference");
  const apiBase = apiBaseUrl();
  if (localApiOnline && currentUploadFile) {
    els.predictionValue.textContent = "推論中";
    els.confidenceValue.textContent = "正在讀取本機模型輸出";
    els.heroPrediction.textContent = "推論中";
    els.heroConfidence.textContent = "正在偵測蛀牙與阻生智齒";
    if (els.topResult) els.topResult.textContent = "推論中";
    els.pipelineResult.textContent = "Running";
    updateSlicerViewer("未偵測到目標", 0, "推論中");
    runApiPrediction(apiBase, currentUploadFile);
    return;
  }
  if (!currentUploadFile) {
    els.confidenceValue.textContent = "請先上傳一張 X-ray 圖片";
    if (els.slicerStatus) els.slicerStatus.textContent = "等待上傳影像";
  } else {
    els.confidenceValue.textContent = "請先連線本機模型 API";
    if (els.slicerStatus) els.slicerStatus.textContent = "等待本機 API";
  }
  appendLog("[api] skipped: upload an image and use API Endpoint for real confidence");
}

async function runApiPrediction(apiBase, file) {
  try {
    const form = new FormData();
    form.append("file", file);
    const response = await fetch(`${apiBase.replace(/\/$/, "")}/predict`, {
      method: "POST",
      headers: editorHeaders(),
      body: form,
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.detail || `API ${response.status}`);
    }
    const result = await response.json();
    selectedDemo = normalizePredictionLabel(result.prediction || selectedDemo);
    currentConfidence = clampConfidence((Number(result.confidence) || 0) * 100);
    currentPredictionBoxes = Array.isArray(result.boxes) ? result.boxes : [];
    currentApiRecordId = result.id || null;
    demoBoxesDirty = false;
    renderDetectionBoxes();
    lastInferenceMs = `${Number(result.inference_ms || 0).toFixed(0)} ms`;
    if (els.inferenceTime) els.inferenceTime.textContent = lastInferenceMs;
    if (els.manualPredictionInput && ["蛀牙", "阻生智齒"].includes(selectedDemo)) els.manualPredictionInput.value = selectedDemo;
    if (els.manualConfidenceInput) els.manualConfidenceInput.value = String(currentConfidence);
    applyResultToUi(selectedDemo, currentConfidence, result.slicer?.connected ? "Slicer 已連線" : "API 已完成");
    appendLog(`[api] /predict ok record=${result.id || "none"} slicer=${result.slicer?.connected ? "connected" : "offline"}`);
  } catch (error) {
    const needsLogin = String(error.message).includes("editor authentication required");
    els.confidenceValue.textContent = needsLogin ? "此 API 需要登入編輯模式後才可推論" : "API 推論失敗";
    if (els.slicerStatus) els.slicerStatus.textContent = "API 失敗";
    appendLog(`[api] /predict failed: ${error.message}`);
  }
}

function applyResultToUi(label, confidence, status = "已完成") {
  selectedDemo = normalizePredictionLabel(label);
  currentConfidence = clampConfidence(confidence);
  const countSummary = detectionCountSummary();
  const confidenceSummary = detectionConfidenceSummary();
  els.predictionValue.textContent = countSummary;
  els.confidenceValue.textContent = selectedDemo === "未偵測到目標" ? "未偵測到目標" : confidenceSummary;
  els.heroPrediction.textContent = countSummary;
  els.heroConfidence.textContent = selectedDemo === "未偵測到目標" ? "未偵測到目標" : confidenceSummary;
  if (els.topResult) els.topResult.textContent = countSummary;
  renderProbabilities();
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

els.imageUpload.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  const isSupportedImage = allowedImageTypes.has(file.type) || (!file.type && allowedImageExtensions.has(extension));
  if (!isSupportedImage) {
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
  currentPredictionBoxes = [];
  currentApiRecordId = null;
  demoBoxesDirty = false;
  selectedDemo = "";
  currentConfidence = 0;
  if (currentPreviewUrl) {
    URL.revokeObjectURL(currentPreviewUrl);
    currentPreviewUrl = null;
  }
  const url = URL.createObjectURL(file);
  currentPreviewUrl = url;
  currentImageInfo = {
    name: file.name,
    type: file.type || `image/${extension}`,
    size: formatBytes(file.size),
  };
  const label = document.createElement("span");
  label.id = "previewLabel";
  label.textContent = `Uploaded: ${file.name}`;
  if (isSupportedImage) {
    const image = document.createElement("img");
    image.src = url;
    image.alt = "uploaded dental image";
    els.previewBox.replaceChildren(image, label);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "preview-tooth";
    els.previewBox.replaceChildren(placeholder, label);
  }
  if (els.medicalViewerImage && els.medicalViewerPlaceholder && els.medicalImageStage) {
    const isImageFile = isSupportedImage;
    els.medicalViewerPlaceholder.hidden = isImageFile;
    els.medicalImageStage.hidden = !isImageFile;
    els.medicalViewerImage.src = isImageFile ? url : "";
    els.medicalViewerImage.onload = renderDetectionBoxes;
  }
  els.predictionValue.textContent = "尚未推論";
  els.confidenceValue.textContent = "影像已載入，請按本機模型推論";
  if (els.topResult) els.topResult.textContent = "尚未推論";
  renderProbabilities();
  updateImageInfoUi();
  if (els.predictBtn) els.predictBtn.disabled = !localApiOnline;
  appendLog(`[demo] uploaded file=${file.name}`);
});

els.runTrainingBtn?.addEventListener("click", runTraining);
els.resetTrainingBtn.addEventListener("click", resetTraining);
els.predictBtn?.addEventListener("click", runPrediction);
els.pauseTrainingBtn?.addEventListener("click", pauseTraining);
els.fastTrainingBtn?.addEventListener("click", fastFinishTraining);
els.comboSelect?.addEventListener("change", () => {
  renderComboResults();
  appendLog(`[query] selected Combo ${selectedComboResult().id}`);
});
els.comboSort?.addEventListener("change", () => {
  markSimulationControlsPending();
  appendLog(`[query] pending sort=${els.comboSort.value}`);
});
els.metricSelect?.addEventListener("change", () => {
  markSimulationControlsPending();
  appendLog(`[chart] pending metric=${els.metricSelect.value}`);
});
els.chartMode?.addEventListener("change", () => {
  markSimulationControlsPending();
  appendLog(`[chart] pending mode=${els.chartMode.value}`);
});
els.applySimulationControlsBtn?.addEventListener("click", applySimulationControls);
els.chart?.addEventListener("mousemove", handleChartPointerMove);
els.chart?.addEventListener("mouseleave", hideChartTooltip);
els.chart?.addEventListener("click", handleChartClick);
els.checkSystemBtn?.addEventListener("click", checkSystemStatus);
els.visitorModeBtn?.addEventListener("click", () => {
  sessionStorage.removeItem(editorSessionKey);
  setAccessMode("visitor");
});
els.editorModeBtn?.addEventListener("click", openAuthModal);
els.authForm?.addEventListener("submit", submitEditorLogin);
els.closeAuthModalBtn?.addEventListener("click", closeAuthModal);
els.cancelAuthBtn?.addEventListener("click", closeAuthModal);
els.authModal?.addEventListener("click", (event) => {
  if (event.target === els.authModal) closeAuthModal();
});
els.openModelModalBtn?.addEventListener("click", openModelModal);
els.closeModelModalBtn?.addEventListener("click", closeModelModal);
els.applyModelBtn?.addEventListener("click", applyActiveModel);
els.adminApplyModelBtn?.addEventListener("click", () => applyActiveModel(els.adminActiveModelSelect?.value));
els.refreshAdminBtn?.addEventListener("click", loadAdminDashboard);
els.refreshAdminRecordsBtn?.addEventListener("click", loadAdminRecords);
els.adminRecordTableBody?.addEventListener("click", handleAdminRecordAction);
els.adminRecordSearch?.addEventListener("input", () => renderAdminRecords(adminRecordsCache));
els.adminRecordStatusFilter?.addEventListener("change", () => renderAdminRecords(adminRecordsCache));
els.adminRecordSort?.addEventListener("change", () => renderAdminRecords(adminRecordsCache));
els.exportAdminRecordsBtn?.addEventListener("click", exportAdminRecords);
els.createBackupBtn?.addEventListener("click", createAdminBackup);
els.refreshSecurityBtn?.addEventListener("click", loadAdminDashboard);
els.closeAdminRecordModalBtn?.addEventListener("click", closeAdminRecordModal);
els.adminReviewForm?.addEventListener("submit", saveAdminReview);
els.adminRecordModal?.addEventListener("click", (event) => {
  if (event.target === els.adminRecordModal) closeAdminRecordModal();
});
els.expandParamBtn?.addEventListener("click", () => setParamGroups(true));
els.collapseParamBtn?.addEventListener("click", () => setParamGroups(false));
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
    closeAuthModal();
  }
});
els.dataImageFolderInput?.addEventListener("change", loadLocalDatasetImages);
els.dataSearchInput?.addEventListener("input", resetDataBrowserPage);
els.dataSplitFilter?.addEventListener("change", resetDataBrowserPage);
els.dataClassFilter?.addEventListener("change", resetDataBrowserPage);
els.dataPageSizeSelect?.addEventListener("change", () => {
  dataPageSize = Number(els.dataPageSizeSelect.value || 25);
  resetDataBrowserPage();
});
document.querySelectorAll("[data-data-sort]").forEach((button) => {
  button.addEventListener("click", () => {
    const key = button.dataset.dataSort || "index";
    if (dataSortKey === key) {
      dataSortDirection = dataSortDirection === "asc" ? "desc" : "asc";
    } else {
      dataSortKey = key;
      dataSortDirection = ["cavity", "wisdom_tooth", "total"].includes(key) ? "desc" : "asc";
    }
    resetDataBrowserPage();
  });
});
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
els.addCavityBoxBtn?.addEventListener("click", () => addDetectionBox("cavity"));
els.addWisdomBoxBtn?.addEventListener("click", () => addDetectionBox("wisdom_tooth"));
els.saveBoxEditsBtn?.addEventListener("click", saveBoxEdits);
els.saveDemoBtn?.addEventListener("click", saveDemoRecord);
els.downloadRecordsBtn?.addEventListener("click", downloadDemoRecords);
els.clearRecordsBtn?.addEventListener("click", clearDemoRecords);
[els.lrInput, els.batchInput, els.epochInput, els.optimizerInput].forEach((input) => {
  input?.addEventListener("change", updateConfigSummary);
  input?.addEventListener("input", updateConfigSummary);
});

function showTab(tabName) {
  const safeTab = tabName === "admin" && !editorToken() ? "overview" : (tabName || "overview");
  document.querySelectorAll("[data-tab-page]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.tabPage === safeTab);
  });
  document.querySelectorAll("nav a[data-tab]").forEach((link) => {
    link.classList.toggle("active", link.dataset.tab === safeTab);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (safeTab === "admin") {
    loadModelManagement();
    loadAdminDashboard();
    loadAdminRecords();
  }
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

resetDemoInferenceState();
setLastUpdatedTime();
setAccessMode(localStorage.getItem(accessModeKey) || "visitor");
renderDemoRecords();
updateConfigSummary();
renderComboResults();
renderDataBrowser();
checkSystemStatus();
