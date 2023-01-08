module.exports = {
  extends: "standard",
  plugins: ["jest"],
  rules: {
    "no-console": "off",
    indent: "off",
    "@typescript-eslint/indent": "off",
  },
  env: {
    "jest/globals": true,
  },
};
