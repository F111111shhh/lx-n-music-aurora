import { getMusicUrlCache } from '@/utils/data'
import {
  getCachedPlaybackSource,
  getPlayQuality,
  getQualityCandidates,
} from '@/core/music/utils'
import { isCached } from '@/plugins/player/utils'
import settingState from '@/store/setting/state'

type PlayMusic = LX.Music.MusicInfo | LX.Download.ListItem

export type CachedPlayerMusicUrl = {
  url: string
  quality: LX.Quality
  source: LX.OnlineSource
}

const getOnlineMusicInfo = (musicInfo: PlayMusic) =>
  'progress' in musicInfo ? musicInfo.metadata.musicInfo : musicInfo

export const getCachedPlayerMusicUrl = async (
  musicInfo: PlayMusic,
  requestedQuality?: LX.Quality,
  allowQualityFallback = true
): Promise<CachedPlayerMusicUrl | null> => {
  const onlineMusicInfo = getOnlineMusicInfo(musicInfo)
  if (onlineMusicInfo.source == 'local') return null

  const targetQuality =
    requestedQuality ?? getPlayQuality(settingState.setting['player.playQuality'], onlineMusicInfo)
  for (const quality of getQualityCandidates(
    onlineMusicInfo,
    targetQuality,
    allowQualityFallback
  )) {
    const cache = await getMusicUrlCache(onlineMusicInfo, quality)
    if (cache?.url && (await isCached(cache.url))) {
      return {
        url: cache.url,
        quality,
        source: cache.source ?? getCachedPlaybackSource(cache.url, onlineMusicInfo.source),
      }
    }
  }
  return null
}
