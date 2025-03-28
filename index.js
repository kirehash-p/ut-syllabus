const GAS_API_URL =
  "https://script.google.com/macros/s/AKfycbzZu84dV89NImVHmcJ2kCFHd1tgJ8SSzxxpqyeMEAu4-d_IIBMPNKVSkfpXiJaT76Nz/exec";

const DEFAULT_FILTERS = [
  { column: "学期", type: "include", keyword: "S" },
];

const columns = [
  "時間割コード",
  "共通科目コード",
  "コース名",
  "教員",
  "学期",
  "時限",
  "講義使用言語",
  "単位",
  "実務経験のある教員による授業科目",
  "他学部履修",
  "開講所属",
  "講義概要",
  "授業計画",
  "授業の方法",
  "成績評価方法",
  "教科書",
  "参考書",
  "URL"
];
const placeholderMapping = {
  "学期": "Ex. S / A / S1 / W",
  "時限": "Ex. 水曜 / 2限 / 月曜1限",
  "講義使用言語": "Ex. 日本語 / 英語",
  "単位": "Ex. 1 / 2",
  "実務経験のある教員による授業科目": "Ex. YES / NO",
  "他学部履修": "Ex. 可 / 不可",
  "成績評価方法": "Ex. 試験 / レポート / 出席"
};

function addFilterRow(defaults = {}) {
  const container = document.getElementById("filterContainer");
  const rowDiv = document.createElement("div");
  rowDiv.className = "filter-row";

  // カラム選択
  const selectColumn = document.createElement("select");
  selectColumn.name = "column";
  columns.forEach(col => {
    let option = document.createElement("option");
    option.value = col;
    option.text = col;
    selectColumn.appendChild(option);
  });
  // defaults.column が指定されていればそれをセット
  selectColumn.value = defaults.column || columns[0];
  rowDiv.appendChild(selectColumn);

  // 条件選択
  const selectCondition = document.createElement("select");
  selectCondition.name = "condition";
  [["include", "含む"], ["exclude", "含まれていない"]].forEach(([val, text]) => {
    let opt = document.createElement("option");
    opt.value = val;
    opt.text = text;
    selectCondition.appendChild(opt);
  });
  selectCondition.value = defaults.condition || "include";
  rowDiv.appendChild(selectCondition);

  // キーワード入力
  const inputKeyword = document.createElement("input");
  inputKeyword.type = "text";
  inputKeyword.name = "keyword";
  inputKeyword.placeholder = placeholderMapping[selectColumn.value] || "キーワード";
  inputKeyword.value = defaults.keyword || "";
  rowDiv.appendChild(inputKeyword);

  // カラム変更時にプレースホルダーを更新
  selectColumn.addEventListener("change", function () {
    inputKeyword.placeholder = placeholderMapping[this.value] || "キーワード";
  });

  // 複数条件の場合は削除ボタンを追加
  if (document.getElementsByClassName("filter-row").length > 0) {
    let removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.innerText = "×";
    removeBtn.onclick = () => rowDiv.remove();
    rowDiv.appendChild(removeBtn);
  }

  container.appendChild(rowDiv);
}

window.onload = function () {
  if (DEFAULT_FILTERS.length > 0) {
    DEFAULT_FILTERS.forEach(filter => addFilterRow(filter));
  } else {
    addFilterRow();
  }
  const toggle = document.getElementById("searchBarToggle");
  const filterForm = document.getElementById("filterForm");
  toggle.addEventListener("click", function (e) {
    if (filterForm.classList.contains("collapsed")) {
      filterForm.classList.remove("collapsed");
      toggle.innerText = "検索条件 ▼";
    } else {
      filterForm.classList.add("collapsed");
      toggle.innerText = "検索条件 ▲";
    }
    e.stopPropagation();
  });
  filterForm.addEventListener("submit", function(e) {
    e.preventDefault();
    submitForm();
  });
};

function submitForm() {
  document.getElementById("result").innerHTML =
    '<div id="loading"><span class="spinner"></span>検索中…</div>';

  const container = document.getElementById("filterContainer");
  const rows = container.getElementsByClassName("filter-row");
  let conditions = [];
  for (let row of rows) {
    let column = row.querySelector("select[name='column']").value;
    let condition = row.querySelector("select[name='condition']").value;
    let keyword = row.querySelector("input[name='keyword']").value;
    if (keyword.trim() !== "")
      conditions.push({ column: column, type: condition, keyword: keyword });
  }
  const payload = {
    action: "filterLectures",
    filterConditions: conditions
  };

  fetch(GAS_API_URL, {
    redirect: "follow",
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  })
    .then(response => response.json())
    .then(data => {
      if (data.status === "success") {
        displayResults(data.data);
      } else {
        alert("エラー: " + data.message);
      }
    })
    .catch(error => {
      alert("通信エラー: " + error);
    });
}

let globalResults = [];
function displayResults(results) {
  const resultDiv = document.getElementById("result");
  if (!results || results.length <= 1) {
    resultDiv.innerHTML = '<p style="text-align:center;">一致する講義は見つかりませんでした。</p>';
    return;
  }
  globalResults = results;
  const headerRow = results[0];
  const colIndexMap = {};
  headerRow.forEach((col, i) => {
    colIndexMap[col] = i;
  });
  let htmlArr = [];
  for (let rowIdx = 1; rowIdx < results.length; rowIdx++) {
    const row = results[rowIdx];
    let teacherName = String(row[colIndexMap["教員"]] || "");
    if (
      colIndexMap["実務経験のある教員による授業科目"] != null &&
      row[colIndexMap["実務経験のある教員による授業科目"]] === "YES"
    ) {
      teacherName += "（実務経験あり）";
    }
    let topHtml = '<div class="card-top">';
    topHtml += '<div class="card-top-left">';
    topHtml += `<div class="course-name">${escapeHtml(
      String(row[colIndexMap["コース名"]] || "")
    )}</div>`;
    topHtml += "</div>";
    topHtml += '<div class="card-top-right">';
    topHtml += `<div class="grid-row">
                  <div><span class="group-label">学期:</span> ${escapeHtml(
                    String(row[colIndexMap["学期"]] || "")
                  )}</div>
                  <div><span class="group-label">時限:</span> ${escapeHtml(
                    String(row[colIndexMap["時限"]] || "")
                  )}</div>
                  <div><span class="group-label">講義使用言語:</span> ${escapeHtml(
                    String(row[colIndexMap["講義使用言語"]] || "")
                  )}</div>
                </div>`;
    topHtml += `<div class="grid-row">
                  <div><span class="group-label">教員:</span> ${escapeHtml(
                    teacherName
                  )}</div>
                  <div><span class="group-label">開講所属:</span> ${escapeHtml(
                    String(row[colIndexMap["開講所属"]] || "")
                  )}</div>
                  <div><span class="group-label">他学部履修:</span> ${escapeHtml(
                    String(row[colIndexMap["他学部履修"]] || "")
                  )}</div>
                </div>`;
    topHtml += "</div></div>";
    let group2 = "";
    if (colIndexMap["講義概要"] != null) {
      group2 = '<div class="group-box">';
      group2 += '<div class="group-header">講義概要</div>';
      group2 += `<div class="pre-wrap">${escapeHtml(
        truncateText(String(row[colIndexMap["講義概要"]] || ""))
      )}</div>`;
      group2 += "</div>";
    }
    let group3Row1 = '<div class="group-row" style="display: flex; gap: 10px;">';
    if (colIndexMap["授業計画"] != null) {
      group3Row1 += '<div class="group-box" style="flex: 1;">';
      group3Row1 += '<div class="group-header">授業計画</div>';
      group3Row1 += `<div class="pre-wrap">${escapeHtml(
        truncateText(String(row[colIndexMap["授業計画"]] || ""))
      )}</div>`;
      group3Row1 += "</div>";
    }
    if (colIndexMap["授業の方法"] != null) {
      group3Row1 += '<div class="group-box" style="flex: 1;">';
      group3Row1 += '<div class="group-header">授業の方法</div>';
      group3Row1 += `<div class="pre-wrap">${escapeHtml(
        truncateText(String(row[colIndexMap["授業の方法"]] || ""))
      )}</div>`;
      group3Row1 += "</div>";
    }
    group3Row1 += "</div>";
    let group3Row2 = '<div class="group-row" style="display: flex; gap: 10px;">';
    if (colIndexMap["成績評価方法"] != null) {
      group3Row2 += '<div class="group-box" style="flex: 1;">';
      group3Row2 += '<div class="group-header">成績評価方法</div>';
      group3Row2 += `<div class="pre-wrap">${escapeHtml(
        truncateText(String(row[colIndexMap["成績評価方法"]] || ""))
      )}</div>`;
      group3Row2 += "</div>";
    }
    if (
      colIndexMap["教科書"] != null ||
      colIndexMap["参考書"] != null
    ) {
      group3Row2 += '<div class="group-box" style="flex: 1; padding: 8px;">';
      group3Row2 += '<div style="display: flex; flex-direction: column; gap: 10px;">';
      if (colIndexMap["教科書"] != null) {
        group3Row2 += '<div style="flex: 1;">';
        group3Row2 += '<div class="group-header">教科書</div>';
        group3Row2 += `<div class="pre-wrap">${escapeHtml(
          truncateText3(String(row[colIndexMap["教科書"]] || ""))
        )}</div>`;
        group3Row2 += "</div>";
      }
      if (colIndexMap["参考書"] != null) {
        group3Row2 += '<div style="flex: 1;">';
        group3Row2 += '<div class="group-header">参考書</div>';
        group3Row2 += `<div class="pre-wrap">${escapeHtml(
          truncateText3(String(row[colIndexMap["参考書"]] || ""))
        )}</div>`;
        group3Row2 += "</div>";
      }
      group3Row2 += "</div>";
      group3Row2 += "</div>";
    }
    group3Row2 += "</div>";
    let group4 = '<div class="group-row" style="display: flex; justify-content: space-between; align-items: center;">';
    group4 += '<div style="display: flex; gap: 10px; align-items: center;">';
    group4 += `<div><span class="group-label">時間割コード:</span> ${escapeHtml(
      String(row[colIndexMap["時間割コード"]] || "")
    )}</div>`;
    group4 += `<div><span class="group-label">共通科目コード:</span> ${escapeHtml(
      String(row[colIndexMap["共通科目コード"]] || "")
    )}</div>`;
    group4 += "</div>";
    let urlVal = String(row[colIndexMap["URL"]] || "");
    group4 += '<div style="text-align: right;">';
    group4 += `<div><span class="group-label">URL:</span> <a href="${escapeHtml(
      urlVal
    )}" target="_blank">${escapeHtml(urlVal)}</a></div>`;
    group4 += "</div>";
    group4 += "</div>";
    htmlArr.push(
      `<div class="lecture-card" onclick="openModal(this,${rowIdx})">${topHtml}${group2}${group3Row1}${group3Row2}${group4}</div>`
    );
  }
  resultDiv.innerHTML = htmlArr.join("");
}

function getColIndexMap(headerRow) {
  const colIndexMap = {};
  headerRow.forEach((col, i) => {
    colIndexMap[col] = i;
  });
  return colIndexMap;
}

function generateFullCardHTML(row, colIndexMap) {
  let teacherName = String(row[colIndexMap["教員"]] || "");
  if (
    colIndexMap["実務経験のある教員による授業科目"] != null &&
    row[colIndexMap["実務経験のある教員による授業科目"]] === "YES"
  ) {
    teacherName += "（実務経験あり）";
  }
  let topHtml = '<div class="card-top">';
  topHtml += '<div class="card-top-left">';
  topHtml += `<div class="course-name">${escapeHtml(
    String(row[colIndexMap["コース名"]] || "")
  )}</div>`;
  topHtml += "</div>";
  topHtml += '<div class="card-top-right">';
  topHtml += `<div class="grid-row">
                <div><span class="group-label">学期:</span> ${escapeHtml(
                  String(row[colIndexMap["学期"]] || "")
                )}</div>
                <div><span class="group-label">時限:</span> ${escapeHtml(
                  String(row[colIndexMap["時限"]] || "")
                )}</div>
                <div><span class="group-label">講義使用言語:</span> ${escapeHtml(
                  String(row[colIndexMap["講義使用言語"]] || "")
                )}</div>
              </div>`;
  topHtml += `<div class="grid-row">
                <div><span class="group-label">教員:</span> ${escapeHtml(
                  teacherName
                )}</div>
                <div><span class="group-label">開講所属:</span> ${escapeHtml(
                  String(row[colIndexMap["開講所属"]] || "")
                )}</div>
                <div><span class="group-label">他学部履修:</span> ${escapeHtml(
                  String(row[colIndexMap["他学部履修"]] || "")
                )}</div>
              </div>`;
  topHtml += "</div></div>";
  let group2 = "";
  if (colIndexMap["講義概要"] != null) {
    group2 = '<div class="group-box">';
    group2 += '<div class="group-header">講義概要</div>';
    group2 += `<div class="pre-wrap">${escapeHtml(
      String(row[colIndexMap["講義概要"]] || "")
    )}</div>`;
    group2 += "</div>";
  }
  let group3Row1 = '<div class="group-row" style="display: flex; gap: 10px;">';
  if (colIndexMap["授業計画"] != null) {
    group3Row1 += '<div class="group-box" style="flex: 1;">';
    group3Row1 += '<div class="group-header">授業計画</div>';
    group3Row1 += `<div class="pre-wrap">${escapeHtml(
      String(row[colIndexMap["授業計画"]] || "")
    )}</div>`;
    group3Row1 += "</div>";
  }
  if (colIndexMap["授業の方法"] != null) {
    group3Row1 += '<div class="group-box" style="flex: 1;">';
    group3Row1 += '<div class="group-header">授業の方法</div>';
    group3Row1 += `<div class="pre-wrap">${escapeHtml(
      String(row[colIndexMap["授業の方法"]] || "")
    )}</div>`;
    group3Row1 += "</div>";
  }
  group3Row1 += "</div>";
  let group3Row2 = '<div class="group-row" style="display: flex; gap: 10px;">';
  if (colIndexMap["成績評価方法"] != null) {
    group3Row2 += '<div class="group-box" style="flex: 1;">';
    group3Row2 += '<div class="group-header">成績評価方法</div>';
    group3Row2 += `<div class="pre-wrap">${escapeHtml(
      String(row[colIndexMap["成績評価方法"]] || "")
    )}</div>`;
    group3Row2 += "</div>";
  }
  if (
    colIndexMap["教科書"] != null ||
    colIndexMap["参考書"] != null
  ) {
    group3Row2 += '<div class="group-box" style="flex: 1; padding: 8px;">';
    group3Row2 += '<div style="display: flex; flex-direction: column; gap: 10px;">';
    if (colIndexMap["教科書"] != null) {
      group3Row2 += '<div style="flex: 1;">';
      group3Row2 += '<div class="group-header">教科書</div>';
      group3Row2 += `<div class="pre-wrap">${escapeHtml(
        String(row[colIndexMap["教科書"]] || "")
      )}</div>`;
      group3Row2 += "</div>";
    }
    if (colIndexMap["参考書"] != null) {
      group3Row2 += '<div style="flex: 1;">';
      group3Row2 += '<div class="group-header">参考書</div>';
      group3Row2 += `<div class="pre-wrap">${escapeHtml(
        String(row[colIndexMap["参考書"]] || "")
      )}</div>`;
      group3Row2 += "</div>";
    }
    group3Row2 += "</div>";
    group3Row2 += "</div>";
  }
  group3Row2 += "</div>";
  let group4 = '<div class="group-row" style="display: flex; justify-content: space-between; align-items: center;">';
  group4 += '<div style="display: flex; gap: 10px; align-items: center;">';
  group4 += `<div><span class="group-label">時間割コード:</span> ${escapeHtml(
    String(row[colIndexMap["時間割コード"]] || "")
  )}</div>`;
  group4 += `<div><span class="group-label">共通科目コード:</span> ${escapeHtml(
    String(row[colIndexMap["共通科目コード"]] || "")
  )}</div>`;
  group4 += "</div>";
  let urlVal = String(row[colIndexMap["URL"]] || "");
  group4 += '<div style="text-align: right;">';
  group4 += `<div><span class="group-label">URL:</span> <a href="${escapeHtml(
    urlVal
  )}" target="_blank">${escapeHtml(urlVal)}</a></div>`;
  group4 += "</div>";
  group4 += "</div>";
  return `<div class="lecture-card expanded">${topHtml}${group2}${group3Row1}${group3Row2}${group4}</div>`;
}

function openModal(elem, rowIndex) {
  const results = globalResults;
  if (!results || results.length <= rowIndex) return;
  const headerRow = results[0];
  const row = results[rowIndex];
  const rect = elem.getBoundingClientRect();
  const startTop = rect.top + window.scrollY;
  const startLeft = rect.left + window.scrollX;
  const modal = document.getElementById("modal");
  modal.innerHTML = "";
  modal.style.display = "block";
  modal.onclick = function (e) {
    if (e.target === modal) {
      closeModal();
    }
  };
  const modalCard = document.createElement("div");
  modalCard.id = "modalCard";
  modalCard.style.position = "absolute";
  modalCard.style.top = startTop + "10vh";
  modalCard.style.left = startLeft + "10vw";
  modalCard.style.width = rect.width + "80vw";
  modalCard.style.maxHeight = "80vh";
  modalCard.style.transition = "all 0.3s ease";
  modalCard.style.backgroundColor = "#fff";
  modalCard.style.overflow = "auto";
  modalCard.style.borderRadius = "8px";
  modalCard.style.zIndex = "10000";
  modalCard.innerHTML = generateFullCardHTML(row, getColIndexMap(headerRow));
  modal.appendChild(modalCard);
  const closeBtn = document.createElement("div");
  closeBtn.innerText = "×";
  closeBtn.style.position = "absolute";
  closeBtn.style.top = "10px";
  closeBtn.style.right = "20px";
  closeBtn.style.fontSize = "3em";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.zIndex = "10001";
  closeBtn.onclick = closeModal;
  modal.appendChild(closeBtn);
  modalCard.getBoundingClientRect();
  const targetWidth = window.innerWidth * 0.8;
  const targetHeight = window.innerHeight * 0.8;
  const targetLeft = (window.innerWidth - targetWidth) / 2;
  const targetTop = (window.innerHeight - targetHeight) / 2;
  modalCard.style.top = targetTop + "px";
  modalCard.style.left = targetLeft + "px";
  modalCard.style.width = targetWidth + "px";
}

function closeModal() {
  const modal = document.getElementById("modal");
  const modalCard = document.getElementById("modalCard");
  if (modalCard) {
    modalCard.style.opacity = "0";
    setTimeout(() => {
      modal.style.display = "none";
      modal.innerHTML = "";
    }, 300);
  } else {
    modal.style.display = "none";
  }
}

function truncateText(text) {
  if (!text) return "";
  let lines = text.split("\n");
  if (lines.length > 5 || text.length > 600) {
    let truncated = text.length > 600 ? text.substring(0, 600) : text;
    let truncatedLines = truncated.split("\n");
    if (truncatedLines.length > 5) {
      truncated = truncatedLines.slice(0, 5).join("\n");
    }
    return truncated + "...";
  }
  return text;
}

function truncateText3(text) {
  if (!text) return "";
  let lines = text.split("\n");
  if (lines.length > 3) return lines.slice(0, 3).join("\n") + "...";
  return text;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
