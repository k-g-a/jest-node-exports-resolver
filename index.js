module.exports = (request, options) => {
  let pkgName = "";
  let submoduleName = "";

  // NOTE: jest-sequencer is a special prefixed jest request
  if (
    !request.startsWith(".") &&
    !request.startsWith("/") &&
    !request.startsWith("jest-sequencer")
  ) {
    const pkgPathParts = request.split("/");
    if (request.startsWith("@") && pkgPathParts.length > 2) {
      pkgName = pkgPathParts.slice(0, 2).join("/");
      submoduleName = `./${pkgPathParts.slice(2).join("/")}`;
    } else if (!request.startsWith("@") && pkgPathParts.length > 1) {
      pkgName = pkgPathParts[0];
      submoduleName = `./${pkgPathParts.slice(1).join("/")}`;
    }
  }

  const submoduleHasExtension = /\.\w+$/.test(submoduleName);
  if (pkgName && submoduleName && !submoduleHasExtension) {
    let pkg;
    try {
      pkg = require(`${pkgName}/package.json`);
    } catch (e) {
      console.log(`Error while trying to get ${pkgName}'s package.json`);
      console.error(e);
    }

    if (
      pkg &&
      pkg.exports &&
      Object.keys(pkg.exports).every((k) => k.startsWith("."))
    ) {
      console.log('[index.js]', 'exports');
      const exportValue = pkg.exports[submoduleName];

      let targetFilePath;
      if (typeof exportValue === "string") {
        targetFilePath = exportValue;
      } else if (exportValue !== null && typeof exportValue === "object") {
        targetFilePath = exportValue.node;

        if (!targetFilePath) {
          targetFilePath = exportValue.require;
        }

        if (!targetFilePath && pkg.type !== "module") {
          targetFilePath = exportValue.default;
        }
      }

      if (targetFilePath) {
        const target = targetFilePath.replace("./", `${pkgName}/`);
        return options.defaultResolver(target, options);
      }
    }
  }

  return options.defaultResolver(request, options);
};
