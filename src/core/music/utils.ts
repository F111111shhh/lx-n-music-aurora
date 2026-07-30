import musicSdk, { findMusic } from '@/utils/musicSdk'
import {
  getOtherSource as getOtherSourceFromStore,
  saveOtherSource as saveOtherSourceFromStore,
  getMusicUrlCache as getStoreMusicUrlCache,
  getMusicUrl as getStoreMusicUrl,
  getPlayerLyric as getStoreLyric,
} from '@/utils/data'
import { langS2T, toNewMusicInfo, toOldMusicInfo } from '@/utils'
import { assertApiSupport } from '@/utils/tools'
import settingState from '@/store/setting/state'
import { requestMsg } from '@/utils/message'
import BackgroundTimer from 'react-native-background-timer'
import { apis } from '@/utils/musicSdk/api-source'

const getOtherSourcePromises = new Map()
export const existTimeExp = /\[\d{1,2}:.*\d{1,4}\]/
const otherSourceCache = new Map<string, LX.Music.MusicInfoOnline[]>()

export const getOtherSource = async (
  musicInfo: LX.Music.MusicInfo | LX.Download.ListItem,
  isRefresh = false
): Promise<LX.Music.MusicInfoOnline[]> => {
  let key: string
  let searchMusicInfo: {
    name: string
    singer: string
    source: string
    albumName: string
    interval: string
  }
  if ('progress' in musicInfo) {
    key = `local_${musicInfo.id}`
    searchMusicInfo = {
      name: musicInfo.metadata.musicInfo.name,
      singer: musicInfo.metadata.musicInfo.singer,
      source: musicInfo.metadata.musicInfo.source,
      albumName: musicInfo.metadata.musicInfo.meta.albumName,
      interval: musicInfo.metadata.musicInfo.interval ?? '',
    }
  } else {
    key = `${musicInfo.source}_${musicInfo.id}`
    searchMusicInfo = {
      name: musicInfo.name,
      singer: musicInfo.singer,
      source: musicInfo.source,
      albumName: musicInfo.meta.albumName,
      interval: musicInfo.interval ?? '',
    }
  }
  if (!isRefresh) {
    if (otherSourceCache.has(key)) return otherSourceCache.get(key)!
    const cachedInfo = await getOtherSourceFromStore(key)
    if (cachedInfo.length) {
      otherSourceCache.set(key, cachedInfo)
      return cachedInfo
    }
  }
  if (getOtherSourcePromises.has(key)) return getOtherSourcePromises.get(key)

  const promise = new Promise<LX.Music.MusicInfoOnline[]>((resolve, reject) => {
    let timeout: null | number = BackgroundTimer.setTimeout(() => {
      timeout = null
      reject(new Error('find music timeout'))
    }, 12_000)
    findMusic(searchMusicInfo)
      .then((otherSource) => {
        if (otherSourceCache.size > 10) otherSourceCache.clear()
        const source = otherSource.map(toNewMusicInfo) as LX.Music.MusicInfoOnline[]
        otherSourceCache.set(key, source)
        resolve(source)
      })
      .catch(reject)
      .finally(() => {
        if (timeout) BackgroundTimer.clearTimeout(timeout)
      })
  })
    .then((otherSource) => {
      if (otherSource.length) void saveOtherSourceFromStore(key, otherSource)
      return otherSource
    })
    .finally(() => {
      if (getOtherSourcePromises.has(key)) getOtherSourcePromises.delete(key)
    })
  getOtherSourcePromises.set(key, promise)
  return promise
}

export const buildLyricInfo = async (
  lyricInfo: MakeOptional<LX.Player.LyricInfo, 'rawlrcInfo'>
): Promise<LX.Player.LyricInfo> => {
  if (!settingState.setting['player.isS2t']) {
    // @ts-expect-error
    if (lyricInfo.rawlrcInfo) return lyricInfo
    return { ...lyricInfo, rawlrcInfo: { ...lyricInfo } }
  }

  if (settingState.setting['player.isS2t']) {
    const tasks = [
      lyricInfo.lyric ? langS2T(lyricInfo.lyric) : Promise.resolve(''),
      lyricInfo.tlyric ? langS2T(lyricInfo.tlyric) : Promise.resolve(''),
      lyricInfo.rlyric ? langS2T(lyricInfo.rlyric) : Promise.resolve(''),
      lyricInfo.lxlyric ? langS2T(lyricInfo.lxlyric) : Promise.resolve(''),
    ]
    if (lyricInfo.rawlrcInfo) {
      tasks.push(lyricInfo.lyric ? langS2T(lyricInfo.lyric) : Promise.resolve(''))
      tasks.push(lyricInfo.tlyric ? langS2T(lyricInfo.tlyric) : Promise.resolve(''))
      tasks.push(lyricInfo.rlyric ? langS2T(lyricInfo.rlyric) : Promise.resolve(''))
      tasks.push(lyricInfo.lxlyric ? langS2T(lyricInfo.lxlyric) : Promise.resolve(''))
    }
    return Promise.all(tasks).then(
      ([lyric, tlyric, rlyric, lxlyric, lyric_raw, tlyric_raw, rlyric_raw, lxlyric_raw]) => {
        const rawlrcInfo = lyric_raw
          ? {
              lyric: lyric_raw,
              tlyric: tlyric_raw,
              rlyric: rlyric_raw,
              lxlyric: lxlyric_raw,
            }
          : {
              lyric,
              tlyric,
              rlyric,
              lxlyric,
            }
        return {
          lyric,
          tlyric,
          rlyric,
          lxlyric,
          rawlrcInfo,
        }
      }
    )
  }

  // @ts-expect-error
  return lyricInfo.rawlrcInfo ? lyricInfo : { ...lyricInfo, rawlrcInfo: { ...lyricInfo } }
}

export const getCachedLyricInfo = async (
  musicInfo: LX.Music.MusicInfo
): Promise<LX.Player.LyricInfo | null> => {
  let lrcInfo = await getStoreLyric(musicInfo)
  // lrcInfo = {}
  if (existTimeExp.test(lrcInfo.lyric) && lrcInfo.tlyric != null) {
    // if (musicInfo.lrc.startsWith('\ufeff[id:$00000000]')) {
    //   let str = musicInfo.lrc.replace('\ufeff[id:$00000000]\n', '')
    //   commit('setLrc', { musicInfo, lyric: str, tlyric: musicInfo.tlrc, lxlyric: musicInfo.tlrc })
    // } else if (musicInfo.lrc.startsWith('[id:$00000000]')) {
    //   let str = musicInfo.lrc.replace('[id:$00000000]\n', '')
    //   commit('setLrc', { musicInfo, lyric: str, tlyric: musicInfo.tlrc, lxlyric: musicInfo.tlrc })
    // }

    // if (lrcInfo.lxlyric == null) {
    //   switch (musicInfo.source) {
    //     case 'kg':
    //     case 'kw':
    //     case 'mg':
    //       break
    //     default:
    //       return lrcInfo
    //   }
    // } else
    if (lrcInfo.rlyric == null) {
      if (!['wy', 'kg'].includes(musicInfo.source)) return lrcInfo
    } else return lrcInfo
  }
  return null
}

export const getOnlineOtherSourceMusicUrlByLocal = async (
  musicInfo: LX.Music.MusicInfoLocal,
  isRefresh: boolean
): Promise<{
  url: string
  quality: LX.Quality
  isFromCache: boolean
}> => {
  if (!(await global.lx.apiInitPromise[0])) throw new Error('source init failed')

  const quality = '128k'

  const cachedUrl = await getStoreMusicUrl(musicInfo, quality)
  if (cachedUrl && !isRefresh) return { url: cachedUrl, quality, isFromCache: true }

  let reqPromise
  try {
    reqPromise = apis('local').getMusicUrl(toOldMusicInfo(musicInfo), null).promise
  } catch (err: any) {
    reqPromise = Promise.reject(err)
  }

  return reqPromise.then(({ url }: { url: string }) => {
    return { url, quality, isFromCache: false }
  })
}

export const getOnlineOtherSourceLyricByLocal = async (
  musicInfo: LX.Music.MusicInfoLocal,
  isRefresh: boolean
): Promise<{
  lyricInfo: LX.Music.LyricInfo
  isFromCache: boolean
}> => {
  if (!(await global.lx.apiInitPromise[0])) throw new Error('source init failed')

  const lyricInfo = await getCachedLyricInfo(musicInfo)
  if (lyricInfo && !isRefresh) return { lyricInfo, isFromCache: true }

  let reqPromise
  try {
    reqPromise = apis('local').getLyric(toOldMusicInfo(musicInfo)).promise
  } catch (err: any) {
    reqPromise = Promise.reject(err)
  }

  return reqPromise.then((lyricInfo: LX.Music.LyricInfo) => {
    return { lyricInfo, isFromCache: false }
  })
}

export const getOnlineOtherSourcePicByLocal = async (
  musicInfo: LX.Music.MusicInfoLocal
): Promise<{
  url: string
}> => {
  if (!(await global.lx.apiInitPromise[0])) throw new Error('source init failed')

  let reqPromise
  try {
    reqPromise = apis('local').getPic(toOldMusicInfo(musicInfo)).promise
  } catch (err: any) {
    reqPromise = Promise.reject(err)
  }

  return reqPromise.then((url: string) => {
    return { url }
  })
}

export const TRY_QUALITYS_LIST = ['master', 'atmos_plus', 'atmos', 'hires', 'flac', '320k'] as const
export const QUALITY_RANK: readonly LX.Quality[] = [
  'master',
  'atmos_plus',
  'atmos',
  'hires',
  'flac',
  '320k',
  '128k',
]

export type MusicUrlFallbackStrategy = 'source-first' | 'quality-first'

export interface ResolvedMusicUrl {
  url: string
  musicInfo: LX.Music.MusicInfoOnline
  quality: LX.Quality
  isFromCache: boolean
  playbackSource: LX.OnlineSource
}

export type MusicUrlRequester = (
  musicInfo: LX.Music.MusicInfoOnline,
  quality: LX.Quality
) => Promise<{ url: string; type?: LX.Quality | string }>

const LEGACY_QUALITY_ALIASES: Partial<Record<LX.Quality, string>> = {
  hires: 'flac24bit',
  atmos: 'effect',
  atmos_plus: 'effect_plus',
}

export const hasMusicQuality = (musicInfo: LX.Music.MusicInfoOnline, quality: LX.Quality) => {
  const qualitys = musicInfo.meta._qualitys as Record<string, unknown>
  return Boolean(qualitys[quality] || qualitys[LEGACY_QUALITY_ALIASES[quality] ?? ''])
}

export const getMusicUrlCandidateKey = (
  musicInfo: LX.Music.MusicInfoOnline,
  quality: LX.Quality
) => `${musicInfo.source}_${musicInfo.id}_${quality}`

export const getCachedPlaybackSource = (url: string, fallback: LX.OnlineSource) =>
  /^https?:\/\/(?:[^/]+\.)?music\.126\.net\//.test(url) ? 'wy' : fallback

export const getQualityCandidates = (
  musicInfo: LX.Music.MusicInfoOnline,
  quality: LX.Quality,
  allowQualityFallback = true
): LX.Quality[] => {
  if (!allowQualityFallback) return [quality]
  const qualityIndex = QUALITY_RANK.indexOf(quality)
  const fallbackList = QUALITY_RANK.slice(qualityIndex < 0 ? 0 : qualityIndex)
  const candidates = fallbackList.filter(
    (itemQuality) =>
      itemQuality == quality || itemQuality == '128k' || hasMusicQuality(musicInfo, itemQuality)
  )
  return candidates.length ? candidates : [quality]
}

const getFallbackQualityRank = (quality: LX.Quality) => {
  const qualityIndex = QUALITY_RANK.indexOf(quality)
  return QUALITY_RANK.slice(qualityIndex < 0 ? 0 : qualityIndex)
}

export const normalizeMusicUrlQuality = (
  quality: LX.Quality | string | undefined,
  fallback: LX.Quality
): LX.Quality => {
  switch (quality) {
    case 'flac24bit':
    case 'flac32bit':
      return 'hires'
    case 'effect':
      return 'atmos'
    case 'effect_plus':
      return 'atmos_plus'
    case 'master':
    case 'atmos_plus':
    case 'atmos':
    case 'hires':
    case 'flac':
    case '320k':
    case '128k':
      return quality
    default:
      return fallback
  }
}

export const getPlayQuality = (
  preferredQuality: LX.Quality,
  musicInfo: LX.Music.MusicInfoOnline
): LX.Quality => {
  console.log('Preferred quality:', preferredQuality);
  // 获取这首歌实际支持的所有音质
  const availableQualities = musicInfo.meta._qualitys;

  // 找到用户偏好音质在排行榜中的位置
  const startIndex = QUALITY_RANK.indexOf(preferredQuality);

  // 如果用户的偏好设置不在我们的榜单里（例如设置了无效值），就从最高音质开始找
  const searchIndex = startIndex === -1 ? 0 : startIndex;

  // 从用户偏好的音质开始，向下遍历排行榜
  for (let i = searchIndex; i < QUALITY_RANK.length; i++) {
    const quality = QUALITY_RANK[i];
    // 如果当前歌曲支持这个音质，那么它就是我们要找的最佳音质
    if (availableQualities[quality]) {
      return quality;
    }
  }

  // 如果遍历完都找不到（极不可能发生，因为歌曲至少有128k），则返回最低音质
  return '128k';
}

const defaultMusicUrlRequester: MusicUrlRequester = async (musicInfo, quality) => {
  return musicSdk[musicInfo.source].getMusicUrl(toOldMusicInfo(musicInfo), quality).promise
}

const createMusicUrlCandidateResolver = ({
  isRefresh,
  attemptedCandidates,
  requestMusicUrl,
  originalMusicInfo,
  onToggleSource,
}: {
  isRefresh: boolean
  attemptedCandidates: Set<string>
  requestMusicUrl: MusicUrlRequester
  originalMusicInfo: LX.Music.MusicInfoOnline
  onToggleSource: (musicInfo?: LX.Music.MusicInfoOnline) => void
}) => {
  let lastError: any
  let previousMusicKey = `${originalMusicInfo.source}_${originalMusicInfo.id}`

  const tryCandidate = async (
    musicInfo: LX.Music.MusicInfoOnline,
    quality: LX.Quality
  ): Promise<ResolvedMusicUrl | null> => {
    const candidateKey = getMusicUrlCandidateKey(musicInfo, quality)
    if (attemptedCandidates.has(candidateKey)) return null

    const musicKey = `${musicInfo.source}_${musicInfo.id}`
    if (musicKey != previousMusicKey) {
      previousMusicKey = musicKey
      onToggleSource(musicInfo)
    }

    if (!isRefresh) {
      const cachedUrl = await getStoreMusicUrlCache(musicInfo, quality)
      if (cachedUrl) {
        attemptedCandidates.add(candidateKey)
        return {
          url: cachedUrl.url,
          musicInfo,
          quality,
          isFromCache: true,
          playbackSource:
            cachedUrl.source ?? getCachedPlaybackSource(cachedUrl.url, musicInfo.source),
        }
      }
    }

    try {
      const { url, type } = await requestMusicUrl(musicInfo, quality)
      if (!url) throw new Error('empty url')
      const resolvedQuality = normalizeMusicUrlQuality(type, quality)
      if (resolvedQuality != quality) {
        throw new Error(`quality mismatch: requested ${quality}, received ${resolvedQuality}`)
      }
      attemptedCandidates.add(candidateKey)
      return {
        url,
        musicInfo,
        quality: resolvedQuality,
        isFromCache: false,
        playbackSource: musicInfo.source,
      }
    } catch (err: any) {
      if (err.message == requestMsg.tooManyRequests) throw err
      attemptedCandidates.add(candidateKey)
      lastError = err
      console.log(`[Music URL] ${candidateKey} failed:`, err)
      return null
    }
  }

  return {
    tryCandidate,
    getLastError: () => lastError,
  }
}

const getUniqueOtherSourceMusicInfos = (
  originalMusicInfo: LX.Music.MusicInfoOnline,
  musicInfos: LX.Music.MusicInfoOnline[]
) => {
  const sources = new Set<LX.OnlineSource>([originalMusicInfo.source])
  const result: LX.Music.MusicInfoOnline[] = []
  for (const musicInfo of musicInfos) {
    if (sources.has(musicInfo.source) || !assertApiSupport(musicInfo.source)) continue
    sources.add(musicInfo.source)
    result.push(musicInfo)
  }
  return result
}

export const getOnlineOtherSourceMusicUrl = async ({
  musicInfos,
  quality,
  onToggleSource,
  isRefresh,
  retryedSource = [],
  allowQualityFallback = true,
  attemptedCandidates = new Set<string>(),
  requestMusicUrl = defaultMusicUrlRequester,
}: {
  musicInfos: LX.Music.MusicInfoOnline[]
  quality?: LX.Quality
  onToggleSource: (musicInfo?: LX.Music.MusicInfoOnline) => void
  isRefresh: boolean
  retryedSource?: LX.OnlineSource[]
  allowQualityFallback?: boolean
  attemptedCandidates?: Set<string>
  requestMusicUrl?: MusicUrlRequester
}): Promise<ResolvedMusicUrl> => {
  if (!(await global.lx.apiInitPromise[0])) throw new Error('source init failed')

  const originalMusicInfo = musicInfos[0]
  if (!originalMusicInfo) throw new Error(global.i18n.t('toggle_source_failed'))
  const resolver = createMusicUrlCandidateResolver({
    isRefresh,
    attemptedCandidates,
    requestMusicUrl,
    originalMusicInfo,
    onToggleSource,
  })

  for (const musicInfo of musicInfos) {
    if (retryedSource.includes(musicInfo.source) || !assertApiSupport(musicInfo.source)) continue
    retryedSource.push(musicInfo.source)
    const targetQuality = quality ?? getPlayQuality(settingState.setting['player.playQuality'], musicInfo)
    for (const itemQuality of getQualityCandidates(
      musicInfo,
      targetQuality,
      allowQualityFallback
    )) {
      const result = await resolver.tryCandidate(musicInfo, itemQuality)
      if (result) return result
    }
  }

  throw resolver.getLastError() ?? new Error(global.i18n.t('toggle_source_failed'))
}

/**
 * 获取在线音乐URL
 */
export const handleGetOnlineMusicUrl = async ({
  musicInfo,
  quality,
  onToggleSource,
  isRefresh,
  allowToggleSource,
  allowQualityFallback = true,
  fallbackStrategy = settingState.setting['player.urlFallbackStrategy'],
  attemptedCandidates = new Set<string>(),
  requestMusicUrl = defaultMusicUrlRequester,
}: {
  musicInfo: LX.Music.MusicInfoOnline
  quality?: LX.Quality
  isRefresh: boolean
  allowToggleSource: boolean
  allowQualityFallback?: boolean
  fallbackStrategy?: MusicUrlFallbackStrategy
  attemptedCandidates?: Set<string>
  requestMusicUrl?: MusicUrlRequester
  onToggleSource: (musicInfo?: LX.Music.MusicInfoOnline) => void
}): Promise<ResolvedMusicUrl> => {
  if (!(await global.lx.apiInitPromise[0])) throw new Error('source init failed')
  const targetQuality = quality ?? getPlayQuality(settingState.setting['player.playQuality'], musicInfo)
  const resolver = createMusicUrlCandidateResolver({
    isRefresh,
    attemptedCandidates,
    requestMusicUrl,
    originalMusicInfo: musicInfo,
    onToggleSource,
  })
  const originalQualitys = getQualityCandidates(musicInfo, targetQuality, allowQualityFallback)

  const findOtherSource = async () => {
    try {
      return getUniqueOtherSourceMusicInfos(musicInfo, await getOtherSource(musicInfo))
    } catch (err) {
      console.log('[Music URL] Failed to find alternative sources:', err)
      return []
    }
  }

  if (fallbackStrategy == 'source-first') {
    for (const itemQuality of originalQualitys) {
      const result = await resolver.tryCandidate(musicInfo, itemQuality)
      if (result) return result
    }

    if (allowToggleSource) {
      const otherSource = await findOtherSource()
      for (const otherMusicInfo of otherSource) {
        for (const itemQuality of getQualityCandidates(
          otherMusicInfo,
          targetQuality,
          allowQualityFallback
        )) {
          const result = await resolver.tryCandidate(otherMusicInfo, itemQuality)
          if (result) return result
        }
      }
    }
  } else {
    const otherSource = allowToggleSource ? await findOtherSource() : []
    const sourceCandidates = [musicInfo, ...otherSource]
    const qualityCandidates = allowQualityFallback
      ? getFallbackQualityRank(targetQuality)
      : [targetQuality]

    for (const itemQuality of qualityCandidates) {
      for (const sourceMusicInfo of sourceCandidates) {
        if (
          itemQuality != targetQuality &&
          itemQuality != '128k' &&
          !hasMusicQuality(sourceMusicInfo, itemQuality)
        ) {
          continue
        }
        const result = await resolver.tryCandidate(sourceMusicInfo, itemQuality)
        if (result) return result
      }
    }
  }

  throw resolver.getLastError() ?? new Error(global.i18n.t('toggle_source_failed'))
}

export const getOnlineOtherSourcePicUrl = async ({
  musicInfos,
  onToggleSource,
  isRefresh,
  retryedSource = [],
}: {
  musicInfos: LX.Music.MusicInfoOnline[]
  onToggleSource: (musicInfo?: LX.Music.MusicInfoOnline) => void
  isRefresh: boolean
  retryedSource?: LX.OnlineSource[]
}): Promise<{
  url: string
  musicInfo: LX.Music.MusicInfoOnline
  isFromCache: boolean
}> => {
  let musicInfo: LX.Music.MusicInfoOnline | null = null

  while ((musicInfo = musicInfos.shift()!)) {
    if (retryedSource.includes(musicInfo.source)) continue
    retryedSource.push(musicInfo.source)
    // if (!assertApiSupport(musicInfo.source)) continue
    console.log(
      'try toggle to: ',
      musicInfo.source,
      musicInfo.name,
      musicInfo.singer,
      musicInfo.interval
    )
    onToggleSource(musicInfo)
    break
  }
  if (!musicInfo) throw new Error(global.i18n.t('toggle_source_failed'))

  if (musicInfo.meta.picUrl && !isRefresh)
    return { musicInfo, url: musicInfo.meta.picUrl, isFromCache: true }

  let reqPromise: Promise<string>
  try {
    reqPromise = musicSdk[musicInfo.source].getPic(
      toOldMusicInfo(musicInfo)
    ) as Promise<string>
  } catch (err: any) {
    reqPromise = Promise.reject(err)
  }
  // retryedSource.includes(musicInfo.source)
  return reqPromise
    .then((url: string) => {
      return { musicInfo, url, isFromCache: false }
    })
    .catch((err: any) => {
      console.log(err)
      return getOnlineOtherSourcePicUrl({ musicInfos, onToggleSource, isRefresh, retryedSource })
    })
}

/**
 * 获取在线歌曲封面
 */
export const handleGetOnlinePicUrl = async ({
  musicInfo,
  isRefresh,
  onToggleSource,
  allowToggleSource,
}: {
  musicInfo: LX.Music.MusicInfoOnline
  onToggleSource: (musicInfo?: LX.Music.MusicInfoOnline) => void
  isRefresh: boolean
  allowToggleSource: boolean
}): Promise<{
  url: string
  musicInfo: LX.Music.MusicInfoOnline
  isFromCache: boolean
}> => {
  // console.log(musicInfo.source)
  let reqPromise: Promise<string>
  try {
    reqPromise = musicSdk[musicInfo.source].getPic(
      toOldMusicInfo(musicInfo)
    ) as Promise<string>
  } catch (err) {
    reqPromise = Promise.reject(err)
  }
  return reqPromise
    .then((url: string) => {
      return { musicInfo, url, isFromCache: false }
    })
    .catch(async (err: any) => {
      console.log(err)
      if (!allowToggleSource) throw err
      onToggleSource()

      return getOtherSource(musicInfo).then((otherSource) => {
        // console.log('find otherSource', otherSource.length)
        if (otherSource.length) {
          return getOnlineOtherSourcePicUrl({
            musicInfos: [...otherSource],
            onToggleSource,
            isRefresh,
            retryedSource: [musicInfo.source],
          })
        }
        throw err
      })
    })
}

export const getOnlineOtherSourceLyricInfo = async ({
  musicInfos,
  onToggleSource,
  isRefresh,
  retryedSource = [],
}: {
  musicInfos: LX.Music.MusicInfoOnline[]
  onToggleSource: (musicInfo?: LX.Music.MusicInfoOnline) => void
  isRefresh: boolean
  retryedSource?: LX.OnlineSource[]
}): Promise<{
  lyricInfo: LX.Music.LyricInfo | LX.Player.LyricInfo
  musicInfo: LX.Music.MusicInfoOnline
  isFromCache: boolean
}> => {
  let musicInfo: LX.Music.MusicInfoOnline | null = null

  while ((musicInfo = musicInfos.shift()!)) {
    if (retryedSource.includes(musicInfo.source)) continue
    retryedSource.push(musicInfo.source)
    // if (!assertApiSupport(musicInfo.source)) continue
    console.log(
      'try toggle to: ',
      musicInfo.source,
      musicInfo.name,
      musicInfo.singer,
      musicInfo.interval
    )
    onToggleSource(musicInfo)
    break
  }
  if (!musicInfo) throw new Error(global.i18n.t('toggle_source_failed'))

  if (!isRefresh) {
    const lyricInfo = await getCachedLyricInfo(musicInfo)
    if (lyricInfo) return { musicInfo, lyricInfo, isFromCache: true }
  }

  let reqPromise
  try {
    // TODO: remove any type
    reqPromise = (musicSdk[musicInfo.source].getLyric(toOldMusicInfo(musicInfo)) as any).promise
  } catch (err: any) {
    reqPromise = Promise.reject(err)
  }
  // retryedSource.includes(musicInfo.source)
  return reqPromise
    .then(async (lyricInfo: LX.Music.LyricInfo) => {
      return existTimeExp.test(lyricInfo.lyric)
        ? {
            lyricInfo,
            musicInfo,
            isFromCache: false,
          }
        : Promise.reject(new Error('failed'))
    })
    .catch((err: any) => {
      console.log(err)
      return getOnlineOtherSourceLyricInfo({ musicInfos, onToggleSource, isRefresh, retryedSource })
    })
}

/**
 * 获取在线歌词信息
 */
export const handleGetOnlineLyricInfo = async ({
  musicInfo,
  onToggleSource,
  isRefresh,
  allowToggleSource,
}: {
  musicInfo: LX.Music.MusicInfoOnline
  onToggleSource: (musicInfo?: LX.Music.MusicInfoOnline) => void
  isRefresh: boolean
  allowToggleSource: boolean
}): Promise<{
  musicInfo: LX.Music.MusicInfoOnline
  lyricInfo: LX.Music.LyricInfo | LX.Player.LyricInfo
  isFromCache: boolean
}> => {
  // console.log(musicInfo.source)
  let reqPromise
  try {
    // TODO: remove any type
    reqPromise = (musicSdk[musicInfo.source].getLyric(toOldMusicInfo(musicInfo)) as any).promise
  } catch (err) {
    reqPromise = Promise.reject(err)
  }
  return reqPromise
    .then(async (lyricInfo: LX.Music.LyricInfo) => {
      return existTimeExp.test(lyricInfo.lyric)
        ? {
            musicInfo,
            lyricInfo,
            isFromCache: false,
          }
        : Promise.reject(new Error('failed'))
    })
    .catch(async (err: any) => {
      console.log(err)
      if (!allowToggleSource) throw err

      onToggleSource()

      return getOtherSource(musicInfo).then((otherSource) => {
        // console.log('find otherSource', otherSource.length)
        if (otherSource.length) {
          return getOnlineOtherSourceLyricInfo({
            musicInfos: [...otherSource],
            onToggleSource,
            isRefresh,
            retryedSource: [musicInfo.source],
          })
        }
        throw err
      })
    })
}
