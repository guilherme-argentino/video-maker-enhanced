import { apiKey as gotitaiApiKey } from '../../credentials/gotit.ai.json'
import axios from 'axios'

const gotitailanguages = {
  pt: 'PtBr',
  en: 'EnUs'
}

const ProcessScriptFactory = function (processMethod) {
  if (this instanceof ProcessScriptFactory) {
    return new this[processMethod]()
  } else {
    return new ProcessScriptFactory(processMethod)
  }
}

ProcessScriptFactory.prototype = {
  GotitAi: function () {
    this.processScript = async function (content) {
      const body = {
        T: content.sourceContentSanitized,
        S: true,
        EM: true,
        SL: gotitailanguages[content.lang]
      }
      const url = 'https://api.gotit.ai/NLU/v1.4/Analyze'
      console.log('> [text-robot] Getting feeling from GotIt.Ai')
      const getData = async (url) => {
        try {
          const response = await axios.request({
            url,
            method: 'post',
            data: body,
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Basic ${gotitaiApiKey}`
            }
          })

          const json = await response.data
          const arr = Object.values(json.emotions)
          const max = Math.max(...arr)
          const emotions = Object.entries(json.emotions).reduce(
            (ret, entry) => {
              const [key, value] = entry
              ret[value] = key
              return ret
            },
            {}
          )
          content.feeling = emotions[max]
          console.log(
            `> [text-robot] the feeling is ${content.feeling}: by GotIt.Ai`
          )
        } catch (error) {
          console.log(`> [text-robot] ${error}`)
        }
      }
      await getData(url)
    }
  }
}

export default ProcessScriptFactory
