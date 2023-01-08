/**
 * https://stackoverflow.com/a/73330963/2888549
 * @param {*} url 
 * @param {*} init 
 * @returns 
 */
exports.fetch = async function (url, init) {
  const { default: fetch } = await import("node-fetch");
  return await fetch(url, init);
};
