const fs = require("fs");
const path = require("path");

function findMainPackageJson(entryPath, packageName) {
  entryPath = entryPath.replace(/\//g, path.sep);
  let directoryName = path.dirname(entryPath);
  while (directoryName && !directoryName.endsWith(packageName)) {
    const parentDirectoryName = path.resolve(directoryName, "..");
    if (parentDirectoryName === directoryName) {
      break;
    }
    directoryName = parentDirectoryName;
  }

  const suspect = path.resolve(directoryName, "package.json");
  if (fs.existsSync(suspect)) {
    return JSON.parse(fs.readFileSync(suspect).toString());
  }

  return null;
}

module.exports = (request, options) => {
  let packageName = "";
  let submoduleName = "";

  // NOTE: jest-sequencer is a special prefixed jest request
  const isNodeModuleRequest =
    !request.startsWith(".") &&
    !request.startsWith("/") &&
    !request.startsWith("jest-sequencer");

  if (isNodeModuleRequest) {
    const pkgPathParts = request.split("/");
    if (request.startsWith("@") && pkgPathParts.length > 2) {
      packageName = pkgPathParts.slice(0, 2).join("/");
      submoduleName = `./${pkgPathParts.slice(2).join("/")}`;
    } else if (!request.startsWith("@") && pkgPathParts.length > 1) {
      packageName = pkgPathParts[0];
      submoduleName = `./${pkgPathParts.slice(1).join("/")}`;
    }
  }

  const extension = path.extname(submoduleName);
  if (packageName && submoduleName) {
    let packageJson = undefined;

    try {
      packageJson = require(`${packageName}/package.json`);
    } catch (requireError) {
      if (requireError.code === "ERR_PACKAGE_PATH_NOT_EXPORTED") {
        // modules's package.json does not provide the "./package.json" path at it's "exports" field
        // try to resolve manually
        try {
          const requestPath = require.resolve(packageName);
          packageJson =
            requestPath && findMainPackageJson(requestPath, packageName);
        } catch (resolveError) {
          if (resolveError.code === "ERR_PACKAGE_PATH_NOT_EXPORTED") {
            console.warn(
              `Could not retrieve package.json neither through require (package.json itself is not within "exports" field), nor through require.resolve (package.json does not specify "main" field) - falling back to default resolver logic`
            );
          } else {
            console.log(
              `Unexpected error while performing require.resolve(${packageName}):`
            );
            console.error(resolveError);
            return null;
          }
        }
      } else {
        console.log(`Unexpected error while requiring ${packageName}:`);
        console.error(requireError);
        return null;
      }
    }

    if (!packageJson) {
      console.error(`Failed to find package.json for ${packageName}`);
    }

    const hasExports = packageJson && packageJson.exports;
    const isEntryPointsExports =
      hasExports &&
      Object.keys(packageJson.exports).every((k) => k.startsWith("."));

    if (hasExports && isEntryPointsExports) {
      const exportValue = packageJson.exports[submoduleName];

      let targetFilePath;
      if (typeof exportValue === "string") {
        targetFilePath = exportValue;
      } else if (exportValue !== null && typeof exportValue === "object") {
        targetFilePath = exportValue.node;

        if (!targetFilePath) {
          targetFilePath = exportValue.require;
        }

        if (!targetFilePath && packageJson.type !== "module") {
          targetFilePath = exportValue.default;
        }
      }

      if (targetFilePath) {
        const target = targetFilePath.replace("./", `${packageName}/`);
        return options.defaultResolver(target, options);
      }
    }
  }

  return options.defaultResolver(request, options);
};
