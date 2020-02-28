const readline = require("readline-sync");
const Parser = require("rss-parser");
const state = require("./state.js");

async function robot() {
  const content = {
    maximumSentences: 7
  };

  const searchTermInputOptions = ["Google Trends", "Keyboard"];

  const searchTermInputOption = askSearchTermSource();

  switch (searchTermInputOption) {
    case "Google Trends":
      content.searchTerm = await askAndReturnTrend();
      // code block
      break;
    case "Keyboard":
    // code block
    default:
      // code block
      content.searchTerm = askAndReturnSearchTerm();
  }
  const { selectedLangText, selectedLangIndex } = askAndReturnLanguage();
  content.lang = selectedLangText;
  content.prefix = askAndReturnPrefix(selectedLangIndex);
  state.save(content);

  function askSearchTermSource() {
    const searchTermInputOptionIndex = readline.keyInSelect(
      searchTermInputOptions,
      "Choose one option: "
    );
    return searchTermInputOptions[searchTermInputOptionIndex];
  }

  function askAndReturnSearchTerm() {
    return readline.question("Type a Wikipedia search term: ");
  }

  function askAndReturnPrefix(selectedLangIndex) {
    const prefixes = [["Quem é", "O que é", "A história de"], ["Who is", "What is", "The history of"]];
    const selectedPrefixIndex = readline.keyInSelect(
      prefixes[selectedLangIndex],
      "Choose one option: "
    );
    const selectedPrefixText = prefixes[selectedPrefixIndex];

    return selectedPrefixText;
  }

  async function askAndReturnTrend() {
    const geo = ["BR", "US"];
    const selectedGeoIndex = readline.keyInSelect(geo, "Choice Trend Geo: ");
    const selectedGeoText = geo[selectedGeoIndex];
    content.trendGeo = selectedGeoText;

    console.log("Please Wait...");
    const trends = await getGoogleTrends();
    const choice = readline.keyInSelect(trends, "Choose your trend:");

    return trends[choice];
  }

  async function getGoogleTrends() {
    const TREND_URL =
      "https://trends.google.com/trends/trendingsearches/daily/rss?geo=" +
      content.trendGeo;

    const parser = new Parser();
    const trends = await parser.parseURL(TREND_URL);
    return trends.items.map(({ title }) => title);
  }

  function askAndReturnLanguage() {
    const language = ["pt", "en"];
    const selectedLangIndex = readline.keyInSelect(
      language,
      "Choice Language: "
    );
    const selectedLangText = language[selectedLangIndex];
    return { selectedLangText, selectedLangIndex };
  }
}

module.exports = robot;
