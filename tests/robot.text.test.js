import { save } from '../robots/state'
import robot from "../robots/text"

test("test text.robot()", async () => {
  const content = {
    maximumSentences: 7,
    lang: "BR",
    prefix: "A história de",
    searchTerm: "UFC",
  };

  save(content);
  await robot();
});
