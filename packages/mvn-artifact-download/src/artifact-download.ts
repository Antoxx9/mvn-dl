import fs from 'fs';
import path from 'path';
import parseName from 'mvn-artifact-name-parser';
import getFilename from 'mvn-artifact-filename';
import artifactUrl from 'mvn-artifact-url';
import fetch from 'node-fetch';
import { Headers } from 'node-fetch';

function pipeToFile(body: NodeJS.ReadableStream, destFile: string) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destFile);
    file.on('finish', () => {
      file.close();
      resolve(destFile);
    });
    file.on('error', err => {
      fs.unlink(destFile, function ignore() {});
      reject(err);
    });
    body.pipe(file);
  });
}

export default (async function download(
  artifactName: string,
  destination?: string,
  repository?: string,
  filename?: string,
  username?: string,
  password?: string
) {
  destination = destination || process.cwd();
  const artifact = parseName(artifactName);

  const url = await artifactUrl(artifact, repository, username, password);

  const destFile = path.join(
    destination || process.cwd(),
    filename || getFilename(artifact)
  );
  const response = await fetch(url, {
    headers: new Headers({
      Authorization:
        'Basic ' + Buffer.from(username + ':' + password).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    }),
  });
  if (response.status !== 200) {
    throw new Error(`Unable to fetch ${url}. Status ${response.status}`);
  }
  await pipeToFile(response.body, destFile);
  return destFile;
});
