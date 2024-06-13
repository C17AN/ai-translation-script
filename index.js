const { Translate } = require("@google-cloud/translate").v2;
const TurndownService = require("turndown");
const marked = require("marked");
const fs = require("fs");
const path = require("path");
const usageFilePath = "translation_usage.json";
const charLimitPerMonth = 450000;

const translate = new Translate();
const turndownService = new TurndownService();

async function translateMarkdownFile(filePath, targetLanguage) {
  try {
    // 파일 읽기
    const markdownText = fs.readFileSync(filePath, "utf8");
    const currentUsage = checkCurrentUsage();
    if (currentUsage + markdownText.length > charLimitPerMonth) {
      console.log("월간 무료 API 할당량을 초과했습니다.");
      return;
    }

    updateUsage(markdownText.length);
    // 마크다운을 HTML로 변환
    const htmlContent = marked.parse(markdownText);

    // HTML을 번역
    const [translatedHtml] = await translate.translate(
      htmlContent,
      targetLanguage
    );

    // 번역된 HTML을 다시 마크다운으로 변환
    const translatedMarkdown = turndownService.turndown(translatedHtml);

    // 번역된 마크다운을 파일로 저장
    const newFilePath = path.join(
      path.dirname(filePath),
      `translated-${path.basename(filePath)}`
    );
    fs.writeFileSync(newFilePath, translatedMarkdown, "utf8");

    console.log("번역한 문자열 개수 : ", markdownText.length);
    console.log(`결과물이 ${newFilePath} 에 저장되었습니다.`);
  } catch (error) {
    console.error("Error:", error);
  }
}

function checkCurrentUsage() {
  const yearMonth = new Date().toISOString().slice(0, 7);
  if (!fs.existsSync(usageFilePath)) {
    fs.writeFileSync(usageFilePath, JSON.stringify({}));
  }
  const usageData = JSON.parse(fs.readFileSync(usageFilePath, "utf8"));
  return usageData[yearMonth] || 0;
}

function updateUsage(chars) {
  const yearMonth = new Date().toISOString().slice(0, 7);
  const usageData = JSON.parse(fs.readFileSync(usageFilePath, "utf8"));
  usageData[yearMonth] = (usageData[yearMonth] || 0) + chars;
  fs.writeFileSync(usageFilePath, JSON.stringify(usageData, null, 2));
}

// 번역하고자 하는 마크다운 파일의 경로와 목표 언어
const markdownFilePath = "./index.md";
const targetLanguage = "ko"; // 한국어로 번역

translateMarkdownFile(markdownFilePath, targetLanguage);
