import algorithmia from 'algorithmia'
import { apiKey as algorithmiaApiKey } from "../../credentials/algorithmia.json";

const superAgent = require("superagent");
const readline = require("readline-sync");
const unicode = require("unidecode");

//Factory method function created in safe mode
let WikipediaFactory = function (fetchMethod) {
  if (this instanceof WikipediaFactory) {
    var s = new this[fetchMethod]();
    return s;
  } else {
    return new WikipediaFactory(fetchMethod);
  }
};

WikipediaFactory.prototype = {
  Algorithmia: function () {
    this.fetch = async function (content) {
      const algorithmiaAutenticated = algorithmia(algorithmiaApiKey)
      const wikipediaAlgorithm = algorithmiaAutenticated.algo(
        'web/WikipediaParser/0.1.2?timeout=300'
      )
      const wikipediaResponde = await wikipediaAlgorithm.pipe({
        lang: content.lang,
        articleName: content.searchTerm
      })
      const wikipediaContent = wikipediaResponde.get()
      content.sourceContentOriginal = wikipediaContent.content
    }
  },
  WikipediaAPI: function () {
    this.fetch = async function (content) {
      const images = [];
      var ctn = "";
      var title = "";
      var summary = "";
      var pageid = "";
      var url = "";
      const links = [];
      const references = [];

      console.log("Fetching from Wikipedia...");
      var RealText = await getRealText(content.searchTerm);
      title = RealText;
      console.log("Searching content...");
      await getContent();
      console.log("Building Structure to others Robots...");
      let result = await buildStructure();

      content.sourceContentOriginal = result.content;

      /*
      *
      * Tenta buscar o termo na Wikipedia, se o mesmo não for encontrado ele encerra o programa,
      * Caso encontre mais de um,o mesmo sugere e pergunta qual termo você realmente tem interesse baseado na busca no Wikipedia.
      *
      * Obs: Um fato interessante é que o mesmo caso mude a URL da wikipedia para https://pt.wiki... o mesmo vai retornar sua busca em Português Brasil
      */
      async function getRealText(text) {
        const res = await superAgent.get("https://en.wikipedia.org/w/api.php").query({
          action: "opensearch",
          search: "" + text,
          limit: 5,
          namespace: 0,
          format: "json",
        });
        if (res.body[1].length == 0) {
          console.log("Your search term don't return any result");
          console.log("Tip: Search your therm in English or pre-search valid Words");
          console.log("Exiting Program...");
          process.exit();
        }
        let sugestions = [];
        res.body[1].forEach((e) => {
          sugestions.push(unicode(e));
        });
        let index = await selectTerm(sugestions);
        if (index == -1) {
          console.log("You don't selected any key");
          console.log("Exiting Program...");
          process.exit();
        }
        url = res.body[3][index];
        return res.body[1][index];
      }
      async function selectTerm(prefix) {
        return readline.keyInSelect(
          prefix,
          "Choose if any of these keys is the desired search :"
        );
      }
      /*
      *
      * Busca Todas as Informações da Pagina da Wikipedia Conforme a API do Algotithmia, trazendo ate alguns dados a mais, sendo que no momento, não estamos utilizando.
      *
      */
      async function getContent() {
        const ret = await superAgent.get("https://en.wikipedia.org/w/api.php").query({
          action: "query",
          prop: "extracts|images|links|info|extlinks",
          redirects: 1,
          exsectionformat: "wiki",
          explaintext: true,
          titles: RealText,
          format: "json",
        });
        let value;
        let map = new Map(Object.entries(ret.body.query.pages));
        map.forEach(function (e) {
          value = e;
        });
        try {
          value.links.forEach((e) => {
            links.push(e.title);
          });
        } catch (Ex) {
          console.log("----------------------------");
          console.log("Any Links in this search");
          console.log("----------------------------");
        }
        try {
          value.extlinks.forEach((e) => {
            references.push(e["*"]);
          });
        } catch (Ex) {
          console.log("----------------------------");
          console.log("Any Reference in this search");
          console.log("----------------------------");
        }
        pageid = value.pageid;
        ctn = value.extract;
        summary = value.extract.split("\n\n\n")[0];
        console.log("Fetching Images...");
        for (let i = 0; i < value.images.length; i++) {
          await getURLImage(value.images[i].title);
        }
      }
      /*
      *
      * Busca a URL das imagens retornadas anteriormente no metodo getContent(), podendo ser utilizada futuramente em outros robos.
      *
      */
      async function getURLImage(title) {
        const ret = await superAgent.get("https://en.wikipedia.org/w/api.php").query({
          action: "query",
          prop: "imageinfo",
          titles: title,
          format: "json",
          iiprop: "url",
        });
        let values = [];
        let map = new Map(Object.entries(ret.body.query.pages));
        map.forEach(function (e) {
          e.imageinfo.forEach(function (e) {
            values.push(e.url);
          });
        });
        values.forEach(function (e) {
          images.push(e);
        });
      }
      /*
      *
      * Constroi uma estrutura de dados, igual a do Algorithmia.
      *
      */
      async function buildStructure() {
        return {
          content: ctn,
          images: images,
          links: links,
          pageid: pageid,
          references: references,
          summary: summary,
          title: title,
          url: url,
        };
      }
    }
  }
}

export default WikipediaFactory