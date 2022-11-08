#!/usr/bin/env node
const chalk = require("chalk");
const fs = require("fs-extra");
const os = require("os");
const path = require("path");
const argv = require("minimist")(process.argv.slice(2));
const execa = require("execa");
const open = require("open");
const { explore } = require("source-map-explorer");
const Package = JSON.parse(fs.readFileSync("./package.json"));

//从metro.config.js 拿referenceDir
function getReferenceDir() {
  const dir = fs
    .readFileSync("./metro.config.js")
    .toString()
    .match(/referenceDir:[\s]{0,1}(\'|\")(\S*)(\'|\")/);
  if (Array.isArray(dir) && dir.length === 4) {
    return dir[2];
  }
  return "";
}

function getAppName() {
  if (Package.name) return Package.name ? Package.name.trim() : Package.name;
  try {
    const appJSON = JSON.parse(fs.readFileSync("./app.json"));
    return appJSON.name.trim() || appJSON.expo.name.trim() || "UnKnown";
  } catch (err) {
    return "UnKnown";
  }
}

function getEntryPoint() {
  let entry = Package.main || "index.js";
  if (entry[0] !== "." && entry[0] !== "/" && entry[0] !== "\\") {
    entry = "./" + entry;
  }
  return entry;
}

//基础路径
const bsDir = path.join(os.tmpdir(), "rn-multibundle-analyzer");
//临时路径
const tmpDir = path.join(bsDir, getAppName());
//output存放路径
const outDir = path.join(tmpDir, "output");
//是否多bundle（多bundle默认入口依旧为index）
const multipleMode = argv.multi || false;
const bundleOutdir = path.join(outDir, "bundle");
//自定义设置 entryFile
let entryFile;
//平台设置
const platform = argv.platform || "ios";
//是否开发环境
const dev = argv.dev || false;
const format = argv.format || "html";
const bundleOutputExplorerFile =
  (argv.bundleOutput && path.join(argv.bundleOutput, "explorer." + format)) ||
  path.join(outDir, "explorer." + format);
const onlyMapped = !!argv["only-mapped"] || false;

if (argv["entry-file"]) {
  if (multipleMode) {
    let entryFile = [...getMultipleEntryPoint(argv["entry-file"])];
    if (getReferenceDir()) {
      entryFile = [`_dll.${platform}`, ...entryFile];
    }
  } else {
    entryFile = [argv["entry-file"]];
  }
} else {
  entryFile = [getEntryPoint()];
  if (!entryFile.length) {
    console.log(
      chalk.red.underline.bold("Must input source path of entryFile!")
    );
    process.exit(1);
  }
  if (multipleMode && getReferenceDir()) {
    entryFile = [`_dll.${platform}`, ...entryFile];
  }
}

process.env.NODE_ENV = dev ? "development" : "production";
fs.ensureDirSync(bsDir);
fs.ensureDirSync(tmpDir);
fs.ensureDir(bundleOutdir);
console.log(chalk.green.bold("Generating bundle..."));

//获得reactnativecli
function getReactNativeBin() {
  const localBin = "./node_modules/.bin/react-native";
  if (fs.existsSync(localBin)) return localBin;
  try {
    const reactNativeDir = path.dirname(
      require.resolve("react-native/package.json")
    );
    return path.join(reactNativeDir, "./cli.js");
  } catch (e) {
    console.error(
      chalk.red.bold(`React-native binary could not be located.`),
      chalk.blue.bold(`${require("../package.json").bugs}`)
    );
    process.exit(1);
  }
}

//获得metro-code-split cli
function getMetroCodeBin() {
  const localBin = "./node_modules/.bin/mcs-scripts";
  if (fs.existsSync(localBin)) return localBin;
  try {
    const MetroCondeBin = path.dirname(
      require.resolve("metro-code-split/package.json")
    );
    return path.join(MetroCondeBin, "./cli.js");
  } catch (e) {
    console.error(
      chalk.red.bold(`Metro-Code-Split binary could not be located`),
      chalk.blue.bold(`${require("../package.json").bugs}`)
    );
    process.exit(1);
  }
}
//获得入口文件
function getMultipleEntryPoint(dir) {
  if (/.json$/.test(dir)) {
    const module = fs.readFileSync(dir);
    if (Array.isArray(JSON.parse(module))) {
      return JSON.parse(module);
    } else {
      console.error(chalk.red.bold(`Invalid Entry-file Type!\n`));
      process.exit(1);
    }
  } else {
    return [dir];
  }
}

const reactNativeBin = getReactNativeBin();

function generateBundlePromise(file) {
  return file.reduce((prev, curr, index) => {
    const bundleOutput = path.join(bundleOutdir, curr + ".bundle");
    if (curr === `_dll.${platform}`) {
      curr = "node_modules/.cache/metro-code-split/dll-entry.js";
    }
    const basecommand = ["bundle", "--platform", platform, "--dev", dev];
    basecommand.push(
      "--entry-file",
      curr,
      "--bundle-output",
      bundleOutput,
      "--sourcemap-output",
      bundleOutput + ".map"
    );
    prev.push(execa(reactNativeBin, basecommand));
    return prev;
  }, []);
}

//生成commonbundle
async function generateBaseBundle() {
  const metroBin = getMetroCodeBin();
  if (getReferenceDir()) {
    let outputdir = path.join(process.cwd(), getReferenceDir());
    if (fs.existsSync(outputdir)) {
    }
    let commands = ["build", "-t", "dllJson", "-od", outputdir];
    await execa(metroBin, commands);
  }
}

// 生成结果
function generateHTML() {
  Promise.all([...generateBundlePromise(entryFile)])
    .then(() => {
      const bundlesAndFiletokens = entryFile.reduce((prev, curr) => {
        prev.push({
          code: path.join(bundleOutdir, curr + ".bundle"),
          map: path.join(bundleOutdir, curr + ".bundle.map"),
        });
        return prev;
      }, []);
      console.log(bundlesAndFiletokens);
      return explore(bundlesAndFiletokens, {
        onlyMapped,
        noBorderChecks: true,
        output: {
          format,
          filename: bundleOutputExplorerFile,
        },
      });
    })
    .then((result) => {
      if (result.errors) {
        result.errors.forEach((error) => {
          if (error.isWarning) {
            console.log(chalk.blueBright.bold(error.message));
          } else {
            console.log(chalk.greenBright.bold(error.message));
          }
        });
      }
      //fs.removeSync(path.join(process.cwd(),getReferenceDir()));
      return open(bundleOutputExplorerFile);
    })
    .catch((err) => {
      console.error(chalk.red.bold("Error Occured at build stage!" + err));
      process.exit(1);
    });
}

if (multipleMode) {
  generateBaseBundle().then(() => generateHTML());
} else {
  process.env.NODE_ENV = "development";
  generateHTML();
}
