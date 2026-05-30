import { execFileSync, spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const cleanUser = (value = '') => String(value || '')
  .trim()
  .toLowerCase()
  .split('@')[0]
  .replace(/[^a-z0-9._-]/g, '')
  .slice(0, 31);

const cleanDomain = (value = '') => String(value || 'tiwlo.com')
  .trim()
  .toLowerCase()
  .replace(/^((mail|email|tmail|www)\.)+/, '')
  .replace(/[^a-z0-9.-]/g, '')
  .replace(/^\.+|\.+$/g, '') || 'tiwlo.com';

function provisionMailbox(record) {
  const address = String(record?.data?.address || record?.title || '').trim().toLowerCase();
  const domain = cleanDomain(record?.data?.domain || address.split('@')[1]);
  const localUser = cleanUser(record?.data?.username || address);
  const password = String(record?.data?.password || '').trim();
  const status = String(record?.status || 'active').toLowerCase();
  if (!address || !localUser || !password || ['disabled', 'suspended'].includes(status)) return false;

  try {
    execFileSync('/usr/local/sbin/tiwlo-mailbox-provision', [localUser, password, domain, address], { stdio: 'ignore' });
    return true;
  } catch {
    // Fall back for systems where the helper has not been installed yet.
  }

  const shellPath = '/usr/sbin/nologin';
  const homeDir = `/home/${localUser}`;
  try {
    spawnSync('useradd', ['-m', '-d', homeDir, '-s', shellPath, localUser], { stdio: 'ignore' });
    spawnSync('chpasswd', [], { input: `${localUser}:${password}\n`, stdio: ['pipe', 'ignore', 'ignore'] });
    execFileSync('mkdir', ['-p', `${homeDir}/Maildir/cur`, `${homeDir}/Maildir/new`, `${homeDir}/Maildir/tmp`], { stdio: 'ignore' });
    execFileSync('chown', ['-R', `${localUser}:${localUser}`, `${homeDir}/Maildir`], { stdio: 'ignore' });
    execFileSync('chmod', ['-R', '700', `${homeDir}/Maildir`], { stdio: 'ignore' });
    return true;
  } catch (error) {
    console.warn(`[mailbox-sync] ${address} failed: ${error?.message || error}`);
    return false;
  }
}

try {
  const setting = await prisma.systemSetting.findUnique({
    where: { scope_scopeId_key: { scope: 'admin', scopeId: 'main-admin', key: 'mainAdmin:emailaccounts' } }
  });
  const records = Array.isArray(setting?.value?.records) ? setting.value.records : [];
  let count = 0;
  for (const record of records) {
    if (provisionMailbox(record)) count += 1;
  }
  console.log(`[mailbox-sync] provisioned ${count}/${records.length} mailboxes`);
} finally {
  await prisma.$disconnect();
}
