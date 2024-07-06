# steamcmd

Call SteamCMD from Node.js

[![npm](https://img.shields.io/npm/dt/steamcmd.svg?style=flat-square)](https://www.npmjs.com/package/steamcmd)
[![AppVeyor](https://img.shields.io/appveyor/ci/mathphreak/node-steamcmd.svg?style=flat-square&label=Windows+build)](https://ci.appveyor.com/project/mathphreak/node-steamcmd)
[![Travis](https://img.shields.io/travis/mathphreak/node-steamcmd.svg?style=flat-square&label=OS+X+%2F+Linux+build)](https://travis-ci.org/mathphreak/node-steamcmd)

## Install

```
$ npm install --save steamcmd
```

SteamCMD works faster if all its [required ports](https://support.steampowered.com/kb_article.php?ref=8571-GLVN-8711)
are available:
* UDP 27015 through 27030
* TCP 27015 through 27030

## Usage

```js
const steamcmd = require('steamcmd');

steamcmd.download();
//=> returns a Promise for downloading steamcmd locally
steamcmd.touch();
//=> returns a Promise for ensuring that steamcmd is updated and dependencies exist
steamcmd.prep();
//=> returns a Promise for downloading and updating steamcmd
steamcmd.getAppInfo(730);
//=> returns a Promise for the app info of appID 730
steamcmd.updateApp(90, path.resolve('hlds'));
//=> returns a Promise for installing/updating the Half-Life Dedicated Server into 'hlds'
```

## API

### steamcmd.download([opts])
Downloads SteamCMD for the current OS into `opts.binDir`
unless `opts.binDir` already exists and is accessible.

### steamcmd.touch([opts])
Ensures SteamCMD is usable by running it with no arguments and exiting.

### steamcmd.prep([opts])
Runs `download([opts])`, waits briefly to avoid `EBUSY`, then runs
`touch([opts])`.

### steamcmd.getAppInfo(appid[, opts])
Asks SteamCMD to get the latest app info for the given app.

### steamcmd.updateApp(appid, installDir[, opts])
Asks SteamCMD to install/update the given app to the given **absolute**
directory. Throws a `TypeError` if `installDir` is not absolute.
Returns `true` if the update succeeded or `false` if it wasn't required.
If SteamCMD's stdout isn't recognized, throws it as an error.

## Configuration

All functions take an optional options parameter.

#### binDir

type: string
default: `path.join(__dirname, 'steamcmd_bin')`

The directory to use when downloading and running `steamcmd` itself.
Defaults to `steamcmd_bin` in the same directory where this package is installed.

## Testing

The tests run in parallel and do a significant amount of downloading and IO.
If you're running programs that scan downloaded files, like anti-virus or
anti-malware (e.g. Windows Defender Realtime Protection), the test processes
may run very slowly or be blocked with `EBUSY`. Try temporarily disabling such
programs while running the tests.

## Table of Contents
1. [Setup and Teardown](#setup-and-teardown)
2. [Test Cases](#test-cases)
   - [Download Test](#download-test)
   - [Touch Test](#touch-test)
   - [Prep Test](#prep-test)
   - [GetAppInfo Test](#getappinfo-test)
   - [Repeated GetAppInfo Calls Test](#repeated-getappinfo-calls-test)
   - [UpdateApp Tests](#updateapp-tests)
3. [Helper Functions](#helper-functions)
4. [Dependencies](#dependencies)

## Setup and Teardown

### Before All Tests
- **Purpose**: Create the test data directory.
- **Implementation**: Uses `mkdirp.sync` to create the `test_data` directory before any tests are run.

### After All Tests
- **Purpose**: Clean up the test data directory.
- **Implementation**: Uses `del` to delete the `test_data` directory after all tests have completed.

### Before Each Test
- **Purpose**: Set up a temporary directory for each test.
- **Implementation**: 
  - Generates a temporary directory path using `tempfile`.
  - Creates the temporary directory using `mkdirp.sync`.
  - Defines the binary directory path and sets up the test context with necessary paths and options.

### After Each Test
- **Purpose**: Clean up the temporary directory created for each test.
- **Implementation**: Uses `del` to delete the temporary directory forcefully after each test.

## Test Cases

### Download Test
- **Purpose**: Verify the download functionality.
- **Implementation**: 
  - Uses the `testDownload` helper function to perform the download action.
  - Ensures the binary directory exists without throwing an error.

### Touch Test
- **Purpose**: Verify the touch functionality.
- **Implementation**: 
  - Downloads the binary files.
  - Waits for 200ms to fix random EBUSY errors on Windows.
  - Performs the touch operation.
  - Ensures the public directory exists without throwing an error.

### Prep Test
- **Purpose**: Verify the prep functionality.
- **Implementation**: 
  - Uses the `testDownload` helper function to perform the prep action.
  - Ensures the binary directory exists without throwing an error.

### GetAppInfo Test
- **Purpose**: Verify the getAppInfo functionality for CS:GO.
- **Implementation**: 
  - Uses the `testGetAppInfo` helper function to fetch the app info for CS:GO.
  - Verifies the app name matches the expected name and ensures the app info is fully parsed.

### Repeated GetAppInfo Calls Test
- **Purpose**: Verify repeated calls to getAppInfo.
- **Implementation**: 
  - Prepares the environment for the test.
  - Fetches the app info for CS:GO.
  - Ensures repeated calls do not throw errors.

### UpdateApp Tests
- **Purpose**: Verify various scenarios for the updateApp functionality.
- **Implementation**: 
  - Uses the `testUpdateApp` helper function to test different scenarios:
    - Update with a relative path.
    - Update with a nonexistent app.
    - Update with valid parameters.
    - Update with HLDS workaround.
    - Update on an already up-to-date app.

## Helper Functions

### testDownload
- **Purpose**: Consolidate code for testing download and prep functionalities.
- **Parameters**: 
  - `t`: The AVA test context.
  - `action`: The action to perform (download or prep).
- **Implementation**: 
  - Extracts the binary directory and options from the test context.
  - Performs the action with the options.
  - Ensures the binary directory exists without throwing an error.

### testGetAppInfo
- **Purpose**: Consolidate code for testing the getAppInfo functionality.
- **Parameters**: 
  - `t`: The AVA test context.
  - `appId`: The application ID.
  - `expectedName`: The expected name of the application.
- **Implementation**: 
  - Prepares the environment for the test.
  - Fetches the app info for the given app ID.
  - Verifies the app name matches the expected name and ensures the app info is fully parsed.

### testUpdateApp
- **Purpose**: Consolidate code for testing the updateApp functionality.
- **Parameters**: 
  - `t`: The AVA test context.
  - `appId`: The application ID.
  - `installDir`: The installation directory.
  - `shouldThrow`: A boolean indicating whether the function should throw an error.
  - `expectedResult`: The expected result of the updateApp function.
- **Implementation**: 
  - Prepares the environment for the test.
  - If `shouldThrow` is true, verifies that the updateApp function throws an error.
  - Otherwise, verifies the result of the updateApp function.

## Dependencies

- **fs**: File system module for file operations.
- **path**: Path module for handling and transforming file paths.
- **tempfile**: Module to generate temporary file paths.
- **mkdirp**: Module to create directories recursively.
- **ava**: Test framework for writing tests.
- **del**: Module to delete files and directories.
- **steamcmd**: Module for SteamCMD operations.
## License

MIT © [Matt Horn](http://www.matthorn.tech)
