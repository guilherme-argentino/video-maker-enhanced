import { save } from '../robot/state.js'
import robot from "./robots/text.js";

test('test text.robot()', () => {
  const content = {
    maximumSentences: 7,
    lang: 'BR',
    prefix: 'A história de',
    searchTerm: 'UFC'
  }
  save(content)
  robot()
})
