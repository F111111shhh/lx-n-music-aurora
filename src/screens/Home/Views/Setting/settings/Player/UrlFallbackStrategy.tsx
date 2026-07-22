import { memo, useMemo } from 'react'
import { View } from 'react-native'

import SubTitle from '../../components/SubTitle'
import CheckBox from '@/components/common/CheckBox'
import { useSettingValue } from '@/store/setting/hook'
import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'

type Strategy = LX.AppSetting['player.urlFallbackStrategy']

const Item = ({ id, label }: { id: Strategy; label: string }) => {
  const strategy = useSettingValue('player.urlFallbackStrategy')
  const isActive = useMemo(() => strategy == id, [strategy, id])

  return (
    <CheckBox
      check={isActive}
      label={label}
      marginBottom={8}
      need
      onChange={() => {
        updateSetting({ 'player.urlFallbackStrategy': id })
      }}
    />
  )
}

export default memo(() => {
  const t = useI18n()

  return (
    <SubTitle title={t('setting_play_url_fallback_strategy')}>
      <View style={styles.list}>
        <Item id="source-first" label={t('setting_play_url_fallback_source_first')} />
        <Item id="quality-first" label={t('setting_play_url_fallback_quality_first')} />
      </View>
    </SubTitle>
  )
})

const styles = createStyle({
  list: {
    flexDirection: 'column',
  },
})
