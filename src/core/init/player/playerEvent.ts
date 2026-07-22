import { setMusicUrl } from '@/core/player/player'
import { setStatusText } from '@/core/player/playStatus'
import { getPosition, isEmpty, setStop } from '@/plugins/player'
import BackgroundTimer from 'react-native-background-timer'
import playerState from '@/store/player/state'
import { setNowPlayTime } from '@/core/player/progress'
import { updateScrobbleInfo } from '@/core/player/scrobble'

export default () => {
  let loadingTimeout: number | null = null
  let refreshPromise: Promise<boolean> | null = null

  const clearLoadingTimeout = () => {
    if (!loadingTimeout) return
    BackgroundTimer.clearTimeout(loadingTimeout)
    loadingTimeout = null
  }

  const markPlaybackError = async (musicInfo: LX.Player.PlayMusic) => {
    if (playerState.playMusicInfo.musicInfo !== musicInfo || global.lx.isPlayedStop) return
    global.lx.playerError = true
    if (!isEmpty()) await setStop()
    setStatusText(global.i18n.t('player__error'))
  }

  const refreshCurrentUrl = () => {
    if (refreshPromise || global.lx.isPlayedStop) return
    const musicInfo = playerState.playMusicInfo.musicInfo
    if (!musicInfo) return

    const promise = (async () => {
      try {
        const position = await getPosition()
        if (position) setNowPlayTime(position)
      } catch (err) {
        console.log('[Player] Failed to read position before URL fallback:', err)
      }

      if (playerState.playMusicInfo.musicInfo !== musicInfo || global.lx.isPlayedStop) return false
      setStatusText(global.i18n.t('player__refresh_url'))
      const isLoaded = await setMusicUrl(musicInfo, true)
      if (!isLoaded) await markPlaybackError(musicInfo)
      return isLoaded
    })().catch((err) => {
      console.log('[Player] URL fallback failed:', err)
      return false
    })
    refreshPromise = promise
    void promise.finally(() => {
      if (refreshPromise === promise) refreshPromise = null
    })
  }

  const startLoadingTimeout = () => {
    clearLoadingTimeout()
    loadingTimeout = BackgroundTimer.setTimeout(() => {
      loadingTimeout = null
      refreshCurrentUrl()
    }, 25000)
  }

  const handleLoadstart = () => {
    console.log('handleLoadstart', playerState.isPlay)
    if (global.lx.isPlayedStop || !playerState.isPlay) return
    startLoadingTimeout()
    setStatusText(global.i18n.t('player__loading'))
  }

  const handlePlaying = () => {
    setStatusText('')
    clearLoadingTimeout()
  }

  const handleEmpied = () => {
    clearLoadingTimeout()
  }

  const handleWating = () => {
    setStatusText(global.i18n.t('player__buffering'))
  }

  const handleError = () => {
    if (!playerState.musicInfo.id || global.lx.isPlayedStop) return
    clearLoadingTimeout()
    refreshCurrentUrl()
  }

  const handleSetPlayInfo = () => {
    clearLoadingTimeout()
    refreshPromise = null
    updateScrobbleInfo()
  }

  const handleStop = () => {
    clearLoadingTimeout()
  }

  global.app_event.on('playerLoadstart', handleLoadstart)
  global.app_event.on('playerPlaying', handlePlaying)
  global.app_event.on('playerWaiting', handleWating)
  global.app_event.on('playerEmptied', handleEmpied)
  global.app_event.on('playerError', handleError)
  global.app_event.on('musicToggled', handleSetPlayInfo)
  global.app_event.on('stop', handleStop)
}
