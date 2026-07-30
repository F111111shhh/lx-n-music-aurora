import { saveLyric, saveMusicUrl } from '@/utils/data'
import { updateListMusics } from '@/core/list'
import settingState from '@/store/setting/state'

import wySdk from '@/utils/musicSdk/wy'
import musicSdk from '@/utils/musicSdk'
import { toOldMusicInfo } from '@/utils'
import {
  buildLyricInfo,
  getPlayQuality,
  handleGetOnlineLyricInfo,
  handleGetOnlineMusicUrl,
  handleGetOnlinePicUrl,
  getCachedLyricInfo,
  QUALITY_RANK,
  type MusicUrlRequester,
  type ResolvedMusicUrl,
} from './utils'
import {fetchAndApplyDetailedQuality} from "@/utils/musicSdk/wy/musicDetail.js"
import userState from '@/store/user/state'

/* export const setMusicUrl = ({ musicInfo, type, url }: {
  musicInfo: LX.Music.MusicInfo
  type: LX.Quality
  url: string
}) => {
  saveMusicUrl(musicInfo, type, url)
}

export const setPic = (datas: {
  listId: string
  musicInfo: LX.Music.MusicInfo
  url: string
}) => {
  datas.musicInfo.img = datas.url
  updateMusicInfo({
    listId: datas.listId,
    id: datas.musicInfo.songmid,
    data: { img: datas.url },
    musicInfo: datas.musicInfo,
  })
}
 */

const HIGH_QUALITY_LEVELS: LX.Quality[] = ['flac', 'hires', 'master', 'atmos', 'atmos_plus']

const normalizeWyCookieLevel = (level: string | undefined, fallback: LX.Quality): LX.Quality => {
  switch (level) {
    case 'standard':
    case 'higher':
      return '128k'
    case 'exhigh':
      return '320k'
    case 'lossless':
      return 'flac'
    case 'hires':
      return 'hires'
    case 'jyeffect':
    case 'dolby':
      return 'atmos'
    case 'sky':
      return 'atmos_plus'
    case 'jymaster':
      return 'master'
    default:
      return fallback
  }
}

const createMusicUrlRequester = (forceWyCookie: boolean): MusicUrlRequester => {
  return async (musicInfo, quality) => {
    if (musicInfo.source == 'wy' && settingState.setting['common.wy_cookie']) {
      const isVipUser = userState.wy_vip_type !== 0
      const isVipSong = musicInfo.meta.fee === 1
      const preferApi = !isVipUser && (isVipSong || HIGH_QUALITY_LEVELS.includes(quality))
      if (forceWyCookie || !preferApi) {
        try {
          const result = (await wySdk.cookie.getMusicUrl(musicInfo, quality).promise) as unknown as {
            url?: string
            level?: string
          }
          if (!result.url) throw new Error('Cookie did not return a URL')
          return {
            url: result.url,
            type: normalizeWyCookieLevel(result.level, quality),
          }
        } catch (error) {
          console.log('Get music URL with cookie failed, fallback to custom API', error)
        }
      }
    }

    return musicSdk[musicInfo.source].getMusicUrl(toOldMusicInfo(musicInfo), quality).promise
  }
}

export const getMusicUrl = async ({
  musicInfo,
  quality,
  isRefresh,
  allowToggleSource = true,
  allowQualityFallback = true,
  attemptedCandidates = new Set<string>(),
  forceWyCookie = false,
  onResolved = () => {},
  onToggleSource = () => {},
}: {
  musicInfo: LX.Music.MusicInfoOnline
  quality?: LX.Quality
  isRefresh: boolean
  allowToggleSource?: boolean
  allowQualityFallback?: boolean
  attemptedCandidates?: Set<string>
  forceWyCookie?: boolean
  onResolved?: (result: ResolvedMusicUrl) => void
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
}): Promise<string> => {
  // if (!musicInfo._types[type]) {
  //   // 兼容旧版酷我源搜索列表过滤128k音质的bug
  //   if (!(musicInfo.source == 'kw' && type == '128k')) throw new Error('该歌曲没有可播放的音频')

  //   // return Promise.reject(new Error('该歌曲没有可播放的音频'))
  // }

  let currentMusicInfo = musicInfo;
  const preferredQuality = quality ?? settingState.setting['player.playQuality'];

  // 检查是否需要获取详细音质
  const isWySource = currentMusicInfo.source === 'wy';
  const hasFullDetails = currentMusicInfo.meta._full;
  console.log("播放：currentMusicInfo:", currentMusicInfo);

  if (isWySource && !hasFullDetails) {
    const availableQualities = Object.keys(currentMusicInfo.meta._qualitys) as LX.Quality[];
    const preferredQualityIndex = QUALITY_RANK.indexOf(preferredQuality);
    const maxAvailableQualityIndex = Math.min(...availableQualities.map(q => QUALITY_RANK.indexOf(q)));

    // 特殊情况：用户想要的音质比当前已知的最好音质还要高，此时需要等待获取
    if (preferredQualityIndex < maxAvailableQualityIndex) {
      console.log('用户想要的音质比当前已知的最好音质还要高，获取音质详情');
      // 阻塞式获取
      currentMusicInfo = await fetchAndApplyDetailedQuality(currentMusicInfo);
    } else {
      console.log('用户想要的音质比当前已知的最好音质还要低，无需获取音质详情');
      // 默认情况：不阻塞播放，在后台异步获取
      void fetchAndApplyDetailedQuality(currentMusicInfo);
    }
  }

  const targetQuality = quality ?? getPlayQuality(preferredQuality, currentMusicInfo)
  const result = await handleGetOnlineMusicUrl({
    musicInfo: currentMusicInfo,
    quality: targetQuality,
    onToggleSource,
    isRefresh,
    allowToggleSource,
    allowQualityFallback,
    attemptedCandidates,
    requestMusicUrl: createMusicUrlRequester(forceWyCookie),
  })
  if (!result.isFromCache) void saveMusicUrl(result.musicInfo, result.quality, result.url)
  if (
    result.musicInfo.id != musicInfo.id ||
    result.musicInfo.source != musicInfo.source
  ) {
    void saveMusicUrl(musicInfo, result.quality, result.url)
  }
  onResolved(result)
  return result.url
}

export const getPicUrl = async ({
  musicInfo,
  listId,
  isRefresh,
  allowToggleSource = true,
  onToggleSource = () => {},
}: {
  musicInfo: LX.Music.MusicInfoOnline
  listId?: string | null
  isRefresh: boolean
  allowToggleSource?: boolean
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
}): Promise<string> => {
  if (musicInfo.meta.picUrl && !isRefresh) return musicInfo.meta.picUrl
  return handleGetOnlinePicUrl({ musicInfo, onToggleSource, isRefresh, allowToggleSource }).then(
    ({ url, musicInfo: targetMusicInfo, isFromCache }) => {
      // picRequest = null
      if (listId) {
        musicInfo.meta.picUrl = url
        void updateListMusics([{ id: listId, musicInfo }])
      }
      // savePic({ musicInfo, url, listId })
      return url
    }
  )
}
export const getLyricInfo = async ({
  musicInfo,
  isRefresh,
  allowToggleSource = true,
  onToggleSource = () => {},
}: {
  musicInfo: LX.Music.MusicInfoOnline
  isRefresh: boolean
  allowToggleSource?: boolean
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
}): Promise<LX.Player.LyricInfo> => {
  if (!isRefresh) {
    const lyricInfo = await getCachedLyricInfo(musicInfo)
    if (lyricInfo) return buildLyricInfo(lyricInfo)
  }

  // lrcRequest = music[musicInfo.source].getLyric(musicInfo)
  return handleGetOnlineLyricInfo({ musicInfo, onToggleSource, isRefresh, allowToggleSource }).then(
    async ({ lyricInfo, musicInfo: targetMusicInfo, isFromCache }) => {
      // lrcRequest = null
      if (isFromCache) return buildLyricInfo(lyricInfo)
      if (targetMusicInfo.id == musicInfo.id) void saveLyric(musicInfo, lyricInfo)
      else void saveLyric(targetMusicInfo, lyricInfo)

      return buildLyricInfo(lyricInfo)
    }
  )
}
