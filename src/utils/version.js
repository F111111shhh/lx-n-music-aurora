import { httpGet } from '@/utils/request'
import { name } from '../../package.json'
import { downloadFile, stopDownload, temporaryDirectoryPath } from '@/utils/fs'
import { installApk } from '@/utils/nativeModules/utils'
import {
  APP_PROVIDER_NAME,
  AURORA_GITHUB_REPOSITORY,
  AURORA_RELEASE_BRANCH,
  AURORA_RELEASES_URL,
  AURORA_UPDATE_CHANNEL,
} from '@/config/constant'

const AURORA_RELEASE_APK_ABI = 'universal'
const AURORA_VERSION_RXP = /^\d+\.\d+\.\d+-aurora\.\d+$/

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

export const getVersionInfo = async (index = 0) => {
  const [url, source] = address[index]
  let promise
  switch (source) {
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
const noop = (total, download) => {}
let apkSavePath

export const downloadNewVersion = async (version, onDownload = noop) => {
  if (typeof version != 'string' || !AURORA_VERSION_RXP.test(version)) {
    throw new Error('Invalid Aurora update version')
  }
  const url = `${AURORA_RELEASES_URL}/download/v${version}/${name}-v${version}-${AURORA_RELEASE_APK_ABI}.apk`
  let savePath = temporaryDirectoryPath + '/lx-netease-music-mobile.apk'

  if (downloadJobId) stopDownload(downloadJobId)

  const { jobId, promise } = downloadFile(url, savePath, {
    progressInterval: 500,
    connectionTimeout: 20000,
    readTimeout: 30000,
    begin({ statusCode, contentLength }) {
      onDownload(contentLength, 0)
      // switch (statusCode) {
      //   case 200:
      //   case 206:
      //     break
      //   default:
      //     onDownload(null, contentLength, 0)
      //     break
      // }
    },
    progress({ contentLength, bytesWritten }) {
      onDownload(contentLength, bytesWritten)
    },
  })
  downloadJobId = jobId
  return promise.then(() => {
    apkSavePath = savePath
    return updateApp()
  })
}

export const updateApp = async () => {
  if (!apkSavePath) throw new Error('apk Save Path is null')
  await installApk(apkSavePath, APP_PROVIDER_NAME)
}
