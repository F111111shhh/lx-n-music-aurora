import {
  getMusicUrl as getOnlineMusicUrl,
  getPicUrl as getOnlinePicUrl,
  getLyricInfo as getOnlineLyricInfo,
} from './online'
import { buildLyricInfo, getCachedLyricInfo, type ResolvedMusicUrl } from './utils'

export const getMusicUrl = async ({
  musicInfo,
  quality,
  isRefresh,
  allowToggleSource = true,
  allowQualityFallback = true,
  attemptedCandidates,
  forceWyCookie,
  onResolved,
  onToggleSource = () => {},
}: {
  musicInfo: LX.Download.ListItem
  quality?: LX.Quality
  isRefresh: boolean
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
  allowToggleSource?: boolean
  allowQualityFallback?: boolean
  attemptedCandidates?: Set<string>
  forceWyCookie?: boolean
  onResolved?: (result: ResolvedMusicUrl) => void
}): Promise<string> => {
  return getOnlineMusicUrl({
    musicInfo: musicInfo.metadata.musicInfo,
    quality,
    isRefresh,
    onToggleSource,
    allowToggleSource,
    allowQualityFallback,
    attemptedCandidates,
    forceWyCookie,
    onResolved,
  })
}

export const getPicUrl = async ({
  musicInfo,
  isRefresh,
  listId,
  onToggleSource = () => {},
}: {
  musicInfo: LX.Download.ListItem
  isRefresh: boolean
  listId?: string | null
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
}): Promise<string> => {
  if (!isRefresh) {
    const onlineMusicInfo = musicInfo.metadata.musicInfo
    if (onlineMusicInfo.meta.picUrl) return onlineMusicInfo.meta.picUrl
  }

  return getOnlinePicUrl({
    musicInfo: musicInfo.metadata.musicInfo,
    isRefresh,
    onToggleSource,
  }).then((url) => {
    return url
  })
}

export const getLyricInfo = async ({
  musicInfo,
  isRefresh,
  onToggleSource = () => {},
}: {
  musicInfo: LX.Download.ListItem
  isRefresh: boolean
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
}): Promise<LX.Player.LyricInfo> => {
  if (!isRefresh) {
    const lyricInfo = await getCachedLyricInfo(musicInfo.metadata.musicInfo)
    if (lyricInfo) return buildLyricInfo(lyricInfo)
  }

  return getOnlineLyricInfo({
    musicInfo: musicInfo.metadata.musicInfo,
    isRefresh,
    onToggleSource,
  }).catch(async () => {
    throw new Error('failed')
  })
}
