'use strict';

// Import necessary modules
const path = require('path');
const fs = require('fs');
const Promise = require('pinkie-promise');
const request = require('request');
const child = require('child-process-promise');
const vdf = require('vdf');
const _ = require('lodash.defaults');
const zlib = require('zlib');
const unzip = require('unzip');
const tar = require('tar');

// Define default options for the module
const defaultOptions = {
  binDir: path.join(__dirname, 'steamcmd_bin')
};

/**
 * Determines the URL and extractor based on the current platform.
 * @returns {Object} - Contains the URL and extractor module, or an error message if the platform is unsupported.
 */
const getExtractor = () => {
  switch (process.platform) {
    case 'win32':
      return { url: 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip', extractor: unzip };
    case 'darwin':
      return { url: 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd_osx.tar.gz', extractor: tar };
    case 'linux':
      return { url: 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz', extractor: tar };
    default:
      return { error: 'Unsupported platform' };
  }
};

/**
 * Downloads the SteamCMD installer based on the current platform.
 * @param {Object} opts - Options object that can override default options.
 * @returns {Promise} - Resolves when the download and extraction are complete, or rejects with an error.
 */
const download = (opts) => {
  opts = _.defaults(opts, defaultOptions);
  const { url, extractor, error } = getExtractor();
  if (error) return Promise.reject(error);

  return new Promise((resolve, reject) => {
    let req = request(url);
    if (process.platform !== 'win32') {
      req = req.pipe(zlib.createGunzip());
    }
    req.pipe(extractor.Extract({ path: opts.binDir }))
      .on('finish', resolve)
      .on('error', reject);
  });
};

/**
 * Checks if the SteamCMD binary directory exists and downloads it if it doesn't.
 * @param {Object} opts - Options object that can override default options.
 * @returns {Promise} - Resolves if the directory exists, or after downloading and extracting if it doesn't.
 */
const downloadIfNeeded = (opts) => {
  opts = _.defaults(opts, defaultOptions);
  try {
    fs.statSync(opts.binDir);
    return Promise.resolve();
  } catch (err) {
    return download(opts);
  }
};

/**
 * Runs SteamCMD with the given commands.
 * @param {Array} commands - Array of commands to pass to SteamCMD.
 * @param {Object} opts - Options object that can override default options.
 * @returns {Promise} - Resolves with the process output or rejects with an error.
 */
const run = (commands, opts) => {
  opts = _.defaults(opts, defaultOptions);
  const exeName = process.platform === 'win32' ? 'steamcmd.exe' : 'steamcmd.sh';
  if (!exeName) return Promise.reject('Unsupported platform');

  const args = commands.concat('quit').map(x => '+' + x).join(' ').split(' ');
  return new Promise((resolve, reject) => {
    child.spawn(path.join(opts.binDir, exeName), args, { capture: ['stdout', 'stderr'], cwd: opts.binDir })
      .then(resolve)
      .catch(x => {
        if (x.code === 7) resolve(x);
        else reject(x);
      });
  });
};

/**
 * Touches the SteamCMD executable to ensure it's ready to run.
 * @param {Object} opts - Options object that can override default options.
 * @returns {Promise} - Resolves after touching the SteamCMD executable.
 */
const touch = (opts) => {
  opts = _.defaults(opts, defaultOptions);
  return run([], opts);
};

/**
 * Retrieves application information for a given app ID.
 * @param {Number} appID - The application ID to retrieve information for.
 * @param {Object} opts - Options object that can override default options.
 * @returns {Promise} - Resolves with the parsed application information or rejects with an error.
 */
const getAppInfo = (appID, opts) => {
  opts = _.defaults(opts, defaultOptions);
  const forceInfoCommand = ['@ShutdownOnFailedCommand 0', 'login anonymous', `app_info_print ${appID}`, 'force_install_dir ./4', 'app_update 4'];
  const fetchInfoCommand = ['@ShutdownOnFailedCommand 0', 'login anonymous', 'app_info_update 1', `app_info_print ${appID}`, 'find e'];

  return run(forceInfoCommand, opts)
    .then(() => run(fetchInfoCommand, opts))
    .then(proc => {
      let stdout = proc.stdout.replace('\r\n', '\n');
      const infoTextStart = stdout.indexOf(`"${appID}"`);
      const infoTextEnd = stdout.indexOf('ConVars:');
      const infoText = stdout.substr(infoTextStart, infoTextEnd - infoTextStart);
      return vdf.parse(infoText)[appID];
    });
};

/**
 * Updates a Steam application to the latest version.
 * @param {Number} appId - The application ID to update.
 * @param {String} installDir - The installation directory for the application.
 * @param {Object} opts - Options object that can override default options.
 * @returns {Promise} - Resolves with a boolean indicating if the application was updated or rejects with an error.
 */
const updateApp = (appId, installDir, opts) => {
  opts = _.defaults(opts, defaultOptions);
  if (!path.isAbsolute(installDir)) throw new TypeError('installDir must be an absolute path in updateApp');

  const commands = ['@ShutdownOnFailedCommand 0', 'login anonymous', `force_install_dir ${installDir}`, `app_update ${appId}`];
  if (parseInt(appId, 10) === 90) commands.push(`app_update ${appId}`);

  return run(commands, opts)
    .then(proc => {
      const stdout = proc.stdout.replace('\r\n', '\n');
      if (stdout.includes(`Success! App '${appId}' fully installed`)) return true;
      if (stdout.includes(`Success! App '${appId}' already up to date.`)) return false;

      const stdoutArray = stdout.split('\n');
      return Promise.reject(new Error(`Unable to update ${appId}. \n SteamCMD error was ${stdoutArray[stdoutArray.length - 2]}`));
    });
};

/**
 * Prepares the SteamCMD environment by ensuring the binaries are downloaded and ready.
 * @param {Object} opts - Options object that can override default options.
 * @returns {Promise} - Resolves after preparing the environment.
 */
const prep = (opts) => {
  opts = _.defaults(opts, defaultOptions);
  return downloadIfNeeded(opts)
    .then(() => new Promise(resolve => setTimeout(resolve, 500)))
    .then(() => touch(opts));
};

// Export the functions for use in other modules
module.exports = {
  download: downloadIfNeeded,
  touch,
  prep,
  getAppInfo,
  updateApp
};
