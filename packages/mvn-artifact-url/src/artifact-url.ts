import path from 'path';
import filename from 'mvn-artifact-filename';
import fetch from 'node-fetch';
import parseXmlString from './parseXmlString';

export interface Artifact {
  groupId: string;
  artifactId: string;
  version: string;
  extension?: string;
  classifier?: string;
  isSnapShot?: boolean;
  snapShotVersion?: string;
}

function groupPath(artifact: Artifact): string {
  return [
    artifact.groupId.replace(/\./g, '/'),
    artifact.artifactId,
    artifact.version + (artifact.isSnapShot ? '-SNAPSHOT' : ''),
  ].join('/');
}

function artifactPath(artifact: Artifact): string {
  return path.join(groupPath(artifact), filename(artifact));
}

async function latestSnapShotVersion(artifact: Artifact, basepath: string, username: string, password: string) {
  const metadataUrl = basepath + groupPath(artifact) + '/maven-metadata.xml';
  let headers = new Headers();
  headers.set('Authorization', 'Basic ' + Buffer.from(username + ":" + password).toString("base64"));
  const response = await fetch(metadataUrl, {headers: headers});
  if (response.status !== 200) {
    throw new Error(
      `Unable to fetch ${metadataUrl}. Status ${response.status}`
    );
  }
  const body = await response.text();
  const xml: any = await parseXmlString(body);
  const snapshot = xml.metadata.versioning[0].snapshot[0];
  const version = snapshot.timestamp[0] + '-' + snapshot.buildNumber[0];
  return version;
}

export default (async function artifactUrl(
  artifact: Artifact,
  basePath?: string,
  userName?: string,
  password?: string
) {
  const prefix = basePath || 'https://repo1.maven.org/maven2/';
  if (artifact.isSnapShot) {
    const snapShotVersion = await latestSnapShotVersion(artifact, prefix, userName, password);
    return prefix + artifactPath({ ...artifact, snapShotVersion });
  } else {
    return prefix + artifactPath(artifact);
  }
});
