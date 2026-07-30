import {
  isInitialized,
  initial as playerInitial,
  isEmpty,
  setPause,
  setPlay,
  setResource,
  setStop,
  getPosition,
} from '@/plugins/player'
import { setStatusText } from '@/core/player/playStatus'
import playerState from '@/store/player/state'
import settingState from '@/store/setting/state'
import { getList, setPlayMusicInfo, setMusicInfo, setPlayListId } from '@/core/player/playInfo'
import { clearPlayedList, addPlayedList, removePlayedList } from '@/core/player/playedList'
import { clearTempPlayeList, removeTempPlayList } from '@/core/player/tempPlayList'
import { getMusicUrl, getPicPath, getLyricInfo } from '@/core/music'
import { requestMsg } from '@/utils/message'
import { getRandom } from '@/utils/common'
import { filterList } from './utils'
import BackgroundTimer from 'react-native-background-timer'
import {
  checkIgnoringBatteryOptimization,
  checkNotificationPermission,
  debounceBackgroundTimer,
} from '@/utils/tools'
import { LIST_IDS } from '@/config/constant'
import { addListMusics, removeListMusics } from '@/core/list'
import { addDislikeInfo } from '@/core/dislikeList'
import type { ResolvedMusicUrl } from '@/core/music/utils'
import { setNowPlayTime } from '@/core/player/progress'

// import { checkMusicFileAvailable } from '@renderer/utils/music'

const createDelayNextTimeout = (delay: number) => {
  let timeout: number | null
  const clearDelayNextTimeout = () => {
    // console.log(this.timeout)
    if (timeout) {
      BackgroundTimer.clearTimeout(timeout)
      timeout = null
    }
  }

  const addDelayNextTimeout = () => {
    clearDelayNextTimeout()
    timeout = BackgroundTimer.setTimeout(() => {
      timeout = null
      if (global.lx.isPlayedStop) return
      console.log('delay next timeout timeout', delay)
      void playNext(true)
    }, delay)
  }

  return {
    clearDelayNextTimeout,
    addDelayNextTimeout,
  }
}
const { addDelayNextTimeout, clearDelayNextTimeout } = createDelayNextTimeout(5000)

const createGettingUrlId = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem) => {
  const onlineMusicInfo = 'progress' in musicInfo ? musicInfo.metadata.musicInfo : musicInfo
  return `${onlineMusicInfo.source}_${onlineMusicInfo.id}`
}

const getOnlineMusicInfo = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem) =>
  'progress' in musicInfo ? musicInfo.metadata.musicInfo : musicInfo

interface PlayUrlContext {
  musicKey: string
  requestedQuality?: LX.Quality
  attemptedCandidates: Set<string>
}

let playUrlContext: PlayUrlContext = {
  musicKey: '',
  attemptedCandidates: new Set<string>(),
}
let musicUrlRequestId = 0

const isCurrentMusicInfo = (
  musicInfo: LX.Music.MusicInfo | LX.Download.ListItem,
) => playerState.playMusicInfo.musicInfo === musicInfo && !global.lx.isPlayedStop

const resetPlayUrlContext = (
  musicInfo: LX.Music.MusicInfo | LX.Download.ListItem,
  requestedQuality?: LX.Quality
) => {
  const onlineMusicInfo = getOnlineMusicInfo(musicInfo)
  playUrlContext = {
    musicKey: createGettingUrlId(musicInfo),
    requestedQuality:
      onlineMusicInfo.source == 'local'
        ? undefined
        : requestedQuality ?? settingState.setting['player.playQuality'],
    attemptedCandidates: new Set<string>(),
  }
}
let cancelDelayRetry: (() => void) | null = null
const delayRetry = async (): Promise<boolean> => {
  return new Promise<boolean>((resolve) => {
    const time = getRandom(2, 6)
    setStatusText(global.i18n.t('player__getting_url_delay_retry', { time }))
    const tiemout = setTimeout(() => {
      cancelDelayRetry = null
      resolve(true)
    }, time * 1000)
    cancelDelayRetry = () => {
      clearTimeout(tiemout)
      cancelDelayRetry = null
      resolve(false)
    }
  })
}
const getMusicPlayUrl = async (
  musicInfo: LX.Music.MusicInfo | LX.Download.ListItem,
  isRefresh: boolean,
  context: PlayUrlContext,
  requestId: number
): Promise<{ url: string; resolved?: ResolvedMusicUrl } | null> => {
  while (isCurrentMusicInfo(musicInfo) && requestId == musicUrlRequestId) {
    setStatusText(global.i18n.t('player__getting_url'))
    let resolved: ResolvedMusicUrl | undefined
    try {
      const url = await getMusicUrl({
        musicInfo,
        quality: context.requestedQuality,
        isRefresh,
        allowToggleSource: true,
        allowQualityFallback: true,
        attemptedCandidates: context.attemptedCandidates,
        onResolved(result) {
          resolved = result
        },
        onToggleSource() {
          if (!isCurrentMusicInfo(musicInfo) || requestId != musicUrlRequestId) return
          setStatusText(global.i18n.t('toggle_source_try'))
        },
      })
      if (!isCurrentMusicInfo(musicInfo) || requestId != musicUrlRequestId) return null
      return { url, resolved }
    } catch (err: any) {
      if (
        !isCurrentMusicInfo(musicInfo) ||
        requestId != musicUrlRequestId ||
        err.message == requestMsg.cancelRequest
      ) {
        return null
      }
      if (err.message != requestMsg.tooManyRequests || !(await delayRetry())) throw err
    }
  }
  return null
}

export const setMusicUrl = (
  musicInfo: LX.Music.MusicInfo | LX.Download.ListItem,
  isRefresh?: boolean,
  requestedQuality?: LX.Quality,
  pauseAfterRestore = false
): Promise<boolean> => {
  if (cancelDelayRetry) cancelDelayRetry()
  const musicKey = createGettingUrlId(musicInfo)
  if (!isRefresh || playUrlContext.musicKey != musicKey || requestedQuality) {
    resetPlayUrlContext(musicInfo, requestedQuality)
  }

  const context = playUrlContext
  const requestId = ++musicUrlRequestId
  global.lx.gettingUrlId = musicKey
  return getMusicPlayUrl(musicInfo, Boolean(isRefresh), context, requestId)
    .then((result) => {
      if (!result) return false
      if (result.resolved) {
        setMusicInfo({
          quality: result.resolved.quality,
          source: result.resolved.musicInfo.source,
        })
      }
      setResource(
        musicInfo,
        result.url,
        playerState.progress.nowPlayTime,
        result.resolved?.musicInfo.source,
        pauseAfterRestore
      )
      return true
    })
    .catch((err: any) => {
      console.log(err)
      setStatusText(err.message as string)
      global.app_event.error()
      return false
    })
    .finally(() => {
      if (requestId == musicUrlRequestId) {
        global.lx.gettingUrlId = ''
      }
    })
}

export const setCurrentPlayQuality = async (quality: LX.Quality): Promise<boolean> => {
  const musicInfo = playerState.playMusicInfo.musicInfo
  if (!musicInfo || getOnlineMusicInfo(musicInfo).source == 'local') return false

  try {
    const position = await getPosition()
    if (Number.isFinite(position)) setNowPlayTime(position)
  } catch (err) {
    console.log('[Player] Failed to read current position before changing quality:', err)
  }

  if (playerState.playMusicInfo.musicInfo !== musicInfo) return false
  if (cancelDelayRetry) cancelDelayRetry()
  return setMusicUrl(musicInfo, false, quality)
}

// 恢复上次播放的状态
const handleRestorePlay = async (restorePlayInfo: LX.Player.SavedPlayInfo) => {
  const musicInfo = playerState.playMusicInfo.musicInfo
  if (!musicInfo) return

  const restoreTime = settingState.setting['player.isSavePlayTime'] ? restorePlayInfo.time : 0
  setNowPlayTime(restoreTime)

  setTimeout(() => {
    if (playerState.playMusicInfo.musicInfo !== musicInfo) return
    global.app_event.setProgress(
      restoreTime,
      restorePlayInfo.maxTime
    )
  })

  const playMusicInfo = playerState.playMusicInfo

  const pauseAfterRestore = !settingState.setting['player.startupAutoPlay']
  global.lx.restorePlayInfo = null
  void setMusicUrl(musicInfo, false, undefined, pauseAfterRestore)

  void getPicPath({ musicInfo, listId: playMusicInfo.listId }).then((url: string) => {
    if (
      musicInfo.id != playMusicInfo.musicInfo?.id ||
      playerState.musicInfo.pic == url ||
      playerState.loadErrorPicUrl == url
    )
      return
    setMusicInfo({ pic: url })
    global.app_event.picUpdated()
  })

  void getLyricInfo({ musicInfo })
    .then((lyricInfo) => {
      if (musicInfo.id != playMusicInfo.musicInfo?.id) return
      setMusicInfo({
        lrc: lyricInfo.lyric,
        tlrc: lyricInfo.tlyric,
        lxlrc: lyricInfo.lxlyric,
        rlrc: lyricInfo.rlyric,
        rawlrc: lyricInfo.rawlrcInfo.lyric,
      })
      global.app_event.lyricUpdated()
    })
    .catch((err) => {
      console.log(err)
      if (musicInfo.id != playMusicInfo.musicInfo?.id) return
      setStatusText(global.i18n.t('lyric__load_error'))
    })

  if (settingState.setting['player.togglePlayMethod'] == 'random' && !playMusicInfo.isTempPlay)
    addPlayedList(playMusicInfo as LX.Player.PlayMusicInfo)
}

const debouncePlay = debounceBackgroundTimer((musicInfo: LX.Player.PlayMusic) => {
  void setMusicUrl(musicInfo)

  void getPicPath({ musicInfo, listId: playerState.playMusicInfo.listId }).then((url: string) => {
    if (
      musicInfo.id != playerState.playMusicInfo.musicInfo?.id ||
      playerState.musicInfo.pic == url ||
      playerState.loadErrorPicUrl == url
    )
      return
    setMusicInfo({ pic: url })
    global.app_event.picUpdated()
  })

  void getLyricInfo({ musicInfo })
    .then((lyricInfo) => {
      if (musicInfo.id != playerState.playMusicInfo.musicInfo?.id) return
      setMusicInfo({
        lrc: lyricInfo.lyric,
        tlrc: lyricInfo.tlyric,
        lxlrc: lyricInfo.lxlyric,
        rlrc: lyricInfo.rlyric,
        rawlrc: lyricInfo.rawlrcInfo.lyric,
      })
      global.app_event.lyricUpdated()
    })
    .catch((err) => {
      console.log(err)
      if (musicInfo.id != playerState.playMusicInfo.musicInfo?.id) return
      setStatusText(global.i18n.t('lyric__load_error'))
    })
}, 200)

// 处理音乐播放
export const handlePlay = async () => {
  if (!isInitialized()) {
    await checkNotificationPermission()
    void checkIgnoringBatteryOptimization()
    await playerInitial({
      volume: settingState.setting['player.volume'],
      playRate: settingState.setting['player.playbackRate'],
      cacheSize: settingState.setting['player.cacheSize']
        ? parseInt(settingState.setting['player.cacheSize'])
        : 0,
      isHandleAudioFocus: settingState.setting['player.isHandleAudioFocus'],
      isEnableAudioOffload: settingState.setting['player.isEnableAudioOffload'],
    })
  }

  global.lx.playerError = false
  global.lx.isPlayedStop &&= false
  resetRandomNextMusicInfo()

  if (global.lx.restorePlayInfo) {
    void handleRestorePlay(global.lx.restorePlayInfo)
    return
  }

  const playMusicInfo = playerState.playMusicInfo
  const musicInfo = playMusicInfo.musicInfo

  if (!musicInfo) return

  await setStop()
  global.app_event.pause()

  clearDelayNextTimeout()

  if (settingState.setting['player.togglePlayMethod'] == 'random' && !playMusicInfo.isTempPlay)
    addPlayedList(playMusicInfo as LX.Player.PlayMusicInfo)

  debouncePlay(musicInfo)
}

/**
 * 播放列表内歌曲
 * @param listId 列表id
 * @param index 播放的歌曲位置
 */
export const playList = async (listId: string, index: number) => {
  const prevListId = playerState.playInfo.playerListId
  setPlayListId(listId)
  setPlayMusicInfo(listId, getList(listId)[index])
  if (settingState.setting['player.isAutoCleanPlayedList'] || prevListId != listId)
    clearPlayedList()
  clearTempPlayeList()
  await handlePlay()
}

const handleToggleStop = async () => {
  await stop()
  setTimeout(() => {
    setPlayMusicInfo(null, null)
  })
}

const randomNextMusicInfo = {
  info: null as LX.Player.PlayMusicInfo | null,
  // index: -1,
}
export const resetRandomNextMusicInfo = () => {
  if (randomNextMusicInfo.info) {
    randomNextMusicInfo.info = null
    // randomNextMusicInfo.index = -1
  }
}

export const getNextPlayMusicInfo = async (): Promise<LX.Player.PlayMusicInfo | null> => {
  if (playerState.tempPlayList.length) {
    // 如果稍后播放列表存在歌曲则直接播放改列表的歌曲
    const playMusicInfo = playerState.tempPlayList[0]
    return playMusicInfo
  }

  if (playerState.playMusicInfo.musicInfo == null) return null

  if (randomNextMusicInfo.info) return randomNextMusicInfo.info

  const playMusicInfo = playerState.playMusicInfo
  const playInfo = playerState.playInfo
  // console.log(playInfo.playerListId)
  const currentListId = playInfo.playerListId
  if (!currentListId) return null
  const currentList = getList(currentListId)

  const playedList = playerState.playedList
  if (playedList.length) {
    // 移除已播放列表内不存在原列表的歌曲
    let currentId: string
    if (playMusicInfo.isTempPlay) {
      const musicInfo = currentList[playInfo.playerPlayIndex]
      if (musicInfo) currentId = musicInfo.id
    } else {
      currentId = playMusicInfo.musicInfo!.id
    }
    // 从已播放列表移除播放列表已删除的歌曲
    let index
    for (
      index = playedList.findIndex((m) => m.musicInfo.id === currentId) + 1;
      index < playedList.length;
      index++
    ) {
      const playMusicInfo = playedList[index]
      const currentId = playMusicInfo.musicInfo.id
      if (playMusicInfo.listId == currentListId && !currentList.some((m) => m.id === currentId)) {
        removePlayedList(index)
        continue
      }
      break
    }

    if (index < playedList.length) return playedList[index]
  }
  // const isCheckFile = findNum > 2 // 针对下载列表，如果超过两次都碰到无效歌曲，则过滤整个列表内的无效歌曲
  let { filteredList, playerIndex } = await filterList({
    // 过滤已播放歌曲
    listId: currentListId,
    list: currentList,
    playedList,
    playerMusicInfo: currentList[playInfo.playerPlayIndex],
    isNext: true,
  })

  if (!filteredList.length) return null
  // let currentIndex: number = filteredList.indexOf(currentList[playInfo.playerPlayIndex])
  if (playerIndex == -1 && filteredList.length) playerIndex = 0
  let nextIndex = playerIndex

  let togglePlayMethod = settingState.setting['player.togglePlayMethod']
  switch (togglePlayMethod) {
    case 'listLoop':
    case 'heartbeat':
      nextIndex = playerIndex === filteredList.length - 1 ? 0 : playerIndex + 1
      break
    case 'random':
      nextIndex = getRandom(0, filteredList.length)
      break
    case 'list':
      nextIndex = playerIndex === filteredList.length - 1 ? -1 : playerIndex + 1
      break
    case 'singleLoop':
      break
    default:
      return null
  }
  if (nextIndex < 0) return null

  const nextPlayMusicInfo = {
    musicInfo: filteredList[nextIndex],
    listId: currentListId,
    isTempPlay: false,
  }

  if (togglePlayMethod == 'random') {
    randomNextMusicInfo.info = nextPlayMusicInfo
    // randomNextMusicInfo.index = nextIndex
  }
  return nextPlayMusicInfo
}

const handlePlayNext = async (playMusicInfo: LX.Player.PlayMusicInfo) => {
  setPlayMusicInfo(playMusicInfo.listId, playMusicInfo.musicInfo, playMusicInfo.isTempPlay)
  await handlePlay()
}
/**
 * 下一曲
 * @param isAutoToggle 是否自动切换
 * @returns
 */
export const playNext = async (isAutoToggle = false): Promise<void> => {
  if (playerState.tempPlayList.length) {
    // 如果稍后播放列表存在歌曲则直接播放改列表的歌曲
    const playMusicInfo = playerState.tempPlayList[0]
    removeTempPlayList(0)
    await handlePlayNext(playMusicInfo)
    return
  }

  const playMusicInfo = playerState.playMusicInfo
  const playInfo = playerState.playInfo
  if (playMusicInfo.musicInfo == null) return handleToggleStop()

  // console.log(playInfo.playerListId)
  const currentListId = playInfo.playerListId
  if (!currentListId) return handleToggleStop()
  const currentList = getList(currentListId)

  const playedList = playerState.playedList

  if (playedList.length) {
    // 移除已播放列表内不存在原列表的歌曲
    let currentId: string
    if (playMusicInfo.isTempPlay) {
      const musicInfo = currentList[playInfo.playerPlayIndex]
      if (musicInfo) currentId = musicInfo.id
    } else {
      currentId = playMusicInfo.musicInfo.id
    }
    // 从已播放列表移除播放列表已删除的歌曲
    let index
    for (
      index = playedList.findIndex((m) => m.musicInfo.id === currentId) + 1;
      index < playedList.length;
      index++
    ) {
      const playMusicInfo = playedList[index]
      const currentId = playMusicInfo.musicInfo.id
      if (playMusicInfo.listId == currentListId && !currentList.some((m) => m.id === currentId)) {
        removePlayedList(index)
        continue
      }
      break
    }

    if (index < playedList.length) {
      await handlePlayNext(playedList[index])
      return
    }
  }
  if (randomNextMusicInfo.info) {
    await handlePlayNext(randomNextMusicInfo.info)
    return
  }
  // const isCheckFile = findNum > 2 // 针对下载列表，如果超过两次都碰到无效歌曲，则过滤整个列表内的无效歌曲
  let { filteredList, playerIndex } = await filterList({
    // 过滤已播放歌曲
    listId: currentListId,
    list: currentList,
    playedList,
    playerMusicInfo: currentList[playInfo.playerPlayIndex],
    isNext: true,
  })

  if (!filteredList.length) return handleToggleStop()
  // let currentIndex: number = filteredList.indexOf(currentList[playInfo.playerPlayIndex])
  if (playerIndex == -1 && filteredList.length) playerIndex = 0
  let nextIndex = playerIndex

  let togglePlayMethod = settingState.setting['player.togglePlayMethod']
  if (!isAutoToggle) {
    switch (togglePlayMethod) {
      case 'list':
      case 'singleLoop':
      case 'none':
      case 'heartbeat':
        togglePlayMethod = 'listLoop' as any
    }
  }
  switch (togglePlayMethod) {
    case 'listLoop':
    case 'heartbeat':
      nextIndex = playerIndex === filteredList.length - 1 ? 0 : playerIndex + 1
      break
    case 'random':
      nextIndex = getRandom(0, filteredList.length)
      break
    case 'list':
      nextIndex = playerIndex === filteredList.length - 1 ? -1 : playerIndex + 1
      break
    case 'singleLoop':
      break
    default:
      nextIndex = -1
      return
  }
  if (nextIndex < 0) return

  await handlePlayNext({
    musicInfo: filteredList[nextIndex],
    listId: currentListId,
    isTempPlay: false,
  })
}

/**
 * 上一曲
 */
export const playPrev = async (isAutoToggle = false): Promise<void> => {
  const playMusicInfo = playerState.playMusicInfo
  if (playMusicInfo.musicInfo == null) return handleToggleStop()
  const playInfo = playerState.playInfo

  const currentListId = playInfo.playerListId
  if (!currentListId) return handleToggleStop()
  const currentList = getList(currentListId)

  const playedList = playerState.playedList
  if (playedList.length) {
    let currentId: string
    if (playMusicInfo.isTempPlay) {
      const musicInfo = currentList[playInfo.playerPlayIndex]
      if (musicInfo) currentId = musicInfo.id
    } else {
      currentId = playMusicInfo.musicInfo.id
    }
    // 从已播放列表移除播放列表已删除的歌曲
    let index
    for (
      index = playedList.findIndex((m) => m.musicInfo.id === currentId) - 1;
      index > -1;
      index--
    ) {
      const playMusicInfo = playedList[index]
      const currentId = playMusicInfo.musicInfo.id
      if (playMusicInfo.listId == currentListId && !currentList.some((m) => m.id === currentId)) {
        removePlayedList(index)
        continue
      }
      break
    }

    if (index > -1) {
      await handlePlayNext(playedList[index])
      return
    }
  }

  // const isCheckFile = findNum > 2
  let { filteredList, playerIndex } = await filterList({
    // 过滤已播放歌曲
    listId: currentListId,
    list: currentList,
    playedList,
    playerMusicInfo: currentList[playInfo.playerPlayIndex],
    isNext: false,
  })
  if (!filteredList.length) return handleToggleStop()

  // let currentIndex = filteredList.indexOf(currentList[playInfo.playerPlayIndex])
  if (playerIndex == -1 && filteredList.length) playerIndex = 0
  let nextIndex = playerIndex
  if (!playMusicInfo.isTempPlay) {
    let togglePlayMethod = settingState.setting['player.togglePlayMethod']
    if (!isAutoToggle) {
      switch (togglePlayMethod) {
        case 'list':
        case 'singleLoop':
        case 'none':
        case 'heartbeat':
          togglePlayMethod = 'listLoop' as any
      }
    }
    switch (togglePlayMethod) {
      case 'random':
        nextIndex = getRandom(0, filteredList.length)
        break
      case 'listLoop':
      case 'list':
      case 'heartbeat':
        nextIndex = playerIndex === 0 ? filteredList.length - 1 : playerIndex - 1
        break
      case 'singleLoop':
        break
      default:
        nextIndex = -1
        return
    }
    if (nextIndex < 0) return
  }

  await handlePlayNext({
    musicInfo: filteredList[nextIndex],
    listId: currentListId,
    isTempPlay: false,
  })
}

/**
 * 恢复播放
 */
export const play = () => {
  if (playerState.playMusicInfo.musicInfo == null) return
  if (isEmpty()) {
    if (createGettingUrlId(playerState.playMusicInfo.musicInfo) != global.lx.gettingUrlId)
      void setMusicUrl(playerState.playMusicInfo.musicInfo)
    return
  }
  void setPlay()
}

/**
 * 暂停播放
 */
export const pause = async () => {
  await setPause()
}

/**
 * 停止播放
 */
export const stop = async () => {
  await setStop()
  setTimeout(() => {
    global.app_event.stop()
  })
}

/**
 * 播放、暂停播放切换
 */
export const togglePlay = () => {
  global.lx.isPlayedStop &&= false
  if (playerState.isPlay) {
    void pause()
  } else {
    play()
  }
}

/**
 * 收藏当前播放的歌曲
 */
export const collectMusic = () => {
  if (!playerState.playMusicInfo.musicInfo) return
  void addListMusics(
    LIST_IDS.LOVE,
    [
      'progress' in playerState.playMusicInfo.musicInfo
        ? playerState.playMusicInfo.musicInfo.metadata.musicInfo
        : playerState.playMusicInfo.musicInfo,
    ],
    settingState.setting['list.addMusicLocationType']
  )
}

/**
 * 取消收藏当前播放的歌曲
 */
export const uncollectMusic = () => {
  if (!playerState.playMusicInfo.musicInfo) return
  void removeListMusics(LIST_IDS.LOVE, [
    'progress' in playerState.playMusicInfo.musicInfo
      ? playerState.playMusicInfo.musicInfo.metadata.musicInfo.id
      : playerState.playMusicInfo.musicInfo.id,
  ])
}

/**
 * 不喜欢当前播放的歌曲
 */
export const dislikeMusic = async () => {
  if (!playerState.playMusicInfo.musicInfo) return
  const minfo =
    'progress' in playerState.playMusicInfo.musicInfo
      ? playerState.playMusicInfo.musicInfo.metadata.musicInfo
      : playerState.playMusicInfo.musicInfo
  await addDislikeInfo([{ name: minfo.name, singer: minfo.singer }])
  await playNext(true)
}
