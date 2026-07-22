import { useMemo, useRef, useState } from 'react'
import { ScrollView, TouchableOpacity, View } from 'react-native'

import CheckBox from '@/components/common/CheckBox'
import Popup, { type PopupType } from '@/components/common/Popup'
import Text from '@/components/common/Text'
import { setCurrentPlayQuality } from '@/core/player/player'
import { useI18n } from '@/lang'
import { hasMusicQuality, QUALITY_RANK } from '@/core/music/utils'
import { usePlayerMusicInfo, usePlayMusicInfo } from '@/store/player/hook'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'

export default () => {
  const t = useI18n()
  const theme = useTheme()
  const { quality } = usePlayerMusicInfo()
  const { musicInfo } = usePlayMusicInfo()
  const popupRef = useRef<PopupType>(null)
  const [isPopupMounted, setPopupMounted] = useState(false)

  const onlineMusicInfo = useMemo(() => {
    if (!musicInfo) return null
    const target = 'progress' in musicInfo ? musicInfo.metadata.musicInfo : musicInfo
    return target.source == 'local' ? null : target
  }, [musicInfo])

  const qualitys = useMemo(() => {
    if (!onlineMusicInfo) return []
    return QUALITY_RANK.filter(
      (itemQuality) => itemQuality == quality || hasMusicQuality(onlineMusicInfo, itemQuality)
    )
  }, [onlineMusicInfo, quality])

  if (!quality || !onlineMusicInfo) return null

  const showPopup = () => {
    if (isPopupMounted) {
      popupRef.current?.setVisible(true)
      return
    }
    setPopupMounted(true)
    requestAnimationFrame(() => popupRef.current?.setVisible(true))
  }

  const selectQuality = (targetQuality: LX.Quality) => {
    popupRef.current?.setVisible(false)
    if (targetQuality != quality) void setCurrentPlayQuality(targetQuality)
  }

  return (
    <>
      <TouchableOpacity
        style={styles.trigger}
        activeOpacity={0.5}
        accessibilityRole="button"
        onPress={showPopup}
      >
        <Text color={theme['c-primary']} numberOfLines={1} size={13}>
          {t(quality)}
        </Text>
      </TouchableOpacity>
      {isPopupMounted ? (
        <Popup ref={popupRef} title={t('play_quality_selector_title')}>
          <ScrollView>
            <View style={styles.list} onStartShouldSetResponder={() => true}>
              {qualitys.map((itemQuality) => (
                <CheckBox
                  key={itemQuality}
                  check={itemQuality == quality}
                  label={t(itemQuality)}
                  marginBottom={8}
                  need
                  onChange={() => selectQuality(itemQuality)}
                />
              ))}
            </View>
          </ScrollView>
        </Popup>
      ) : null}
    </>
  )
}

const styles = createStyle({
  trigger: {
    minWidth: 70,
    minHeight: 20,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 14,
  },
})
