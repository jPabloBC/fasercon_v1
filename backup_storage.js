
const { createClient } = require('@supabase/supabase-js');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://gbdoqxdldyszmfzqzmuk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiZG9xeGRsZHlzem1menF6bXVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTMyNzIzNSwiZXhwIjoyMDc0OTAzMjM1fQ.TqKpmBMLisTp4XPWGY4gmhUegnAneAx-gSj-q7EZg88';
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');
const DRIVE_FOLDER_NAME = 'Supabase Backups';

const supabase = createClient(supabaseUrl, supabaseKey);

async function authenticate() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  if (fs.existsSync(TOKEN_PATH)) {
    oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
    return oAuth2Client;
  }
  throw new Error('No se encontró token.json. Ejecuta backup_to_drive.js primero para autorizar.');
}

async function getDriveFolderId(drive, folderName) {
  const res = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}'`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });
  if (res.data.files.length > 0) {
    return res.data.files[0].id;
  }
  // Si no existe, crea la carpeta
  const folder = await drive.files.create({
    resource: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id',
  });
  return folder.data.id;
}

async function uploadToDrive(drive, folderId, fileBuffer, fileName, parents=[]) {
  const fileMetadata = {
    name: fileName,
    parents: [folderId, ...parents],
  };
  const media = {
    mimeType: 'application/octet-stream',
    body: fileBuffer,
  };
  await drive.files.create({
    resource: fileMetadata,
    media,
    fields: 'id',
  });
  console.log(`Archivo subido a Drive: ${fileName}`);
}

const { execSync } = require('child_process');
const DB_DUMP_FILE = 'supabase_db_backup.dump';
const PGHOST = process.env.PGHOST || '';
const PGPORT = process.env.PGPORT || '';
const PGUSER = process.env.PGUSER || '';
const PGPASSWORD = process.env.PGPASSWORD || '';
const PGDATABASE = process.env.PGDATABASE || '';

async function backupDatabaseAndUpload(drive, rootFolderId) {
  let dumpCmd;
  if (PGHOST && PGPORT && PGUSER && PGPASSWORD && PGDATABASE) {
    dumpCmd = `PGHOST=\"${PGHOST}\" PGPORT=\"${PGPORT}\" PGUSER=\"${PGUSER}\" PGPASSWORD=\"${PGPASSWORD}\" PGDATABASE=\"${PGDATABASE}\" pg_dump --quote-all-identifier --role \"postgres\" --exclude-schema \"information_schema|pg_*|_analytics|_realtime|_supavisor|auth|extensions|pgbouncer|realtime|storage|supabase_functions|supabase_migrations|cron|dbdev|graphql|graphql_public|net|pgmq|pgsodium|pgsodium_masks|pgtle|repack|tiger|tiger_data|timescaledb_*|_timescaledb_*|topology|vault\" -f ${DB_DUMP_FILE}`;
  } else {
    dumpCmd = `supabase db dump -f ${DB_DUMP_FILE}`;
  }
  try {
    console.log('Generando respaldo de la base de datos...');
    execSync(dumpCmd, { stdio: 'inherit' });
    const fileBuffer = fs.createReadStream(DB_DUMP_FILE);
    await uploadToDrive(drive, rootFolderId, fileBuffer, DB_DUMP_FILE);
    console.log(`Respaldo de base de datos subido a Drive: ${DB_DUMP_FILE}`);
  } catch (err) {
    console.error('Error al generar o subir el respaldo de la base de datos:', err.message);
  }
}

async function fullBackupToDrive() {
  const auth = await authenticate();
  const drive = google.drive({ version: 'v3', auth });
  const rootFolderId = await getDriveFolderId(drive, DRIVE_FOLDER_NAME);

  // 1. Backup de la base de datos
  await backupDatabaseAndUpload(drive, rootFolderId);

  // 2. Backup de todos los archivos de Storage
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  if (bucketError) throw bucketError;

  for (const bucket of buckets) {
    console.log(`Procesando bucket: ${bucket.name}`);
    const bucketFolderId = await getDriveFolderId(drive, bucket.name);
    async function processFolder(folderPath = '') {
      const { data: items, error: listError } = await supabase.storage.from(bucket.name).list(folderPath);
      if (listError) {
        console.error(`Error al listar archivos en ${bucket.name}/${folderPath}:`, listError.message);
        return;
      }
      for (const item of items) {
        if (item.type === 'folder') {
          await processFolder(folderPath ? `${folderPath}/${item.name}` : item.name);
        } else if (item.type === 'file') {
          const filePath = folderPath ? `${folderPath}/${item.name}` : item.name;
          const { data, error: downloadError } = await supabase.storage.from(bucket.name).download(filePath);
          if (downloadError) {
            console.error(`Error al descargar ${filePath} en ${bucket.name}:`, downloadError.message);
            continue;
          }
          await uploadToDrive(drive, bucketFolderId, Buffer.from(await data.arrayBuffer()), filePath);
        }
      }
    }
    await processFolder('');
  }
}

fullBackupToDrive().catch(console.error);
