// backup_to_drive.js
// Subir un archivo de backup a Google Drive usando la API y OAuth2

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json'); // Se genera en el primer uso

// Cambia esto por el nombre de tu carpeta en Drive
const DRIVE_FOLDER_NAME = 'Supabase Backups';

// Archivo a subir (ejemplo: dump generado por pg_dump)
const FILE_TO_UPLOAD = 'supabase_db_backup.dump';

async function authenticate() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  // Intenta cargar el token guardado
  if (fs.existsSync(TOKEN_PATH)) {
    oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
    return oAuth2Client;
  }

  // Si no existe token, solicita autorización manual
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.file'],
  });
  console.log('Autoriza esta app visitando esta URL:', authUrl);
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  readline.question('Introduce el código de autorización: ', (code) => {
    readline.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error recuperando el token', err);
      oAuth2Client.setCredentials(token);
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
      console.log('Token guardado en', TOKEN_PATH);
    });
  });
  throw new Error('Autorización requerida. Ejecuta de nuevo tras autorizar.');
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

async function uploadFile(auth) {
  const drive = google.drive({ version: 'v3', auth });
  const folderId = await getDriveFolderId(drive, DRIVE_FOLDER_NAME);
  const fileMetadata = {
    name: path.basename(FILE_TO_UPLOAD),
    parents: [folderId],
  };
  const media = {
    mimeType: 'application/octet-stream',
    body: fs.createReadStream(FILE_TO_UPLOAD),
  };
  const res = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: 'id',
  });
  console.log('Archivo subido a Google Drive con ID:', res.data.id);
}

(async () => {
  try {
    const auth = await authenticate();
    await uploadFile(auth);
  } catch (err) {
    console.error('Error en backup_to_drive:', err);
  }
})();
