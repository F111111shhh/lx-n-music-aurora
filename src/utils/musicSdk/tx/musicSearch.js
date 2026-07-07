import { formatPlayTime, sizeFormate } from '../../index'
import { formatSingerName } from '../utils'
import { signRequest } from './utils'

const wait = (time) => new Promise((resolve) => setTimeout(resolve, time))

export default {
  limit: 50,
  total: 0,
  page: 0,
  allPage: 1,
  successCode: 0,
  musicSearch(str, page, limit, retryNum = 0) {
    if (retryNum > 8) return Promise.reject(new Error('搜索失败'))
    const searchRequest = signRequest({
      comm: {
        ct: '11',
        cv: '14090508',
        v: '14090508',
        tmeAppID: 'qqmusic',
        phonetype: 'EBG-AN10',
        deviceScore: '553.47',
        devicelevel: '50',
        newdevicelevel: '20',
        rom: 'HuaWei/EMOTION/EmotionUI_14.2.0',
        os_ver: '12',
        OpenUDID: '0',
        OpenUDID2: '0',
        QIMEI36: '0',
        udid: '0',
        chid: '0',
        aid: '0',
        oaid: '0',
        taid: '0',
        tid: '0',
        wid: '0',
        uid: '0',
        sid: '0',
        modeSwitch: '6',
        teenMode: '0',
        ui_mode: '2',
        nettype: '1020',
        v4ip: '',
      },
      req: {
        module: 'music.search.SearchCgiService',
        method: 'DoSearchForQQMusicMobile',
        param: {
          search_type: 0,
          searchid: Math.random().toString().slice(2),
          query: str,
          page_num: page,
          num_per_page: limit,
          highlight: 0,
          nqc_flag: 0,
          multi_zhida: 0,
          cat: 2,
          grp: 1,
          sin: 0,
          sem: 0,
        },
      },
    })
    return searchRequest.then(({ body }) => {
      if (!body || !body.req || body.code != this.successCode || body.req.code != this.successCode) {
        return wait(250 + retryNum * 150).then(() =>
          this.musicSearch(str, page, limit, retryNum + 1)
        )
      }
      return body.req.data
    }).catch((err) => {
      if (retryNum >= 8) return Promise.reject(err)
      return wait(250 + retryNum * 150).then(() =>
        this.musicSearch(str, page, limit, retryNum + 1)
      )
    })
  },
  handleResult(rawList) {
    if (!rawList || !Array.isArray(rawList)) return []
    const list = []
    rawList.forEach((item) => {
      if (!item.file?.media_mid) return

      let types = []
      let _types = {}
      const file = item.file
      if (file.size_128mp3 != 0) {
        let size = sizeFormate(file.size_128mp3)
        types.push({ type: '128k', size })
        _types['128k'] = {
          size,
        }
      }
      if (file.size_320mp3 !== 0) {
        let size = sizeFormate(file.size_320mp3)
        types.push({ type: '320k', size })
        _types['320k'] = {
          size,
        }
      }
      if (file.size_flac !== 0) {
        let size = sizeFormate(file.size_flac)
        types.push({ type: 'flac', size })
        _types.flac = {
          size,
        }
      }
      if (file.size_hires !== 0) {
        let size = sizeFormate(file.size_hires)
        types.push({ type: 'hires', size })
        _types.hires = {
          size,
        }
      }
      const sizeNew = Array.isArray(file.size_new) ? file.size_new : []
      const atmosSize = Number(sizeNew[1]) || 0
      const atmosPlusSize = Number(sizeNew[2]) || 0
      const masterSize = Number(sizeNew[0]) || 0
      if (atmosSize !== 0) {
        let size = sizeFormate(atmosSize)
        types.push({ type: 'atmos', size })
        _types.atmos = {
          size,
        }
      }
      if (atmosPlusSize !== 0) {
        let size = sizeFormate(atmosPlusSize)
        types.push({ type: 'atmos_plus', size })
        _types.atmos_plus = {
          size,
        }
      }
      if (masterSize !== 0) {
        let size = sizeFormate(masterSize)
        types.push({ type: 'master', size })
        _types.master = {
          size,
        }
      }
      let albumId = ''
      let albumName = ''
      if (item.album) {
        albumName = item.album.name
        albumId = item.album.mid
      }
      list.push({
        singer: formatSingerName(item.singer, 'name'),
        name: item.title,
        albumName,
        albumId,
        source: 'tx',
        interval: formatPlayTime(item.interval),
        songId: item.id,
        albumMid: item.album?.mid ?? '',
        strMediaMid: item.file.media_mid,
        songmid: item.mid,
        img:
          albumId === '' || albumId === '空'
            ? item.singer?.length
              ? `https://y.gtimg.cn/music/photo_new/T001R500x500M000${item.singer[0].mid}.jpg`
              : ''
            : `https://y.gtimg.cn/music/photo_new/T002R500x500M000${albumId}.jpg`,
        types,
        _types,
        typeUrl: {},
      })
    })
    return list
  },
  search(str, page = 1, limit, retryNum = 0) {
    if (limit == null) limit = this.limit
    return this.musicSearch(str, page, limit).then(({ body, meta }) => {
      let list = this.handleResult(body?.item_song)
      const total = meta?.estimate_sum ?? list.length

      if (page == 1 && !list.length && retryNum < 3) {
        return wait(300 + retryNum * 200).then(() =>
          this.search(str, page, limit, retryNum + 1)
        )
      }

      this.total = total
      this.page = page
      this.allPage = Math.ceil(this.total / limit)

      return Promise.resolve({
        list,
        allPage: this.allPage,
        limit,
        total: this.total,
        source: 'tx',
      })
    })
  },
}
