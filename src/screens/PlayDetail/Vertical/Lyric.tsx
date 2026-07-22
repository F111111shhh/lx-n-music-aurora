import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import {
  Animated,
  View,
  FlatList,
  type FlatListProps,
  type LayoutChangeEvent,
  Pressable,
  PanResponder,
  Text as NativeText,
} from 'react-native'
import { type Line, useLrcPlay, useLrcSet } from '@/plugins/lyric'
import { createStyle } from '@/utils/tools'
import { updateSetting } from '@/core/common'
import { useTextShadow, useTheme } from '@/store/theme/hook'
import { useSettingValue } from '@/store/setting/hook'
import { setSpText } from '@/utils/pixelRatio'
import settingState from '@/store/setting/state'
import playerState from '@/store/player/state'

type FlatListType = FlatListProps<Line>

type LrcLineHandle = {
  setActive: (active: boolean) => void
}

type LyricLayoutInfo = {
  spaceHeight: number
  lineHeights: number[]
  lineOffsets: number[]
}

interface LineProps {
  line: Line
  lineNum: number
  activeLineRef: { current: number }
  onLayout: (lineNum: number, height: number) => void
  onPress: (index: number) => void
  onRegister: (lineNum: number, handle: LrcLineHandle | null) => void
}

const getKey = (item: Line, index: number) => `${index}${item.text}`

const ACTIVE_LINE_SCALE = 1.08
const ACTIVE_LINE_SCALE_DURATION = 180
const LINE_PRESS_ACTIVE_HOLD_DURATION = ACTIVE_LINE_SCALE_DURATION + 260

const LrcLine = memo(
  ({ line, lineNum, activeLineRef, onLayout, onPress, onRegister }: LineProps) => {
    const theme = useTheme()
    const textShadow = useTextShadow()
    const lrcFontSize = useSettingValue('playDetail.vertical.style.lrcFontSize')
    const textAlign = useSettingValue('playDetail.style.align')
    const size = lrcFontSize / 10
    const lineHeight = setSpText(size) * 1.3
    const primaryTextRef = useRef<NativeText>(null)
    const extendedTextRefs = useRef<Array<NativeText | null>>([])
    const activeRef = useRef(activeLineRef.current == lineNum)
    const lineScale = useRef(new Animated.Value(activeRef.current ? ACTIVE_LINE_SCALE : 1)).current

    const colors = useMemo(() => ({
      active: {
        primary: theme.isDark ? theme['c-font'] : theme['c-primary-font-active'],
        secondary: theme['c-primary-alpha-200'],
        opacity: 1,
      },
      inactive: {
        primary: theme['c-450'],
        secondary: theme['c-400'],
        opacity: 0.8,
      },
    }), [theme])

    const textShadowStyle = useMemo(() => textShadow ? {
      textShadowColor: theme['c-primary-dark-300-alpha-800'],
      textShadowOffset: { width: 0.2, height: 0.2 },
      textShadowRadius: 2,
    } : null, [textShadow, theme])

    const makeTextStyle = useCallback((
      color: string,
      opacity: number,
      fontSize: number,
      textLineHeight: number,
      style: object,
    ) => ({
      ...style,
      ...textShadowStyle,
      fontSize: setSpText(fontSize),
      color,
      textAlign,
      lineHeight: textLineHeight,
      opacity,
    }), [textAlign, textShadowStyle])

    const isActive = activeLineRef.current == lineNum
    const lineTextStyle = useMemo(
      () => makeTextStyle(
        isActive ? colors.active.primary : colors.inactive.primary,
        isActive ? colors.active.opacity : colors.inactive.opacity,
        size,
        lineHeight,
        styles.lineText,
      ),
      [colors, isActive, lineHeight, makeTextStyle, size],
    )
    const translationTextStyle = useMemo(
      () => makeTextStyle(
        isActive ? colors.active.secondary : colors.inactive.secondary,
        isActive ? colors.active.opacity : colors.inactive.opacity,
        size * 0.8,
        lineHeight * 0.8,
        styles.lineTranslationText,
      ),
      [colors, isActive, lineHeight, makeTextStyle, size],
    )

    const setActive = useCallback((active: boolean, force = false) => {
      if (!force && activeRef.current == active) return
      activeRef.current = active
      const color = active ? colors.active : colors.inactive
      if (force) {
        lineScale.stopAnimation()
        lineScale.setValue(active ? ACTIVE_LINE_SCALE : 1)
      } else {
        Animated.timing(lineScale, {
          toValue: active ? ACTIVE_LINE_SCALE : 1,
          duration: ACTIVE_LINE_SCALE_DURATION,
          useNativeDriver: true,
          isInteraction: false,
        }).start()
      }
      primaryTextRef.current?.setNativeProps({
        style: { color: color.primary, opacity: color.opacity },
      })
      for (const textRef of extendedTextRefs.current) {
        textRef?.setNativeProps({
          style: { color: color.secondary, opacity: color.opacity },
        })
      }
    }, [colors, lineScale])

    useLayoutEffect(() => {
      setActive(activeLineRef.current == lineNum, true)
      onRegister(lineNum, { setActive })
      return () => onRegister(lineNum, null)
    }, [activeLineRef, line, lineNum, onRegister, setActive])

    const handleLayout = useCallback(({ nativeEvent }: LayoutChangeEvent) => {
      onLayout(lineNum, nativeEvent.layout.height)
    }, [lineNum, onLayout])
    const handlePress = useCallback(() => {
      onPress(lineNum)
    }, [lineNum, onPress])

    return (
      <Pressable onPress={handlePress} style={({ pressed }) => pressed ? styles.linePressed : undefined}>
        <View style={styles.line} onLayout={handleLayout}>
          <Animated.View style={{ transform: [{ scale: lineScale }] }}>
            <NativeText
              ref={primaryTextRef}
              style={lineTextStyle}
              textBreakStrategy="simple"
            >
              {line.text}
            </NativeText>
            {line.extendedLyrics.map((lrc, index) => (
              <NativeText
                ref={(textRef) => {
                  extendedTextRefs.current[index] = textRef
                }}
                style={translationTextStyle}
                textBreakStrategy="simple"
                key={index}
              >
                {lrc}
              </NativeText>
            ))}
          </Animated.View>
        </View>
      </Pressable>
    )
  },
  (prevProps, nextProps) => (
    prevProps.line === nextProps.line &&
    prevProps.lineNum === nextProps.lineNum &&
    prevProps.activeLineRef === nextProps.activeLineRef &&
    prevProps.onLayout === nextProps.onLayout &&
    prevProps.onPress === nextProps.onPress &&
    prevProps.onRegister === nextProps.onRegister
  ),
)

export default () => {
  const lyricLines = useLrcSet()
  const { line } = useLrcPlay()
  const flatListRef = useRef<FlatList<Line>>(null)
  const isPauseScrollRef = useRef(true)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const initialScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const scrollRetryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const linePressScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const scrollFrameRef = useRef<number | null>(null)
  const pendingScrollIndexRef = useRef<number | null>(null)
  const lineRef = useRef({ line: 0, prevLine: 0 })
  const activeLineRef = useRef(line)
  const renderedActiveLineRef = useRef(line)
  const activeLineFrameRef = useRef<number | null>(null)
  const currentLineRef = useRef(line)
  currentLineRef.current = line
  const lineHandlesRef = useRef(new Map<number, LrcLineHandle>())
  const scrollToActiveRef = useRef<(index?: number) => void>(() => {})
  const listHeightRef = useRef(0)
  const listLayoutInfoRef = useRef<LyricLayoutInfo>({
    spaceHeight: 0,
    lineHeights: [],
    lineOffsets: [],
  })
  const isShowLyricProgressSetting = useSettingValue('playDetail.isShowLyricProgressSetting')

  const initialDistanceRef = useRef(0)
  const initialFontSizeRef = useRef(0)

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: (evt) => evt.nativeEvent.touches.length === 2,
    onMoveShouldSetPanResponder: (evt) => evt.nativeEvent.touches.length === 2,
    onPanResponderGrant: (evt) => {
      if (evt.nativeEvent.touches.length !== 2) return
      const dx = evt.nativeEvent.touches[0].pageX - evt.nativeEvent.touches[1].pageX
      const dy = evt.nativeEvent.touches[0].pageY - evt.nativeEvent.touches[1].pageY
      initialDistanceRef.current = Math.sqrt(dx * dx + dy * dy)
      initialFontSizeRef.current = settingState.setting['playDetail.vertical.style.lrcFontSize']
    },
    onPanResponderMove: (evt) => {
      if (evt.nativeEvent.touches.length !== 2 || initialDistanceRef.current <= 0) return
      const dx = evt.nativeEvent.touches[0].pageX - evt.nativeEvent.touches[1].pageX
      const dy = evt.nativeEvent.touches[0].pageY - evt.nativeEvent.touches[1].pageY
      const scale = Math.sqrt(dx * dx + dy * dy) / initialDistanceRef.current
      const newSize = Math.max(100, Math.min(Math.round((initialFontSizeRef.current * scale) / 2) * 2, 300))
      if (settingState.setting['playDetail.vertical.style.lrcFontSize'] !== newSize) {
        updateSetting({ 'playDetail.vertical.style.lrcFontSize': newSize })
      }
    },
    onPanResponderRelease: () => {
      initialDistanceRef.current = 0
    },
    onPanResponderTerminate: () => {
      initialDistanceRef.current = 0
    },
  }), [])

  const registerLine = useCallback((lineNum: number, handle: LrcLineHandle | null) => {
    if (handle) lineHandlesRef.current.set(lineNum, handle)
    else lineHandlesRef.current.delete(lineNum)
  }, [])

  const setRenderedActiveLine = useCallback((nextLine: number) => {
    const previousActiveLine = renderedActiveLineRef.current
    activeLineRef.current = nextLine
    if (previousActiveLine === nextLine) return
    if (previousActiveLine >= 0) lineHandlesRef.current.get(previousActiveLine)?.setActive(false)
    if (nextLine >= 0) lineHandlesRef.current.get(nextLine)?.setActive(true)
    renderedActiveLineRef.current = nextLine
  }, [])

  const syncActiveLine = useCallback(() => {
    activeLineFrameRef.current = null
    const previousActiveLine = renderedActiveLineRef.current
    const nextActiveLine = activeLineRef.current
    if (previousActiveLine === nextActiveLine) return
    if (previousActiveLine >= 0) lineHandlesRef.current.get(previousActiveLine)?.setActive(false)
    if (nextActiveLine >= 0) lineHandlesRef.current.get(nextActiveLine)?.setActive(true)
    renderedActiveLineRef.current = nextActiveLine
  }, [])

  const scheduleActiveLineSync = useCallback(() => {
    if (activeLineFrameRef.current != null) return
    activeLineFrameRef.current = requestAnimationFrame(syncActiveLine)
  }, [syncActiveLine])

  const cancelActiveLineSync = useCallback(() => {
    if (activeLineFrameRef.current == null) return
    cancelAnimationFrame(activeLineFrameRef.current)
    activeLineFrameRef.current = null
  }, [])

  const getLineOffset = useCallback((index: number) => {
    const layoutInfo = listLayoutInfoRef.current
    const cachedOffset = layoutInfo.lineOffsets[index]
    if (cachedOffset != null) return cachedOffset

    let startLine = index
    while (startLine > 0 && layoutInfo.lineOffsets[startLine] == null) startLine--
    let offset = layoutInfo.lineOffsets[startLine] ?? layoutInfo.spaceHeight
    for (let lineNum = startLine; lineNum < index; lineNum++) {
      const lineHeight = layoutInfo.lineHeights[lineNum]
      if (lineHeight == null) return null
      layoutInfo.lineOffsets[lineNum] = offset
      offset += lineHeight
    }
    layoutInfo.lineOffsets[index] = offset
    return offset
  }, [])

  const scrollToIndex = useCallback((index: number) => {
    try {
      flatListRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.42,
      })
    } catch { }
  }, [])

  const handleScrollToActive = useCallback((index = lineRef.current.line) => {
    const flatList = flatListRef.current
    if (index < 0 || !flatList || !listHeightRef.current) return

    const offset = getLineOffset(index)
    const lineHeight = listLayoutInfoRef.current.lineHeights[index]
    if (offset == null || lineHeight == null) {
      scrollToIndex(index)
      return
    }

    flatList.scrollToOffset({
      offset: Math.max(0, offset + lineHeight / 2 - listHeightRef.current * 0.42),
      animated: true,
    })
  }, [getLineOffset, scrollToIndex])

  const cancelScheduledScroll = useCallback(() => {
    if (scrollFrameRef.current != null) {
      cancelAnimationFrame(scrollFrameRef.current)
      scrollFrameRef.current = null
    }
    pendingScrollIndexRef.current = null
  }, [])

  const cancelLinePressScroll = useCallback(() => {
    if (!linePressScrollTimeoutRef.current) return
    clearTimeout(linePressScrollTimeoutRef.current)
    linePressScrollTimeoutRef.current = null
  }, [])

  const scheduleScrollToActive = useCallback((index = lineRef.current.line) => {
    if (index < 0) return
    pendingScrollIndexRef.current = index
    if (scrollFrameRef.current != null) return
    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = null
      const targetIndex = pendingScrollIndexRef.current
      pendingScrollIndexRef.current = null
      if (targetIndex != null) handleScrollToActive(targetIndex)
    })
  }, [handleScrollToActive])
  scrollToActiveRef.current = scheduleScrollToActive

  const handleScrollBeginDrag = useCallback(() => {
    isPauseScrollRef.current = true
    cancelScheduledScroll()
    cancelLinePressScroll()
    if (initialScrollTimeoutRef.current) {
      clearTimeout(initialScrollTimeoutRef.current)
      initialScrollTimeoutRef.current = null
    }
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
      scrollTimeoutRef.current = null
    }
    if (scrollRetryTimeoutRef.current) {
      clearTimeout(scrollRetryTimeoutRef.current)
      scrollRetryTimeoutRef.current = null
    }
  }, [cancelLinePressScroll, cancelScheduledScroll])

  const onScrollEndDrag = useCallback(() => {
    if (!isPauseScrollRef.current) return
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    scrollTimeoutRef.current = setTimeout(() => {
      scrollTimeoutRef.current = null
      isPauseScrollRef.current = false
      if (playerState.isPlay) scheduleScrollToActive()
    }, 3000)
  }, [scheduleScrollToActive])

  useEffect(() => () => {
    cancelScheduledScroll()
    cancelLinePressScroll()
    cancelActiveLineSync()
    if (initialScrollTimeoutRef.current) clearTimeout(initialScrollTimeoutRef.current)
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    if (scrollRetryTimeoutRef.current) clearTimeout(scrollRetryTimeoutRef.current)
  }, [cancelActiveLineSync, cancelLinePressScroll, cancelScheduledScroll])

  useEffect(() => {
    cancelScheduledScroll()
    cancelLinePressScroll()
    if (initialScrollTimeoutRef.current) {
      clearTimeout(initialScrollTimeoutRef.current)
      initialScrollTimeoutRef.current = null
    }
    if (scrollRetryTimeoutRef.current) {
      clearTimeout(scrollRetryTimeoutRef.current)
      scrollRetryTimeoutRef.current = null
    }

    const targetLine = Math.max(0, currentLineRef.current)
    isPauseScrollRef.current = true
    listLayoutInfoRef.current.lineHeights = []
    listLayoutInfoRef.current.lineOffsets = []
    lineRef.current.prevLine = 0
    lineRef.current.line = targetLine
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false })
    if (!lyricLines.length) return

    initialScrollTimeoutRef.current = setTimeout(() => {
      initialScrollTimeoutRef.current = null
      isPauseScrollRef.current = false
      scrollToActiveRef.current(targetLine)
    }, 100)
  }, [cancelLinePressScroll, cancelScheduledScroll, lyricLines])

  useEffect(() => {
    activeLineRef.current = line
    scheduleActiveLineSync()
    if (line < 0) return

    lineRef.current.prevLine = lineRef.current.line
    lineRef.current.line = line
    if (isPauseScrollRef.current) return

    if (initialScrollTimeoutRef.current) {
      clearTimeout(initialScrollTimeoutRef.current)
      initialScrollTimeoutRef.current = null
    }
    scheduleScrollToActive(line)
  }, [line, scheduleActiveLineSync, scheduleScrollToActive])

  const handleScrollToIndexFailed = useCallback<NonNullable<FlatListType['onScrollToIndexFailed']>>((info) => {
    const flatList = flatListRef.current
    if (!flatList) return
    flatList.scrollToOffset({
      offset: Math.max(0, info.averageItemLength * info.index),
      animated: false,
    })
    if (scrollRetryTimeoutRef.current) clearTimeout(scrollRetryTimeoutRef.current)
    scrollRetryTimeoutRef.current = setTimeout(() => {
      scrollRetryTimeoutRef.current = null
      scrollToActiveRef.current(info.index)
    }, 50)
  }, [])

  const handleLineLayout = useCallback((lineNum: number, height: number) => {
    const layoutInfo = listLayoutInfoRef.current
    if (layoutInfo.lineHeights[lineNum] == height) return
    layoutInfo.lineHeights[lineNum] = height
    if (layoutInfo.lineOffsets.length > lineNum + 1) {
      layoutInfo.lineOffsets.length = lineNum + 1
    }
  }, [])

  const handleSpaceLayout = useCallback(({ nativeEvent }: LayoutChangeEvent) => {
    const layoutInfo = listLayoutInfoRef.current
    if (layoutInfo.spaceHeight == nativeEvent.layout.height) return
    layoutInfo.spaceHeight = nativeEvent.layout.height
    layoutInfo.lineOffsets = []
  }, [])

  const handleListLayout = useCallback(({ nativeEvent }: LayoutChangeEvent) => {
    listHeightRef.current = nativeEvent.layout.height
  }, [])

  const handleLinePress = useCallback((index: number) => {
    if (!isShowLyricProgressSetting) return
    cancelScheduledScroll()
    cancelLinePressScroll()
    if (initialScrollTimeoutRef.current) {
      clearTimeout(initialScrollTimeoutRef.current)
      initialScrollTimeoutRef.current = null
    }
    if (scrollRetryTimeoutRef.current) {
      clearTimeout(scrollRetryTimeoutRef.current)
      scrollRetryTimeoutRef.current = null
    }
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
      scrollTimeoutRef.current = null
    }
    const targetLine = lyricLines[index]
    if (!targetLine) return
    const wasPlaying = playerState.isPlay
    isPauseScrollRef.current = false
    if (!wasPlaying) {
      cancelActiveLineSync()
      setRenderedActiveLine(index)
    }
    global.app_event.setProgress(targetLine.time / 1000)
    if (wasPlaying) {
      scheduleScrollToActive(index)
      return
    }
    linePressScrollTimeoutRef.current = setTimeout(() => {
      linePressScrollTimeoutRef.current = null
      scheduleScrollToActive(index)
    }, LINE_PRESS_ACTIVE_HOLD_DURATION)
  }, [cancelActiveLineSync, cancelLinePressScroll, cancelScheduledScroll, isShowLyricProgressSetting, lyricLines, scheduleScrollToActive, setRenderedActiveLine])

  const renderItem = useCallback(({ item, index }: { item: Line, index: number }) => (
    <LrcLine
      line={item}
      lineNum={index}
      activeLineRef={activeLineRef}
      onLayout={handleLineLayout}
      onPress={handleLinePress}
      onRegister={registerLine}
    />
  ), [handleLineLayout, handleLinePress, registerLine])

  const spaceComponent = useMemo(
    () => <View style={styles.space} onLayout={handleSpaceLayout} />,
    [handleSpaceLayout],
  )

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <FlatList
        data={lyricLines}
        renderItem={renderItem}
        keyExtractor={getKey}
        style={styles.list}
        ref={flatListRef}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={spaceComponent}
        ListFooterComponent={spaceComponent}
        onLayout={handleListLayout}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={onScrollEndDrag}
        fadingEdgeLength={100}
        initialNumToRender={16}
        maxToRenderPerBatch={12}
        updateCellsBatchingPeriod={8}
        windowSize={7}
        removeClippedSubviews={false}
        onScrollToIndexFailed={handleScrollToIndexFailed}
      />
    </View>
  )
}

const styles = createStyle({
  container: {
    flex: 1,
    paddingLeft: 20,
    paddingRight: 20,
  },
  list: {
    flex: 1,
  },
  space: {
    paddingTop: '100%',
  },
  line: {
    paddingTop: 10,
    paddingBottom: 10,
  },
  linePressed: {
    opacity: 0.7,
  },
  lineText: {
    textAlign: 'center',
  },
  lineTranslationText: {
    textAlign: 'center',
    paddingTop: 5,
  },
})
