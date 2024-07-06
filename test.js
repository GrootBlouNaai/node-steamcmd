import fs from 'fs'; // Importing the file system module for file operations
import path from 'path'; // Importing the path module for handling and transforming file paths
import tempfile from 'tempfile'; // Importing the tempfile module to generate temporary file paths
import mkdirp from 'mkdirp'; // Importing the mkdirp module to create directories recursively
import test from 'ava'; // Importing the AVA test framework for writing tests
import del from 'del'; // Importing the del module to delete files and directories
import steamcmd from './'; // Importing the steamcmd module for SteamCMD operations

const TEST_DATA_DIR = 'test_data'; // Defining a constant for the test data directory

// Hook to run before all tests to create the test data directory
test.before(() => {
  mkdirp.sync(TEST_DATA_DIR); // Create the test data directory synchronously
});

// Hook to run after all tests to clean up the test data directory
test.after.always(() => {
  return del(TEST_DATA_DIR); // Delete the test data directory
});

// Hook to run before each test to set up the test environment
test.beforeEach(t => {
  const binDirParent = tempfile('/'); // Generate a temporary directory path
  mkdirp.sync(binDirParent); // Create the temporary directory synchronously
  const binDir = path.join(binDirParent, 'steamcmd_bin'); // Define the binary directory path
  t.context = { binDirParent, binDir, opts: { binDir } }; // Set up the test context with necessary paths and options
});

// Hook to run after each test to clean up the temporary directory
test.afterEach(async t => {
  await del(t.context.binDirParent, { force: true }); // Delete the temporary directory forcefully
});

// Helper function to test the download functionality
const testDownload = async (t, action) => {
  const { binDir, opts } = t.context; // Extract the binary directory and options from the test context
  await action(opts); // Perform the action (download or prep) with the options
  t.notThrows(() => fs.statSync(binDir)); // Ensure the binary directory exists without throwing an error
};

// Test to verify the download functionality
test('download', testDownload, steamcmd.download);

// Test to verify the touch functionality
test('touch', async t => {
  const { binDir, opts } = t.context; // Extract the binary directory and options from the test context
  await steamcmd.download(opts); // Download the binary files
  await new Promise(resolve => setTimeout(resolve, 200)); // Wait for 200ms to fix random EBUSY errors on Windows
  await steamcmd.touch(opts); // Perform the touch operation
  t.notThrows(() => fs.statSync(path.join(binDir, 'public'))); // Ensure the public directory exists without throwing an error
});

// Test to verify the prep functionality
test('prep', testDownload, steamcmd.prep);

// Helper function to test the getAppInfo functionality
const testGetAppInfo = async (t, appId, expectedName) => {
  const { opts } = t.context; // Extract the options from the test context
  await steamcmd.prep(opts); // Prepare the environment for the test
  const appInfo = await steamcmd.getAppInfo(appId, opts); // Fetch the app info for the given app ID
  t.is(appInfo.common.name, expectedName); // Verify the app name matches the expected name
  t.truthy(appInfo.ufs); // Ensure the app info is fully parsed
};

// Test to verify the getAppInfo functionality for CS:GO
test('getAppInfo', testGetAppInfo, 730, 'Counter-Strike: Global Offensive');

// Test to verify repeated calls to getAppInfo
test('repeated calls to getAppInfo', async t => {
  const { opts } = t.context; // Extract the options from the test context
  await steamcmd.prep(opts); // Prepare the environment for the test
  const csgoAppInfo = await steamcmd.getAppInfo(730, opts); // Fetch the app info for CS:GO
  t.is(csgoAppInfo.common.name, 'Counter-Strike: Global Offensive'); // Verify the app name matches the expected name
  t.notThrows(() => steamcmd.getAppInfo(730, opts)); // Ensure repeated calls do not throw errors
});

// Helper function to test the updateApp functionality
const testUpdateApp = async (t, appId, installDir, shouldThrow, expectedResult) => {
  const { opts } = t.context; // Extract the options from the test context
  await steamcmd.prep(opts); // Prepare the environment for the test
  if (shouldThrow) {
    t.throws(() => steamcmd.updateApp(appId, installDir, opts)); // Verify that the updateApp function throws an error
  } else {
    t.is(await steamcmd.updateApp(appId, installDir, opts), expectedResult); // Verify the result of the updateApp function
  }
};

// Test to verify updateApp with a relative path
test('updateApp with a relative path', testUpdateApp, 1007, 'bad_steamworks', true, undefined);

// Test to verify updateApp with a nonexistent app
test('updateApp with a nonexistent app', testUpdateApp, 4, path.resolve(TEST_DATA_DIR, 'nonexistent_app'), true, undefined);

// Test to verify updateApp with valid parameters
test('updateApp with valid parameters', testUpdateApp, 1007, path.resolve(TEST_DATA_DIR, 'steamworks'), false, true);

// Test to verify updateApp with HLDS workaround
test('updateApp with HLDS workaround', testUpdateApp, 90, path.resolve(TEST_DATA_DIR, 'hlds'), false, true);

// Test to verify updateApp on an already up-to-date app
test('updateApp on already up-to-date app returns false', async t => {
  const { binDirParent, opts } = t.context; // Extract the binary directory parent and options from the test context
  const appId = 1007; // Define the app ID
  const installDir = path.join(binDirParent, 'app'); // Define the installation directory
  await steamcmd.prep(opts); // Prepare the environment for the test
  await steamcmd.updateApp(appId, installDir, opts); // Update the app
  t.false(await steamcmd.updateApp(appId, installDir, opts)); // Verify that updating an already up-to-date app returns false
});
