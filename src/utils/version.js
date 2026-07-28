import { httpGet } from '@/utils/request'
import { name } from '../../package.json'
import {
  downloadFile,
  existsFile,
  hash,
  moveFile,
  stopDownload,
  temporaryDirectoryPath,
  unlink,
} from '@/utils/fs'
import { installApk } from '@/utils/nativeModules/utils'
import {
  APP_PROVIDER_NAME,
  AURORA_GITHUB_REPOSITORY,
  AURORA_RELEASE_BRANCH,
  AURORA_RELEASES_API_BASE_URL,
  AURORA_RELEASES_API_URL,
  AURORA_UPDATE_CHANNEL,
} from '@/config/constant'

const AURORA_RELEASE_APK_ABI = 'universal'
const AURORA_VERSION_RXP = /^\d+\.\d+\.\d+-aurora\.\d+$/
const AURORA_RELEASE_TAG_RXP = /^v(\d+\.\d+\.\d+-aurora\.\d+)$/
const SHA256_RXP = /^sha256:([a-f0-9]{64})$/

const getUniversalApkName = (version) => `${name}-v${version}-${AURORA_RELEASE_APK_ABI}.apk`
const getUpdateApkPath = (version) => `${temporaryDirectoryPath}/${getUniversalApkName(version)}`
const getReleaseApiUrl = (version) => `${AURORA_RELEASES_API_BASE_URL}/tags/v${version}`

const assertAuroraVersionInfo = (info) => {
  if (
    info?.channel !== AURORA_UPDATE_CHANNEL ||
    typeof info.version != 'string' ||
    !AURORA_VERSION_RXP.test(info.version)
  ) {
    throw new Error('Invalid Aurora update metadata')
  }
  return info
}

const address = [
  [AURORA_RELEASES_API_URL, 'github_release'],
  [
    `https://raw.githubusercontent.com/${AURORA_GITHUB_REPOSITORY}/${AURORA_RELEASE_BRANCH}/publish/version.json`,
    'direct',
  ],
  // ['https://registry.npmjs.org/lx-music-mobile-version-info/latest', 'npm'],
  [
    `https://cdn.jsdelivr.net/gh/${AURORA_GITHUB_REPOSITORY}@${AURORA_RELEASE_BRANCH}/publish/version.json`,
    'direct',
  ],
  [
    `https://fastly.jsdelivr.net/gh/${AURORA_GITHUB_REPOSITORY}@${AURORA_RELEASE_BRANCH}/publish/version.json`,
    'direct',
  ],
  [
    `https://gcore.jsdelivr.net/gh/${AURORA_GITHUB_REPOSITORY}@${AURORA_RELEASE_BRANCH}/publish/version.json`,
    'direct',
  ],
  // ['https://registry.npmmirror.com/lx-music-mobile-version-info/latest', 'npm'],
  // ['http://cdn.stsky.cn/lx-music/mobile/version.json', 'direct'],
]

const request = async (url, retryNum = 0) => {
  return new Promise((resolve, reject) => {
    httpGet(
      url,
      {
        timeout: 10000,
      },
      (err, resp, body) => {
        if (err || resp.statusCode != 200) {
          ++retryNum >= 3
            ? reject(err || new Error(resp.statusMessage || resp.statusCode))
            : request(url, retryNum).then(resolve).catch(reject)
        } else resolve(body)
      }
    )
  })
}

const getDirectInfo = async (url) => {
  return request(url).then(assertAuroraVersionInfo)
}

const getNpmPkgInfo = async (url) => {
  return request(url).then((json) => {
    if (!json.versionInfo) throw new Error('failed')
    return assertAuroraVersionInfo(JSON.parse(json.versionInfo))
  })
}

const getReleaseVersion = (release) => {
  const tagMatch = AURORA_RELEASE_TAG_RXP.exec(release?.tag_name ?? '')
  const version = tagMatch?.[1]
  if (!version || release.draft || release.prerelease) {
    throw new Error('Invalid Aurora release')
  }
  return version
}

const getReleaseApkAsset = (release, version) => {
  const asset = Array.isArray(release.assets)
    ? release.assets.find((item) => item?.name === getUniversalApkName(version))
    : null
  const digestMatch = SHA256_RXP.exec(asset?.digest?.toLowerCase() ?? '')
  if (
    !asset ||
    typeof asset.browser_download_url != 'string' ||
    !Number.isSafeInteger(asset.size) ||
    asset.size <= 0 ||
    !digestMatch
  ) {
    throw new Error('Invalid Aurora release asset')
  }
  return {
    url: asset.browser_download_url,
    size: asset.size,
    sha256: digestMatch[1],
  }
}

const getGithubReleaseInfo = async (url) => {
  return request(url).then((release) => {
    const version = getReleaseVersion(release)
    getReleaseApkAsset(release, version)
    return assertAuroraVersionInfo({
      channel: AURORA_UPDATE_CHANNEL,
      version,
      desc: typeof release.body == 'string' ? release.body : '',
      history: [],
    })
  })
}

const getGithubReleaseAsset = async (version) => {
  return request(getReleaseApiUrl(version)).then((release) => {
    if (getReleaseVersion(release) != version) throw new Error('Invalid Aurora release version')
    return getReleaseApkAsset(release, version)
  })
}

export const getVersionInfo = async (index = 0) => {
  const [url, source] = address[index]
  let promise
  switch (source) {
    case 'github_release':
      promise = getGithubReleaseInfo(url)
      break
    case 'direct':
      promise = getDirectInfo(url)
      break
    case 'npm':
      promise = getNpmPkgInfo(url)
      break
  }

  return promise.catch(async (err) => {
    index++
    if (index >= address.length) throw err
    return getVersionInfo(index)
  })
}

let downloadJobId = null
let downloadPromise = null
const noop = (total, download) => {}
let apkSavePath

const removeFileIfExists = async (path) => {
  if (await existsFile(path)) await unlink(path)
}

const downloadNewVersionTask = async (version, onDownload = noop) => {
  if (typeof version != 'string' || !AURORA_VERSION_RXP.test(version)) {
    throw new Error('Invalid Aurora update version')
  }

  if (downloadJobId) stopDownload(downloadJobId)
  downloadJobId = null
  apkSavePath = null

  const releaseAsset = await getGithubReleaseAsset(version)
  const savePath = getUpdateApkPath(version)
  const temporaryPath = `${savePath}.part`
  const legacySavePath = `${temporaryDirectoryPath}/lx-netease-music-mobile.apk`

  await Promise.all([removeFileIfExists(temporaryPath), removeFileIfExists(legacySavePath)])

  const { jobId, promise } = downloadFile(releaseAsset.url, temporaryPath, {
    progressInterval: 500,
    connectionTimeout: 20000,
    readTimeout: 30000,
    begin({ contentLength }) {
      onDownload(contentLength > 0 ? contentLength : releaseAsset.size, 0)
    },
    progress({ contentLength, bytesWritten }) {
      onDownload(contentLength > 0 ? contentLength : releaseAsset.size, bytesWritten)
    },
  })
  downloadJobId = jobId
  try {
    const { statusCode, bytesWritten } = await promise
    if (statusCode < 200 || statusCode >= 300 || bytesWritten != releaseAsset.size) {
      throw new Error('Aurora update download failed')
    }

    const downloadedSha256 = await hash(temporaryPath, 'sha256')
    if (downloadedSha256.toLowerCase() != releaseAsset.sha256) {
      throw new Error('Aurora update checksum mismatch')
    }

    await removeFileIfExists(savePath)
    await moveFile(temporaryPath, savePath)
    apkSavePath = savePath
    return updateApp()
  } catch (err) {
    await removeFileIfExists(temporaryPath).catch(() => {})
    throw err
  } finally {
    downloadJobId = null
  }
}

export const downloadNewVersion = (version, onDownload = noop) => {
  if (downloadPromise) return downloadPromise

  const task = downloadNewVersionTask(version, onDownload)
  downloadPromise = task
  task.then(
    () => {
      if (downloadPromise === task) downloadPromise = null
    },
    () => {
      if (downloadPromise === task) downloadPromise = null
    }
  )
  return task
}

export const updateApp = async () => {
  if (!apkSavePath) throw new Error('apk Save Path is null')
  await installApk(apkSavePath, APP_PROVIDER_NAME)
}
