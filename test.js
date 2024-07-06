import fs from 'fs';
import path from 'path';
import tempfile from 'tempfile';
import mkdirp from 'mkdirp';
import test from 'ava';
import del from 'del';
import steamcmd from './';

const TEST_DATA_DIR = 'test_data';

test.before(() => {
  mkdirp.sync(TEST_DATA_DIR);
});

test.after.always(() => {
  return del(TEST_DATA_DIR);
});

test.beforeEach(t => {
  const binDirParent = tempfile('/');
  mkdirp.sync(binDirParent);
  const binDir = path.join(binDirParent, 'steamcmd_bin');
  t.context = { binDirParent, binDir, opts: { binDir } };
});

test.afterEach(async t => {
  await del(t.context.binDirParent, { force: true });
});

const testDownload = async (t, action) => {
  const { binDir, opts } = t.context;
  await action(opts);
  t.notThrows(() => fs.statSync(binDir));
};

test('download', testDownload, steamcmd.download);

test('touch', async t => {
  const { binDir, opts } = t.context;
  await steamcmd.download(opts);
  await new Promise(resolve => setTimeout(resolve, 200)); // fix random EBUSY on Windows
  await steamcmd.touch(opts);
  t.notThrows(() => fs.statSync(path.join(binDir, 'public')));
});

test('prep', testDownload, steamcmd.prep);

const testGetAppInfo = async (t, appId, expectedName) => {
  const { opts } = t.context;
  await steamcmd.prep(opts);
  const appInfo = await steamcmd.getAppInfo(appId, opts);
  t.is(appInfo.common.name, expectedName);
  t.truthy(appInfo.ufs);
};

test('getAppInfo', testGetAppInfo, 730, 'Counter-Strike: Global Offensive');

test('repeated calls to getAppInfo', async t => {
  const { opts } = t.context;
  await steamcmd.prep(opts);
  const csgoAppInfo = await steamcmd.getAppInfo(730, opts);
  t.is(csgoAppInfo.common.name, 'Counter-Strike: Global Offensive');
  t.notThrows(() => steamcmd.getAppInfo(730, opts));
});

const testUpdateApp = async (t, appId, installDir, shouldThrow, expectedResult) => {
  const { opts } = t.context;
  await steamcmd.prep(opts);
  if (shouldThrow) {
    t.throws(() => steamcmd.updateApp(appId, installDir, opts));
  } else {
    t.is(await steamcmd.updateApp(appId, installDir, opts), expectedResult);
  }
};

test('updateApp with a relative path', testUpdateApp, 1007, 'bad_steamworks', true, undefined);
test('updateApp with a nonexistent app', testUpdateApp, 4, path.resolve(TEST_DATA_DIR, 'nonexistent_app'), true, undefined);
test('updateApp with valid parameters', testUpdateApp, 1007, path.resolve(TEST_DATA_DIR, 'steamworks'), false, true);
test('updateApp with HLDS workaround', testUpdateApp, 90, path.resolve(TEST_DATA_DIR, 'hlds'), false, true);

test('updateApp on already up-to-date app returns false', async t => {
  const { binDirParent, opts } = t.context;
  const appId = 1007;
  const installDir = path.join(binDirParent, 'app');
  await steamcmd.prep(opts);
  await steamcmd.updateApp(appId, installDir, opts);
  t.false(await steamcmd.updateApp(appId, installDir, opts));
});
