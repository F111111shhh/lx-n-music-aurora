import versionActions from '@/store/version/action'
import versionState, { type InitState } from '@/store/version/state'
import { saveIgnoreVersion } from '@/utils/data'
import { showVersionModal } from '@/navigation'
import { Navigation } from 'react-native-navigation'

const getDisabledVersionInfo = (): InitState['versionInfo'] => ({
  ...versionState.versionInfo,
  newVersion: {
    version: process.versions.app,
    desc: '',
    history: [],
  },
  isUnknown: false,
  isLatest: true,
  status: 'idle',
})

export const showModal = () => {
  if (versionState.showModal) return
  versionActions.setVersionInfo(getDisabledVersionInfo())
  versionActions.setVisibleModal(true)
  showVersionModal()
}

export const hideModal = (componentId: string) => {
  if (!versionState.showModal) return
  versionActions.setVisibleModal(false)
  void Navigation.dismissOverlay(componentId)
}

export const checkUpdate = async (silent = false) => {
  versionActions.setVersionInfo(getDisabledVersionInfo())
}

export const downloadUpdate = () => {
  versionActions.setVersionInfo(getDisabledVersionInfo())
  versionActions.setProgress({ total: 0, current: 0 })
}

export const setIgnoreVersion = (version: InitState['ignoreVersion']) => {
  versionActions.setIgnoreVersion(version)
  saveIgnoreVersion(version)
}
